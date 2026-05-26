import { NextRequest, NextResponse } from 'next/server';
import { getAlertConfig, getRelevantThreads, saveRelevantThreads, clearRelevantThreads } from '@/lib/upstash';
import { scoreThreadsForProduct } from '@/lib/thread-scorer';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const subreddit = searchParams.get('subreddit')?.replace(/^r\//, '').trim().toLowerCase();
  const force = searchParams.get('force') === '1';

  if (!subreddit) {
    return NextResponse.json({ error: 'subreddit param required' }, { status: 400 });
  }

  try {
    // Force rescore: clear cache first
    if (force) {
      await clearRelevantThreads(subreddit);
    }

    // Return cached threads if available and not forcing
    if (!force) {
      const cached = await getRelevantThreads(subreddit);
      if (cached.length > 0) {
        return NextResponse.json({ threads: cached, fresh: false });
      }
    }

    // Need to score fresh — requires alert config for product context
    const config = await getAlertConfig();
    if (!config) {
      return NextResponse.json({
        threads: [],
        fresh: false,
        needsSetup: true,
      });
    }

    const threads = await scoreThreadsForProduct(
      subreddit,
      config.productDescription,
      config.goal
    );

    await saveRelevantThreads(subreddit, threads);
    return NextResponse.json({ threads, fresh: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[threads/relevant]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
