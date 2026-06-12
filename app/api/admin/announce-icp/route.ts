import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

// One-off broadcast for the ICP Radar launch. Owner-triggered, never on a schedule.
//
// Auth: requires CRON_SECRET via `Authorization: Bearer <secret>` or `?secret=`.
// Modes (query params):
//   ?dryRun=1  → send nothing; just report how many registered users would receive it
//   ?test=1    → send ONLY to the owner (preview the real thing in your own inbox)
//   (neither)  → send to every registered user, ONCE each (idempotent — safe to re-run)
//
// Idempotency: each real send sets treddit:announce:icp:{email}; re-runs skip anyone
// already emailed, so a crash mid-blast can be safely resumed. Test mode ignores it.

export const runtime = 'nodejs';
export const maxDuration = 300;

const OWNER = 'vandit296@gmail.com';
const SUBJECT = 'Your customers are on Reddit. Now we hand you the list.';
const USERS_SET = 'treddit:brief-users';
const sentKey = (email: string) => `treddit:announce:icp:${email.toLowerCase()}`;

async function redis(cmd: unknown[]): Promise<unknown> {
  const url = process.env.UPSTASH_REDIS_REST_URL, token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  try {
    const r = await fetch(url, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(cmd), cache: 'no-store' });
    return ((await r.json()) as { result: unknown }).result;
  } catch { return null; }
}

async function firstNameFor(email: string): Promise<string> {
  const raw = await redis(['GET', `subsignal:user:${email.toLowerCase()}`]) as string | null;
  if (!raw) return '';
  try { const u = JSON.parse(raw) as { name?: string }; return (u.name || '').trim().split(/\s+/)[0] || ''; } catch { return ''; }
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

async function sendEmail(to: string, html: string, attempt = 0): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error('RESEND_API_KEY not set');
  const from = process.env.RESEND_FROM ?? 'Treddit <brief@treddit.live>';
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to, subject: SUBJECT, html }),
  });
  // Resend allows 5 req/sec — back off and retry on 429 rather than dropping the send.
  if (res.status === 429 && attempt < 4) { await sleep(1200); return sendEmail(to, html, attempt + 1); }
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
}

