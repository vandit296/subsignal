import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getCompany } from '@/lib/upstash';
import Anthropic from '@anthropic-ai/sdk';

const BASE = 'https://arctic-shift.photon-reddit.com';
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

interface RawPost {
  id: string;
  title: string;
  selftext?: string;
  score: number;
  num_comments: number;
  created_utc: number;
  url: string;
  subreddit: string;
  is_self: boolean;
  author: string;
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
  filtered?: boolean;   // true = AI removed it
  filterReason?: string;
}

// AI filter: remove posts where keyword appears in an unrelated context
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

For each post, decide if the keyword is used in a context RELEVANT to the product/business context above.

Examples of what to REMOVE (irrelevant):
- Keyword "pre-seed" appearing in a pregnancy or fertility post
- Keyword "pitch deck" appearing in a music/entertainment context
- Keyword "investor list" appearing in a completely unrelated industry

Examples of what to KEEP (relevant):
- The keyword is used in the startup/business context that matches the product
- The post discusses a topic genuinely connected to the product's space
- Even tangentially related business discussions should be KEPT

Be conservative — only remove posts where the keyword is clearly used in a completely different context. When in doubt, KEEP.

Return ONLY a JSON array of indexes to REMOVE (posts that are irrelevant):
[0, 3, 7]

If nothing should be removed, return: []
No markdown.`;

  try {
    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001', // Haiku is fine for this binary filter task
      max_tokens: 200,
      messages: [{ role: 'user', content: prompt }],
    });

    const raw = (message.content[0] as { type: string; text: string }).text.trim();
    const json = raw.replace(/^```json?\n?/, '').replace(/\n?```$/, '');
    const toRemove: number[] = JSON.parse(json);
    const removeSet = new Set(toRemove);

    return posts.filter((_, i) => !removeSet.has(i));
  } catch {
    // If AI filter fails, return all posts unfiltered
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

  const periodSeconds: Record<string, number> = {
    '1day':   86400,
    '1week':  86400 * 7,
    '1month': 86400 * 30,
  };
  const afterTs = Math.floor(Date.now() / 1000) - (periodSeconds[period] ?? 86400 * 7);

  // Get product context for AI filtering (optional — graceful if not set up)
  let productDescription = '';
  try {
    const session = await getSession();
    if (session?.user?.email) {
      const company = await getCompany(session.user.email);
      productDescription = company?.description ?? '';
    }
  } catch { /* non-fatal */ }

  try {
    const res = await fetch(
      `${BASE}/api/posts/search?q=${encodeURIComponent(keyword)}&limit=100&after=${afterTs}&sort=desc`,
      { headers: { Accept: 'application/json' }, cache: 'no-store' }
    );

    if (!res.ok) {
      return NextResponse.json({ error: `Arctic Shift error: ${res.status}` }, { status: 500 });
    }

    const json = await res.json();
    const posts: RawPost[] = (json.data ?? []).slice(0, 50);

    const threads: Thread[] = posts.map(p => ({
      id: p.id,
      title: p.title,
      subreddit: p.subreddit,
      score: p.score,
      numComments: p.num_comments,
      createdUtc: p.created_utc,
      url: p.is_self
        ? `https://reddit.com/r/${p.subreddit}/comments/${p.id}`
        : p.url,
      snippet: (p.selftext ?? '').slice(0, 200),
      author: p.author,
    }));

    // Run AI filter if we have product context
    const filteredThreads = productDescription
      ? await aiFilter(keyword, threads, productDescription)
      : threads;

    const removedCount = threads.length - filteredThreads.length;

    // Group by subreddit for activity view
    const bySubreddit: Record<string, Thread[]> = {};
    filteredThreads.forEach(t => {
      if (!bySubreddit[t.subreddit]) bySubreddit[t.subreddit] = [];
      bySubreddit[t.subreddit].push(t);
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
      fetchedAt: new Date().toISOString(),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
