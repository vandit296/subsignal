import { ScoredThread } from '@/types';
import type { DailyBrief, BriefNarrative, MarketPulseItem } from '@/lib/upstash';

const RESEND_API_KEY = process.env.RESEND_API_KEY!;
// Use RESEND_FROM env var (e.g. "Treddit <hello@treddit.live>") — falls back to treddit.live sender
const FROM = process.env.RESEND_FROM ?? 'Treddit Brief <brief@treddit.live>';
const APP_URL = process.env.NEXTAUTH_URL ?? 'https://treddit.live';

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
// 1. KEYWORD MATCH ALERT
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
  await send(to, subject, keywordAlertHtml({ threads }));
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. SIGNAL FEED DIGEST
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
  await send(to, `Your Reddit signal feed — ${threads.length} new threads`, signalFeedHtml({ threads }));
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. POSTS OF THE DAY
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
// 4. HEALTH REPORT
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
// 5. MORNING BRIEF — newspaper dark design
// ─────────────────────────────────────────────────────────────────────────────

export async function sendMorningBrief(
  userEmail: string,
  brief: DailyBrief,
  edition = 1
): Promise<{ ok: boolean; error?: string }> {
  if (!RESEND_API_KEY) return { ok: false, error: 'RESEND_API_KEY not set' };

  const html = buildMorningBriefHtml(brief, edition);
  const date = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM,
        to: [userEmail],
        subject: `Morning Brief #${edition} — ${date}`,
        html,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return { ok: false, error: err };
    }

    return { ok: true };
  } catch (e: unknown) {
    return { ok: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SHARED TEMPLATES
// ─────────────────────────────────────────────────────────────────────────────

function getEngagementText(t: ScoredThread): string {
  return (t as any).strategyMove ?? t.engagementAngle ?? t.relevanceReason ?? '';
}

const CATEGORY_LABEL: Record<string, string> = {
  ideal_user: 'Ideal user',
  competition: 'Competitor',
  industry: 'Industry signal',
  interesting: 'Worth watching',
};

const CATEGORY_COLOR: Record<string, string> = {
  ideal_user: '#2d5a27',
  competition: '#5a2727',
  industry: '#27415a',
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

function keywordAlertHtml({ threads }: { threads: ScoredThread[] }) {
  const rows = threads.map(t => `
<tr>
<td style="padding:18px 0;border-bottom:1px solid #161616;">
<table width="100%" cellpadding="0" cellspacing="0">
<tr>
<td style="padding-bottom:8px;">
<span style="display:inline-block;padding:2px 7px;border-radius:3px;background:${CATEGORY_COLOR[t.category] ?? '#1e1e1e'};color:#aaa;font-size:10px;font-family:monospace;letter-spacing:0.05em;">${CATEGORY_LABEL[t.category] ?? t.category}</span>
<span style="margin-left:8px;font-size:11px;color:#444;font-family:monospace;">r/${t.subreddit} · score ${t.relevanceScore}/10</span>
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
<tr><td style="padding-bottom:28px;">
<h1 style="margin:0;font-size:22px;font-weight:600;color:#e2e2da;letter-spacing:-0.02em;">
${threads.length} new ${threads.length === 1 ? 'match' : 'matches'} found
</h1>
</td></tr>
<tr><td>
<table width="100%" cellpadding="0" cellspacing="0">${rows}</table>
</td></tr>
<tr><td style="padding-top:24px;padding-bottom:32px;">
<a href="${APP_URL}/watch" style="display:inline-block;padding:10px 18px;background:#161616;border:1px solid #252525;border-radius:6px;font-size:13px;color:#e2e2da;text-decoration:none;">View all in Treddit →</a>
</td></tr>
`);
}

function signalFeedHtml({ threads }: { threads: ScoredThread[] }) {
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
<span style="font-size:10px;font-family:monospace;letter-spacing:0.1em;text-transform:uppercase;color:#444;">${CATEGORY_LABEL[cat]} · ${groups[cat].length}</span>
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
<tr><td style="padding-bottom:28px;">
<h1 style="margin:0;font-size:22px;font-weight:600;color:#e2e2da;letter-spacing:-0.02em;">
${threads.length} new signals
</h1>
</td></tr>
${sections}
<tr><td style="padding-top:28px;padding-bottom:32px;">
<a href="${APP_URL}/watch" style="display:inline-block;padding:10px 18px;background:#161616;border:1px solid #252525;border-radius:6px;font-size:13px;color:#e2e2da;text-decoration:none;">Open Treddit →</a>
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
    ok: '<span style="color:#2d7a3e;font-family:monospace;">✓</span>',
    warn: '<span style="color:#7a6a2d;font-family:monospace;">⚠</span>',
    fail: '<span style="color:#7a2d2d;font-family:monospace;">✗</span>',
  };
  const statusBg: Record<string, string> = {
    ok: '#0f1a12',
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
<a href="${APP_URL}/feed" style="display:inline-block;padding:10px 18px;background:#161616;border:1px solid #252525;border-radius:6px;font-size:13px;color:#e2e2da;text-decoration:none;">Open Treddit →</a>
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
<span style="font-size:11px;color:#444;font-family:monospace;">r/${p.subreddit} · ${p.score.toLocaleString()} upvotes · ${p.num_comments.toLocaleString()} comments</span>
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
<h1 style="margin:0;font-size:22px;font-weight:600;color:#e2e2da;letter-spacing:-0.02em;">Top posts today</h1>
</td></tr>
<tr><td style="padding-bottom:28px;">
<p style="margin:0;font-size:13px;color:#555;">${today} · ${subredditList}</p>
</td></tr>
<tr><td>
<table width="100%" cellpadding="0" cellspacing="0">${rows}</table>
</td></tr>
<tr><td style="padding-top:28px;padding-bottom:32px;">
<a href="${APP_URL}/scout" style="display:inline-block;padding:10px 18px;background:#161616;border:1px solid #252525;border-radius:6px;font-size:13px;color:#e2e2da;text-decoration:none;">Explore in Scout →</a>
</td></tr>
`);
}

// ─────────────────────────────────────────────────────────────────────────────
// MORNING BRIEF HTML TEMPLATE
// ─────────────────────────────────────────────────────────────────────────────

const BEAT_COLORS: Record<string, { label: string; color: string }> = {
  hero:    { label: 'LEAD STORY', color: '#FF6B35' },
  signal:  { label: 'SIGNAL',     color: '#60A5FA' },
  tension: { label: 'DEBATE',     color: '#FBBF24' },
  mood:    { label: 'TRENDING',   color: '#4ADE80' },
};

function getBeatLabel(type: string): { label: string; color: string } {
  return BEAT_COLORS[type] ?? { label: 'SIGNAL', color: '#60A5FA' };
}

function pulseChips(items: MarketPulseItem[]): string {
  if (!items || items.length === 0) return '';
  const chips = items.map(item => {
    const up = item.change >= 0;
    const color = up ? '#4ADE80' : '#F87171';
    const bg = up ? '#0D2B1A' : '#2B0D0D';
    const border = up ? '#1A4A2E' : '#4A1A1A';
    return `<span style="display:inline-block;font-size:11px;font-weight:700;padding:3px 10px;border-radius:3px;background:${bg};color:${color};border:1px solid ${border};margin:0 4px 4px 0;">${item.label} ${up ? '▲' : '▼'} ${Math.abs(item.change).toFixed(1)}%</span>`;
  }).join('');
  return `
    <div style="padding:16px 32px 12px;border-bottom:1px solid #1E1E1E;">
      ${chips}
    </div>`;
}

function narrativeBlock(narrative: BriefNarrative, isLead: boolean): string {
  const beat = getBeatLabel(narrative.type);
  const lede = narrative.synthesis?.split('\n\n')[0] ?? '';
  const shortLede = lede.split('. ').slice(0, 2).join('. ').trim() + '.';
  const threads = (narrative.threads ?? []).slice(0, 3);
  const srcLine = [...new Set(threads.map(t => `r/${t.subreddit}`))].join(' · ');

  const chips = threads.map(t =>
    `<a href="${t.url}" style="display:inline-block;font-size:10px;padding:3px 9px;border-radius:3px;background:#191919;color:#666;border:1px solid #2A2A2A;text-decoration:none;margin:0 4px 4px 0;white-space:nowrap;"><span style="color:#FF4500;font-weight:600;">r/${t.subreddit}</span> <span style="color:#333;">·</span> ${t.score.toLocaleString()}↑ <span style="color:#333;">·</span> ${t.numComments}c</a>`
  ).join('');

  const headlineSize = isLead ? '20px' : '15px';
  const padding = isLead ? '28px 32px 24px' : '22px 32px 18px';
  const borderBottom = isLead ? 'border-bottom:1px solid #1E1E1E;' : '';

  return `
    <div style="padding:${padding};${borderBottom}">
      <div style="margin-bottom:10px;">
        <span style="display:inline-block;font-size:9px;font-weight:800;letter-spacing:0.12em;padding:2px 8px;border-radius:2px;background:#1A1A1A;color:${beat.color};border:1px solid #2A2A2A;">${beat.label}</span>
        ${srcLine ? `<span style="font-size:10px;color:#444;margin-left:8px;">${srcLine}</span>` : ''}
      </div>

      <div style="font-size:${headlineSize};font-weight:700;color:#F0EBE0;line-height:1.3;font-family:Georgia,'Times New Roman',serif;margin-bottom:${isLead ? '14px' : '10px'};">
        ${narrative.headline}
      </div>

      ${isLead && shortLede ? `<div style="font-size:13px;color:#888;line-height:1.75;margin-bottom:14px;">${shortLede}</div>` : ''}

      ${narrative.implication ? `
      <div style="padding:10px 14px;border-left:2px solid ${beat.color}33;background:#0A0A0A;border-radius:0 4px 4px 0;margin-bottom:12px;">
        <div style="font-size:8px;font-weight:700;letter-spacing:0.12em;color:#3A3A3A;margin-bottom:5px;">WHY IT MATTERS</div>
        <div style="font-size:12px;color:#777;line-height:1.6;">${narrative.implication}</div>
      </div>` : ''}

      ${chips ? `<div style="margin-top:4px;">${chips}</div>` : ''}
    </div>`;
}

function buildMorningBriefHtml(brief: DailyBrief, edition: number): string {
  const date = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  const signals = brief.signals ?? [];

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Treddit Morning Brief</title>
</head>
<body style="margin:0;padding:0;background:#0C0C0C;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:600px;margin:0 auto;background:#0C0C0C;">

    <!-- Header -->
    <div style="padding:24px 32px 16px;border-bottom:2px solid #FF6B35;">
      <div style="font-size:9px;font-weight:700;letter-spacing:0.15em;color:#FF6B35;margin-bottom:6px;">TREDDIT INTELLIGENCE</div>
      <div style="display:flex;justify-content:space-between;align-items:baseline;">
        <div style="font-size:24px;font-weight:900;color:#F5F0E8;letter-spacing:-0.04em;font-family:Georgia,'Times New Roman',serif;">Morning Brief</div>
        <div style="font-size:10px;color:#444;">Edition #${edition}</div>
      </div>
      <div style="font-size:11px;color:#555;margin-top:4px;">
        ${date}
        ${brief.narrativeCount > 0 ? ` &middot; ${brief.narrativeCount} narratives` : ''}
        ${brief.threadCount > 0 ? ` &middot; ${brief.threadCount} threads` : ''}
      </div>
    </div>

    <!-- Market Pulse -->
    ${pulseChips(brief.pulse ?? [])}

    <!-- Lead story -->
    ${brief.hero ? narrativeBlock(brief.hero, true) : ''}

    <!-- Signals divider -->
    ${signals.length > 0 ? `
    <div style="padding:12px 32px 8px;border-top:1px solid #1A1A1A;">
      <span style="font-size:9px;font-weight:700;letter-spacing:0.12em;color:#3A3A3A;">MORE SIGNALS</span>
    </div>` : ''}

    <!-- Signal stories -->
    ${signals.map((s, i) => `
    <div style="${i < signals.length - 1 ? 'border-bottom:1px solid #161616;' : ''}">
      ${narrativeBlock(s, false)}
    </div>`).join('')}

    <!-- Footer -->
    <div style="padding:20px 32px 28px;border-top:1px solid #1A1A1A;text-align:center;">
      <div style="font-size:10px;color:#2E2E2E;line-height:1.7;">
        Generated ${brief.generatedAt ? new Date(brief.generatedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : 'today'} &middot; Powered by Reddit + Claude<br />
        <a href="${APP_URL}/brief" style="color:#444;text-decoration:none;">View in browser</a>
        &nbsp;&middot;&nbsp;
        <a href="${APP_URL}/settings" style="color:#444;text-decoration:none;">Manage preferences</a>
      </div>
    </div>

  </div>
</body>
</html>`;
}
