import { NextRequest, NextResponse } from 'next/server';

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

async function checkRoute(path: string, expectedCodes: number[], method = 'GET', body?: unknown, headers: Record<string, string> = {}): Promise<void> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(15_000),
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
    { name: 'Stripe key', category: 'Infrastructure', fn: async () => { if (!process.env.STRIPE_SECRET_KEY) throw new Error('Not set'); } },
    { name: 'CRON_SECRET', category: 'Infrastructure', fn: async () => { if (!process.env.CRON_SECRET) throw new Error('Not set'); } },
    { name: 'Arctic Shift API', category: 'Infrastructure', fn: pingArcticShift },

    // ── SCAN ─────────────────────────────────────────────────────────────────
    // Expect 401 (needs auth) — proves route exists, not crashing
    { name: 'Radar — standard mode', category: 'Scan', fn: async () => checkRoute('/api/subreddits?mode=standard', [401]) },
    { name: 'Radar — go crazy mode', category: 'Scan', fn: async () => checkRoute('/api/subreddits?mode=gocrazy', [401]) },
    { name: 'Radar — guest mode', category: 'Scan', fn: async () => checkRoute('/api/subreddits-guest?description=test+saas', [200]) },
    { name: 'Radar — by URL', category: 'Scan', fn: async () => checkRoute('/api/subreddits-by-url?url=https://treddit.live', [200, 400]) },
    { name: 'Scout (analyze)', category: 'Scan', fn: async () => checkRoute('/api/analyze?subreddit=startups', [200, 401]) },

    // ── TRACK ─────────────────────────────────────────────────────────────────
    { name: 'Daily Brief (web)', category: 'Track', fn: async () => checkRoute('/api/brief', [200, 401]) },
    { name: 'Brief generate', category: 'Track', fn: async () => checkRoute('/api/brief/generate', [401, 400], 'POST') },
    { name: 'Feed (signal)', category: 'Track', fn: async () => checkRoute('/api/engage', [200]) },
    { name: 'Keyword Watch', category: 'Track', fn: async () => checkRoute('/api/track?q=test', [200, 401, 400]) },
    { name: 'Relevant threads', category: 'Track', fn: async () => checkRoute('/api/threads/relevant', [200, 400, 401]) },

    // ── PUBLISH ───────────────────────────────────────────────────────────────
    { name: 'Distribute', category: 'Publish', fn: async () => checkRoute('/api/distribute', [401, 400], 'POST') },
    { name: 'Post predictor', category: 'Publish', fn: async () => checkRoute('/api/predict', [401, 400], 'POST') },
    { name: 'Similar posts', category: 'Publish', fn: async () => checkRoute('/api/post-similar', [401, 400], 'POST') },

    // ── PLATFORM ──────────────────────────────────────────────────────────────
    { name: 'Geo detection', category: 'Platform', fn: async () => checkRoute('/api/geo', [200]) },
    { name: 'Onboarding API', category: 'Platform', fn: async () => checkRoute('/api/onboarding', [401, 400], 'POST') },
    { name: 'Command API', category: 'Platform', fn: async () => checkRoute('/api/command', [401, 400]) },
    { name: 'Alerts API', category: 'Platform', fn: async () => checkRoute('/api/alerts', [401, 400]) },
    { name: 'Thread comments', category: 'Platform', fn: async () => checkRoute('/api/thread-comments?id=test', [200, 400]) },

    // ── BILLING ───────────────────────────────────────────────────────────────
    { name: 'Checkout API', category: 'Billing', fn: async () => checkRoute('/api/billing/create-checkout', [401, 400], 'POST') },
    { name: 'Billing webhook', category: 'Billing', fn: async () => checkRoute('/api/billing/webhook', [400], 'POST') },
    { name: 'Extend trial', category: 'Billing', fn: async () => checkRoute('/api/extend-trial?token=test', [400, 401]) },

    // ── ADMIN ─────────────────────────────────────────────────────────────────
    { name: 'Admin users list', category: 'Admin', fn: async () => checkRoute('/api/admin/users', [401, 403]) },
    { name: 'Admin send brief', category: 'Admin', fn: async () => checkRoute('/api/admin/send-brief-now', [401, 403], 'POST') },

    // ── CRONS (routing only — no auth = 401, proves route is alive) ───────────
    { name: 'Cron: morning-brief', category: 'Crons', fn: async () => checkRoute('/api/cron/morning-brief', [401]) },
    { name: 'Cron: signal-feed', category: 'Crons', fn: async () => checkRoute('/api/cron/signal-feed', [401]) },
    { name: 'Cron: posts-of-day', category: 'Crons', fn: async () => checkRoute('/api/cron/posts-of-day', [401]) },
    { name: 'Cron: daily-digest', category: 'Crons', fn: async () => checkRoute('/api/cron/daily-digest', [401]) },
    { name: 'Cron: trial-emails', category: 'Crons', fn: async () => checkRoute('/api/cron/trial-emails', [401]) },
    { name: 'Cron: weekly-brief', category: 'Crons', fn: async () => checkRoute('/api/cron/weekly-brief', [401]) },
  ];

  const results: Result[] = await Promise.all(tests.map(t => runTest(t.name, t.category, t.fn)));

  const failures = results.filter(r => r.status === 'fail');
  const passing  = results.filter(r => r.status === 'pass');

  if (failures.length > 0) {
    const html = buildFailureEmail(failures, passing.length, results.length);
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: FROM,
        to: FOUNDER_EMAIL,
        subject: `⚠️ Treddit: ${failures.length} feature${failures.length > 1 ? 's' : ''} failing`,
        html,
      }),
    });
  }

  return NextResponse.json({ ok: failures.length === 0, total: results.length, passing: passing.length, failing: failures.length, failures });
}

