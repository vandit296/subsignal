import { NextRequest, NextResponse } from 'next/server';
import { getAlertConfig, saveRelevantThreads, markThreadsSeen, filterUnseenThreads, saveAlertConfig } from '@/lib/upstash';
import { scoreThreadsForProduct } from '@/lib/thread-scorer';

export async function GET(req: NextRequest) {
  // Verify this is called by Vercel Cron (or manually with the secret)
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const config = await getAlertConfig();
  if (!config || !config.subreddits.length) {
    return NextResponse.json({ message: 'No alert config found — nothing to do' });
  }

  const results: Record<string, number> = {};
  const allNewThreadIds: string[] = [];

  // Score threads for each monitored subreddit
  for (const subreddit of config.subreddits) {
    try {
      const threads = await scoreThreadsForProduct(
        subreddit,
        config.productDescription,
        config.goal
      );

      // Store all threads (for dashboard display, including seen ones)
      await saveRelevantThreads(subreddit, threads);

      // Find which are genuinely new (not sent before)
      const unseenIds = await filterUnseenThreads(threads.map(t => t.id));
      const unseenThreads = threads.filter(t => unseenIds.includes(t.id));

      results[subreddit] = unseenThreads.length;
      allNewThreadIds.push(...unseenIds);

      console.log(`[cron] r/${subreddit}: ${threads.length} scored, ${unseenThreads.length} new`);
    } catch (err) {
      console.error(`[cron] r/${subreddit} failed:`, err);
      results[subreddit] = -1;
    }
  }

  // Mark all found threads as seen to avoid resending
  if (allNewThreadIds.length > 0) {
    await markThreadsSeen(allNewThreadIds);
  }

  // Update lastDigestAt
  await saveAlertConfig({
    ...config,
    lastDigestAt: new Date().toISOString(),
  });

  const totalNew = Object.values(results).filter(n => n > 0).reduce((a, b) => a + b, 0);
  console.log(`[cron] Done. ${totalNew} new threads across ${config.subreddits.length} subreddits. Email coming soon.`);

  return NextResponse.json({
    ok: true,
    subreddits: results,
    totalNewThreads: totalNew,
    email: 'pending — email integration coming next',
  });
}
