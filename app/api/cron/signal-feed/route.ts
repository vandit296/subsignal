import { NextRequest, NextResponse } from 'next/server';
import { getAlertConfig, saveRelevantThreads } from '@/lib/upstash';
import { scoreThreadsForProduct } from '@/lib/thread-scorer';
import { sendSignalFeed } from '@/lib/email';
import { ScoredThread } from '@/types';

// Runs every 12 hours via vercel.json cron.
// Sends a grouped digest of all threads found — regardless of seen/unseen.
// Unlike keyword-alerts, this is a curated summary, not a deduped real-time feed.

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const config = await getAlertConfig();
  if (!config || !config.subreddits.length) {
    return NextResponse.json({ message: 'No alert config — nothing to do' });
  }

  const allThreads: ScoredThread[] = [];

  for (const subreddit of config.subreddits) {
    try {
      const threads = await scoreThreadsForProduct(
        subreddit,
        config.productDescription,
        config.goal
      );
      await saveRelevantThreads(subreddit, threads);
      // Take top 5 per subreddit by relevance score
      const top = threads
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, 5);
      allThreads.push(...top);
      console.log(`[signal-feed] r/${subreddit}: ${top.length} top threads`);
    } catch (err) {
      console.error(`[signal-feed] r/${subreddit} failed:`, err);
    }
  }

  // Sort globally by relevance, cap at 20
  const topThreads = allThreads
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, 20);

  // Until a custom sending domain is set up, all digest emails go to the founder.
  // Resend's onboarding@resend.dev can only deliver to the Resend account owner's email.
  const FOUNDER_EMAIL = 'vandit296@gmail.com';

  let emailStatus = 'no threads';
  if (topThreads.length > 0) {
    try {
      await sendSignalFeed({
        to: FOUNDER_EMAIL,
        productDescription: config.productDescription,
        threads: topThreads,
      });
      emailStatus = `sent to ${FOUNDER_EMAIL}`;
    } catch (err) {
      console.error('[signal-feed] Email failed:', err);
      emailStatus = `failed: ${String(err)}`;
    }
  }

  console.log(`[signal-feed] Done. ${topThreads.length} threads. Email: ${emailStatus}`);
  return NextResponse.json({ ok: true, threadCount: topThreads.length, email: emailStatus });
}
