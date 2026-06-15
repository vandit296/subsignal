import { NextRequest, NextResponse } from 'next/server';
import { getCronHeartbeat } from '@/lib/upstash';

export const runtime = 'nodejs';
export const maxDuration = 60;

const FOUNDER_EMAIL = 'vandit296@gmail.com';
const BASE = process.env.NEXTAUTH_URL || 'https://treddit.live';
const RESEND_KEY = process.env.RESEND_API_KEY!;
const FROM = process.env.RESEND_FROM ?? 'Treddit <brief@treddit.live>';

interface Result {
  name: string;
  category: string;
  status: 'pass' | 'fail';
  error?: string;
  code?: number;
}

async function hit(path: string, opts: { method?: string; headers?: Record<string, string>; body?: unknown; expect: number[] }): Promise<Result & { name: string; category: string }> {
  throw new Error('use runTest instead');
}

async function runTest(name: string, category: string, fn: () => Promise<void>): Promise<Result> {
  try {
    await fn();
    return { name, category, status: 'pass' };
  } catch (err) {
    return { name, category, status: 'fail', error: err instanceof Error ? err.message : String(err) };
  }
}

async function checkRoute(path: string, expectedCodes: number[], method = 'GET', body?: unknown, headers: Record<string, string> = {}, timeoutMs = 15_000): Promise<void> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(timeoutMs),
    cache: 'no-store',
  });
  if (!expectedCodes.includes(res.status)) {
    let detail = '';
    try { const j = await res.json() as { error?: string }; detail = j.error ? `: ${j.error}` : ''; } catch {}
    throw new Error(`HTTP ${res.status}${detail}`);
  }
}

