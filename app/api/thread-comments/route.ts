// Thread Comments — fetches post content via Exa (reliable from Vercel)
// Comments are not available without Reddit API access, so we show the post
// body and a clear link to Reddit for the full discussion.
// GET /api/thread-comments?url=<reddit_thread_url>
import { NextRequest, NextResponse } from 'next/server';

export interface FlatComment {
  id: string;
  author: string;
  body: string;
  score: number;
  createdUtc: number;
  depth: number;
}

function extractSubreddit(url: string): string {
  return url.match(/\/r\/([^/?#]+)/i)?.[1] ?? '';
}

// ── Exa contents (primary) ────────────────────────────────────────────────────
// Exa can fetch the crawled text of any Reddit thread it has indexed.
// Returns post body; Reddit comments are not available without Reddit API.

async function fetchViaExa(url: string): Promise<{
  post: Record<string, unknown>;
  comments: FlatComment[];
} | null> {
  const apiKey = process.env.EXA_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch('https://api.exa.ai/contents', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify({
        ids: [url],
        text: { maxCharacters: 3000 },
      }),
      signal: AbortSignal.timeout(8_000),
    });

    if (!res.ok) return null;

    const data = await res.json() as {
      results?: Array<{
        title?: string;
        text?: string;
        publishedDate?: string;
        author?: string;
        url?: string;
      }>;
    };

    const item = data.results?.[0];
    if (!item) return null;

    return {
      post: {
        title:       item.title ?? '',
        body:        item.text ?? '',
        author:      item.author ?? '',
        score:       0,
        numComments: 0,
        createdUtc:  item.publishedDate
          ? Math.floor(new Date(item.publishedDate).getTime() / 1000)
          : Math.floor(Date.now() / 1000),
        subreddit:   extractSubreddit(url),
        permalink:   url,
      },
      comments: [],
    };
  } catch {
    return null;
  }
}

// ── Reddit JSON (fallback — works from local dev, may 403 on Vercel) ──────────

interface RawComment {
  id?: string;
  author?: string;
  body?: string;
  score?: number;
  created_utc?: number;
  replies?: { data?: { children?: RawCommentChild[] } };
}
interface RawCommentChild { kind: string; data: RawComment; }

function flattenReddit(children: RawCommentChild[], depth = 0): FlatComment[] {
  const out: FlatComment[] = [];
  for (const child of children) {
    if (child.kind !== 't1' || !child.data) continue;
    const d = child.data;
    out.push({
      id: d.id ?? '',
      author: d.author ?? '[deleted]',
      body: d.body ?? '',
      score: d.score ?? 0,
      createdUtc: d.created_utc ?? 0,
      depth,
    });
    const replies = d.replies?.data?.children;
    if (replies?.length) out.push(...flattenReddit(replies, depth + 1));
  }
  return out;
}

async function fetchViaReddit(url: string): Promise<{
  post: Record<string, unknown>;
  comments: FlatComment[];
} | null> {
  const postId    = url.match(/\/comments\/([a-z0-9]+)/i)?.[1];
  const subreddit = extractSubreddit(url);
  if (!postId || !subreddit) return null;

  const candidates = [
    `https://api.reddit.com/r/${subreddit}/comments/${postId}.json?limit=100&sort=top&raw_json=1`,
    `https://old.reddit.com/r/${subreddit}/comments/${postId}.json?limit=100&sort=top&raw_json=1`,
  ];

  for (const jsonUrl of candidates) {
    try {
      const res = await fetch(jsonUrl, {
        headers: {
          'User-Agent': 'SubSignal/1.0 (thread reader)',
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(6_000),
      });
      if (!res.ok) continue;

      const data = await res.json() as [
        { data: { children: [{ data: Record<string, unknown> }] } },
        { data: { children: RawCommentChild[] } },
      ];

      const post = data[0]?.data?.children?.[0]?.data ?? {};
      const rawComments = data[1]?.data?.children ?? [];
      return { post, comments: flattenReddit(rawComments) };
    } catch {
      continue;
    }
  }
  return null;
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const url = req.nextUrl.searchParams.get('url');
    if (!url) return NextResponse.json({ error: 'url required' }, { status: 400 });

    // 1. Exa — works reliably from Vercel, gives post body
    const exa = await fetchViaExa(url);
    if (exa) {
      const { post, comments } = exa;
      return NextResponse.json({
        post: {
          title:       post.title       ?? '',
          body:        post.body        ?? '',
          author:      post.author      ?? '',
          score:       post.score       ?? 0,
          numComments: post.numComments ?? 0,
          createdUtc:  post.createdUtc  ?? 0,
          subreddit:   post.subreddit   ?? '',
          permalink:   post.permalink   ?? url,
        },
        comments,
        source: 'exa',
        commentsNote: 'Full comments available on Reddit',
      });
    }

    // 2. Reddit JSON — works in dev, may 403 on Vercel
    const reddit = await fetchViaReddit(url);
    if (reddit) {
      const { post, comments } = reddit;
      return NextResponse.json({
        post: {
          title:       post.title       ?? '',
          body:        post.selftext    ?? '',
          author:      post.author      ?? '',
          score:       post.score       ?? 0,
          numComments: post.num_comments ?? 0,
          createdUtc:  post.created_utc  ?? 0,
          subreddit:   post.subreddit   ?? '',
          permalink:   post.permalink
            ? `https://reddit.com${post.permalink}`
            : url,
        },
        comments,
        source: 'reddit',
      });
    }

    return NextResponse.json({ error: 'Could not load thread' }, { status: 502 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[thread-comments]', msg);
    // Always return JSON — never let Next.js return an HTML error page
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
