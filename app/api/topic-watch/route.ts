import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { buildTopicFeed, getTopicFeed, cacheTopicFeed } from '@/lib/intelligence';
import { consumeBuildQuota } from '@/lib/upstash';

export const runtime = 'nodejs';
export const maxDuration = 300; // first build sweeps + scores; then cached

// Anonymous visitors get a small free allowance of NEW topic builds per day.
// Cached topics are always free (no Claude cost). Signed-in users build freely
// (still bounded by the global rate limit + the daily spend circuit-breaker).
const ANON_FREE_BUILDS = Number(process.env.TOPIC_ANON_FREE_PER_DAY ?? '1');

async function redis(cmd: unknown[]): Promise<unknown> {
  const url = process.env.UPSTASH_REDIS_REST_URL, token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(cmd),
      cache: 'no-store',
    });
    return ((await r.json()) as { result: unknown }).result;
  } catch { return null; }
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  const signedIn = !!session?.user?.email;

  const { searchParams } = new URL(req.url);
  const topic = (searchParams.get('topic') || searchParams.get('q') || '').trim();
  if (!topic) return NextResponse.json({ error: 'topic required' }, { status: 400 });

  // Force-rebuild bypasses the cache (extra Claude cost) — signed-in only.
  const rebuild = searchParams.get('rebuild') === '1' && signedIn;

  // Cached topics are free for everyone.
  if (!rebuild) {
    const cached = await getTopicFeed(topic);
    if (cached) return NextResponse.json({ ...cached, cached: true });
  }

  // Cache miss → this requires a paid build. Meter anonymous visitors per IP/day.
  if (!signedIn) {
    const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown';
    const key = `treddit:tw:anon:${ip}:${new Date().toISOString().slice(0, 10)}`;
    const n = (await redis(['INCR', key])) as number | null;
    if (n === 1) await redis(['EXPIRE', key, String(36 * 3600)]);
    if (n !== null && n > ANON_FREE_BUILDS) {
      return NextResponse.json(
        {
          error: `You've used your free ${ANON_FREE_BUILDS === 1 ? 'search' : 'searches'} for today. Sign in to keep watching topics.`,
          requiresAuth: true,
        },
        { status: 401 },
      );
    }
  }

  // Signed-in users get a generous but bounded daily build allowance — one user
  // hammering rebuilds/new topics could otherwise burn the global LLM daily cap.
  if (signedIn && !(await consumeBuildQuota(session!.user!.email!, 'topic-watch', 20))) {
    return NextResponse.json(
      { error: 'Daily topic build limit reached — cached topics still work. Resets tomorrow.' },
      { status: 429 },
    );
  }

  const feed = await buildTopicFeed(topic);
  await cacheTopicFeed(topic, feed);
  return NextResponse.json({ ...feed, cached: false });
}