function buildFailureEmail(failures: Result[], passing: number, total: number): string {
  const rows = failures.map(f => `
    <tr>
      <td style="padding:10px 14px;border-bottom:1px solid #1a1a1a;font-size:13px;color:#f0ece4;font-weight:500;">${f.name}</td>
      <td style="padding:10px 14px;border-bottom:1px solid #1a1a1a;font-size:11px;color:#888;font-family:monospace;">${f.category}</td>
      <td style="padding:10px 14px;border-bottom:1px solid #1a1a1a;font-size:12px;color:#ef4444;">${f.error ?? 'Unknown error'}</td>
    </tr>`).join('');

  return `<!DOCTYPE html><html><body style="background:#0d0d0f;font-family:system-ui,sans-serif;padding:32px;">
    <div style="max-width:560px;margin:0 auto;">
      <div style="font-size:11px;color:#666;margin-bottom:8px;letter-spacing:0.1em;text-transform:uppercase;">Treddit · Feature test · ${new Date().toUTCString()}</div>
      <h2 style="color:#ef4444;font-size:20px;margin:0 0 4px;">⚠️ ${failures.length} feature${failures.length > 1 ? 's' : ''} failing</h2>
      <p style="color:#888;font-size:13px;margin:0 0 24px;">${passing} of ${total} checks passing. Only failures shown.</p>
      <table style="width:100%;border-collapse:collapse;background:#111;border-radius:8px;overflow:hidden;">
        <thead><tr style="background:#1a1a1a;">
          <th style="padding:10px 14px;text-align:left;font-size:11px;color:#666;letter-spacing:0.06em;text-transform:uppercase;">Feature</th>
          <th style="padding:10px 14px;text-align:left;font-size:11px;color:#666;letter-spacing:0.06em;text-transform:uppercase;">Category</th>
          <th style="padding:10px 14px;text-align:left;font-size:11px;color:#666;letter-spacing:0.06em;text-transform:uppercase;">Error</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <p style="color:#555;font-size:11px;margin-top:16px;">No email = all clear. Next check in 3h.</p>
    </div>
  </body></html>`;
}
