import { NextRequest, NextResponse } from 'next/server';

const BASE = 'https://arctic-shift.photon-reddit.com';

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

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const keyword = searchParams.get('keyword')?.trim();
  const period = searchParams.get('period') ?? '1week'; // 1day, 1week, 1month

  if (!keyword) {
    return NextResponse.json({ error: 'keyword required' }, { status: 400 });
  }

  const periodSeconds: Record<string, number> = {
    '1day':   86400,
    '1week':  86400 * 7,
    '1month': 86400 * 30,
  };
  const afterTs = Math.floor(Date.now() / 1000) - (periodSeconds[period] ?? 86400 * 7);

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

    const threads = posts.map(p => ({
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

    // Group by subreddit for activity view
    const bySubreddit: Record<string, typeof threads> = {};
    threads.forEach(t => {
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
      totalThreads: threads.length,
      threads,
      subredditActivity,
      fetchedAt: new Date().toISOString(),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
