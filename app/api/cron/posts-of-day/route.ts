import { NextRequest, NextResponse } from 'next/server';
import {
  getAllBriefUsers,
  getEmailPrefs,
  getCompany,
  getUser,
  hasEmailBeenSentToday,
  markEmailSentToday,
  markCronHeartbeat,
} from '@/lib/upstash';
import { sendPostsOfDay, RawPost } from '@/lib/email';

// Runs every hour via vercel.json cron.
// Sends each user their top Reddit posts for the day at their morning delivery hour.
// No AI scoring — pure community pulse by raw upvotes.

export const maxDuration = 60;

const ARCTIC_SHIFT = 'https://arctic-shift.photon-reddit.com';
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

async function fetchTopPosts(subreddit: string, hoursBack = 24): Promise<RawPost[]> {
  const after = Math.floor(Date.now() / 1000) - hoursBack * 3600;
  try {
    const res = await fetch(
      `${ARCTIC_SHIFT}/api/posts/search?subreddit=${encodeURIComponent(subreddit)}&limit=100&after=${after}&sort=desc`,
      { headers: { Accept: 'application/json' }, cache: 'no-store' }
    );
    if (!res.ok) return [];
    const json = await res.json();
    const posts = (json.data ?? []) as Array<{
      id: string; title: string; url: string;
      score: number; num_comments: number;
      subreddit: string; created_utc: number;
    }>;
    return posts.map(p => ({
      id: p.id,
      title: p.title,
      url: p.url.startsWith('http') ? p.url : `https://reddit.com${p.url}`,
      score: p.score,
      num_comments: p.num_comments,
      subreddit: p.subreddit,
      created_utc: p.created_utc,
    }));
  } catch {
    return [];
  }
}

// Cache raw posts per subreddit for the current cron run so users sharing
// the same subreddit don't trigger duplicate Arctic Shift fetches.
const postCache = new Map<string, RawPost[]>();

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  postCache.clear(); // fresh per invocation

  const force = new URL(req.url).searchParams.get('force') === '1';
  const users = await getAllBriefUsers();
  const results: Record<string, string> = {};

  for (const email of users) {
    try {
      const prefs = await getEmailPrefs(email);

      if (!prefs.globalEnabled || !prefs.postsOfDay.enabled) {
        results[email] = 'disabled';
        continue;
      }

      // Daily engagement email goes to EVERY opted-in, set-up user — including
      // expired trials (a daily nudge to bring them back). Access is intentionally
      // NOT required here; opt-out is honoured via prefs above, so anyone who
      // doesn't want it has already been filtered out.
      const u = await getUser(email);
      if (!u) { results[email] = 'no-user'; continue; }

      if (!force && await hasEmailBeenSentToday(email, 'posts-of-day')) {
        results[email] = 'already-sent';
        continue;
      }

      // Only send if they've set up their product/communities — no generic blasts.
      const company = await getCompany(email);
      if (!company?.subreddits?.length) { results[email] = 'not-set-up'; continue; }
      const subreddits = company.subreddits;

      const allPosts: RawPost[] = [];

      for (const subreddit of subreddits) {
        try {
          if (!postCache.has(subreddit)) {
            postCache.set(subreddit, await fetchTopPosts(subreddit));
          }
          const top = (postCache.get(subreddit) ?? [])
            .sort((a, b) => b.score - a.score)
            .slice(0, 3);
          allPosts.push(...top);
        } catch (err) {
          console.error(`[posts-of-day] ${email} r/${subreddit} failed:`, err);
        }
      }

      const topPosts = allPosts
        .sort((a, b) => b.score - a.score)
        .slice(0, Math.min(20, Math.max(3, prefs.postsOfDay.count ?? 10)));

      if (!topPosts.length) {
        results[email] = 'no-posts';
        continue;
      }

      await sendPostsOfDay({
        to: email,
        subreddits,
        posts: topPosts,
      });
      await markEmailSentToday(email, 'posts-of-day');
      results[email] = `emailed:${topPosts.length}`;
      await sleep(220); // ~4.5/sec — stays under Resend's 5/sec cap as the audience grows
    } catch (err) {
      results[email] = `error:${String(err)}`;
      console.error(`[posts-of-day] ${email} failed:`, err);
    }
  }

  const sent = Object.values(results).filter(v => v.startsWith('emailed')).length;
  console.log(`[posts-of-day] Sent to ${sent}/${users.length} users.`);
  // Heartbeat — the health check reads this to detect a stalled/zero-send cron.
  await markCronHeartbeat('posts-of-day', { sent, total: users.length });
  return NextResponse.json({ ok: true, results, sent, total: users.length });
}
