import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getCompany } from '@/lib/upstash';
import { findSubreddits } from '@/lib/claude';
import { SubredditMatch } from '@/types';

const BASE = 'https://arctic-shift.photon-reddit.com';
const CACHE_TTL = 60 * 60 * 24; // 24 hours

// ── Inline Redis helper (same pattern as lib/upstash.ts) ──────────────────────
async function redis(command: unknown[]): Promise<unknown> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) throw new Error('Redis env vars missing');
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(command),
    cache: 'no-store',
  });
  const json = await res.json() as { result: unknown; error?: string };
  if (json.error) throw new Error(`Redis error: ${json.error}`);
  return json.result;
}

async function fetchSubscriberCount(subreddit: string): Promise<number> {
  try {
    const res = await fetch(
      `${BASE}/api/subreddits/search?subreddit=${encodeURIComponent(subreddit)}&limit=1`,
      { headers: { Accept: 'application/json' }, cache: 'no-store' }
    );
    if (!res.ok) return 0;
    const json = await res.json();
    const data = json.data as Record<string, unknown>[];
    return (data?.[0]?.subscribers as number) ?? 0;
  } catch {
    return 0;
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const email = session.user.email;
    const force = req.nextUrl.searchParams.get('refresh') === '1';

    // Get company profile
    const company = await getCompany(email);
    if (!company || !company.description?.trim()) {
      return NextResponse.json({ noProfile: true });
    }

    // Check cache (unless force refresh)
    const cacheKey = `treddit:subreddits:${email}`;
    if (!force) {
      try {
        const cached = await redis(['GET', cacheKey]) as string | null;
        if (cached) {
          return NextResponse.json({ ...JSON.parse(cached), cached: true, company });
        }
      } catch {
        // Cache miss or Redis error — continue to generate
      }
    }

    // Generate fresh recommendations
    const result = await findSubreddits(
      company.description.trim(),
      company.goal?.trim() || undefined,
      company.website?.trim() || undefined
    );

    // Enrich with real subscriber counts
    const enriched: SubredditMatch[] = await Promise.all(
      result.matches.map(async (match) => ({
        ...match,
        subscribers: await fetchSubscriberCount(match.subreddit),
      }))
    );

    const payload = { ...result, matches: enriched, generatedAt: new Date().toISOString() };

    // Cache for 24 hours
    try {
      await redis(['SET', cacheKey, JSON.stringify(payload), 'EX', String(CACHE_TTL)]);
    } catch {
      // Cache write failure is non-fatal
    }

    return NextResponse.json({ ...payload, company });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[subreddits]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
