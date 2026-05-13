import { RedditData, RedditPost, RedditComment, SubredditAbout, SubredditRule } from '@/types';

// Arctic Shift — a free Reddit data archive API that works from any server (no IP blocks)
// Docs: https://github.com/ArthurHeitmann/arctic_shift/tree/master/api
// Base URL: https://arctic-shift.photon-reddit.com
const BASE = 'https://arctic-shift.photon-reddit.com';

async function arcticFetch(path: string) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Accept': 'application/json' },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Arctic Shift fetch failed: ${res.status} ${path}`);
  return res.json();
}

function parsePost(item: Record<string, unknown>): RedditPost {
  const createdUtc = (item.created_utc as number) || 0;
  const date = new Date(createdUtc * 1000);
  return {
    id: (item.id as string) || '',
    title: (item.title as string) || '',
    selftext: ((item.selftext as string) || '').slice(0, 500),
    score: (item.score as number) || 0,
    upvote_ratio: (item.upvote_ratio as number) || 0,
    num_comments: (item.num_comments as number) || 0,
    created_utc: createdUtc,
    author: (item.author as string) || '',
    url: (item.url as string) || '',
    is_self: (item.is_self as boolean) || false,
    link_flair_text: (item.link_flair_text as string | null) || null,
    hour_of_day: date.getUTCHours(),
    day_of_week: date.getUTCDay(), // 0=Sun, 1=Mon...
  };
}

function parseComment(item: Record<string, unknown>): RedditComment | null {
  const body = item.body as string;
  if (!body || body === '[deleted]' || body === '[removed]') return null;
  return {
    id: (item.id as string) || '',
    body: body.slice(0, 300),
    score: (item.score as number) || 0,
    author: (item.author as string) || '',
    created_utc: (item.created_utc as number) || 0,
  };
}

// Map UI period labels to Arctic Shift `after` param values
const PERIOD_TO_AFTER: Record<string, string | null> = {
  '1week':   '1week',
  '1month':  '1month',
  '3months': '3months',
  '1year':   '1year',
  'alltime': null,
};

export async function fetchSubredditData(subreddit: string, period = '1year'): Promise<RedditData> {
  const sub = subreddit.replace(/^r\//, '').trim();
  const enc = encodeURIComponent(sub);

  const afterParam = PERIOD_TO_AFTER[period] ?? '1year';
  const afterSuffix = afterParam ? `&after=${afterParam}` : '';

  const [aboutRaw, topRaw, newRaw, commentsRaw, rulesRaw] = await Promise.all([
    arcticFetch(`/api/subreddits/search?subreddit=${enc}&limit=1`).catch(() => ({ data: [] })),
    // "auto" returns 100–1000 posts depending on server capacity; fall back to limit=100
    arcticFetch(`/api/posts/search?subreddit=${enc}&limit=auto${afterSuffix}&sort=desc`)
      .catch(() => arcticFetch(`/api/posts/search?subreddit=${enc}&limit=100${afterSuffix}&sort=desc`))
      .catch(() => ({ data: [] })),
    arcticFetch(`/api/posts/search?subreddit=${enc}&limit=50${afterSuffix}&sort=desc`).catch(() => ({ data: [] })),
    arcticFetch(`/api/comments/search?subreddit=${enc}&limit=50&sort=desc`).catch(() => ({ data: [] })),
    arcticFetch(`/api/subreddits/rules?subreddits=${enc}`).catch(() => ({ data: {} })),
  ]);

  // Subreddit about
  const subData = (aboutRaw.data as Record<string, unknown>[])?.[0] ?? {};
  const about: SubredditAbout = {
    display_name: (subData.display_name as string) ?? sub,
    title: (subData.title as string) ?? sub,
    subscribers: (subData.subscribers as number) ?? 0,
    active_user_count: 0, // not available in archive data
    public_description: (subData.public_description as string) ?? '',
    description: ((subData.description as string) ?? '').slice(0, 1000),
    created_utc: (subData.created_utc as number) ?? 0,
    over18: (subData.over18 as boolean) ?? false,
  };

  // Rules: response is { data: { subredditName: [...rules] } }
  const rulesData = rulesRaw.data as Record<string, unknown[]>;
  const rulesArray: Record<string, unknown>[] =
    (rulesData?.[sub] ?? rulesData?.[sub.toLowerCase()] ?? []) as Record<string, unknown>[];
  const rules: SubredditRule[] = rulesArray.map(r => ({
    short_name: (r.short_name as string) ?? '',
    description: ((r.description as string) ?? '').slice(0, 300),
    kind: (r.kind as string) ?? '',
  }));

  // Posts — sort by score descending after fetching
  const topPosts: RedditPost[] = ((topRaw.data as Record<string, unknown>[]) ?? [])
    .map(parsePost)
    .sort((a: RedditPost, b: RedditPost) => b.score - a.score);

  const newPosts: RedditPost[] = ((newRaw.data as Record<string, unknown>[]) ?? [])
    .map(parsePost);

  const topComments: RedditComment[] = ((commentsRaw.data as Record<string, unknown>[]) ?? [])
    .map(parseComment)
    .filter(Boolean)
    .slice(0, 30) as RedditComment[];

  return { about, topPosts, newPosts, topComments, rules };
}
