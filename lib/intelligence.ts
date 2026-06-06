// Company-to-Opportunity Intelligence Engine (v1, pragmatic)
//
// Pipeline: company profile (Claude) -> wide Arctic firehose across a large
// subreddit universe (live-filtered) -> keyword pre-filter (recall) -> Claude
// intent scorer (precision) -> tiered opportunities. Cached per user in Redis.
//
// v1 deliberately runs on the existing stack (Arctic + Claude + Upstash). A
// vector index for true semantic recall is the phase-2 upgrade.

import { createMessage } from './llm';
import { CORE_SUBREDDITS, SUBREDDIT_CANDIDATES } from './subreddit-pool';
import { safeFetchText } from './safe-fetch';

// ── tunables ────────────────────────────────────────────────────────────────
const UNIVERSE_CAP   = 140;   // subreddits swept per build
const PER_SUB_LIMIT  = 40;    // posts pulled per subreddit
const WINDOW_DAYS    = 10;    // recency window
const SWEEP_CONC     = 6;     // concurrent Arctic calls (gentle — it rate-limits)
const LLM_CAP        = 100;   // max candidates sent to the scorer (cost-trimmed from 180)
const LLM_BATCH      = 20;    // candidates per scoring call
export const FEED_TTL = 60 * 60 * 12; // 12h

// ── types ───────────────────────────────────────────────────────────────────
export interface IntelProfile {
  summary: string; category: string; jtbd: string;
  keywords: string[]; subreddits: string[];
}
export interface IntelOpportunity {
  sub: string; title: string; url: string; snippet: string;
  tier: 'reply' | 'add' | 'watch'; score: number; angle: string;
  numComments: number; createdUtc: number;
}
export interface IntelFeed {
  profile: { summary: string; category: string; jtbd: string };
  opportunities: IntelOpportunity[];
  stats: { universe: number; indexed: number; matched: number; builtAt: string; shortlist?: number; skipped?: number; unscored?: number };
}

// ── redis (self-contained REST) ──────────────────────────────────────────────
async function redis(command: unknown[]): Promise<unknown> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(command), cache: 'no-store', signal: AbortSignal.timeout(8_000),
    });
    const j = await res.json() as { result?: unknown };
    return j.result ?? null;
  } catch { return null; }
}
const feedKey    = (email: string) => `treddit:intel-feed:${email.toLowerCase()}`;
const profileKey = (email: string) => `treddit:intel-profile:${email.toLowerCase()}`;

// ── helpers ──────────────────────────────────────────────────────────────────
async function mapPool<T, R>(items: T[], n: number, fn: (x: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length); let i = 0;
  const w = async () => { while (i < items.length) { const k = i++; out[k] = await fn(items[k]); } };
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, w));
  return out;
}
function stripJson(t: string): string { return t.trim().replace(/^```json?\n?/, '').replace(/\n?```$/, ''); }

// ── 1. company profile (Prompt A) ────────────────────────────────────────────
export async function buildProfile(company: { description?: string; name?: string; goal?: string }): Promise<IntelProfile> {
  const desc = (company.description || '').slice(0, 4000);
  const prompt = `You are a B2B market-intelligence engine. From a company's description, infer how to find its customers on Reddit. Output strict JSON only.

COMPANY: ${company.name || '(unknown)'}
${company.goal ? `GOAL: ${company.goal}\n` : ''}DESCRIPTION:
"""${desc}"""

Translate marketing language into how a real person types on Reddit when they HAVE the problem (not polished copy). Include competitor/brand names and the product's literal category terms (e.g. "investor database").

Return JSON:
{
 "summary": "1-2 sentence plain take on what this company really does",
 "category": "short category",
 "jtbd": "the customer's real job-to-be-done, plain language",
 "keywords": ["18-30 short phrases a customer/prospect would actually type or that would appear in a relevant post or comment"],
 "subreddits": ["12-30 real subreddit names (no r/) where these customers gather, most likely first"]
}
No markdown.`;
  const msg = await createMessage({ model: 'claude-haiku-4-5-20251001', max_tokens: 1200, messages: [{ role: 'user', content: prompt }] });
  const raw = (msg.content[0] as { type: string; text: string }).text;
  const p = JSON.parse(stripJson(raw)) as IntelProfile;
  p.keywords = (p.keywords || []).filter(Boolean).slice(0, 30);
  p.subreddits = (p.subreddits || []).filter(Boolean).slice(0, 30);
  return p;
}

