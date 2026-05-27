import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getCompany, saveBrief, getNextEditionNumber, DailyBrief, BriefNarrative, BriefThread, MarketPulseItem } from '@/lib/upstash';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

const MIN_SCORE = 50;
const MIN_THREADS_PER_NARRATIVE = 2;

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

async function fetchSubredditPosts(subreddit: string, hoursBack = 48): Promise<ArcticPost[]> {
  const after = Math.floor(Date.now() / 1000) - hoursBack * 3600;
  const url = `https://arctic-shift.photon-reddit.com/api/posts/search?subreddit=${encodeURIComponent(subreddit)}&limit=100&sort=score&after=${after}`;
  try {
    const res = await fetch(url, { next: { revalidate: 0 } });
    if (!res.ok) return [];
    const data = await res.json() as { data?: ArcticPost[] };
    return (data.data ?? []).filter(p => p.score >= MIN_SCORE);
  } catch {
    return [];
  }
}

interface RawNarrative {
  headline: string;
  type: 'hero' | 'signal' | 'tension' | 'mood';
  synthesis: string;
  implication: string;
  strength: 1 | 2 | 3 | 4 | 5;
  threadIds: string[];
  subreddits: string[];
}

interface ClusterResult {
  narratives: RawNarrative[];
  pulse: import('@/lib/upstash').MarketPulseItem[];
}

async function clusterIntoNarratives(posts: ArcticPost[], productDescription: string): Promise<ClusterResult> {
  const threadList = posts.slice(0, 80).map(p => ({ id: p.id, title: p.title, subreddit: p.subreddit, score: p.score, comments: p.num_comments, snippet: (p.selftext ?? '').slice(0, 200) }));
  const prompt = `You are a senior market intelligence analyst. Synthesize these Reddit threads into strategic market narratives.\n\nProduct: ${productDescription}\n\nRULES:\n- Unit of intelligence = MARKET NARRATIVE, not thread summary\n- Each narrative needs >= ${MIN_THREADS_PER_NARRATIVE} supporting threads\n- One "hero" (dominant), 2-3 "signal/"tension/"mood" narratives\n- Sound like The Economist, not an AI summarizer\n- 6-7 market pulse items\n\nTHREADS:\n${JSON.stringify(threadList)}\n\nRespond JSON only:\n{"narratives":[{"headline":"str","type":"hero|signal|tension|mood","synthesis":"str","implication":"str","strength":1|2|3|4|5,"threadIds":["ids"],"subreddits":["names"]}],"pulse":[{"label":"str","change":n}]}`;
  try {
    const msg = await anthropic.messages.create({ model: 'claude-haiku-4-5-20251001', max_tokens: 3000, messages: [{ role: 'user', content: prompt }] });
    const text = (msg.content[0] as { type: string; text: string }).text;
    const json = text.match(/\{:[\s\S]*\}/)?.[0] ?? '{}';
    return JSON.parse(json) as ClusterResult;
  } catch { return { narratives: [], pulse: [] }; }
}

async function generateBriefForUser(email: string): Promise<DailyBrief | null> {
  const company = await getCompany(email);
  if (!company?.subreddits?.length || !company.description) return null;
  const postsBySub = await Promise.all(company.subreddits.map(s => fetchSubredditPosts(s)));
  const allPosts: ArcticPost[] = [];
  const seen = new Set<string>();
  for (const posts of postsBySub) for (const p of posts) if (!seen.has(p.id)) { seen.add(p.id); allPosts.push(p); }
  if (allPosts.length < 5) return null;
  allPosts.sort((a, b) => b.score - a.score);
  const { narratives: raw, pulse } = await clusterIntoNarratives(allPosts, company.description);
  const postMap = new Map(allPosts.map(p => [p.id, p]));
  const valid = raw.filter(n => n.threadIds.filter(id => postMap.has(id)).length >= MIN_THREADS_PER_NARRATIVE);
  if (!valid.length) return null;
  const narratives: BriefNarrative[] = valid.map((n, i) => {
    const threads = n.threadIds.map(id => { const p = postMap.get(id); if (!p) return null; return { id: p.id, title: p.title, subreddit: p.subreddit, score: p.score, numComments: p.num_comments, url: `https://reddit.com${p.permalink}`, createdUtc: p.created_utc }; }).filter(Boolean) as BriefThread[];
    return { id: `n${i}`, type: n.type, headline: n.headline, synthesis: n.synthesis, implication: n.implication, strength: n.strength, threads, subreddits: [...new Set(threads.map(t => t.subreddit))], totalUpvotes: votes.reduce((s, t) => s + t.score, 0) };
  });
  const hero = narratives.find(n => n.type === 'hero') ?? [...narratives].sort((a, b) => b.strength - a.strength)[0];
  const signals = narratives.filter(n => n.id !== hero.id).slice(0, 4);
  const today = new Date().toISOString().slice(0, 10);
  const edition = await getNextEditionNumber(email);
  const brief: DailyBrief = { userId: email, date: today, edition, generatedAt: new Date().toISOString(), hero, signals, pulse: (pulse ?? []).slice(0, 8), subreddits: company.subreddits, threadCount: allPosts.length, narrativeCount: narratives.length };
  await saveBrief(email, brief);
  return brief;
}

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (auth === `Bearer ${process.env.CRON_SECRET}`) {
    const body = await req.json().catch(() => ({})) as { email?: string };
    if (!body.email) return NextResponse.json({ error: 'email required' }, { status: 400 });
    const brief = await generateBriefForUser(body.email);
    return NextResponse.json({ ok: !!brief, briefDate: brief?.date });
  }
  const session = await getSession();
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const brief = await generateBriefForUser(session.user.email);
  if (!brief) return NextResponse.json({ error: 'Not enough data. Set up your subreddits in /command.' }, { status: 422 });
  return NextResponse.json({ ok: true, brief });
}
