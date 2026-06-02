import { NextRequest, NextResponse } from 'next/server';
import {
  getAllBriefUsers,
  getAlertSettings,
  getCompany,
  getRelevantThreads,
  saveRelevantThreads,
  filterUnseenThreadsForUser,
  markThreadsSeenForUser,
  hasEmailBeenSentToday,
  markEmailSentToday,
} from '@/lib/upstash';
import { scoreThreadsForProduct } from '@/lib/thread-scorer';
import { sendKeywordAlert } from '@/lib/email';
import { ScoredThread } from '@/types';

const DEFAULT_SUBREDDITS = ['SaaS', 'startups', 'entrepreneur', 'smallbusiness', 'marketing'];
const DEFAULT_DESCRIPTION = 'General startup, SaaS, and technology market intelligence.';

// Runs every hour via vercel.json cron.
// At each user's morning delivery hour, sends a digest of all new keyword-matching
// threads since their last delivery (per-user dedup via seen-threads set).

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const users = await getAllBriefUsers();
  const results: Record<string, string> = {};

  for (const email of users) {
    try {
      const settings = await getAlertSettings(email);

      if (!settings.globalEnabled || !settings.keywordWatch?.enabled) {
        results[email] = 'disabled';
        continue;
      }
      if (await hasEmailBeenSentToday(email, 'keyword-alerts')) {
        results[email] = 'already-sent';
        continue;
      }

      const company = await getCompany(email);
      const subreddits = company?.subreddits?.length ? company.subreddits : DEFAULT_SUBREDDITS;
      const description = company?.description ?? DEFAULT_DESCRIPTION;

      const minScore = settings.keywordWatch?.minScore ?? 6;
      const allNewThreadIds: string[] = [];
      const allNewThreads: ScoredThread[] = [];

      for (const subreddit of subreddits) {
        try {
          // Use cached threads if available
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

          // Filter to minScore threshold and per-user unseen
          const qualifying = threads.filter(t => t.relevanceScore >= minScore);
          const unseenIds = await filterUnseenThreadsForUser(email, qualifying.map(t => t.id));
          const unseenThreads = qualifying.filter(t => unseenIds.includes(t.id));

          allNewThreadIds.push(...unseenIds);
          allNewThreads.push(...unseenThreads);
          console.log(`[keyword-alerts] ${email} r/${subreddit}: ${qualifying.length} qualifying, ${unseenThreads.length} new`);
        } catch (err) {
          console.error(`[keyword-alerts] ${email} r/${subreddit} failed:`, err);
        }
      }

      // Mark all seen before sending (prevents duplication on retry)
      if (allNewThreadIds.length > 0) {
        await markThreadsSeenForUser(email, allNewThreadIds);
      }

      if (!allNewThreads.length) {
        results[email] = 'no-new-threads';
        continue;
      }

      // Sort by relevance, cap at 20
      const topThreads = allNewThreads
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, 20);

      await sendKeywordAlert({
        to: email,
        productDescription: description,
        threads: topThreads,
      });
      await markEmailSentToday(email, 'keyword-alerts');
      results[email] = `emailed:${topThreads.length}`;
    } catch (err) {
      results[email] = `error:${String(err)}`;
      console.error(`[keyword-alerts] ${email} failed:`, err);
    }
  }

  const sent = Object.values(results).filter(v => v.startsWith('emailed')).length;
  console.log(`[keyword-alerts] Sent to ${sent}/${users.length} users.`);
  return NextResponse.json({ ok: true, results, sent, total: users.length });
}
