import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getCompany, saveBrief, getNextEditionNumber, DailyBrief, BriefNarrative, BriefThread, MarketPulseItem } from '@/lib/upstash';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

const MIN_SCORE = 10;          // quality threshold: min Reddit upvotes
const MIN_THREADS_PER_NARRATIVE = 1;  // a narrative needs ≥1 supporting thread

// Fallback subreddits used when user hasn't configured any
const DEFAULT_SUBREDDITS = [
  'SaaS', 'startups', 'entrepreneur', 'smallbusiness',
  'marketing', 'technology', 'webdev', 'ProductManagement',
];
const DEFAULT_DESCRIPTION = 'General startup, SaaS, and technology market intelligence.';

// ── Arctic Shift fetch ────────────────────────────────────────────────────────

interface ArcticPost {
  id: string;
  title: string;
  selftext?: string;
  score: number;
  num_comments: number;
  created_utc: number;
  permalink: string;
  subreddit: string;
}

async function fetchSubredditPosts(subreddit: string, hoursBack = 7 * 24): Promise<ArcticPost[]> {
  const after = Math.floor(Date.now() / 1000) - hoursBack * 3600;
  // sort=asc returns oldest posts first — these have had the most time to accumulate upvotes.
  // Arctic Shift no longer supports sort=score; we sort by score ourselves after fetching.
  const url = `https://arctic-shift.photon-reddit.com/api/posts/search?subreddit=${encodeURIComponent(subreddit)}&limit=100&sort=asc&after=${after}`;
  try {
    const res = await fetch(url, { next: { revalidate: 0 } });
    if (!res.ok) return [];
    const data = await res.json() as { data?: ArcticPost[] };
    return (data.data ?? []).filter(p => p.score >= MIN_SCORE);
  } catch {
    return [];
  }
}

// ── Claude narrative synthesis ────────────────────────────────────────────────

interface RawNarrative {
  headline: string;
  type: 'hero' | 'signal' | 'tension' | 'mood';
  synthesis: string;
  implication: string;
  strength: 1 | 2 | 3 | 4 | 5;
  threadIds: string[];      // IDs of supporting threads
  subreddits: string[];
}

interface ClusterResult {
  narratives: RawNarrative[];
  pulse: MarketPulseItem[];
}

async function clusterIntoNarratives(
  posts: ArcticPost[],
  productDescription: string
): Promise<ClusterResult> {
  const threadList = posts.slice(0, 80).map(p => ({
    id: p.id,
    title: p.title,
    subreddit: p.subreddit,
    score: p.score,
    comments: p.num_comments,
    snippet: (p.selftext ?? '').slice(0, 200),
  }));

  const prompt = `You are a senior market intelligence analyst. Your job is to synthesize Reddit discussions into strategic market narratives for founders and operators.

Product context: ${productDescription}

Below are ${threadList.length} Reddit threads collected from the past 48 hours (score ≥ ${MIN_SCORE} upvotes, already quality-filtered). Your task is to:

1. CLUSTER threads into 2–5 distinct market narratives (NOT thread summaries)
2. Each narrative needs ≥ ${MIN_THREADS_PER_NARRATIVE} supporting thread to qualify — use EXACT id values from the threads list above
3. One narrative must be designated "hero" (the dominant story)
4. Other narratives: "signal" (momentum shift), "tension" (market contradiction), or "mood" (founder/operator psychology)
5. Write editorial synthesis — journalistic, compressed, strategic — NOT AI commentary
6. Generate 6–7 market pulse items (metric-style: "Buffer mentions ↑ 41%")

NARRATIVE QUALITY RULES:
- The unit is a MARKET NARRATIVE, not a thread summary
- "Operators switching legacy social tooling" NOT "People complain about Buffer"
- Synthesis should sound like The Economist or Bloomberg Terminal
- Implications must be actionable, editorial, confident

THREADS:
${JSON.stringify(threadList, null, 2)}

Respond with ONLY valid JSON matching this exact schema:
{
  "narratives": [
    {
      "headline": "string (one crisp sentence, no quotes)",
      "type": "hero|signal|tension|mood",
      "synthesis": "string (2-3 paragraphs for hero, 1-2 sentences for others, \\n\\n separated)",
      "implication": "string (one editorial sentence, e.g. 'Governance-first AI tooling may outperform open-ended copilots.')",
      "strength": 1|2|3|4|5,
      "threadIds": ["id1", "id2", ...],
      "subreddits": ["SaaS", "startups", ...]
    }
  ],
  "pulse": [
    { "label": "Buffer mentions", "change": 41 },
    { "label": "AI distrust signals", "change": 63 }
  ]
}`;

  try {
    const msg = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 3000,
      messages: [{ role: 'user', content: prompt }],
    });
    const text = (msg.content[0] as { type: string; text: string }).text;
    const json = text.match(/\{[\s\S]*\}/)?.[0] ?? '{}';
    return JSON.parse(json) as ClusterResult;
  } catch {
    return { narratives: [], pulse: [] };
  }
}

