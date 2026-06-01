import { NextResponse } from 'next/server';
import {
  getUser, getCompany, getBriefUsers,
  hasLifecycleEmailBeenSent, markLifecycleEmailSent,
  generateExtendToken,
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

  const emails = await getBriefUsers();
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

      // Email 3: incomplete setup — sent 24h after signup
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

      // Email 2: expired — within 4h of expiry, status is expired
      if (msToEnd <= 0 && msToEnd >= -4 * 3600_000 && user.subscriptionStatus === 'expired') {
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

      results.skipped++;
    } catch (err) {
      console.error(`[trial-emails] failed for ${email}:`, err);
      results.skipped++;
    }
  }

  console.log('[trial-emails]', results);
  return NextResponse.json({ ok: true, ...results });
}
