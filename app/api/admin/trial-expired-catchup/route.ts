import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import {
  getUser, getCompany, getAllBriefUsers,
  hasLifecycleEmailBeenSent, markLifecycleEmailSent, generateExtendToken,
} from '@/lib/upstash';
import { sendTrialExpired } from '@/lib/email';

// One-time backlog: email every past-expired, unpaid user who never received the
// trial-expired email (the cron's 48h window only catches recent expirations).
// Owner-triggered. Shares the 'trial-expired' lifecycle flag with the cron, so
// nobody is emailed twice and the cron won't re-send to anyone caught here.

export const runtime = 'nodejs';
export const maxDuration = 300;

const OWNER = 'vandit296@gmail.com';
const TRIAL_DAYS = 3;
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

async function handle(req: NextRequest) {
  const session = await getSession();
  const isOwner = session?.user?.email?.toLowerCase() === OWNER;
  const secret = process.env.CRON_SECRET;
  const provided = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || req.nextUrl.searchParams.get('secret');
  if (!isOwner && !(secret && provided === secret)) {
    return NextResponse.json({ error: 'unauthorized', hint: 'Sign in as owner and open this in your browser.' }, { status: 401 });
  }

  const dryRun = req.nextUrl.searchParams.get('dryRun') === '1';
  const confirmAll = req.nextUrl.searchParams.get('send') === 'all';
  if (!dryRun && !confirmAll) {
    return NextResponse.json({ ready: true, message: 'Nothing sent. Add ?dryRun=1 to count eligible users, or ?send=all to email them.' });
  }

  const emails = await getAllBriefUsers();
  const now = Date.now();
  let eligible = 0, sent = 0, skipped = 0, failed = 0;
  const errors: string[] = [];

  for (const email of emails) {
    try {
      const user = await getUser(email);
      if (!user) { skipped++; continue; }
      if (user.subscriptionStatus === 'active' || user.subscriptionStatus === 'cancelled') { skipped++; continue; }
      const trialEnd = new Date(user.trialStartAt).getTime() + TRIAL_DAYS * 86400_000;
      if (trialEnd - now > 0) { skipped++; continue; }                       // trial still active
      if (await hasLifecycleEmailBeenSent(email, 'trial-expired')) { skipped++; continue; } // already emailed

      eligible++;
      if (dryRun) continue;

      const company = await getCompany(email);
      const token = await generateExtendToken(email);
      try {
        await sendTrialExpired(email, user.name, company?.name ?? 'your product', token);
      } catch {
        await sleep(1200); // likely a 429 — back off once and retry
        await sendTrialExpired(email, user.name, company?.name ?? 'your product', token);
      }
      await markLifecycleEmailSent(email, 'trial-expired');
      sent++;
      await sleep(280); // ~3.5/sec, under Resend's 5/sec cap
    } catch (e) {
      failed++;
      if (errors.length < 10) errors.push(`${email}: ${e instanceof Error ? e.message : 'err'}`);
    }
  }

  return NextResponse.json({ ok: true, dryRun, totalUsers: emails.length, eligible, sent, skipped, failed, errors });
}

export async function GET(req: NextRequest) { return handle(req); }
export async function POST(req: NextRequest) { return handle(req); }
