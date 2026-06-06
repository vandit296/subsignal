import { NextRequest, NextResponse } from 'next/server';
import {
  getAllBriefUsers,
  hasEmailBeenSentToday,
  markEmailSentToday,
} from '@/lib/upstash';

export const runtime = 'nodejs';
export const maxDuration = 300;

// ─────────────────────────────────────────────────────────────────────────────
// One-shot launch announcement blast.
//
//   GET /api/admin/launch-email?secret=<CRON_SECRET>&dry=1   → preview recipients
//   GET /api/admin/launch-email?secret=<CRON_SECRET>         → send for real
//
// Auth: ?secret= must match CRON_SECRET (or Authorization: Bearer <CRON_SECRET>).
// Dedupe: each recipient is marked sent under EMAIL_TYPE so a re-run is safe and
// will not double-send (pass &force=1 to bypass the dedupe guard).
// ─────────────────────────────────────────────────────────────────────────────

const RESEND_API_KEY = process.env.RESEND_API_KEY;
// Same verified sender the daily Morning Brief uses (brief@treddit.live).
// RESEND_FROM wins if set in the environment.
const FROM = process.env.RESEND_FROM ?? 'Treddit <brief@treddit.live>';
const SUBJECT = 'Treddit now finds your customers for you & more';
const EMAIL_TYPE = 'launch-jun2026';

