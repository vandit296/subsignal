import Anthropic from '@anthropic-ai/sdk';
import { ScoredThread, ThreadCategory, SignalConfidence, RiskLevel, ThreadPriority } from '@/types';
import { getRelevantThreads, saveRelevantThreads } from '@/lib/upstash';

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

  // ── Incremental scoring: skip posts already in cache ──────────────────────
  const cachedThreads = await getRelevantThreads(subreddit);
  const cachedIds = new Set(cachedThreads.map(t => t.id));
  const newPosts = posts.slice(0, 80).filter(p => !cachedIds.has(p.id));

  if (newPosts.length === 0) {
    console.log(`[thread-scorer] r/${subreddit}: all posts cached, returning ${cachedThreads.length} threads`);
    return cachedThreads;
  }

  console.log(`[thread-scorer] r/${subreddit}: ${newPosts.length} new posts to score (${cachedIds.size} cached)`);

  const postList = newPosts
    .map((p, i) =>
      `[${i}] id:${p.id} | upvotes:${p.score} | comments:${p.num_comments} | "${p.title}"${p.selftext ? ` — ${p.selftext.slice(0, 200)}` : ''}`
    )
    .join('\n');

  const prompt = `You are a GTM intelligence analyst helping a founder identify strategic Reddit engagement opportunities. You think like a seasoned operator who understands timing, psychology, and leverage.

PRODUCT:
"${productDescription}"

IDEAL CUSTOMER PROFILE:
"${idealUser || 'Infer from product description'}"

FOUNDER'S GOAL:
"${goal || 'Get early users and build brand awareness'}"

POSTS FROM r/${subreddit} (last 48h):
${postList}

---

For each post, assess strategic value using two lenses:

LENS 1 — STRATEGIC SCORE (1-10):
Judge by asymmetric opportunity, not popularity. A 1-upvote question from an exact ICP match is a 10.

9-10: Can't miss — ICP is present AND in pain/switching/buying mode, or someone is literally asking about solutions in this space
7-8: Strong opportunity — ICP is present or thread is directly in the problem space
6: Marginal — loosely relevant, low-effort entry possible
<6: Skip

LENS 2 — SIGNAL TYPE (assign exactly one):
"switching_intent" — Person evaluating moving away from a competitor or current solution
"buying_exploration" — Actively researching tools/solutions in this category
"founder_vulnerability" — Founder/operator struggling with a problem this product addresses
"workflow_frustration" — Team-level operational pain around problems this product solves
"competitive_intel" — Discussion about competitor tools, alternatives, or the landscape
"pain_signal" — Clear pain point around a problem this product solves (but not actively buying)
"churn_risk" — Current user of a competitor expressing dissatisfaction
"ideal_user" — ICP is present but signal type doesn't fit above categories
"industry" — Relevant trend or discussion in the broader space
"interesting" — Loosely related, worth watching

---

For threads scoring 6+, provide full intelligence assessment:

SIGNAL CONFIDENCE (pick one):
- "conviction" — Multiple strong indicators, high certainty
- "strong_signal" — Clear, confident signal
- "emerging" — Pattern forming, solid evidence
- "early_pattern" — Very early but directionally interesting
- "momentum_building" — Signal gaining strength
- "speculative" — Possible but uncertain

RISK LEVEL (pick one):
- "low" — Safe to engage directly
- "medium" — Requires care in sequencing
- "high" — Significant risk of negative reaction
- "severe" — Do not engage or engage with extreme caution

PRIORITY (pick one — operational urgency for the founder):
- "respond_now" — Act within hours. Thread is active, ICP is present, window is closing.
- "high_leverage" — High value, respond within 24h. Strong signal, good timing.
- "observe_only" — Monitor without engaging yet. Not ready for entry.
- "long_term" — Relationship-building opportunity, not immediate conversion play.
- "educational" — Add value through insight or teaching only, no product pitch.
- "wait" — Thread not mature enough. Check back later.
- "avoid" — Risk outweighs opportunity. Engagement likely to backfire.

ENGAGEMENT STRATEGY (structured operator guidance — be specific and tactical):
- "strategyMove": One clear first action. What exactly to do as the opening move.
- "strategyAngle": The narrative frame. How to position this engagement — what story to tell, what identity to come from.
- "strategyAvoid": Specific social pitfalls in this thread. What would trigger a negative reaction.
- "strategyPositioning": How and when to naturally introduce the product, if at all. Be honest if the answer is "don't".

---

Return ONLY a valid JSON array. Include threads with relevanceScore >= 6. Max 10 threads.

[
  {
    "index": <N>,
    "relevanceScore": <6-10>,
    "category": "<signal type from list above>",
    "signalConfidence": "<one of the confidence values>",
    "riskLevel": "<low|medium|high|severe>",
    "priority": "<respond_now|high_leverage|observe_only|long_term|educational|wait|avoid>",
    "relevanceReason": "<2-3 sentences: what specifically makes this moment strategically significant>",
    "personSignal": "<2 sentences: psychological read on the poster — who they are, how they think, what they respond to>",
    "conversationOpenness": "<1-2 sentences: emotional receptivity of this thread — are people open, defensive, collaborative?>",
    "trajectory": "<1-2 sentences: thread momentum — age, velocity, whether the narrative is still forming or locked>",
    "strategyMove": "<one clear first action — specific and tactical>",
    "strategyAngle": "<narrative framing — what identity and story to come from>",
    "strategyAvoid": "<specific social pitfalls to avoid in this thread>",
    "strategyPositioning": "<how/when to introduce the product, or explicitly say not to>",
    "engagementRisk": "<1-2 sentences: specific risk to watch for in this thread>"
  }
]

No markdown. Empty array [] if nothing qualifies.`;

  let scored: {
    index: number;
    relevanceScore: number;
    category: ThreadCategory;
    signalConfidence?: SignalConfidence;
    riskLevel?: RiskLevel;
    priority?: ThreadPriority;
    relevanceReason: string;
    personSignal?: string;
    conversationOpenness?: string;
    trajectory?: string;
    strategyMove?: string;
    strategyAngle?: string;
    strategyAvoid?: string;
    strategyPositioning?: string;
    engagementRisk?: string;
  }[] = [];

  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }],
    });

    const raw = (message.content[0] as { type: string; text: string }).text.trim();
    const json = raw.replace(/^```json?\n?/, '').replace(/\n?```$/, '');
    scored = JSON.parse(json);
  } catch {
    return cachedThreads;
  }

  const now = new Date().toISOString();

  const validCategories = new Set<ThreadCategory>([
    'ideal_user', 'competition', 'industry', 'interesting',
    'switching_intent', 'buying_exploration', 'founder_vulnerability',
    'workflow_frustration', 'competitive_intel', 'pain_signal', 'churn_risk',
  ]);

  const validConfidence = new Set<SignalConfidence>([
    'conviction', 'strong_signal', 'emerging',
    'speculative', 'early_pattern', 'momentum_building',
  ]);

  const validRisk = new Set<RiskLevel>(['low', 'medium', 'high', 'severe']);

  const validPriority = new Set<ThreadPriority>([
    'respond_now', 'high_leverage', 'observe_only',
    'long_term', 'educational', 'wait', 'avoid',
  ]);

  const freshlyScored: ScoredThread[] = scored
    .filter(s => s.relevanceScore >= 6 && s.index < newPosts.length)
    .map(s => {
      const post = newPosts[s.index];
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
        category: validCategories.has(s.category) ? s.category : 'interesting',
        signalConfidence: s.signalConfidence && validConfidence.has(s.signalConfidence)
          ? s.signalConfidence : undefined,
        riskLevel: s.riskLevel && validRisk.has(s.riskLevel) ? s.riskLevel : undefined,
        priority: s.priority && validPriority.has(s.priority) ? s.priority : undefined,
        personSignal: s.personSignal,
        conversationOpenness: s.conversationOpenness,
        trajectory: s.trajectory,
        strategyMove: s.strategyMove,
        strategyAngle: s.strategyAngle,
        strategyAvoid: s.strategyAvoid,
        strategyPositioning: s.strategyPositioning,
        engagementRisk: s.engagementRisk,
        foundAt: now,
      } as ScoredThread;
    });

  // Merge fresh + cached, dedupe by id, sort by strategic score
  const mergedMap = new Map<string, ScoredThread>();
  for (const t of cachedThreads) mergedMap.set(t.id, t);
  for (const t of freshlyScored) mergedMap.set(t.id, t);

  const merged = Array.from(mergedMap.values())
    .sort((a, b) => b.relevanceScore - a.relevanceScore);

  await saveRelevantThreads(subreddit, merged);
  return merged;
}
