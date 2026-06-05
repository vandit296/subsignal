// Keyword Watch — Reddit search
//
// Priority order:
//   1. Arctic Shift — PRIMARY. Reddit archive with live data, no cloud-IP blocks.
//      Searches across the growing subreddit pool (lib/subreddit-pool.ts).
//   2. Reddit RSS — fallback, generally not blocked from Vercel.
//   3. Reddit public JSON — last resort, may 403 on cloud IPs.
//   4. Exa — DISABLED by default. Its Reddit index returns 0/stale results
//      for includeDomains:reddit.com, so it is NOT used for keyword search.
//      Re-enable as a last-ditch fallback only with EXA_KEYWORD_FALLBACK=true.

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getCompany } from '@/lib/upstash';
import { getSearchSubreddits, addDiscoveredSubreddits } from '@/lib/subreddit-pool';
import Anthropic from '@anthropic-ai/sdk';

// ── Shared types ──────────────────────────────────────────────────────────────

interface Thread {
  id: string;
  title: string;
  subreddit: string;
  score: number;
  numComments: number;
  createdUtc: number;
  url: string;
  snippet: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function periodToMs(period: string): number {
  switch (period) {
    case '1day':   return 86_400_000;
    case '1week':  return 7 * 86_400_000;
    case '1month': return 30 * 86_400_000;
    default:       return 7 * 86_400_000;
  }
}

function periodToRedditT(period: string): string {
  switch (period) {
    case '1day':   return 'day';
    case '1week':  return 'week';
    case '1month': return 'month';
    default:       return 'week';
  }
}

function extractSubreddit(url: string): string {
  return url.match(/reddit\.com\/r\/([^/?#]+)/i)?.[1] ?? 'reddit';
}

// ── 1. Exa (best path) ────────────────────────────────────────────────────────

interface ExaResult {
  id: string;
  url: string;
  title: string;
  publishedDate?: string;
  text?: string;
}

let _searchDebug = '';

async function exaFetch(
  apiKey: string,
  keyword: string,
  startDate: string,
  withContents: boolean,
  exact = true,
): Promise<{ results: ExaResult[]; debug: string }> {
  const query = exact ? `"${keyword}"` : keyword;
  const body: Record<string, unknown> = {
    query,
    includeDomains: ['reddit.com'],
    numResults: 100,
    startPublishedDate: startDate,
    type: 'keyword',
  };
  if (withContents) body.contents = { text: { maxCharacters: 400 } };

  const res = await fetch('https://api.exa.ai/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
    body: JSON.stringify(body),
  });

  const tag = `exa:${exact ? 'exact' : 'broad'}${withContents ? '+txt' : ''} status=${res.status}`;
  if (!res.ok) {
    const err = await res.text();
    return { results: [], debug: `${tag} err=${err.slice(0, 120)}` };
  }
  const data = await res.json() as { results?: ExaResult[] };
  const results = data.results ?? [];
  return { results, debug: `${tag} n=${results.length}` };
}

// Build keyword variants to maximise coverage without semantic drift.
// e.g. "pre-seed" → ["pre-seed", "preseed", "pre seed"]
// Quoted exact-match ensures both words appear together in the same context,
// never split across paragraphs.
function buildVariants(keyword: string): string[] {
  const base = keyword.trim().toLowerCase();
  const variants = new Set<string>([base]);
  if (base.includes('-')) {
    variants.add(base.replace(/-/g, ''));   // pre-seed → preseed
    variants.add(base.replace(/-/g, ' '));  // pre-seed → pre seed
  }
  if (base.includes(' ')) {
    variants.add(base.replace(/ /g, '-'));  // pre seed → pre-seed
    variants.add(base.replace(/ /g, ''));   // pre seed → preseed
  }
  return [...variants].slice(0, 4);
}

async function searchViaExa(keyword: string, period: string): Promise<{ threads: Thread[]; debug: string }> {
  const apiKey = process.env.EXA_API_KEY;
  if (!apiKey) return { threads: [], debug: 'exa:no_key' };

  const startDate = new Date(Date.now() - periodToMs(period)).toISOString();
  const parts: string[] = [];
  const seen = new Set<string>();
  let allResults: ExaResult[] = [];

  const variants = buildVariants(keyword);

  try {
    // Run all variants in parallel — each quoted exact-match forces the phrase
    // to appear together, so "pre" and "seed" can never be in separate paragraphs.
    // Each call returns up to 100 results → up to ~400 total after dedup.
    const calls = variants.flatMap(v => [
      exaFetch(apiKey, v, startDate, true, true),   // exact phrase + snippet
      exaFetch(apiKey, v, startDate, false, false),  // broad (catches adjacent spacing variants)
    ]);

    const settled = await Promise.allSettled(calls);

    for (const r of settled) {
      if (r.status !== 'fulfilled') continue;
      parts.push(r.value.debug);
      for (const result of r.value.results) {
        if (!seen.has(result.url)) {
          seen.add(result.url);
          allResults.push(result);
        }
      }
    }

    // Only keep actual Reddit thread URLs (not profiles, wikis, etc.)
    allResults = allResults.filter(r =>
      /reddit\.com\/r\/[^/]+\/comments\//i.test(r.url)
    );

    const threads = allResults.map(r => ({
      id: r.id,
      title: r.title ?? '',
      subreddit: extractSubreddit(r.url),
      score: 0,
      numComments: 0,
      createdUtc: r.publishedDate
        ? Math.floor(new Date(r.publishedDate).getTime() / 1000)
        : Math.floor(Date.now() / 1000),
      url: r.url,
      snippet: (r.text ?? '').slice(0, 300),
    }));

    return {
      threads,
      debug: `variants=[${variants.join(',')}] total=${threads.length} | ${parts.join(' | ')}`,
    };
  } catch (e) {
    return { threads: [], debug: `exa:exception ${String(e).slice(0, 80)}` };
  }
}

// ── Arctic Shift full-text search across subreddits (PRIMARY) ────────────────
// Arctic Shift is a Reddit archive with live data (no IP blocks from Vercel).
// Uses the growing subreddit pool (lib/subreddit-pool.ts) — starts at ~15,
// grows by 25/day via the expand-subreddit-pool cron, targets 1000+.

async function searchViaArcticShift(
  keyword: string,
  period: string,
  subreddits: string[],
): Promise<{ threads: Thread[]; debug: string }> {
  const afterDate = new Date(Date.now() - periodToMs(period)).toISOString().slice(0, 10);

  try {
    const settled = await Promise.allSettled(
      subreddits.map(sub =>
        fetch(
          // Full-text `query=` matches title AND selftext (body). `title=` only
          // matched headlines (and 422s on some terms) — it missed keywords
          // mentioned in post bodies, e.g. "...at the pre-seed stage".
          `https://arctic-shift.photon-reddit.com/api/posts/search?query=${encodeURIComponent(keyword)}&subreddit=${encodeURIComponent(sub)}&limit=25&sort=desc&after=${afterDate}`,
          { headers: { Accept: 'application/json' }, cache: 'no-store', signal: AbortSignal.timeout(10_000) }
        ).then(r => r.json() as Promise<{ data?: Array<Record<string, unknown>> }>)
      )
    );

    const seen = new Set<string>();
    const threads: Thread[] = [];
    for (const r of settled) {
      if (r.status !== 'fulfilled') continue;
      for (const p of r.value.data ?? []) {
        const id = p.id as string;
        if (!id || !p.permalink || seen.has(id)) continue;
        seen.add(id);
        threads.push({
          id,
          title: (p.title as string) ?? '',
          subreddit: (p.subreddit as string) ?? '',
          score: (p.score as number) ?? 0,
          numComments: (p.num_comments as number) ?? 0,
          createdUtc: (p.created_utc as number) ?? 0,
          url: `https://reddit.com${p.permalink as string}`,
          snippet: ((p.selftext as string) ?? '').slice(0, 300),
        });
      }
    }
    threads.sort((a, b) => b.createdUtc - a.createdUtc);
    return { threads, debug: `arctic:ok n=${threads.length} subs=${subreddits.length}` };
  } catch (e) {
    return { threads: [], debug: `arctic:exception ${String(e).slice(0, 80)}` };
  }
}

// ── 3. Reddit RSS search ──────────────────────────────────────────────────────
// Reddit still serves RSS feeds — a legacy endpoint that predates their API
// lockdown and is generally NOT blocked by their cloud-IP restrictions.
// No API key or approval needed. Returns up to 100 results per query.
//
// NOTE: Reddit OAuth 3rd-party API is effectively closed (killed in 2023).
// RSS is the only native Reddit path that reliably works from Vercel.

// Minimal XML value extractor — no xml2js dependency needed
function xmlVal(xml: string, tag: string): string {
  const m = xml.match(new RegExp(`<${tag}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?</${tag}>`, 'i'));
  return m?.[1]?.trim() ?? '';
}
function xmlAll(xml: string, tag: string): string[] {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'gi');
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) out.push(m[1]);
  return out;
}

async function searchViaRedditRSS(keyword: string, period: string): Promise<{ threads: Thread[]; debug: string }> {
  const t = periodToRedditT(period);
  const qs = new URLSearchParams({ q: keyword, sort: 'new', t, limit: '100' });
  const url = `https://www.reddit.com/search.rss?${qs}`;

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'SubSignal/1.0 RSS reader',
        'Accept': 'application/rss+xml, application/xml, text/xml',
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      return { threads: [], debug: `rss:http_${res.status}` };
    }