async function pingRedis(): Promise<void> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) throw new Error('Redis env vars not set');
  const res = await fetch(`${url}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify([['PING']]),
    signal: AbortSignal.timeout(5_000),
  });
  if (!res.ok) throw new Error(`Redis HTTP ${res.status}`);
  const data = await res.json() as { result: string }[];
  if (data[0]?.result !== 'PONG') throw new Error(`Unexpected Redis response: ${data[0]?.result}`);
}

async function pingArcticShift(): Promise<void> {
  const res = await fetch('https://arctic-shift.photon-reddit.com/api/subreddits/search?subreddit=startups&limit=1', {
    signal: AbortSignal.timeout(10_000), cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Arctic Shift HTTP ${res.status}`);
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const tests: Array<{ name: string; category: string; fn: () => Promise<void> }> = [
    // ── Infrastructure ────────────────────────────────────────────────────────
    { name: 'Redis (Upstash)', category: 'Infrastructure', fn: pingRedis },
    { name: 'Anthropic API key', category: 'Infrastructure', fn: async () => { if (!process.env.ANTHROPIC_API_KEY) throw new Error('Not set'); } },
    { name: 'Resend API key', category: 'Infrastructure', fn: async () => { if (!RESEND_KEY) throw new Error('Not set'); } },
    { name: 'Exa API key', category: 'Infrastructure', fn: async () => { if (!process.env.EXA_API_KEY) throw new Error('Not set'); } },
    { name: 'Paddle API key',  category: 'Infrastructure', fn: async () => { if (!process.env.PADDLE_API_KEY)  throw new Error('Not set'); } },
    { name: 'Paddle price ID', category: 'Infrastructure', fn: async () => { if (!process.env.PADDLE_PRICE_ID) throw new Error('Not set'); } },
    { name: 'CRON_SECRET', category: 'Infrastructure', fn: async () => { if (!process.env.CRON_SECRET) throw new Error('Not set'); } },
    { name: 'Arctic Shift API', category: 'Infrastructure', fn: pingArcticShift },

    // ── SCAN ─────────────────────────────────────────────────────────────────
    // Expect 401 (needs auth) — proves route exists, not crashing
    { name: 'Radar — standard mode', category: 'Scan', fn: async () => checkRoute('/api/subreddits?mode=standard', [401]) },
    { name: 'Radar — go crazy mode', category: 'Scan', fn: async () => checkRoute('/api/subreddits?mode=gocrazy', [401]) },
    { name: 'Radar — guest mode', category: 'Scan', fn: async () => checkRoute('/api/subreddits-guest?description=test+saas', [200], 'GET', undefined, {}, 25_000) },
    { name: 'Radar — by URL', category: 'Scan', fn: async () => checkRoute('/api/subreddits-by-url?url=https://treddit.live', [200, 400], 'GET', undefined, {}, 25_000) },
    { name: 'Scout (analyze)', category: 'Scan', fn: async () => checkRoute('/api/analyze?subreddit=startups', [200, 401]) },

    // ── TRACK ─────────────────────────────────────────────────────────────────
    { name: 'Daily Brief (web)', category: 'Track', fn: async () => checkRoute('/api/brief', [200, 401]) },
    { name: 'Brief generate', category: 'Track', fn: async () => checkRoute('/api/brief/generate', [401, 400], 'POST') },
    { name: 'Feed (signal)', category: 'Track', fn: async () => checkRoute('/api/engage', [200], 'GET', undefined, {}, 25_000) },
    { name: 'Keyword Watch', category: 'Track', fn: async () => {
      // Exercise the REAL search path: correct param (keyword=), parse the body,
      // and fail unless a working Reddit source served results. A 200 with
      // source 'none' (soft failure) or 'exa' (broken index) must page us.
      const res = await fetch(`${BASE}/api/track?keyword=startup&period=1week`, { signal: AbortSignal.timeout(30_000), cache: 'no-store' });
      if (res.status !== 200) throw new Error(`HTTP ${res.status}`);
      const j = await res.json() as { source?: string; rawThreads?: number; error?: string };
      if (j.error) throw new Error(j.error);
      const good = ['arctic', 'reddit_rss', 'reddit_public'];
      if (!good.includes(j.source ?? 'none')) throw new Error(`degraded: source='${j.source ?? 'none'}' (expected Arctic Shift; Exa/none means keyword search is broken)`);
    } },
    { name: 'Relevant threads', category: 'Track', fn: async () => checkRoute('/api/threads/relevant', [200, 400, 401]) },

    // ── PUBLISH ───────────────────────────────────────────────────────────────
    { name: 'Distribute', category: 'Publish', fn: async () => checkRoute('/api/distribute', [401, 400], 'POST') },
    { name: 'Post predictor', category: 'Publish', fn: async () => checkRoute('/api/predict', [401, 400], 'POST') },
    { name: 'Similar posts', category: 'Publish', fn: async () => checkRoute('/api/post-similar', [401, 400, 200]) },

    // ── PLATFORM ──────────────────────────────────────────────────────────────
    { name: 'Geo detection', category: 'Platform', fn: async () => checkRoute('/api/geo', [200]) },
    { name: 'Onboarding API', category: 'Platform', fn: async () => checkRoute('/api/onboarding', [401, 400], 'POST') },
    { name: 'Command API', category: 'Platform', fn: async () => checkRoute('/api/command', [401, 400]) },
    { name: 'Alerts API', category: 'Platform', fn: async () => checkRoute('/api/alerts', [401, 400]) },
    { name: 'Thread comments', category: 'Platform', fn: async () => checkRoute('/api/thread-comments?id=test', [200, 400]) },

    // ── BILLING ───────────────────────────────────────────────────────────────
    { name: 'Checkout API', category: 'Billing', fn: async () => checkRoute('/api/billing/create-checkout', [401, 400], 'POST') },
    { name: 'Billing webhook', category: 'Billing', fn: async () => checkRoute('/api/billing/webhook', [400], 'POST') },
    { name: 'Extend trial', category: 'Billing', fn: async () => checkRoute('/api/extend-trial?token=test', [200, 302, 400, 401]) },

    // ── ADMIN ─────────────────────────────────────────────────────────────────
    { name: 'Admin users list', category: 'Admin', fn: async () => checkRoute('/api/admin/users', [401, 403]) },
    { name: 'Admin send brief', category: 'Admin', fn: async () => checkRoute('/api/admin/send-brief-now', [401, 403], 'POST') },

    // ── CRONS (routing only — no auth = 401, proves route is alive) ───────────
    { name: 'Cron: morning-brief', category: 'Crons', fn: async () => checkRoute('/api/cron/morning-brief', [401]) },
    { name: 'Cron: signal-feed', category: 'Crons', fn: async () => checkRoute('/api/cron/signal-feed', [401]) },
    { name: 'Cron: posts-of-day', category: 'Crons', fn: async () => checkRoute('/api/cron/posts-of-day', [401]) },
    // Real delivery check, not just reachability: alert if the daily email cron
    // hasn't actually completed a run in >25h (catches silent stalls/zero-sends).
    { name: 'Daily email ran (heartbeat)', category: 'Crons', fn: async () => {
      const hb = await getCronHeartbeat('posts-of-day');
      if (!hb) throw new Error('posts-of-day heartbeat missing — cron may never have completed a run');
      const ageH = (Date.now() - new Date(hb.at).getTime()) / 3_600_000;
      if (ageH > 25) throw new Error(`posts-of-day last completed ${ageH.toFixed(1)}h ago (expected <25h) — daily email is stalled`);
    } },
    { name: 'Cron: daily-digest', category: 'Crons', fn: async () => checkRoute('/api/cron/daily-digest', [401]) },
    { name: 'Cron: trial-emails', category: 'Crons', fn: async () => checkRoute('/api/cron/trial-emails', [401]) },
    { name: 'Cron: weekly-brief', category: 'Crons', fn: async () => checkRoute('/api/cron/weekly-brief', [401]) },
    { name: 'Cron: expand-subreddit-pool', category: 'Crons', fn: async () => checkRoute('/api/cron/expand-subreddit-pool', [401]) },
  ];

  const results: Result[] = await Promise.all(tests.map(t => runTest(t.name, t.category, t.fn)));

  const failures = results.filter(r => r.status === 'fail');
  const passing  = results.filter(r => r.status === 'pass');

  if (failures.length > 0) {
    const headline = failures.map(f => explain(f.name, f.error ?? '').title).slice(0, 2).join(' · ');
    const html = buildFailureEmail(failures, results);
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: FROM,
        to: FOUNDER_EMAIL,
        subject: `🔴 Treddit health — ${failures.length} thing${failures.length > 1 ? 's' : ''} need you: ${headline}${failures.length > 2 ? '…' : ''}`,
        html,
      }),
    });
  }

  return NextResponse.json({ ok: failures.length === 0, total: results.length, passing: passing.length, failing: failures.length, failures });
}

