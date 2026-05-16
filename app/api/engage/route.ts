import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getCompany } from '@/lib/upstash';
import { scoreThreadsForProduct } from '@/lib/thread-scorer';
import { ScoredThread } from '@/types';

export async function GET() {
  // Read from the V2 CompanyProfile (saved by Command page)
  const session = await getSession();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'no_config', threads: [] });
  }

  const company = await getCompany(session.user.email).catch(() => null);

  if (!company?.description) {
    return NextResponse.json({ error: 'no_config', threads: [] });
  }

  if (!company.subreddits?.length) {
    return NextResponse.json({ error: 'no_subreddits', threads: [] });
  }

  // Score threads across all monitored subreddits in parallel
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

  return NextResponse.json({
    threads: deduped,
    subreddits: company.subreddits,
    productDescription: company.description,
    goal: company.goal,
    generatedAt: new Date().toISOString(),
  });
}