    const xml = await res.text();
    const items = xmlAll(xml, 'item');

    const threads: Thread[] = items.map((item, i) => {
      const title   = xmlVal(item, 'title');
      const link    = xmlVal(item, 'link');
      const pubDate = xmlVal(item, 'pubDate');
      const desc    = xmlVal(item, 'description').replace(/<[^>]+>/g, '').slice(0, 300);
      const sub     = extractSubreddit(link);
      // Reddit RSS item links look like: https://www.reddit.com/r/startups/comments/...
      const idMatch = link.match(/comments\/([a-z0-9]+)\//i);
      return {
        id: idMatch?.[1] ?? `rss_${i}`,
        title,
        subreddit: sub,
        score: 0,
        numComments: 0,
        createdUtc: pubDate ? Math.floor(new Date(pubDate).getTime() / 1000) : 0,
        url: link,
        snippet: desc,
      };
    }).filter(t => t.title && t.url);

    return { threads, debug: `rss:ok n=${threads.length}` };
  } catch (e) {
    return { threads: [], debug: `rss:exception ${String(e).slice(0, 80)}` };
  }
}

// ── 3. Reddit public JSON (last resort) ──────────────────────────────────────
// Works from dev/local environments. May 403/timeout on Vercel (cloud IPs).

async function searchViaRedditPublic(keyword: string, period: string): Promise<{ threads: Thread[]; debug: string }> {
  const t = periodToRedditT(period);
  const threads: Thread[] = [];
  let after = '';

  for (let page = 0; page < 2; page++) {
    const qs = new URLSearchParams({ q: keyword, sort: 'new', t, limit: '100', type: 'link' });
    if (after) qs.set('after', after);

    try {
      const res = await fetch(`https://www.reddit.com/search.json?${qs}`, {
        headers: {
          'User-Agent': 'SubSignal/1.0 by vandit296',
          'Accept': 'application/json',
        },
        cache: 'no-store',
        // Short timeout — if Reddit is going to block us, fail fast
        signal: AbortSignal.timeout(8_000),
      });

      if (!res.ok) {
        return { threads, debug: `reddit_public:http_${res.status}` };
      }

      const data = await res.json() as {
        data?: { children?: Array<{ data: RedditJsonPost }>; after?: string };
      };
      const children = data?.data?.children ?? [];
      if (children.length === 0) break;

      for (const child of children) {
        const p = child.data;
        threads.push({
          id: p.id ?? '',
          title: p.title ?? '',
          subreddit: p.subreddit ?? '',
          score: p.score ?? 0,
          numComments: p.num_comments ?? 0,
          createdUtc: p.created_utc ?? 0,
          url: p.permalink ? `https://reddit.com${p.permalink}` : (p.url ?? ''),
          snippet: (p.selftext ?? '').slice(0, 300),
        });
      }

      after = data?.data?.after ?? '';
      if (!after) break;
      if (page < 1) await new Promise(r => setTimeout(r, 200));
    } catch (e) {
      return { threads, debug: `reddit_public:exception ${String(e).slice(0, 60)}` };
    }
  }

  return { threads, debug: `reddit_public:ok n=${threads.length}` };
}

