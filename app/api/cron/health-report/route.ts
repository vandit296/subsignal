import { NextRequest, NextResponse } from 'next/server';
import { getAlertConfig, getRelevantThreads } from '@/lib/upstash';
import { sendHealthReport, HealthCheck } from '@/lib/email';

const FOUNDER_EMAIL = 'vandit296@gmail.com';
const APP_URL = process.env.NEXTAUTH_URL ?? 'https://treddit.live';

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const checks: HealthCheck[] = [];
  const stats = { users: 0, subreddits: 0, cachedThreads: 0, lastScoredAt: null as string | null };

  // ── 1. Upstash / alert config ─────────────────────────────────────────────
  let config: Awaited<ReturnType<typeof getAlertConfig>> = null;
  try {
    config = await getAlertConfig();
    if (config) {
      stats.users = 1; // single-tenant for now
      stats.subreddits = config.subreddits.length;
      checks.push({
        name: 'Upstash connection',
        status: 'ok',
        detail: `Alert config loaded — ${config.subreddits.length} subreddit(s) monitored`,
      });
    } else {
      checks.push({
        name: 'Upstash connection',
        status: 'warn',
        detail: 'Connected but no alert config found — user may not have completed onboarding',
      });
    }
  } catch (err) {
    checks.push({
      name: 'Upstash connection',
      status: 'fail',
      detail: `Failed to connect: ${(err as Error).message}`,
    });
  }

  // ── 2. Cached threads ─────────────────────────────────────────────────────
  if (config?.subreddits.length) {
    let totalThreads = 0;
    let oldestScore: string | null = null;
    let anyEmpty = false;

    for (const sub of config.subreddits) {
      try {
        const threads = await getRelevantThreads(sub);
        totalThreads += threads.length;
        if (threads.length === 0) anyEmpty = true;
        const latest = threads[0]?.foundAt;
        if (latest && (!oldestScore || latest > oldestScore)) oldestScore = latest;
      } catch {
        anyEmpty = true;
      }
    }

    stats.cachedThreads = totalThreads;
    stats.lastScoredAt = oldestScore;

    if (anyEmpty) {
      checks.push({
        name: 'Signal cache',
        status: 'warn',
        detail: `${totalThreads} total cached threads — at least one subreddit has no cached threads`,
      });
    } else {
      checks.push({
        name: 'Signal cache',
        status: 'ok',
        detail: `${totalThreads} threads cached across ${config.subreddits.length} subreddit(s)`,
      });
    }

    // ── 3. Stale cache check ───────────────────────────────────────────────
    if (oldestScore) {
      const ageHours = (Date.now() - new Date(oldestScore).getTime()) / 3_600_000;
      if (ageHours > 12) {
        checks.push({
          name: 'Cache freshness',
          status: 'warn',
          detail: `Last scored ${Math.round(ageHours)}h ago — threads may be stale`,
        });
      } else {
        checks.push({
          name: 'Cache freshness',
          status: 'ok',
          detail: `Last scored ${Math.round(ageHours)}h ago`,
        });
      }
    }
  }

  // ── 4. Signal feed endpoint ───────────────────────────────────────────────
  try {
    const res = await fetch(`${APP_URL}/api/engage`, {
      headers: { 'x-health-check': '1' },
      signal: AbortSignal.timeout(10_000),
    });
    if (res.ok) {
      checks.push({ name: 'Signal feed API (/api/engage)', status: 'ok', detail: `HTTP ${res.status}` });
    } else {
      checks.push({ name: 'Signal feed API (/api/engage)', status: 'fail', detail: `HTTP ${res.status}` });
    }
  } catch (err) {
    checks.push({ name: 'Signal feed API (/api/engage)', status: 'fail', detail: (err as Error).message });
  }

  // ── 5. Resend API key present ─────────────────────────────────────────────
  if (process.env.RESEND_API_KEY) {
    checks.push({ name: 'Resend API key', status: 'ok', detail: 'Key is set' });
  } else {
    checks.push({ name: 'Resend API key', status: 'fail', detail: 'RESEND_API_KEY env var is missing' });
  }

  // ── 6. Anthropic API key present ─────────────────────────────────────────
  if (process.env.ANTHROPIC_API_KEY) {
    checks.push({ name: 'Anthropic API key', status: 'ok', detail: 'Key is set' });
  } else {
    checks.push({ name: 'Anthropic API key', status: 'fail', detail: 'ANTHROPIC_API_KEY env var is missing' });
  }

  // ── Send report ───────────────────────────────────────────────────────────
  try {
    await sendHealthReport({ to: FOUNDER_EMAIL, checks, stats });
  } catch (err) {
    console.error('[health-report] Failed to send email:', err);
  }

  const failCount = checks.filter(c => c.status === 'fail').length;
  return NextResponse.json({ ok: failCount === 0, checks, stats });
}
