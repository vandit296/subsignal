import Anthropic from '@anthropic-ai/sdk';
import { ScoredThread } from '@/types';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

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
}

async function fetchRecentPosts(subreddit: string, hoursBack = 48): Promise<RawPost[]> {
  const after = Math.floor(Date.now() / 1000) - hoursBack * 3600;
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

export async function scoreThreadsForProduct(
  subreddit: string,
  productDescription: string,
  goal: string
): Promise<ScoredThread[]> {
  const posts = await fetchRecentPosts(subreddit);
  if (posts.length === 0) return [];

  // Build a compact list for Claude to evaluate
  const postList = posts
    .slice(0, 80)
    .map((p, i) =>
      `[${i}] id:${p.id} | score:${p.score} | comments:${p.num_comments} | "${p.title}"${p.selftext ? ` — ${p.selftext.slice(0, 120)}` : ''}`
    )
    .join('\n');

  const prompt = `You are a Reddit opportunity detector. A founder needs help finding threads where they can genuinely add value.

FOUNDER'S PRODUCT:
"${productDescription}"

FOUNDER'S GOAL:
"${goal || 'Get early users and build brand awareness'}"

RECENT POSTS FROM r/${subreddit} (last 48 hours):
${postList}

Your job: Find threads where this founder could engage helpfully and organically — NOT to spam, but to genuinely help someone who has a problem this product solves.

CRITICAL SCORING RULES:
- HIGH relevance (7-10): Thread author has a specific problem, question, or struggle that this product directly addresses. Low upvotes are fine — early threads are opportunities.
- MEDIUM relevance (4-6): Thread is topically related but the product fit is indirect or the timing isn't perfect.
- LOW relevance (1-3): Tangentially related. Skip these.
- ZERO (0): Not relevant at all. Do not include.

DO NOT score threads highly just because they're popular. A 2-upvote question like "how do I figure out which subreddits to post in?" is a 10/10 match for a subreddit intelligence tool.

Return ONLY a valid JSON array (no markdown). Only include threads with relevanceScore >= 6.
Maximum 8 threads. If fewer than 3 qualify, return what qualifies (can be empty array).

[
  {
    "index": <the [N] index from the post list>,
    "relevanceScore": <6-10>,
    "relevanceReason": "<1 sentence: what specific problem/need in this thread matches the product>",
    "engagementAngle": "<1 sentence: HOW the founder should engage — what to offer or say, without being spammy>"
  }
]

Return ONLY the JSON array. No markdown fences. Empty array [] if nothing qualifies.`;

  let scored: { index: number; relevanceScore: number; relevanceReason: string; engagementAngle: string }[] = [];

  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001', // fast + cheap for batch scoring
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }],
    });

    const raw = (message.content[0] as { type: string; text: string }).text.trim();
    const json = raw.replace(/^```json?\n?/, '').replace(/\n?```$/, '');
    scored = JSON.parse(json);
  } catch {
    return [];
  }

  const now = new Date().toISOString();

  return scored
    .filter(s => s.relevanceScore >= 6 && s.index < posts.length)
    .map(s => {
      const post = posts[s.index];
      return {
        id: post.id,
        subreddit,
        title: post.title,
        url: post.is_self
          ? `https://reddit.com/r/${subreddit}/comments/${post.id}`
          : post.url,
        score: post.score,
        numComments: post.num_comments,
        createdUtc: post.created_utc,
        relevanceScore: s.relevanceScore,
        relevanceReason: s.relevanceReason,
        engagementAngle: s.engagementAngle,
        foundAt: now,
      } as ScoredThread;
    })
    .sort((a, b) => b.relevanceScore - a.relevanceScore);
}