// Translate a technical check into plain English a non-engineer can act on.
function explain(name: string, error: string): { title: string; meaning: string } {
  const n = name.toLowerCase(), e = error || '';
  if (n.includes('resend')) return { title: 'Email sending is down', meaning: 'No emails — daily posts, briefs, trial reminders, alerts — can go out until this is fixed. Check RESEND_API_KEY in Vercel.' };
  if (n.includes('daily email')) return { title: 'Daily email has stalled', meaning: `Your Posts-of-the-Day email hasn't run in over a day, so users aren't getting it. (${e})` };
  if (n.includes('anthropic')) return { title: 'AI (Claude) is unavailable', meaning: 'Feed, scoring, ICP Radar and the AI brief will all stop working. Check ANTHROPIC_API_KEY in Vercel.' };
  if (n.includes('redis')) return { title: 'The database is unreachable', meaning: `The app can't read or write any data — users, companies, caches. Check Upstash. (${e})` };
  if (n.includes('arctic')) return { title: 'Reddit data source is down', meaning: 'Scout, Radar, Feed and ICP Radar can’t pull Reddit data — likely an Arctic Shift outage.' };
  if (n.includes('keyword') || e.includes('degraded')) return { title: 'Reddit search is degraded', meaning: e };
  if (n.includes('paddle')) return { title: 'Global payments misconfigured', meaning: 'International (Paddle) checkout may fail. Check the Paddle env vars in Vercel.' };
  if (n.includes('razorpay')) return { title: 'India payments misconfigured', meaning: 'Razorpay checkout may fail. Check the Razorpay env vars in Vercel.' };
  if (n.includes('webhook')) return { title: 'Payment webhook problem', meaning: `Purchases might not activate accounts. (${e})` };
  if (n.includes('extend trial')) return { title: 'Trial-extend link problem', meaning: `The "give me 3 more days" link may be broken. (${e})` };
  if (n.includes('cron')) return { title: `Scheduled job "${name.replace(/^Cron:\s*/i, '')}" not responding`, meaning: `A background job isn't reachable as expected. (${e})` };
  if (e.toLowerCase().includes('not set') || n.includes('secret') || n.includes('key') || n.includes('id')) return { title: `${name} is not configured`, meaning: `A required setting is missing in Vercel’s environment variables. (${e})` };
  return { title: name, meaning: e || 'This check failed.' };
}