// ── 2. wide sweep (Arctic firehose, live-filtered) ───────────────────────────
interface Cand { sub: string; title: string; url: string; sel: string; nc: number; sc: number; created: number; }

function buildUniverse(profileSubs: string[]): string[] {
  const seen = new Set<string>(); const out: string[] = [];
  for (const s of [...profileSubs, ...CORE_SUBREDDITS, ...SUBREDDIT_CANDIDATES]) {
    const k = s.toLowerCase();
    if (!seen.has(k)) { seen.add(k); out.push(s); }
    if (out.length >= UNIVERSE_CAP) break;
  }
  return out;
}

async function fetchSub(sub: string, after: string, attempt = 0): Promise<Cand[]> {
  try {
    const res = await fetch(
      `https://arctic-shift.photon-reddit.com/api/posts/search?subreddit=${encodeURIComponent(sub)}&limit=${PER_SUB_LIMIT}&sort=desc&after=${after}`,
      { headers: { Accept: 'application/json' }, cache: 'no-store', signal: AbortSignal.timeout(10_000) }
    );
    if (res.status === 429 && attempt < 2) { await new Promise(r => setTimeout(r, 500 * 2 ** attempt + Math.random() * 300)); return fetchSub(sub, after, attempt + 1); }
    if (!res.ok) return [];
    const j = await res.json() as { data?: Array<Record<string, unknown>> };
    const out: Cand[] = [];
    for (const p of j.data ?? []) {
      const st = (p.selftext as string) ?? '', au = (p.author as string) ?? '', ti = (p.title as string) ?? '';
      if (!p.id || !p.permalink) continue;
      if (st === '[removed]' || st === '[deleted]' || au === '[deleted]' || p.removed_by_category || ti === '[removed]' || p.locked) continue;
      out.push({ sub: (p.subreddit as string) ?? sub, title: ti, url: `https://reddit.com${p.permalink as string}`, sel: st.replace(/\s+/g, ' ').slice(0, 300), nc: (p.num_comments as number) ?? 0, sc: (p.score as number) ?? 0, created: (p.created_utc as number) ?? 0 });
    }
    return out;
  } catch { return []; }
}

async function sweep(subs: string[]): Promise<Cand[]> {
  const after = new Date(Date.now() - WINDOW_DAYS * 864e5).toISOString().slice(0, 10);
  const results = await mapPool(subs, SWEEP_CONC, s => fetchSub(s, after));
  const seenUrl = new Set<string>(); const seenTitle = new Set<string>(); const all: Cand[] = [];
  for (const arr of results) for (const c of arr) {
    const tkey = c.title.toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 60);
    if (seenUrl.has(c.url) || (tkey && seenTitle.has(tkey))) continue;   // dedupe URLs + crossposts
    seenUrl.add(c.url); if (tkey) seenTitle.add(tkey); all.push(c);
  }
  return all;
}

