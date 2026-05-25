import { NextRequest, NextResponse } from 'next/server';
import { getCompany, saveRelevantThreads, markThreadsSeen, filterUnseenThreads } from '@/lib/upstash';
import { scoreThreadsForProduct } from '@/lib/thread-scorer';
import { sendKeywordAlert } from '@/lib/email';
import { ScoredThread } from '@/types';

// Runs every hour via vercel.json cron.
// Finds new keyword-matching threads and sends an immediate email alert.

const FOUNDER_EMAIL = 'vandit296@gmail.com';

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Read from the founder's Command profile (set via /command page)
  const config = await getCompany(FOUNDER_EMAIL);
  if (!config?.description || !config.subreddits?.length) {
    return NextResponse.json({ message: 'No company config found — set up your product in /command' });
  }

  const results: Record<string, number> = {};
  const allNewThreadIds: string[] = [];
  const allNewThreads: ScoredThread[] = [];

  for (const subreddit of config.subreddits) {
    try {
      const threads = await scoreThreadsForProduct(
        subreddit,
        config.description,
        config.goal ?? '',
        config.idealUser
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
        productDescription: config.description,
        threads: allNewThreads,
      });
      emailStatus = `sent to ${FOUNDER_EMAIL}`;
    } catch (err) {
      console.error('[keyword-alerts] Email failed:', err);
      emailStatus = `failed: ${String(err)}`;
    }
  }

  const totalNew = Object.values(results).filter(n => n > 0).reduce((a, b) => a + b, 0);
  console.log(`[keyword-alerts] Done. ${totalNew} new threads. Email: ${emailStatus}`);

  return NextResponse.json({ ok: true, subreddits: results, totalNewThreads: totalNew, email: emailStatus });
}