// ── Main handler ──────────────────────────────────────────────────────────────

async function generateBriefForUser(email: string): Promise<DailyBrief | null> {
  const company = await getCompany(email);

  // Use user's subreddits if configured, otherwise fall back to defaults
  const subreddits = (company?.subreddits?.length) ? company.subreddits : DEFAULT_SUBREDDITS;
  const description = company?.description ?? DEFAULT_DESCRIPTION;

  // Fetch from all subreddits in parallel
  const postsBySubreddit = await Promise.all(
    subreddits.map(sub => fetchSubredditPosts(sub))
  );

  // Flatten + deduplicate by id
  const allPosts: ArcticPost[] = [];
  const seen = new Set<string>();
  for (const posts of postsBySubreddit) {
    for (const post of posts) {
      if (!seen.has(post.id)) {
        seen.add(post.id);
        allPosts.push(post);
      }
    }
  }

  if (allPosts.length < 3) return null;

  // Sort by score descending so Claude sees the highest-signal threads first
  allPosts.sort((a, b) => b.score - a.score);

  const { narratives: rawNarratives, pulse } = await clusterIntoNarratives(allPosts, description);

  // Filter: each narrative needs ≥2 valid supporting threads
  const postMap = new Map(allPosts.map(p => [p.id, p]));
  const validNarratives = rawNarratives.filter(n => {
    const validThreads = n.threadIds.filter(id => postMap.has(id));
    return validThreads.length >= MIN_THREADS_PER_NARRATIVE;
  });

  if (validNarratives.length === 0) return null;

  // Build final narratives
  const toThread = (id: string): BriefThread | null => {
    const p = postMap.get(id);
    if (!p) return null;
    return {
      id: p.id,
      title: p.title,
      subreddit: p.subreddit,
      score: p.score,
      numComments: p.num_comments,
      url: `https://reddit.com${p.permalink}`,
      createdUtc: p.created_utc,
    };
  };

  const narratives: BriefNarrative[] = validNarratives.map((n, i) => {
    const threads = n.threadIds.map(toThread).filter(Boolean) as BriefThread[];
    return {
      id: `n${i}`,
      type: n.type,
      headline: n.headline,
      synthesis: n.synthesis,
      implication: n.implication,
      strength: n.strength,
      threads,
      subreddits: [...new Set(threads.map(t => t.subreddit))],
      totalUpvotes: threads.reduce((s, t) => s + t.score, 0),
    };
  });

  // Hero is the one explicitly typed hero, or the highest strength
  const hero = narratives.find(n => n.type === 'hero') ??
               [...narratives].sort((a, b) => b.strength - a.strength)[0];
  const signals = narratives.filter(n => n.id !== hero.id).slice(0, 4);

  const today = new Date().toISOString().slice(0, 10);
  const edition = await getNextEditionNumber(email);

  const brief: DailyBrief = {
    userId: email,
    date: today,
    edition,
    generatedAt: new Date().toISOString(),
    hero,
    signals,
    pulse: (pulse ?? []).slice(0, 8),
    subreddits,
    threadCount: allPosts.length,
    narrativeCount: narratives.length,
  };

  await saveBrief(email, brief);
  return brief;
}

// POST /api/brief/generate — called by cron or manually
export async function POST(req: NextRequest) {
  // Cron path: bearer auth
  const authHeader = req.headers.get('authorization');
  if (authHeader === `Bearer ${process.env.CRON_SECRET}`) {
    const body = await req.json().catch(() => ({})) as { email?: string };
    if (!body.email) return NextResponse.json({ error: 'email required' }, { status: 400 });
    const brief = await generateBriefForUser(body.email);
    return NextResponse.json({ ok: !!brief, briefDate: brief?.date });
  }

  // User path: session auth
  const session = await getSession();
  if (!session?.user?.email) return NextResponse.json({ error: 'Unathorized' }, { status: 401 });
  const brief = await generateBriefForUser(session.user.email);
  if (!brief) return NextResponse.json({ error: 'Not enough signal data in the past 48h. Try again later or add more subreddits in /command.' }, { status: 422 });
  return NextResponse.json({ ok: true, brief });
}
