import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getCompany } from '@/lib/upstash';
import { scoreThreadsForProduct } from '@/lib/thread-scorer';
import { ScoredThread } from '@/types';

const FEED_CACHE_TTL = 60 * 60 * 2; // 2 hours

// ── Anonymous default config ──────────────────────────────────────────────────
// Shown to users who haven't signed in. Scores a generic founder persona
// across the most popular founder-adjacent subreddits.
const ANON_CONFIG = {
  subreddits: ['SaaS', 'startups', 'entrepreneur', 'indiehackers'],
  description: 'An early-stage B2B SaaS product helping founders and operators automate workflows and move faster.',
  goal: 'Find early adopters, get feedback, and build brand awareness among founders and indie hackers.',
  idealUser: 'Early-stage founders, indie hackers, and startup operators who are actively building and looking for tools to grow faster.',
  cacheKey: 'subsignal:feed:__anon__',
};

export async function GET(req: NextRequest) {
  const bust = new URL(req.url).searchParams.get('bust') === '1';

  // ── Determine config: authenticated user vs anonymous ─────────────────────
  const session = await getSession();
  const isAnon = !session?.user?.email;

  let subreddits: string[];
  let description: string;
  let goal: string | undefined;
  let idealUser: string | undefined;
  let cacheKey: string;

  if (isAnon) {
    // Anonymous user — serve default discovery feed
    ({ subreddits, description, goal, idealUser, cacheKey } = ANON_CONFIG);
  } else {
    // Authenticated user — load their configured profile
    const email = session!.user!.email!;
    const company = await getCompany(email).catch(() => null);

    if (!company?.description) {
      return NextResponse.json({ error: 'no_config', threads: [] });
    }

    if (!company.subreddits?.length) {
      return NextResponse.json({ error: 'no_subreddits', threads: [] });
    }

    subreddits = company.subreddits;
    description = company.description;
    goal = company.goal;
    idealUser = company.idealUser;
    cacheKey = `subsignal:feed:${email.toLowerCase()}`;
  }

  // ── Cache check (skip on ?bust=1) ────────────────────────────────────────
  if (!bust) {
    try {
      const { getCachedFeed } = await import('@/lib/upstash');
      const cached = await getCachedFeed(cacheKey);
      if (cached) return NextResponse.json({ ...cached, cached: true, isAnon });
    } catch { /* non-fatal */ }
  }

  // ── Live scoring ──────────────────────────────────────────────────────────
  const results = await Promise.allSettled(
    subreddits.map(sub =>
      scoreThreadsForProduct(sub, description, goal ?? '', idealUser)
    )
  );

  const allThreads: ScoredThread[] = results
    .filter((r): r is PromiseFulfilledResult<ScoredThread[]> => r.status === 'fulfilled')
    .flatMap(r => r.value);

  // Sort by relevance score desc, deduplicate by id
  const seen = new Set<string>();
  const deduped = allThreads
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .filter(t => {
      if (seen.has(t.id)) return false;
      seen.add(t.id);
      return true;
    });

  const payload = {
    threads: deduped,
    subreddits,
    productDescription: description,
    goal,
    generatedAt: new Date().toISOString(),
    isAnon,
  };

  // Store in cache (non-fatal)
  try {
    const { saveFeedCache } = await import('@/lib/upstash');
    await saveFeedCache(cacheKey, payload, FEED_CACHE_TTL);
  } catch { /* non-fatal */ }

  return NextResponse.json(payload);
}
