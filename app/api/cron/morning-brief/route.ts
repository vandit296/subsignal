import { NextRequest, NextResponse } from 'next/server';
import {
  getAllBriefUsers,
  getBrief,
  hasEmailBeenSentToday,
  markEmailSentToday,
  getUser,
  getEmailPrefs,
  isLifetimeAccount,
  isTargetHourForUser,
} from '@/lib/upstash';
import { sendMorningBrief } from '@/lib/email';

// Runs HOURLY (vercel.json). Paid users only: sends the AI "Daily News" brief at
// each user's chosen local hour, once per day. (Email Alerts → Daily News.)

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
      // Paid-only feature.
      const u = await getUser(email);
      const paid = isLifetimeAccount(email) || u?.subscriptionStatus === 'active';
      if (!paid) { results[email] = 'not-paid'; continue; }

      // Honor Email Alerts prefs: global on + Daily News on.
      const prefs = await getEmailPrefs(email);
      if (!prefs.globalEnabled || !prefs.dailyNews.enabled) { results[email] = 'disabled'; continue; }

      // Only at the user's chosen local hour.
      if (!force && !isTargetHourForUser(prefs.timezone, prefs.dailyNews.hour)) { results[email] = 'not-their-hour'; continue; }

      // Don't double-send within the same UTC day.
      if (!force && await hasEmailBeenSentToday(email, 'daily-news')) {
        results[email] = 'already-sent';
        continue;
      }

      // Generate brief for this user
      const genRes = await fetch(`${process.env.NEXTAUTH_URL}/api/brief/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.CRON_SECRET}`,
        },
        body: JSON.stringify({ email }),
      });
      const genData = await genRes.json() as { ok: boolean; briefDate?: string };

      if (!genData.ok) {
        results[email] = 'generation-failed';
        continue;
      }

      // Fetch the generated brief from Redis
      const today = genData.briefDate ?? new Date().toISOString().slice(0, 10);
      const brief = await getBrief(email, today);
      if (!brief) {
        results[email] = 'brief-not-found';
        continue;
      }

      // Send the email — positional args: (userEmail, brief, edition)
      const emailResult = await sendMorningBrief(email, brief, brief.edition);
      if (!emailResult.ok) {
        results[email] = `send-failed:${emailResult.error ?? 'unknown'}`;
        continue;
      }

      await markEmailSentToday(email, 'daily-news');
      results[email] = `emailed:${today}`;
    } catch (err) {
      results[email] = `error:${String(err)}`;
      console.error(`[morning-brief] ${email} failed:`, err);
    }
  }

  const sent = Object.values(results).filter(v => v.startsWith('emailed')).length;
  console.log(`[morning-brief] Sent ${sent}/${users.length} briefs.`);
  return NextResponse.json({ ok: true, results, sent, total: users.length });
}
