import { RedditData, RedditPost, RedditComment, SubredditAbout, SubredditRule } from '@/types';

const REDDIT_BASE = 'https://www.reddit.com';

// This runs in the browser — no User-Agent header needed (browser sets its own)
// Browser requests are not blocked by Reddit's datacenter IP filters
async function redditFetch(url: string) {
  const res = await fetch(url, {
    headers: {
      'Accept': 'application/json',
    },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Reddit fetch failed: ${res.status} ${url}`);
  return res.json();
}

function parsePost(child: Record<string, unknown>): RedditPost {
  const d = child.data as Record<string, unknown>;
  const createdUtc = d.created_utc as number;
  const date = new Date(createdUtc * 1000);
  return {
    id: d.id as string,
    title: d.title as string,
    selftext: ((d.selftext as string) || '').slice(0, 500),
    score: d.score as number,
    upvote_ratio: d.upvote_ratio as number,
    num_comments: d.num_comments as number,
    created_utc: createdUtc,
    author: d.author as string,
    url: d.url as string,
    is_self: d.is_self as boolean,
    link_flair_text: d.link_flair_text as string | null,
    hour_of_day: date.getUTCHours(),
    day_of_week: date.getUTCDay(), // 0=Sun, 1=Mon...
  };
}

function parseComment(child: Record<string, unknown>): RedditComment | null {
  const d = child.data as Record<string, unknown>;
  if (!d.body || d.body === '[deleted]' || d.body === '[removed]') return null;
  return {
    id: d.id as string,
    body: ((d.body as string) || '').slice(0, 300),
    score: d.score as number,
    author: d.author as string,
    created_utc: d.created_utc as number,
  };
}

export async function fetchSubredditData(subreddit: string): Promise<RedditData> {
  const sub = encodeURIComponent(subreddit.replace(/^r\//, ''));

  const [aboutRaw, topRaw, newRaw, rulesRaw, commentsRaw] = await Promise.all([
    redditFetch(`${REDDIT_BASE}/r/${sub}/about.json`),
    redditFetch(`${REDDIT_BASE}/r/${sub}/top.json?limit=100&t=year`),
    redditFetch(`${REDDIT_BASE}/r/${sub}/new.json?limit=50`),
    redditFetch(`${REDDIT_BASE}/r/${sub}/about/rules.json`).catch(() => ({ rules: [] })),
    redditFetch(`${REDDIT_BASE}/r/${sub}/comments.json?limit=50`).catch(() => ({ data: { children: [] } })),
  ]);

  const about: SubredditAbout = {
    display_name: aboutRaw.data.display_name,
    title: aboutRaw.data.title,
    subscribers: aboutRaw.data.subscribers,
    active_user_count: aboutRaw.data.active_user_count ?? 0,
    public_description: aboutRaw.data.public_description ?? '',
    description: (aboutRaw.data.description ?? '').slice(0, 1000),
    created_utc: aboutRaw.data.created_utc,
    over18: aboutRaw.data.over18,
  };

  const rules: SubredditRule[] = (rulesRaw.rules ?? []).map((r: Record<string, unknown>) => ({
    short_name: r.short_name,
    description: ((r.description as string) ?? '').slice(0, 300),
    kind: r.kind,
  }));

  const topPosts: RedditPost[] = (topRaw.data?.children ?? [])
    .map(parsePost)
    .sort((a: RedditPost, b: RedditPost) => b.score - a.score);

  const newPosts: RedditPost[] = (newRaw.data?.children ?? []).map(parsePost);

  const topComments: RedditComment[] = (commentsRaw.data?.children ?? [])
    .map(parseComment)
    .filter(Boolean)
    .slice(0, 30) as RedditComment[];

  return { about, topPosts, newPosts, topComments, rules };
}
