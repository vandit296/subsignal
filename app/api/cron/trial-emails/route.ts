import { NextResponse } from 'next/server';
import {
  getUser, getCompany, getAllBriefUsers,
  hasLifecycleEmailBeenSent, markLifecycleEmailSent,
  generateExtendToken, markCronHeartbeat,
} from '@/lib/upstash';
import { sendTrialEndingSoon, sendTrialExpired, sendIncompleteSetup } from '@/lib/email';

export const runtime = 'nodejs';
export const maxDuration = 60;

const TRIAL_DAYS = 3;

export async function GET(req: Request) {
  const authHeader = (req as Request & { headers: { get: (k: string) => string | null } }).headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const emails = await getAllBriefUsers();
  const now = Date.now();
  const results = { endingSoon: 0, expired: 0, incompleteSetup: 0, skipped: 0 };

  for (const email of emails) {
    try {
      const user = await getUser(email);
      if (!user) { results.skipped++; continue; }
      if (user.subscriptionStatus === 'active' || user.subscriptionStatus === 'cancelled') {
        results.skipped++; continue;
      }

      const trialEnd        = new Date(user.trialStartAt).getTime() + TRIAL_DAYS * 86400_000;
      const msToEnd         = trialEnd - now;
      const daysSinceSignup = (now - new Date(user.createdAt).getTime()) / 86400_000;

      // Email 2 (TOP PRIORITY): expired — trial ended and they haven't paid.
      // This MUST come before incomplete-setup: a finished trial is a finished
      // trial whether or not they onboarded. (Previously incomplete-setup ran
      // first and `continue`d, so non-onboarded users NEVER got the expired email
      // — the silent failure behind "we missed so many.") Expiry is computed from
      // trialStartAt; 48h window tolerates a missed daily run; the dedupe flag
      // guarantees exactly one send. Paid/cancelled users already skipped above.
      if (msToEnd <= 0 && msToEnd >= -48 * 3600_000) {
        const sent = await hasLifecycleEmailBeenSent(email, 'trial-expired');
        if (!sent) {
          const company     = await getCompany(email);
          const extendToken = await generateExtendToken(email);
          await sendTrialExpired(email, user.name, company?.name ?? 'your product', extendToken);
          await markLifecycleEmailSent(email, 'trial-expired');
          results.expired++;
        } else results.skipped++;
        continue;
      }

      // Email 3: incomplete setup — only while STILL in trial, not onboarded, >24h in.
      if (!user.onboardingComplete && daysSinceSignup >= 1) {
        const sent = await hasLifecycleEmailBeenSent(email, 'incomplete-setup');
        if (!sent) {
          const daysLeft = Math.max(0, Math.ceil(msToEnd / 86400_000));
          await sendIncompleteSetup(email, user.name, daysLeft);
          await markLifecycleEmailSent(email, 'incomplete-setup');
          results.incompleteSetup++;
        } else results.skipped++;
        continue;
      }

      // Email 1: ending soon — 20-28h window before expiry
      if (msToEnd > 20 * 3600_000 && msToEnd <= 28 * 3600_000) {
        const sent = await hasLifecycleEmailBeenSent(email, 'trial-ending-soon');
        if (!sent) {
          const company = await getCompany(email);
          await sendTrialEndingSoon(email, user.name, company?.name ?? 'your product');
          await markLifecycleEmailSent(email, 'trial-ending-soon');
          results.endingSoon++;
        } else results.skipped++;
        continue;
      }

      results.skipped++;
    } catch (err) {
      console.error(`[trial-emails] failed for ${email}:`, err);
      results.skipped++;
    }
  }

  console.log('[trial-emails]', results);
  // Heartbeat so the health check can alert if this cron ever stalls.
  await markCronHeartbeat('trial-emails', { sent: results.expired + results.endingSoon + results.incompleteSetup, total: emails.length });
  return NextResponse.json({ ok: true, ...results });
}
