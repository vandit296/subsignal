import { NextRequest, NextResponse } from 'next/server';
import {
  getAllBriefUsers,
  getAlertSettings,
  getBrief,
  hasEmailBeenSentToday,
  markEmailSentToday,
  getUser,
  isAccessGranted,
} from '@/lib/upstash';
import { sendMorningBrief } from '@/lib/email';

// Runs every hour via vercel.json cron.
// For each registered user, checks if it's their configured morning delivery hour
// (from alert settings, default 07:00 local). Generates and emails the brief once per day.

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

      // Respect global kill-switch
      if (!settings.globalEnabled) {
        results[email] = 'disabled';
        continue;
      }

      // Cost control: only generate Claude briefs for users who still have
      // access (paid / lifetime / active trial). Skip churned/expired accounts.
      const u = await getUser(email);
      if (!u || !isAccessGranted(u)) { results[email] = 'no-access'; continue; }

      // Parse user's delivery hour (e.g. "07:00" → 7)
        
      // Don't double-send within the same UTC day
      if (!force && await hasEmailBeenSentToday(email, 'morning-brief')) {
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

      await markEmailSentToday(email, 'morning-brief');
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