// Recall stage: tokenize keywords into individual words and keep any candidate
// that hits >=1 token, ranked by (token hits, recency). Phrase-only matching
// missed almost everything ("angel investors" never matched "Seeking Angel
// Investor"); word tokens (investor, angel, fund, seed, pitch, founder…) catch
// the real threads, and the LLM scorer below handles precision.
// Never surface someone in crisis (self-harm, suicidal ideation, acute distress)
// as an engagement opportunity — hard exclusion, independent of relevance.
const CRISIS = /(suicid|su\*cid|kill(ing)? myself|end(ing)? (it all|my life)|want(?:\s?to|na) die|no reason to live|can'?t go on|take my (own )?life|self[\s-]?harm|harm(ing)? myself|unalive|overdos)/i;

function preFilter(cands: Cand[], keywords: string[]): Cand[] {
  cands = cands.filter(c => !CRISIS.test(`${c.title} ${c.sel}`));
  const toks = new Set<string>();
  for (const k of keywords) for (const w of (k || '').toLowerCase().split(/[^a-z0-9]+/)) if (w.length >= 4) toks.add(w);
  const tokens = [...toks];
  if (!tokens.length) return cands.slice(0, LLM_CAP);
  const now = Date.now() / 1000;
  const ranked = cands
    .map(c => {
      const h = (c.title + ' ' + c.sel).toLowerCase();
      let hits = 0; for (const t of tokens) if (h.includes(t)) hits++;
      return { c, hits, rank: hits * 5 + Math.max(0, 14 - (now - c.created) / 86400) };
    })
    .filter(x => x.hits > 0);
  ranked.sort((a, b) => b.rank - a.rank);
  return ranked.slice(0, LLM_CAP).map(x => x.c);
}

// ── 3. intent scorer (Prompt B) ──────────────────────────────────────────────
async function scoreBatch(profile: IntelProfile, batch: Cand[]): Promise<Record<number, { tier: string; score: number; angle: string }>> {
  const list = batch.map((c, i) => `[${i}] r/${c.sub} | "${c.title}" | ${c.sel.slice(0, 120)}`).join('\n');
  const prompt = `You score Reddit threads as engagement opportunities for a specific company. Output strict JSON only.

COMPANY: ${profile.summary}
CUSTOMER JOB-TO-BE-DONE: ${profile.jtbd}

For each thread decide if the company should engage, the tier, a 0-100 score, and a <=14-word angle.
- "reply": someone is actively seeking/struggling with what the company solves (a question, a request for tools/recommendations, an active need). Highest value.
- "add": relevant discussion where a helpful, non-pitchy comment builds authority.
- "watch": tangential market signal; low direct value.
- "skip": not relevant to this company at all (drop it).
Be strict: keyword overlap is NOT relevance. A resume roast, a hiring post, an off-topic rant = skip.
SAFETY (overrides everything): if the author shows self-harm or suicidal thoughts, or is in acute personal/medical/financial crisis, return "skip". Never surface a person in distress as an engagement opportunity, no matter how relevant the topic.

THREADS:
${list}

Return ONLY a JSON array: [{"i":0,"tier":"reply|add|watch|skip","score":0-100,"angle":"..."}]`;
  const msg = await createMessage({ model: 'claude-haiku-4-5-20251001', max_tokens: 1500, messages: [{ role: 'user', content: prompt }] });
  const raw = (msg.content[0] as { type: string; text: string }).text;
  const out: Record<number, { tier: string; score: number; angle: string }> = {};
  let arr: Array<{ i: number; tier: string; score: number; angle: string }> | null = null;
  const txt = stripJson(raw);
  try { arr = JSON.parse(txt); }
  catch { const m = txt.match(/\[[\s\S]*\]/); if (m) { try { arr = JSON.parse(m[0]); } catch { /* give up */ } } }
  if (arr) for (const r of arr) out[r.i] = { tier: r.tier, score: r.score, angle: r.angle };
  return out;
}

// ── orchestration ────────────────────────────────────────────────────────────
export async function buildFeed(company: { description?: string; name?: string; goal?: string }, email?: string): Promise<IntelFeed> {
  const profile = await buildProfile(company);
  if (email) await redis(['SET', profileKey(email), JSON.stringify(profile), 'EX', String(60 * 60 * 24 * 7)]);

  const universe = buildUniverse(profile.subreddits);
  const candidates = await sweep(universe);
  const shortlist = preFilter(candidates, profile.keywords);

  const opportunities: IntelOpportunity[] = [];
  let skipped = 0, unscored = 0;
  for (let i = 0; i < shortlist.length; i += LLM_BATCH) {
    const batch = shortlist.slice(i, i + LLM_BATCH);
    const scores = await scoreBatch(profile, batch);
    batch.forEach((c, j) => {
      const s = scores[j];
      if (!s) { unscored++; return; }
      const tier = (s.tier || '').toLowerCase();
      if (!['reply', 'add', 'watch'].includes(tier)) { skipped++; return; }
      opportunities.push({ sub: c.sub, title: c.title, url: c.url, snippet: c.sel.slice(0, 180), tier: tier as IntelOpportunity['tier'], score: s.score ?? 0, angle: s.angle ?? '', numComments: c.nc, createdUtc: c.created });
    });
  }
  const tierRank = { reply: 0, add: 1, watch: 2 } as Record<string, number>;
  opportunities.sort((a, b) => (tierRank[a.tier] - tierRank[b.tier]) || (b.score - a.score));

  return {
    profile: { summary: profile.summary, category: profile.category, jtbd: profile.jtbd },
    opportunities,
    stats: { universe: universe.length, indexed: candidates.length, shortlist: shortlist.length, skipped, unscored, matched: opportunities.length, builtAt: new Date().toISOString() },
  };
}

export async function cacheFeed(email: string, feed: IntelFeed): Promise<void> {
  await redis(['SET', feedKey(email), JSON.stringify(feed), 'EX', String(FEED_TTL)]);
}
export async function getCachedFeed(email: string): Promise<IntelFeed | null> {
  const raw = await redis(['GET', feedKey(email)]) as string | null;
  if (!raw) return null;
  try { return JSON.parse(raw) as IntelFeed; } catch { return null; }
}

// ── URL-driven feeds (homepage "Find customers now") ─────────────────────────
export function urlFeedKey(url: string): string {
  return `treddit:intel-urlfeed:${url.toLowerCase().replace(/^https?:\/\//, '').replace(/[^a-z0-9]+/g, '').slice(0, 80)}`;
}
export async function getFeedByKey(key: string): Promise<IntelFeed | null> {
  const raw = await redis(['GET', key]) as string | null;
  if (!raw) return null;
  try { return JSON.parse(raw) as IntelFeed; } catch { return null; }
}
export async function setFeedByKey(key: string, feed: IntelFeed): Promise<void> {
  await redis(['SET', key, JSON.stringify(feed), 'EX', String(FEED_TTL)]);
}
// Fetch a company URL and reduce it to readable text for the profiler.
export async function fetchUrlText(url: string): Promise<string> {
  // SSRF-safe: blocks private/reserved/metadata targets, validates redirects, caps size.
  try {
    const html = await safeFetchText(url, { timeoutMs: 12_000, maxChars: 200_000 });
    return html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&[a-z#0-9]+;/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 5000);
  } catch { return ''; }
}

// ── Topic Watch (topic → expand → retrieve → relevance score) ────────────────
export interface TopicResult { sub: string; title: string; url: string; snippet: string; score: number; reason: string; numComments: number; createdUtc: number; }
export interface TopicFeed { topic: string; definition: string; threads: TopicResult[]; stats: { universe: number; indexed: number; matched: number; builtAt: string }; }

async function expandTopic(topic: string): Promise<{ definition: string; keywords: string[]; subreddits: string[] }> {
  const prompt = `You expand a monitoring TOPIC into a search plan. Output strict JSON only.
TOPIC: "${topic}"
Return:
{
 "definition": "1 sentence: what counts as on-topic, and what doesn't",
 "keywords": ["15-25 terms/phrases that appear in relevant posts or comments — include synonyms, slang, and brand/product names"],
 "subreddits": ["10-25 real subreddit names (no r/) where this topic is discussed, most likely first"]
}
No markdown.`;
  const msg = await createMessage({ model: 'claude-haiku-4-5-20251001', max_tokens: 900, messages: [{ role: 'user', content: prompt }] });
  const p = JSON.parse(stripJson((msg.content[0] as { type: string; text: string }).text)) as { definition: string; keywords: string[]; subreddits: string[] };
  p.keywords = (p.keywords || []).filter(Boolean).slice(0, 25);
  p.subreddits = (p.subreddits || []).filter(Boolean).slice(0, 25);
  return p;
}

async function scoreTopicBatch(topic: string, definition: string, batch: Cand[]): Promise<Record<number, { score: number; reason: string }>> {
  const list = batch.map((c, i) => `[${i}] r/${c.sub} | "${c.title}" | ${c.sel.slice(0, 120)}`).join('\n');
  const prompt = `Score how strongly each Reddit thread is ABOUT this topic. Output strict JSON only.
TOPIC: "${topic}"
ON-TOPIC MEANS: ${definition}
Keyword overlap is NOT relevance — a coincidental word doesn't count.
SAFETY: if the author shows self-harm/suicidal thoughts or acute crisis, set score 0.
For each thread: relevance 0-100 and a <=12-word reason. (score < 45 is dropped.)
THREADS:
${list}
Return ONLY: [{"i":0,"score":0-100,"reason":"..."}]`;
  const msg = await createMessage({ model: 'claude-haiku-4-5-20251001', max_tokens: 1500, messages: [{ role: 'user', content: prompt }] });
  const out: Record<number, { score: number; reason: string }> = {};
  let arr: Array<{ i: number; score: number; reason: string }> | null = null;
  const txt = stripJson((msg.content[0] as { type: string; text: string }).text);
  try { arr = JSON.parse(txt); } catch { const m = txt.match(/\[[\s\S]*\]/); if (m) { try { arr = JSON.parse(m[0]); } catch { /* give up */ } } }
  if (arr) for (const r of arr) out[r.i] = { score: r.score, reason: r.reason };
  return out;
}

export function topicKey(topic: string): string { return `treddit:topicfeed:${topic.toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 80)}`; }

export async function buildTopicFeed(topic: string): Promise<TopicFeed> {
  const exp = await expandTopic(topic);
  const universe = buildUniverse(exp.subreddits);
  const candidates = await sweep(universe);             // live-filtered + crisis-filtered in preFilter
  const shortlist = preFilter(candidates, exp.keywords);
  const threads: TopicResult[] = [];
  for (let i = 0; i < shortlist.length; i += LLM_BATCH) {
    const batch = shortlist.slice(i, i + LLM_BATCH);
    const scores = await scoreTopicBatch(topic, exp.definition, batch);
    batch.forEach((c, j) => {
      const s = scores[j];
      if (!s || (s.score ?? 0) < 45) return;
      threads.push({ sub: c.sub, title: c.title, url: c.url, snippet: c.sel.slice(0, 180), score: s.score, reason: s.reason || '', numComments: c.nc, createdUtc: c.created });
    });
  }
  threads.sort((a, b) => b.score - a.score);
  return { topic, definition: exp.definition, threads, stats: { universe: universe.length, indexed: candidates.length, matched: threads.length, builtAt: new Date().toISOString() } };
}

export async function getTopicFeed(topic: string): Promise<TopicFeed | null> {
  const raw = await redis(['GET', topicKey(topic)]) as string | null;
  if (!raw) return null;
  try { return JSON.parse(raw) as TopicFeed; } catch { return null; }
}
export async function cacheTopicFeed(topic: string, feed: TopicFeed): Promise<void> {
  await redis(['SET', topicKey(topic), JSON.stringify(feed), 'EX', String(FEED_TTL)]);
}
