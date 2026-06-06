import { NextRequest, NextResponse } from 'next/server';
import {
  getAllBriefUsers,
  getAlertSettings,
  getCompany,
  getRelevantThreads,
  saveRelevantThreads,
  hasEmailBeenSentToday,
  markEmailSentToday,
  getUser,
  isAccessGranted,
} from '@/lib/upstash';
import { scoreThreadsForProduct } from '@/lib/thread-scorer';
import { sendSignalFeed } from '@/lib/email';
import { ScoredThread } from '@/types';
const DEFAULT_SUBREDDITS = ['SaaS', 'startups', 'entrepreneur', 'smallbusiness', 'marketing', 'technology', 'webdev', 'ProductManagement'];
const DEFAULT_DESCRIPTION = 'General startup, SaaS, and technology market intelligence.';

// Runs every hour via vercel.json cron.
// For each registered user, sends a grouped signal-feed digest at their morning
// delivery hour. Uses cached scored threads where available to avoid redundant
// Anthropic API calls across users who share subreddits.

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const force = new URL(req.url).searchParams.get('force') === '1';
  const users = await getAllBriefUsers();
  const results: Record<string, string> = {};

  for (const email of users) {
    try {
      const settings = await getAlertSettings(email);

      if (!settings.globalEnabled || !settings.signalFeed?.enabled) {
        results[email] = 'disabled';
        continue;
      }

      // Cost control: only score/send for users who still have access.
      const u = await getUser(email);
      if (!u || !isAccessGranted(u)) { results[email] = 'no-access'; continue; }
      if (!force && await hasEmailBeenSentToday(email, 'signal-feed')) {
        results[email] = 'already-sent';
        continue;
      }

      const company = await getCompany(email);
      const subreddits = company?.subreddits?.length ? company.subreddits : DEFAULT_SUBREDDITS;
      const description = company?.description ?? DEFAULT_DESCRIPTION;

      const allThreads: ScoredThread[] = [];

      for (const subreddit of subreddits) {
        try {
          // Use cached scored threads if available (avoids re-scoring the same subreddit
          // when multiple users track it in the same hour window)
          let threads = await getRelevantThreads(subreddit);
          if (!threads.length) {
            threads = await scoreThreadsForProduct(
              subreddit,
              description,
              company?.goal ?? '',
              company?.idealUser
            );
            await saveRelevantThreads(subreddit, threads);
          }
          const top = threads
            .sort((a, b) => b.relevanceScore - a.relevanceScore)
            .slice(0, 5);
          allThreads.push(...top);
        } catch (err) {
          console.error(`[signal-feed] ${email} r/${subreddit} failed:`, err);
        }
      }

      const topThreads = allThreads
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, 20);

      if (!topThreads.length) {
        results[email] = 'no-threads';
        continue;
      }

      await sendSignalFeed({
        to: email,
        productDescription: description,
        threads: topThreads,
      });
      await markEmailSentToday(email, 'signal-feed');
      results[email] = `emailed:${topThreads.length}`;
    } catch (err) {
      results[email] = `error:${String(err)}`;
      console.error(`[signal-feed] ${email} failed:`, err);
    }
  }

  const sent = Object.values(results).filter(v => v.startsWith('emailed')).length;
  console.log(`[signal-feed] Sent to ${sent}/${users.length} users.`);
  return NextResponse.json({ ok: true, results, sent, total: users.length });
}