// ── Language pre-filter ──────────────────────────────────────────────────────
// Drop posts where the title is predominantly non-Latin script
// (Cyrillic, Arabic, CJK, Devanagari, etc.) — these are false matches from
// Exa indexing translated/cross-posted versions of English content.
function isLikelyEnglish(title: string): boolean {
  if (!title) return true;
  // Count non-ASCII-Latin chars (excludes basic punctuation & numbers)
  const nonLatin = (title.match(/[^ -À-ɏḀ-ỿ]/g) ?? []).length;
  const total = title.replace(/\s/g, '').length;
  // Reject if more than 30% of characters are non-Latin
  return total === 0 || nonLatin / total < 0.3;
}

// ── AI relevance filter ───────────────────────────────────────────────────────

async function aiFilter(
  keyword: string,
  posts: Thread[],
  productDescription: string,
): Promise<Thread[]> {
  if (posts.length === 0) return [];

  const postList = posts
    .slice(0, 60)
    .map((p, i) => `[${i}] "${p.title}"${p.snippet ? ` — ${p.snippet.slice(0, 100)}` : ''}`)
    .join('\n');

  const context = productDescription
    ? `PRODUCT CONTEXT: "${productDescription}"`
    : 'CONTEXT: Startup / founder / SaaS / B2B / fundraising';

  const prompt = `You are a strict relevance filter for Reddit keyword tracking. The user is tracking the keyword "${keyword}".

KEYWORD: "${keyword}"
${context}

REMOVE a post if ANY of these are true:
1. The post is in a different language (French, Spanish, etc.) and the keyword appears as a word in that language, not as the English brand/product/concept the user is tracking
2. The post clearly has nothing to do with the keyword topic (e.g. gaming post for a fintech keyword)
3. The keyword only appears coincidentally — a single common word in an unrelated sentence

KEEP a post if: it genuinely discusses the keyword topic, product, or concept in English.

POSTS:
${postList}

Return ONLY a JSON array of indexes to REMOVE. If nothing to remove return []. No markdown, no explanation.`;

  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const msg = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      messages: [{ role: 'user', content: prompt }],
    });
    const raw = (msg.content[0] as { type: string; text: string }).text.trim();
    const clean = raw.replace(/^```json?\n?/, '').replace(/\n?```$/, '');
    const toRemove: number[] = JSON.parse(clean);
    const removeSet = new Set(toRemove);
    return posts.filter((_, i) => !removeSet.has(i));
  } catch {
    return posts;
  }
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const keyword = searchParams.get('keyword')?.trim();
  const period  = searchParams.get('period') ?? '1week';

  if (!keyword) {
    return NextResponse.json({ error: 'keyword required' }, { status: 400 });
  }

  let productDescription = '';
  let userSubreddits: string[] = [];
  try {
    const session = await getSession();
    if (session?.user?.email) {
      const company = await getCompany(session.user.email);
      productDescription = company?.description ?? '';
      userSubreddits = company?.subreddits ?? [];
    }
  } catch { /* non-fatal */ }

  let threads: Thread[] = [];
  let source = 'none';

  // ── Try each source in order until we get results ─────────────────────────
  // Arctic Shift is PRIMARY. Exa is intentionally excluded from the keyword
  // path (its Reddit index is broken) unless EXA_KEYWORD_FALLBACK=true.

  // 1. Arctic Shift (growing subreddit pool — starts ~15, grows by 25/day)
  {
    const searchSubs = await getSearchSubreddits(userSubreddits, 50);
    const r = await searchViaArcticShift(keyword, period, searchSubs);
    _searchDebug = r.debug;
    if (r.threads.length > 0) {
      threads = r.threads;
      source = 'arctic';
      // Feed newly discovered subreddits back into the pool
      const found = [...new Set(r.threads.map(t => t.subreddit).filter(Boolean))];
      void addDiscoveredSubreddits(found);
    }
  }

  // 2. Reddit RSS (no API key needed, less restricted than JSON)
  if (threads.length === 0) {
    const r = await searchViaRedditRSS(keyword, period);
    _searchDebug += ` | ${r.debug}`;
    if (r.threads.length > 0) {
      threads = r.threads;
      source = 'reddit_rss';
    }
  }

  // 3. Reddit public JSON (may 403 on cloud IPs)
  if (threads.length === 0) {
    const r = await searchViaRedditPublic(keyword, period);
    _searchDebug += ` | ${r.debug}`;
    if (r.threads.length > 0) {
      threads = r.threads;
      source = 'reddit_public';
    }
  }

  // 4. Exa — disabled by default (broken Reddit index). Opt-in last resort.
  if (threads.length === 0 && process.env.EXA_KEYWORD_FALLBACK === 'true' && process.env.EXA_API_KEY) {
    const r = await searchViaExa(keyword, period);
    _searchDebug += ` | ${r.debug}`;
    if (r.threads.length > 0) {
      threads = r.threads;
      source = 'exa';
    }
  }

  console.log(`[track] "${keyword}" period=${period} source=${source} raw=${threads.length} debug=${_searchDebug}`);

  // If everything failed, return a clear error
  if (threads.length === 0 && source === 'none') {
    return NextResponse.json({
      keyword,
      period,
      totalThreads: 0,
      rawThreads: 0,
      removedByAI: 0,
      aiFiltered: false,
      source,
      debug: _searchDebug,
      threads: [],
      subredditActivity: [],
      fetchedAt: new Date().toISOString(),
      error: 'No search sources available. Add EXA_API_KEY to Vercel environment variables for reliable results.',
    });
  }

  // Language pre-filter (fast, no API cost)
  const langFiltered = threads.filter(t => isLikelyEnglish(t.title));
  const langRemoved = threads.length - langFiltered.length;

  // AI relevance filter
  let filtered = langFiltered;
  let removed = langRemoved;
  if (process.env.ANTHROPIC_API_KEY && langFiltered.length > 0) {
    const aiFiltered = await aiFilter(keyword, langFiltered, productDescription);
    removed = threads.length - aiFiltered.length;
    filtered = aiFiltered;
  }

  const bySubreddit: Record<string, number> = {};
  filtered.forEach(t => { bySubreddit[t.subreddit] = (bySubreddit[t.subreddit] ?? 0) + 1; });
  const subredditActivity = Object.entries(bySubreddit)
    .map(([subreddit, count]) => ({ subreddit, count }))
    .sort((a, b) => b.count - a.count);

  return NextResponse.json({
    keyword,
    period,
    totalThreads: filtered.length,
    rawThreads: threads.length,
    removedByAI: removed,
    aiFiltered: removed > 0,
    source,
    threads: filtered,
    subredditActivity,
    fetchedAt: new Date().toISOString(),
  });
}