function emailHtml(firstName: string): string {
  const hi = firstName ? `Hey ${firstName},` : 'Hey there,';
  const t1 = '#F0ECE4', t2 = 'rgba(240,236,228,0.78)', t3 = 'rgba(240,236,228,0.50)', t4 = 'rgba(240,236,228,0.38)', blue = '#4A8FFF', hot = '#FF4500', bd = 'rgba(240,236,228,0.10)';
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#000;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#000;"><tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#0C0C0F;border:0.5px solid ${bd};border-radius:14px;">
<tr><td style="padding:40px 36px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">

  <table role="presentation" cellpadding="0" cellspacing="0"><tr>
    <td style="vertical-align:middle;padding-right:9px;">
      <table role="presentation" cellpadding="0" cellspacing="0"><tr><td width="22" height="22" align="center" style="width:22px;height:22px;background:${blue};border-radius:6px;color:#06121f;font-size:14px;font-weight:700;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">T</td></tr></table>
    </td>
    <td style="vertical-align:middle;font-size:15px;font-weight:600;color:${t1};letter-spacing:-0.01em;">Treddit</td>
  </tr></table>

  <p style="margin:28px 0 12px;font-size:11px;font-weight:600;letter-spacing:0.08em;color:${blue};">NEW</p>
  <h1 style="margin:0 0 18px;font-size:24px;line-height:1.3;font-weight:600;color:${t1};letter-spacing:-0.02em;">Your customers are on Reddit.<br>Now we hand you the list.</h1>

  <p style="margin:0 0 14px;font-size:15px;line-height:1.65;color:${t2};">${hi}</p>
  <p style="margin:0 0 14px;font-size:15px;line-height:1.65;color:${t2};">Treddit has always found you the right <em>threads</em>. Today it starts finding you the right <em>people</em>.</p>
  <p style="margin:0 0 6px;font-size:16px;font-weight:500;color:${t1};">Meet ICP Radar.</p>
  <p style="margin:0 0 16px;font-size:15px;line-height:1.65;color:${t2};">Every morning it scans Reddit for founders describing the exact problem you solve, then hands you a short, ranked list of the ones who are genuinely your customers. For each:</p>

  <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 18px;">
    <tr><td style="padding:0 10px 10px 0;color:${blue};vertical-align:top;font-size:15px;">&rarr;</td><td style="padding:0 0 10px;font-size:14px;line-height:1.55;color:${t2};"><span style="color:${t1};">Why they fit</span> — scored against your company, so you're not guessing</td></tr>
    <tr><td style="padding:0 10px 10px 0;color:${blue};vertical-align:top;font-size:15px;">&rarr;</td><td style="padding:0 0 10px;font-size:14px;line-height:1.55;color:${t2};"><span style="color:${t1};">Their own words</span> — the exact post that flagged them</td></tr>
    <tr><td style="padding:0 10px 0 0;color:${blue};vertical-align:top;font-size:15px;">&rarr;</td><td style="font-size:14px;line-height:1.55;color:${t2};"><span style="color:${t1};">What they're up to</span> — recent posts &amp; comments, so you can open warm</td></tr>
  </table>

  <p style="margin:0 0 10px;font-size:11px;letter-spacing:0.05em;text-transform:uppercase;color:${t4};">A lead looks like this</p>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 22px;background:#131317;border:0.5px solid ${bd};border-radius:12px;"><tr><td style="padding:16px 18px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
      <td width="46" style="vertical-align:top;">
        <table role="presentation" cellpadding="0" cellspacing="0"><tr><td width="46" height="46" align="center" style="width:46px;height:46px;border:1.5px solid ${blue};border-radius:23px;color:${t1};font-size:16px;font-weight:700;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">90</td></tr></table>
      </td>
      <td style="padding-left:13px;vertical-align:top;">
        <div style="font-size:14px;color:${t1};"><span style="font-weight:600;font-family:SFMono-Regular,Menlo,monospace;">u/Paradisos_</span> <span style="color:${t3};font-size:12px;">· r/microsaas</span> &nbsp;<span style="color:${hot};font-size:11px;border:0.5px solid rgba(255,69,0,0.3);border-radius:20px;padding:2px 8px;white-space:nowrap;">DM today</span></div>
        <div style="font-size:13px;color:${t3};padding-top:4px;line-height:1.5;">Cnotes — meeting-notes tracker · just launched</div>
      </td>
    </tr></table>
    <div style="border-left:2px solid rgba(74,143,255,0.22);padding:6px 0 6px 12px;margin:12px 0 12px;font-size:14px;color:${t1};font-style:italic;line-height:1.5;">"What actually moved the needle on your first 100 users?"</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr><td width="80" style="vertical-align:top;font-size:10px;letter-spacing:0.02em;text-transform:uppercase;color:${t4};padding:0 0 6px;">Why them</td><td style="font-size:13px;color:${t2};line-height:1.5;padding:0 0 6px;">Real shipped product, asking the exact distribution question. Bullseye buyer.</td></tr>
      <tr><td width="80" style="vertical-align:top;font-size:10px;letter-spacing:0.02em;text-transform:uppercase;color:${t4};">Your angle</td><td style="font-size:13px;color:${t2};line-height:1.5;">Point at r/sales notes threads — lead with a tip, not the tool.</td></tr>
    </table>
  </td></tr></table>

  <p style="margin:0 0 14px;font-size:15px;line-height:1.65;color:${t2};">Then you do the human part: you write the message, in your voice, and send it yourself. No bot-sounding auto-DMs — the right person, at the right moment, with something real to say.</p>
  <p style="margin:0 0 24px;font-size:15px;line-height:1.65;color:${t2};"><span style="color:${hot};">One catch, on purpose:</span> one fresh batch a day. No endless scroll, no burning through a thousand cold leads — a handful genuinely worth your time, then come back tomorrow.</p>

  <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 28px;"><tr><td style="border-radius:8px;background:${blue};">
    <a href="https://treddit.live/icp" style="display:inline-block;padding:13px 26px;font-size:15px;font-weight:600;color:#06121f;text-decoration:none;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">See today's customers &nbsp;&rarr;</a>
  </td></tr></table>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="border-top:0.5px solid ${bd};padding-top:20px;">
    <p style="margin:0 0 14px;font-size:15px;line-height:1.65;color:${t2};">This is the feature I most wanted to build — finding customers shouldn't mean shouting into the void. Reply and tell me what you think. I read every one.</p>
    <p style="margin:0;font-size:15px;line-height:1.5;color:${t2};">&mdash; Vandit<br><span style="color:${t3};font-size:13px;">Founder, Treddit</span></p>
  </td></tr></table>

  <p style="margin:30px 0 0;padding-top:18px;border-top:0.5px solid ${bd};font-size:12px;line-height:1.6;color:${t4};text-align:center;">
    Treddit · <a href="https://treddit.live" style="color:${t3};">treddit.live</a><br>
    You're getting this because you have a Treddit account. <a href="https://treddit.live/settings/alerts" style="color:${t3};">Manage emails</a>.
  </p>

</td></tr></table>
</td></tr></table>
</body></html>`;
}

async function handle(req: NextRequest) {
  // Authorize by EITHER the owner's logged-in session (just open the URL in your
  // browser while signed in) OR a CRON_SECRET bearer/secret param (if it's set).
  const session = await getSession();
  const isOwner = session?.user?.email?.toLowerCase() === OWNER;
  const secret = process.env.CRON_SECRET;
  const provided = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || req.nextUrl.searchParams.get('secret');
  const secretOk = !!secret && provided === secret;
  if (!isOwner && !secretOk) {
    return NextResponse.json({ error: 'unauthorized', hint: 'Sign in as the owner and open this URL in your browser.' }, { status: 401 });
  }

  const dryRun = req.nextUrl.searchParams.get('dryRun') === '1';
  const test = req.nextUrl.searchParams.get('test') === '1';
  const confirmAll = req.nextUrl.searchParams.get('send') === 'everyone';

  const all = (await redis(['SMEMBERS', USERS_SET]) as string[] | null) ?? [];

  if (dryRun) {
    return NextResponse.json({ dryRun: true, totalRegistered: all.length });
  }
  // Safety: a bare URL (no explicit target) never sends — prevents an accidental
  // browser visit from blasting the whole base.
  if (!test && !confirmAll) {
    return NextResponse.json({ ready: true, totalRegistered: all.length, message: 'Nothing sent. Add ?test=1 to email only yourself, or ?send=everyone to email all registered users.' });
  }

  const recipients = test ? [OWNER] : all;

  let sent = 0, skipped = 0, failed = 0;
  const errors: string[] = [];

  // Sequential with a ~280ms gap = ~3.5 sends/sec, safely under Resend's 5/sec
  // cap. Idempotent: a 429 or crash leaves unsent users unflagged, so re-running
  // only retries those who haven't received it.
  for (const email of recipients) {
    try {
      if (!test && (await redis(['GET', sentKey(email)]))) { skipped++; continue; }
      const html = emailHtml(await firstNameFor(email));
      await sendEmail(email, html);
      if (!test) await redis(['SET', sentKey(email), '1', 'EX', String(180 * 86400)]);
      sent++;
    } catch (e) {
      failed++;
      if (errors.length < 10) errors.push(`${email}: ${e instanceof Error ? e.message : 'err'}`);
    }
    await sleep(280);
  }

  return NextResponse.json({ ok: true, mode: test ? 'test' : 'everyone', totalRegistered: all.length, attempted: recipients.length, sent, skipped, failed, errors });
}

export async function GET(req: NextRequest) { return handle(req); }
export async function POST(req: NextRequest) { return handle(req); }