function buildFailureEmail(failures: Result[], all: Result[]): string {
  // Plain-English issue cards
  const cards = failures.map(f => {
    const x = explain(f.name, f.error ?? '');
    return `<div style="background:#141417;border:1px solid #2a1414;border-left:3px solid #ef4444;border-radius:8px;padding:14px 16px;margin-bottom:10px;">
      <div style="font-size:15px;font-weight:600;color:#f0ece4;">${x.title}</div>
      <div style="font-size:13px;color:#b8b2a8;line-height:1.55;margin-top:5px;">${x.meaning}</div>
      <div style="font-size:11px;color:#5a5a5a;font-family:monospace;margin-top:7px;">${f.category} · ${(f.error ?? '').slice(0, 160)}</div>
    </div>`;
  }).join('');

  // "Everything else is fine" coverage, grouped by category so you trust the scope
  const cats = [...new Set(all.map(r => r.category))];
  const coverage = cats.map(c => {
    const items = all.filter(r => r.category === c);
    const ok = items.filter(r => r.status === 'pass').length;
    return `<span style="display:inline-block;font-size:12px;color:#9a948a;background:#16161a;border:0.5px solid #242428;border-radius:20px;padding:3px 11px;margin:0 6px 6px 0;">${c} ${ok}/${items.length}</span>`;
  }).join('');

  return `<!DOCTYPE html><html><body style="background:#0C0C0F;font-family:system-ui,-apple-system,sans-serif;padding:30px 16px;">
    <div style="max-width:580px;margin:0 auto;">
      <div style="font-size:11px;color:#5a5a5a;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:10px;">Treddit health check · ${new Date().toUTCString()}</div>
      <h1 style="color:#ef4444;font-size:22px;margin:0 0 6px;font-weight:600;">${failures.length} thing${failures.length > 1 ? 's need' : ' needs'} your attention</h1>
      <p style="color:#888;font-size:13px;margin:0 0 22px;">The other ${all.length - failures.length} of ${all.length} checks passed. Here's only what's broken and what to do:</p>
      ${cards}
      <div style="margin-top:22px;padding-top:16px;border-top:0.5px solid #1d1d20;">
        <div style="font-size:11px;color:#5a5a5a;letter-spacing:0.06em;text-transform:uppercase;margin-bottom:8px;">Everything checked (and how it's doing)</div>
        ${coverage}
      </div>
      <p style="color:#4a4a4a;font-size:11px;margin-top:18px;">Runs every 6 hours. No email means everything passed.</p>
    </div>
  </body></html>`;
}
