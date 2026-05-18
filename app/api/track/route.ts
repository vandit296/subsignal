import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getCompany } from '@/lib/upstash';
import Anthropic from '@anthropic-ai/sdk';

// Default subreddits used when the user hasn't configured any in Command
const DEFAULT_SUBREDDITS = [
  'SaaS', 'startups', 'entrepreneur', 'indiehackers',
  'webdev', 'smallbusiness', 'marketing',
];

const BASE = 'https://arctic-shift.photon-reddit.com';

interface RawPost {
  id: string;
  title: string;
  selftext?: string;
  score: number;
  num_comments: number;
  created_utc: number;
  url?: string;
  subreddit: string;
  is_self?: boolean;
  author: string;
  permalink?: string;
}

interface Thread {
  id: string;
  title: string;
  subreddit: string;
  score: number;
  numComments: number;
  createdUtc: number;
  url: string;
  snippet: string;
  author: string;
}

function periodToAfter(period: string): number {
  const now = Math.floor(Date.now() / 1000);
  switch (period) {
    case '1day':   return now - 86400;
    case '1week':  return now - 7 * 86400;
    case '1month': return now - 30 * 86400;
    default:       return now - 7 * 86400;
  }
}

// Fetch recent posts from a subreddit via Arctic Shift (works from Vercel — no IP blocks)
async function fetchSubredditPosts(subreddit: string, after: number): Promise<RawPost[]> {
  try {
    const res = await fetch(
      `${BASE}/api/posts/search?subreddit=${encodeURIComponent(subreddit)}&limit=100&after=${after}&sort=desc`,
      { headers: { Accept: 'application/json' }, cache: 'no-store' }
    );
    if (!res.ok) return [];
    const json = await res.json();
    return (json.data as RawPost[]) ?? [];
  } catch {
    return [];
  }
}

// Search across multiple subreddits, filter by keyword
async function searchByKeyword(keyword: string, subreddits: string[], after: number): Promise<Thread[]> {
  const kw = keyword.toLowerCase();

  const results = await Promise.allSettled(
    subreddits.map(sub => fetchSubredditPosts(sub, after))
  );

  const allPosts: RawPost[] = results
    .filter((r): r is PromiseFulfilledResult<RawPost[]> => r.status === 'fulfilled')
    .flatMap(r => r.value);

  // Filter posts that mention the keyword in title or body
  const matched = allPosts.filter(p =>
    p.title?.toLowerCase().includes(kw) ||
    (p.selftext ?? '').toLowerCase().includes(kw)
  );

  // Sort by newest first, deduplicate
  const seen = new Set<string>();
  return matched
    .sort((a, b) => b.created_utc - a.created_utc)
    .filter(p => {
      if (seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    })
    .map(p => ({
      id: p.id,
      title: p.title,
      subreddit: p.subreddit,
      score: p.score,
      numComments: p.num_comments,
      createdUtc: p.created_utc,
      url: p.permalink
        ? `https://reddit.com${p.permalink}`
        : `https://reddit.com/r/${p.subreddit}/comments/${p.id}`,
      snippet: (p.selftext ?? '').slice(0, 200),
      author: p.author,
    }));
}

async function aiFilter(
  keyword: string,
  posts: Thread[],
  productDescription: string
): Promise<Thread[]> {
  if (posts.length === 0) return [];

  const postList = posts
    .map((p, i) => `[${i}] "${p.title}"${p.snippet ? ` — ${p.snippet.slice(0, 120)}` : ''}`)
    .join('\n');

  const prompt = `You are filtering Reddit posts for relevance to a specific context.

KEYWORD BEING TRACKED: "${keyword}"

PRODUCT / CONTEXT:
"${productDescription}"

POSTS TO EVALUATE:
${postList}

Decide which posts use the keyword in an IRRELEVANT context vs. the product/business context above.

Examples of what to REMOVE:
- "pre-seed" in a pregnancy or gardening post
- "pitch deck" in a music context
- "investor list" in a completely unrelated industry

Examples of what to KEEP:
- Keyword in the startup/business context matching the product
- Tangentially related business discussions

Be conservative — only remove posts where the keyword is clearly off-topic. When in doubt, KEEP.

Return ONLY a JSON array of indexes to REMOVE. If nothing should be removed, return: []
No markdown.`;

  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      messages: [{ role: 'user', content: prompt }],
    });

    const raw = (message.content[0] as { type: string; text: string }).text.trim();
    const json = raw.replace(/^```json?\n?/, '').replace(/\n?```$/, '');
    const toRemove: number[] = JSON.parse(json);
    const removeSet = new Set(toRemove);
    return posts.filter((_, i) => !removeSet.has(i));
  } catch {
    return posts;
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const keyword = searchParams.get('keyword')?.trim();
  const period = searchParams.get('period') ?? '1week';

  if (!keyword) {
    return NextResponse.json({ error: 'keyword required' }, { status: 400 });
  }

  const after = periodToAfter(period);

  // Get user's subreddits + product context from Command settings
  let subreddits = DEFAULT_SUBREDDITS;
  let productDescription = '';
  try {
    const session = await getSession();
    if (session?.user?.email) {
      const company = await getCompany(session.user.email);
      if (company?.subreddits?.length) subreddits = company.subreddits;
      productDescription = company?.description ?? '';
    }
  } catch { /* non-fatal — fall back to defaults */ }

  try {
    const threads = await searchByKeyword(keyword, subreddits, after);

    // Run AI filter if we have product context
    const filteredThreads = productDescription
      ? await aiFilter(keyword, threads, productDescription)
      : threads;

    const removedCount = threads.length - filteredThreads.length;

    // Group by subreddit for sidebar activity view
    const bySubreddit: Record<string, Thread[]> = {};
    filteredThreads.forEach(th => {
      if (!bySubreddit[th.subreddit]) bySubreddit[th.subreddit] = [];
      bySubreddit[th.subreddit].push(th);
    });

    const subredditActivity = Object.entries(bySubreddit)
      .map(([sub, posts]) => ({
        subreddit: sub,
        count: posts.length,
        topScore: Math.max(...posts.map(p => p.score)),
      }))
      .sort((a, b) => b.count - a.count);

    return NextResponse.json({
      keyword,
      period,
      totalThreads: filteredThreads.length,
      removedByAI: removedCount,
      aiFiltered: !!productDescription,
      threads: filteredThreads,
      subredditActivity,
      searchedSubreddits: subreddits,
      fetchedAt: new Date().toISOString(),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