async function sendOne(to: string): Promise<{ ok: boolean; error?: string }> {
  if (!RESEND_API_KEY) return { ok: false, error: 'RESEND_API_KEY not set' };
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from: FROM, to: [to], subject: SUBJECT, html: LAUNCH_HTML }),
    });
    if (!res.ok) return { ok: false, error: await res.text() };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'unknown' };
  }
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const secret = url.searchParams.get('secret') ?? '';
  const bearer = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
  const provided = secret || bearer;

  if (!process.env.CRON_SECRET || provided !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!RESEND_API_KEY) {
    return NextResponse.json({ error: 'RESEND_API_KEY not set' }, { status: 500 });
  }

  const dry = url.searchParams.get('dry') === '1';
  const force = url.searchParams.get('force') === '1';

  const all = await getAllBriefUsers();
  // De-dup + basic sanity filter on email shape
  const recipients = Array.from(new Set(all.map(e => e.trim().toLowerCase())))
    .filter(e => /.+@.+\..+/.test(e));

  if (dry) {
    return NextResponse.json({
      mode: 'dry-run',
      subject: SUBJECT,
      from: FROM,
      totalRegistered: all.length,
      uniqueValid: recipients.length,
      recipients,
    });
  }

  let sent = 0, failed = 0, skipped = 0;
  const errors: { email: string; error: string }[] = [];

  for (const email of recipients) {
    if (!force && (await hasEmailBeenSentToday(email, EMAIL_TYPE))) {
      skipped++;
      continue;
    }
    const r = await sendOne(email);
    if (r.ok) {
      sent++;
      await markEmailSentToday(email, EMAIL_TYPE);
    } else {
      failed++;
      errors.push({ email, error: r.error ?? 'unknown' });
    }
    // ~2 req/s — stay under Resend's default rate limit
    await sleep(550);
  }

  return NextResponse.json({
    mode: 'send',
    subject: SUBJECT,
    from: FROM,
    total: recipients.length,
    sent,
    failed,
    skipped,
    errors: errors.slice(0, 20),
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Dark launch email (VOID theme) — table-based, inline styles, email-client safe.
// ─────────────────────────────────────────────────────────────────────────────

const APP_URL = process.env.NEXTAUTH_URL ?? 'https://treddit.live';

const LAUNCH_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="x-apple-disable-message-reformatting">
<title>Treddit — Product Update</title>
</head>
<body style="margin:0; padding:0; background:#08080a; -webkit-text-size-adjust:100%;">
  <div style="display:none; max-height:0; overflow:hidden; opacity:0; font-size:1px; line-height:1px; color:#08080a;">Paste your URL and get a live feed of customers. Plus Topic Watch and global checkout.</div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#08080a;">
    <tr><td align="center" style="padding:28px 14px 50px;">

      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px; max-width:600px; background:#0C0C0F; border:1px solid #1C1C22; border-radius:16px; overflow:hidden;">

        <tr><td style="padding:26px 32px 6px;">
          <span style="color:#4A8FFF; font-size:18px; vertical-align:middle;">&#9670;</span>
          <span style="font-family:Arial,Helvetica,sans-serif; font-weight:700; font-size:18px; color:#F0ECE4; vertical-align:middle; letter-spacing:-0.01em; margin-left:6px;">Treddit</span>
          <span style="float:right; font-family:'Courier New',monospace; font-size:10px; letter-spacing:0.18em; text-transform:uppercase; color:#5c5c63; padding-top:6px;">Product update</span>
        </td></tr>

        <tr><td style="padding:24px 32px 8px;">
          <h1 style="margin:0; font-family:Arial,Helvetica,sans-serif; font-size:30px; line-height:1.18; font-weight:800; color:#F0ECE4; letter-spacing:-0.03em;">Paste your URL.<br>Get a live feed of customers.</h1>
          <p style="margin:14px 0 0; font-family:Arial,Helvetica,sans-serif; font-size:15px; line-height:1.6; color:#b8b4ac;">Treddit just got a lot smarter. Three upgrades shipped this week — here's what's new.</p>
        </td></tr>

        <tr><td style="padding:22px 32px 0;"><div style="height:1px; background:#1C1C22; line-height:1px;">&nbsp;</div></td></tr>

        <tr><td style="padding:24px 32px 0;">
          <p style="margin:0 0 6px; font-family:'Courier New',monospace; font-size:10px; letter-spacing:0.14em; text-transform:uppercase; color:#4A8FFF;">01 &nbsp;&middot;&nbsp; Flagship</p>
          <h2 style="margin:0 0 8px; font-family:Arial,Helvetica,sans-serif; font-size:19px; font-weight:700; color:#F0ECE4;">Your Market Feed — built from just your URL</h2>
          <p style="margin:0 0 16px; font-family:Arial,Helvetica,sans-serif; font-size:14px; line-height:1.6; color:#a8a49c;">Drop your company URL. Treddit reads your site, works out who your customers are, then surfaces the exact Reddit threads where people are asking for what you sell — right now. It sweeps ~140 communities, drops the dead and irrelevant, and ranks the rest into <span style="color:#00C8A0;">Reply&nbsp;now</span>, <span style="color:#4A8FFF;">Add&nbsp;value</span>, and <span style="color:#FFB400;">Watch</span>. No keyword setup, no subreddit hunting.</p>
          <a href="${APP_URL}" style="display:inline-block; background:#4A8FFF; color:#0C0C0F; font-family:Arial,Helvetica,sans-serif; font-size:13px; font-weight:700; text-decoration:none; padding:11px 22px; border-radius:9px;">Find my customers &rarr;</a>
        </td></tr>

        <tr><td style="padding:24px 32px 0;"><div style="height:1px; background:#1C1C22; line-height:1px;">&nbsp;</div></td></tr>

        <tr><td style="padding:24px 32px 0;">
          <p style="margin:0 0 6px; font-family:'Courier New',monospace; font-size:10px; letter-spacing:0.14em; text-transform:uppercase; color:#9B8CFF;">02 &nbsp;&middot;&nbsp; New</p>
          <h2 style="margin:0 0 8px; font-family:Arial,Helvetica,sans-serif; font-size:19px; font-weight:700; color:#F0ECE4;">Topic Watch (goodbye, keyword matching)</h2>
          <p style="margin:0 0 16px; font-family:Arial,Helvetica,sans-serif; font-size:14px; line-height:1.6; color:#a8a49c;">Watching a "keyword" missed half the conversation. Now you watch a <b style="color:#F0ECE4;">topic</b> — say <i>"cloud API credits"</i> — and Treddit understands the concept. It catches threads that never use your exact words ("our Azure startup credits ran out…") and ignores the coincidental noise. More signal, far less junk.</p>
          <a href="${APP_URL}/watch" style="display:inline-block; background:transparent; color:#F0ECE4; font-family:Arial,Helvetica,sans-serif; font-size:13px; font-weight:700; text-decoration:none; padding:11px 22px; border-radius:9px; border:1px solid #2A2A33;">Watch a topic &rarr;</a>
        </td></tr>

        <tr><td style="padding:24px 32px 0;"><div style="height:1px; background:#1C1C22; line-height:1px;">&nbsp;</div></td></tr>

        <tr><td style="padding:24px 32px 0;">
          <p style="margin:0 0 6px; font-family:'Courier New',monospace; font-size:10px; letter-spacing:0.14em; text-transform:uppercase; color:#FFB400;">03 &nbsp;&middot;&nbsp; For global founders</p>
          <h2 style="margin:0 0 8px; font-family:Arial,Helvetica,sans-serif; font-size:19px; font-weight:700; color:#F0ECE4;">Global checkout + a launch offer</h2>
          <p style="margin:0 0 16px; font-family:Arial,Helvetica,sans-serif; font-size:14px; line-height:1.6; color:#a8a49c;">Founders outside India can now upgrade directly — and there's a launch discount: <b style="color:#F0ECE4;">50% off your first month</b>, applied automatically at checkout (through July).</p>
          <a href="${APP_URL}/upgrade" style="display:inline-block; background:transparent; color:#F0ECE4; font-family:Arial,Helvetica,sans-serif; font-size:13px; font-weight:700; text-decoration:none; padding:11px 22px; border-radius:9px; border:1px solid #2A2A33;">See plans &rarr;</a>
        </td></tr>

        <tr><td style="padding:34px 32px 0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#131317; border:1px solid #1C1C22; border-radius:12px;">
            <tr><td align="center" style="padding:26px 24px;">
              <p style="margin:0 0 16px; font-family:Arial,Helvetica,sans-serif; font-size:16px; line-height:1.5; color:#F0ECE4; font-weight:600;">Stop searching Reddit.<br>Let Treddit bring the conversations to you.</p>
              <a href="${APP_URL}" style="display:inline-block; background:#4A8FFF; color:#0C0C0F; font-family:Arial,Helvetica,sans-serif; font-size:14px; font-weight:700; text-decoration:none; padding:13px 28px; border-radius:10px;">Paste your URL &rarr;</a>
            </td></tr>
          </table>
        </td></tr>

        <tr><td style="padding:26px 32px 4px;">
          <p style="margin:0; font-family:Arial,Helvetica,sans-serif; font-size:14px; line-height:1.6; color:#a8a49c;">— Vandit, Treddit</p>
        </td></tr>

        <tr><td style="padding:22px 32px 30px;">
          <div style="height:1px; background:#1C1C22; line-height:1px; margin-bottom:16px;">&nbsp;</div>
          <p style="margin:0; font-family:Arial,Helvetica,sans-serif; font-size:11px; line-height:1.6; color:#5c5c63;">
            You're receiving this because you signed up at treddit.live.<br>
            <a href="${APP_URL}" style="color:#7a7a82; text-decoration:underline;">treddit.live</a> &nbsp;&middot;&nbsp; <a href="${APP_URL}/unsubscribe" style="color:#7a7a82; text-decoration:underline;">Unsubscribe</a>
          </p>
        </td></tr>

      </table>

    </td></tr>
  </table>
</body>
</html>`;
