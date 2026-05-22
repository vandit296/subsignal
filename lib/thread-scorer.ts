import Anthropic from '@anthropic-ai/sdk';
import { ScoredThread, ThreadCategory } from '@/types';

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
  goal: string,
  idealUser?: string
): Promise<ScoredThread[]> {
  const posts = await fetchRecentPosts(subreddit);
  if (posts.length === 0) return [];

  const postList = posts
    .slice(0, 80)
    .map((p, i) =>
      `[${i}] id:${p.id} | upvotes:${p.score} | comments:${p.num_comments} | "${p.title}"${p.selftext ? ` — ${p.selftext.slice(0, 150)}` : ''}`
    )
    .join('\n');

  const prompt = `You are a Reddit opportunity detector. A founder needs help finding threads worth engaging in — either to reach their ideal user, monitor competition, or stay informed.

FOUNDER'S PRODUCT:
"${productDescription}"

IDEAL USER / ICP:
"${idealUser || 'Not specified — infer from product description'}"

GOAL ON REDDIT:
"${goal || 'Get early users and build brand awareness'}"

RECENT POSTS FROM r/${subreddit} (last 48 hours):
${postList}

---

STEP 1 — QUALITY SCORING (primary signal):
Score every thread on how genuinely valuable it is for THIS founder to engage with. This is the most important step.

SCORING RULES:
- 9-10: Can't miss. Either (a) the ideal user is clearly present AND struggling with something the product solves, OR (b) a competitor/alternative tool is being discussed and the founder can position, OR (c) someone is literally asking "what tool should I use for [X that this product does]?"
- 7-8: Good opportunity. The ideal user is present (even on a different topic), OR the thread is squarely in the product's space with real engagement potential.
- 6: Marginal but worth including. Loosely relevant, low-effort engagement possible.
- Below 6: Skip entirely.

CRITICAL: Do NOT score high just because a thread is popular or has many upvotes. A 1-upvote question that exactly matches the product/ICP is a 10. A 500-upvote general discussion that barely connects is a 5.

STEP 2 — CATEGORIZATION (secondary signal):
After scoring, assign one category per thread:

"ideal_user": The PERSON posting matches the ICP profile — regardless of topic. A founder talking about co-founder conflict, fundraising, burnout, or hiring is still your ideal user. Ask: "Is my target person present?" not "Is this topic about my product?"

"competition": ANY mention of tools, approaches, or alternatives in the same problem space. Includes: direct competitors by name, "what tool do you use for X?" where X is what your product does, people comparing tools, workarounds to problems your product solves, social listening / monitoring / analytics tools. Err broadly — if there's any problem-space overlap, it's competition.

"industry": Trends, news, or discussions about the broader space the product operates in. The person may not be the ideal user, but the topic is relevant.

"interesting": Loosely related, doesn't fit above categories but worth reading.

STEP 3 — ENGAGEMENT ANGLE (goal-aware):
Write a concrete, specific one-sentence engagement suggestion:
- ideal_user thread about product problem → naturally introduce the product
- ideal_user thread about unrelated topic (fundraising, conflict, etc.) → engage genuinely on THEIR actual topic, build credibility, do NOT pitch
- competition thread → position or mention the product directly
- industry thread → share an insight or perspective
- "Get early users" → prioritize direct, natural product mentions where appropriate
- "Validate idea" → ask questions, learn
- "Build brand awareness" → add value, no pitch

---

Return ONLY a valid JSON array. Include threads with relevanceScore >= 6. Max 10 threads.

[
  {
    "index": <N>,
    "relevanceScore": <6-10>,
    "category": "ideal_user" | "competition" | "industry" | "interesting",
    "relevanceReason": "<1 sentence: what specifically makes this thread valuable>",
    "engagementAngle": "<1 sentence: exactly what to do/say>"
  }
]

No markdown. Empty array [] if nothing qualifies.`;

  let scored: {
    index: number;
    relevanceScore: number;
    category: ThreadCategory;
    relevanceReason: string;
    engagementAngle: string;
  }[] = [];

  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001', // Haiku — cost-efficient, runs on cron
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    });

    const raw = (message.content[0] as { type: string; text: string }).text.trim();
    const json = raw.replace(/^```json?\n?/, '').replace(/\n?```$/, '');
    scored = JSON.parse(json);
  } catch {
    return [];
  }

  const now = new Date().toISOString();
  const validCategories = new Set<ThreadCategory>(['ideal_user', 'competition', 'industry', 'interesting']);

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
        category: validCategories.has(s.category) ? s.category : 'interesting',
        foundAt: now,
      } as ScoredThread;
    })
    .sort((a, b) => b.relevanceScore - a.relevanceScore);
}
