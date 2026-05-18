import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getCompany } from '@/lib/upstash';
import { scoreThreadsForProduct } from '@/lib/thread-scorer';
import { ScoredThread } from '@/types';

const FEED_CACHE_TTL = 60 * 60 * 2; // 2 hours

export async function GET(req: NextRequest) {
  const bust = new URL(req.url).searchParams.get('bust') === '1';

  // Read from the V2 CompanyProfile (saved by Command page)
  const session = await getSession();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'no_config', threads: [] });
  }

  const email = session.user.email;
  const company = await getCompany(email).catch(() => null);

  if (!company?.description) {
    return NextResponse.json({ error: 'no_config', threads: [] });
  }

  if (!company.subreddits?.length) {
    return NextResponse.json({ error: 'no_subreddits', threads: [] });
  }

  // ── Cache check (skip on ?bust=1) ────────────────────────────────────────
  const cacheKey = `subsignal:feed:${email.toLowerCase()}`;
  if (!bust) {
    try {
      const { getCachedFeed } = await import('@/lib/upstash');
      const cached = await getCachedFeed(cacheKey);
      if (cached) return NextResponse.json({ ...cached, cached: true });
    } catch { /* non-fatal */ }
  }

  // ── Live scoring ──────────────────────────────────────────────────────────
  const results = await Promise.allSettled(
    company.subreddits.map(sub =>
      scoreThreadsForProduct(sub, company.description, company.goal, company.idealUser)
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
    subreddits: company.subreddits,
    productDescription: company.description,
    goal: company.goal,
    generatedAt: new Date().toISOString(),
  };

  // Store in cache (non-fatal)
  try {
    const { saveFeedCache } = await import('@/lib/upstash');
    await saveFeedCache(cacheKey, payload, FEED_CACHE_TTL);
  } catch { /* non-fatal */ }

  return NextResponse.json(payload);
}
