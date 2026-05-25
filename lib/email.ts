import { ScoredThread } from '@/types';

const RESEND_API_KEY = process.env.RESEND_API_KEY!;
// Use verified custom domain — set RESEND_FROM env var to override (e.g. "Treddit <hello@treddit.app>")
// Falls back to onboarding@resend.dev (Resend test domain — only delivers to the Resend account owner's email)
const FROM = process.env.RESEND_FROM ?? 'Treddit <onboarding@resend.dev>';
const APP_URL = process.env.NEXTAUTH_URL ?? 'https://treddit-app.vercel.app';

async function send(to: string, subject: string, html: string) {
  if (!RESEND_API_KEY) {
    console.warn('[email] RESEND_API_KEY not set — skipping');
    return;
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: FROM, to, subject, html }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Resend error: ${err}`);
  }
  console.log(`[email] Sent "${subject}" → ${to}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. KEYWORD MATCH — sent immediately when new threads are found
// ─────────────────────────────────────────────────────────────────────────────

export async function sendKeywordAlert({
  to,
  productDescription,
  threads,
}: {
  to: string;
  productDescription: string;
  threads: ScoredThread[];
}) {
  if (!threads.length) return;
  const count = threads.length;
  const subject = count === 1
    ? `New Reddit thread matching your keywords`
    : `${count} new Reddit threads matching your keywords`;
  await send(to, subject, keywordAlertHtml({ productDescription, threads }));
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. SIGNAL FEED — sent every 12 hours as a grouped digest
// ─────────────────────────────────────────────────────────────────────────────

export async function sendSignalFeed({
  to,
  productDescription,
  threads,
}: {
  to: string;
  productDescription: string;
  threads: ScoredThread[];
}) {
  if (!threads.length) return;
  await send(to, `Your Reddit signal feed — ${threads.length} new threads`, signalFeedHtml({ productDescription, threads }));
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. POSTS OF THE DAY — daily top posts from tracked subreddits
// ─────────────────────────────────────────────────────────────────────────────

export interface RawPost {
  id: string;
  title: string;
  url: string;
  score: number;
  num_comments: number;
  subreddit: string;
  created_utc: number;
}

export async function sendPostsOfDay({
  to,
  subreddits,
  posts,
}: {
  to: string;
  subreddits: string[];
  posts: RawPost[];
}) {
  if (!posts.length) return;
  const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  await send(to, `Top Reddit posts in your communities — ${today}`, postsOfDayHtml({ subreddits, posts }));
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. HEALTH REPORT — daily bug/status report for the founder
// ─────────────────────────────────────────────────────────────────────────────

export interface HealthCheck {
  name: string;
  status: 'ok' | 'warn' | 'fail';
  detail: string;
}

export async function sendHealthReport({
  to,
  checks,
  stats,
}: {
  to: string;
  checks: HealthCheck[];
  stats: { users: number; subreddits: number; cachedThreads: number; lastScoredAt: string | null };
}) {
  const failCount = checks.filter(c => c.status === 'fail').length;
  const warnCount = checks.filter(c => c.status === 'warn').length;
  const subject = failCount > 0
    ? `🔴 Treddit health report — ${failCount} issue${failCount > 1 ? 's' : ''} detected`
    : warnCount > 0
    ? `🟡 Treddit health report — ${warnCount} warning${warnCount > 1 ? 's' : ''}`
    : `✅ Treddit health report — all systems operational`;
  await send(to, subject, healthReportHtml({ checks, stats }));
}

// ─────────────────────────────────────────────────────────────────────────────
// TEMPLATES
// ─────────────────────────────────────────────────────────────────────────────

// Resolve engagement text — new threads use strategyMove, old ones used engagementAngle
function getEngagementText(t: ScoredThread): string {
  return (t as any).strategyMove ?? t.engagementAngle ?? t.relevanceReason ?? '';
}

const CATEGORY_LABEL: Record<string, string> = {
  ideal_user:  'Ideal user',
  competition: 'Competitor',
  industry:    'Industry signal',
  interesting: 'Worth watching',
};

const CATEGORY_COLOR: Record<string, string> = {
  ideal_user:  '#2d5a27',
  competition: '#5a2727',
  industry:    '#27415a',
  interesting: '#3d3d27',
};

function shell(content: string) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
</head>
<body style="margin:0;padding:0;background:#080808;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#e2e2da;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#080808;padding:40px 16px;">
    <tr><td align="center">
      <table width="580" cellpadding="0" cellspacing="0" style="max-width:580px;width:100%;">
        ${content}
        <tr><td style="padding-top:40px;border-top:1px solid #1c1c1c;">
          <p style="margin:0;font-size:11px;color:#333;line-height:1.6;">
            You're receiving this from Treddit because you set up keyword monitoring.<br>
            Manage alerts at <a href="${APP_URL}/command" style="color:#444;">${APP_URL}/command</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function keywordAlertHtml({ productDescription, threads }: { productDescription: string; threads: ScoredThread[] }) {
  const rows = threads.map(t => `
    <tr>
      <td style="padding:18px 0;border-bottom:1px solid #161616;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding-bottom:8px;">
              <span style="
                display:inline-block;padding:2px 7px;border-radius:3px;
                background:${CATEGORY_COLOR[t.category] ?? '#1e1e1e'};
                color:#aaa;font-size:10px;font-family:monospace;letter-spacing:0.05em;
              ">${CATEGORY_LABEL[t.category] ?? t.category}</span>
              <span style="margin-left:8px;font-size:11px;color:#444;font-family:monospace;">
                r/${t.subreddit} · score ${t.relevanceScore}/10
              </span>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom:6px;">
              <a href="${t.url}" style="font-size:15px;font-weight:600;color:#e2e2da;text-decoration:none;line-height:1.4;">${t.title}</a>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom:6px;">
              <p style="margin:0;font-size:13px;color:#666;line-height:1.5;">${t.relevanceReason}</p>
            </td>
          </tr>
          <tr>
            <td>
              <p style="margin:0;font-size:13px;color:#5b85cc;line-height:1.5;">↳ ${getEngagementText(t)}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `).join('');

  return shell(`
    <tr><td style="padding-bottom:4px;">
      <span style="font-size:11px;font-family:monospace;color:#444;letter-spacing:0.1em;text-transform:uppercase;">Treddit · Keyword Alert</span>
    </td></tr>
    <tr><td style="padding-bottom:6px;">
      <h1 style="margin:0;font-size:22px;font-weight:600;color:#e2e2da;letter-spacing:-0.02em;">
        ${threads.length} new ${threads.length === 1 ? 'match' : 'matches'} found
      </h1>
    </td></tr>
    <tr><td style="padding-bottom:28px;">
      <p style="margin:0;font-size:13px;color:#555;">Tracking: ${productDescription}</p>
    </td></tr>
    <tr><td>
      <table width="100%" cellpadding="0" cellspacing="0">${rows}</table>
    </td></tr>
    <tr><td style="padding-top:24px;padding-bottom:32px;">
      <a href="${APP_URL}/watch" style="
        display:inline-block;padding:10px 18px;background:#161616;
        border:1px solid #252525;border-radius:6px;
        font-size:13px;color:#e2e2da;text-decoration:none;
      ">View all in Treddit →</a>
    </td></tr>
  `);
}

function signalFeedHtml({ productDescription, threads }: { productDescription: string; threads: ScoredThread[] }) {
  // Group by category
  const groups: Record<string, ScoredThread[]> = {};
  for (const t of threads) {
    if (!groups[t.category]) groups[t.category] = [];
    groups[t.category].push(t);
  }

  const order = ['ideal_user', 'competition', 'industry', 'interesting'];
  const sections = order
    .filter(cat => groups[cat]?.length)
    .map(cat => {
      const items = groups[cat].map(t => `
        <tr>
          <td style="padding:12px 0;border-bottom:1px solid #111;">
            <a href="${t.url}" style="font-size:14px;font-weight:500;color:#e2e2da;text-decoration:none;display:block;margin-bottom:4px;line-height:1.4;">${t.title}</a>
            <span style="font-size:11px;color:#444;font-family:monospace;">r/${t.subreddit} · ${t.relevanceScore}/10</span>
            <p style="margin:6px 0 0;font-size:12px;color:#555;line-height:1.4;">${getEngagementText(t)}</p>
          </td>
        </tr>
      `).join('');

      return `
        <tr><td style="padding-top:24px;padding-bottom:8px;">
          <span style="
            font-size:10px;font-family:monospace;letter-spacing:0.1em;
            text-transform:uppercase;color:#444;
          ">${CATEGORY_LABEL[cat]} · ${groups[cat].length}</span>
        </td></tr>
        <tr><td>
          <table width="100%" cellpadding="0" cellspacing="0">${items}</table>
        </td></tr>
      `;
    }).join('');

  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }) + ' UTC';

  return shell(`
    <tr><td style="padding-bottom:4px;">
      <span style="font-size:11px;font-family:monospace;color:#444;letter-spacing:0.1em;text-transform:uppercase;">Treddit · Signal Feed · ${timeStr}</span>
    </td></tr>
    <tr><td style="padding-bottom:6px;">
      <h1 style="margin:0;font-size:22px;font-weight:600;color:#e2e2da;letter-spacing:-0.02em;">
        ${threads.length} new signals
      </h1>
    </td></tr>
    <tr><td style="padding-bottom:28px;">
      <p style="margin:0;font-size:13px;color:#555;">Tracking: ${productDescription}</p>
    </td></tr>
    ${sections}
    <tr><td style="padding-top:28px;padding-bottom:32px;">
      <a href="${APP_URL}/watch" style="
        display:inline-block;padding:10px 18px;background:#161616;
        border:1px solid #252525;border-radius:6px;
        font-size:13px;color:#e2e2da;text-decoration:none;
      ">Open Treddit →</a>
    </td></tr>
  `);
}

function healthReportHtml({
  checks,
  stats,
}: {
  checks: HealthCheck[];
  stats: { users: number; subreddits: number; cachedThreads: number; lastScoredAt: string | null };
}) {
  const statusDot: Record<string, string> = {
    ok:   '<span style="color:#2d7a3e;font-family:monospace;">✓</span>',
    warn: '<span style="color:#7a6a2d;font-family:monospace;">⚠</span>',
    fail: '<span style="color:#7a2d2d;font-family:monospace;">✗</span>',
  };
  const statusBg: Record<string, string> = {
    ok:   '#0f1a12',
    warn: '#1a180f',
    fail: '#1a0f0f',
  };

  const checkRows = checks.map(c => `
    <tr>
      <td style="padding:10px 12px;background:${statusBg[c.status]};border-radius:4px;margin-bottom:4px;display:block;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td width="20">${statusDot[c.status]}</td>
            <td><span style="font-size:13px;color:#c8d0c8;font-weight:500;">${c.name}</span></td>
          </tr>
          <tr>
            <td></td>
            <td><span style="font-size:11px;color:#555;font-family:monospace;">${c.detail}</span></td>
          </tr>
        </table>
      </td>
    </tr>
    <tr><td style="height:4px;"></td></tr>
  `).join('');

  const lastScored = stats.lastScoredAt
    ? new Date(stats.lastScoredAt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }) + ' UTC'
    : 'Never';

  const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });

  return shell(`
    <tr><td style="padding-bottom:4px;">
      <span style="font-size:11px;font-family:monospace;color:#444;letter-spacing:0.1em;text-transform:uppercase;">Treddit · Daily Health Report · ${today}</span>
    </td></tr>
    <tr><td style="padding-bottom:28px;">
      <h1 style="margin:0;font-size:22px;font-weight:600;color:#e2e2da;letter-spacing:-0.02em;">System Status</h1>
    </td></tr>
    <tr><td style="padding-bottom:24px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td width="25%" style="text-align:center;padding:14px 8px;background:#0f0f0f;border-radius:4px;">
            <div style="font-size:22px;font-weight:600;color:#e2e2da;font-family:monospace;">${stats.users}</div>
            <div style="font-size:10px;color:#444;letter-spacing:0.08em;text-transform:uppercase;margin-top:4px;">Users</div>
          </td>
          <td width="4%"></td>
          <td width="25%" style="text-align:center;padding:14px 8px;background:#0f0f0f;border-radius:4px;">
            <div style="font-size:22px;font-weight:600;color:#e2e2da;font-family:monospace;">${stats.subreddits}</div>
            <div style="font-size:10px;color:#444;letter-spacing:0.08em;text-transform:uppercase;margin-top:4px;">Subreddits</div>
          </td>
          <td width="4%"></td>
          <td width="25%" style="text-align:center;padding:14px 8px;background:#0f0f0f;border-radius:4px;">
            <div style="font-size:22px;font-weight:600;color:#e2e2da;font-family:monospace;">${stats.cachedThreads}</div>
            <div style="font-size:10px;color:#444;letter-spacing:0.08em;text-transform:uppercase;margin-top:4px;">Threads</div>
          </td>
          <td width="4%"></td>
          <td width="13%" style="vertical-align:middle;padding:8px;">
            <div style="font-size:9px;color:#333;font-family:monospace;line-height:1.6;">Last scored<br>${lastScored}</div>
          </td>
        </tr>
      </table>
    </td></tr>
    <tr><td style="padding-bottom:8px;">
      <span style="font-size:10px;font-family:monospace;color:#333;letter-spacing:0.1em;text-transform:uppercase;">Checks</span>
    </td></tr>
    <tr><td>
      <table width="100%" cellpadding="0" cellspacing="0">${checkRows}</table>
    </td></tr>
    <tr><td style="padding-top:28px;padding-bottom:32px;">
      <a href="${APP_URL}/feed" style="
        display:inline-block;padding:10px 18px;background:#161616;
        border:1px solid #252525;border-radius:6px;
        font-size:13px;color:#e2e2da;text-decoration:none;
      ">Open Treddit →</a>
    </td></tr>
  `);
}

