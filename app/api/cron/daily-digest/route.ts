import { NextRequest, NextResponse } from 'next/server';
import { getAlertConfig, saveRelevantThreads, markThreadsSeen, filterUnseenThreads, saveAlertConfig } from '@/lib/upstash';
import { scoreThreadsForProduct } from '@/lib/thread-scorer';
import { sendKeywordAlert } from '@/lib/email';
import { ScoredThread } from '@/types';

// Runs every hour via vercel.json cron.
// Finds new keyword-matching threads and sends an immediate email alert.

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const config = await getAlertConfig();
  if (!config || !config.subreddits.length) {
    return NextResponse.json({ message: 'No alert config — nothing to do' });
  }

  const results: Record<string, number> = {};
  const allNewThreadIds: string[] = [];
  const allNewThreads: ScoredThread[] = [];

  for (const subreddit of config.subreddits) {
    try {
      const threads = await scoreThreadsForProduct(
        subreddit,
        config.productDescription,
        config.goal
      );
      await saveRelevantThreads(subreddit, threads);

      const unseenIds = await filterUnseenThreads(threads.map(t => t.id));
      const unseenThreads = threads.filter(t => unseenIds.includes(t.id));

      results[subreddit] = unseenThreads.length;
      allNewThreadIds.push(...unseenIds);
      allNewThreads.push(...unseenThreads);

      console.log(`[keyword-alerts] r/${subreddit}: ${threads.length} scored, ${unseenThreads.length} new`);
    } catch (err) {
      console.error(`[keyword-alerts] r/${subreddit} failed:`, err);
      results[subreddit] = -1;
    }
  }

  if (allNewThreadIds.length > 0) {
    await markThreadsSeen(allNewThreadIds);
  }

  let emailStatus = 'no new threads';
  // Until a custom sending domain is set up, all emails go to the founder.
  // Resend's onboarding@resend.dev can only deliver to the Resend account owner's email.
  const FOUNDER_EMAIL = 'vandit296@gmail.com';

  if (allNewThreads.length > 0) {
    try {
      await sendKeywordAlert({
        to: FOUNDER_EMAIL,
        productDescription: config.productDescription,
        threads: allNewThreads,
      });
      emailStatus = `sent to ${FOUNDER_EMAIL}`;
    } catch (err) {
      console.error('[keyword-alerts] Email failed:', err);
      emailStatus = `failed: ${String(err)}`;
    }
  }

  await saveAlertConfig({ ...config, lastDigestAt: new Date().toISOString() });

  const totalNew = Object.values(results).filter(n => n > 0).reduce((a, b) => a + b, 0);
  console.log(`[keyword-alerts] Done. ${totalNew} new threads. Email: ${emailStatus}`);

  return NextResponse.json({ ok: true, subreddits: results, totalNewThreads: totalNew, email: emailStatus });
}
