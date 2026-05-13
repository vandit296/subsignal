import { NextResponse } from 'next/server';
import { getAlertConfig } from '@/lib/upstash';
import { scoreThreadsForProduct } from '@/lib/thread-scorer';
import { ScoredThread } from '@/types';

export async function GET() {
  const alertConfig = await getAlertConfig().catch(() => null);

  if (!alertConfig?.productDescription) {
    return NextResponse.json({ error: 'no_config', threads: [] });
  }

  if (!alertConfig.subreddits?.length) {
    return NextResponse.json({ error: 'no_subreddits', threads: [] });
  }

  // Score threads across all monitored subreddits in parallel
  const results = await Promise.allSettled(
    alertConfig.subreddits.map(sub =>
      scoreThreadsForProduct(sub, alertConfig.productDescription, alertConfig.goal)
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
    subreddits: alertConfig.subreddits,
    productDescription: alertConfig.productDescription,
    goal: alertConfig.goal,
    generatedAt: new Date().toISOString(),
  });
}