function postsOfDayHtml({ subreddits, posts }: { subreddits: string[]; posts: RawPost[] }) {
  const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });

  const rows = posts.map((p, i) => `
    <tr>
      <td style="padding:16px 0;border-bottom:1px solid #111;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td width="28" style="vertical-align:top;padding-top:2px;">
              <span style="font-size:13px;font-family:monospace;color:#333;">${String(i + 1).padStart(2, '0')}</span>
            </td>
            <td style="vertical-align:top;">
              <a href="${p.url}" style="font-size:14px;font-weight:500;color:#e2e2da;text-decoration:none;display:block;margin-bottom:5px;line-height:1.4;">${p.title}</a>
              <span style="font-size:11px;color:#444;font-family:monospace;">
                r/${p.subreddit}
                · ${p.score.toLocaleString()} upvotes
                · ${p.num_comments.toLocaleString()} comments
              </span>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `).join('');

  const subredditList = subreddits.map(s => `r/${s}`).join(', ');

  return shell(`
    <tr><td style="padding-bottom:4px;">
      <span style="font-size:11px;font-family:monospace;color:#444;letter-spacing:0.1em;text-transform:uppercase;">Treddit · Posts of the Day</span>
    </td></tr>
    <tr><td style="padding-bottom:6px;">
      <h1 style="margin:0;font-size:22px;font-weight:600;color:#e2e2da;letter-spacing:-0.02em;">
        Top posts today
      </h1>
    </td></tr>
    <tr><td style="padding-bottom:28px;">
      <p style="margin:0;font-size:13px;color:#555;">${today} · ${subredditList}</p>
    </td></tr>
    <tr><td>
      <table width="100%" cellpadding="0" cellspacing="0">${rows}</table>
    </td></tr>
    <tr><td style="padding-top:28px;padding-bottom:32px;">
      <a href="${APP_URL}/scout" style="
        display:inline-block;padding:10px 18px;background:#161616;
        border:1px solid #252525;border-radius:6px;
        font-size:13px;color:#e2e2da;text-decoration:none;
      ">Explore in Scout →</a>
    </td></tr>
  `);
}
