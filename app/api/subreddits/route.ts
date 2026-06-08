import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getCompany } from '@/lib/upstash';
import { findSubreddits, findSubredditsGoCrazy } from '@/lib/claude';
import { SubredditMatch } from '@/types';

export const runtime = 'nodejs';
export const maxDuration = 120;

const BASE = 'https://arctic-shift.photon-reddit.com';
const CACHE_TTL = 60 * 60 * 24;

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
      `${BASE}/api/subreddits/search?subreddit=${encodeURIComponent(subreddit)}&limit=10`,
      { headers: { Accept: 'application/json' }, cache: 'no-store', signal: AbortSignal.timeout(6000) }
    );
    if (!res.ok) return 0;
    const json = await res.json();
    const data = (json.data as Record<string, unknown>[]) || [];
    const exact = data.find(d => String(d.display_name ?? '').toLowerCase() === subreddit.toLowerCase());
    return ((exact ?? data[0])?.subscribers as number) ?? 0;
  } catch { return 0; }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const email = session.user.email;
    const force = req.nextUrl.searchParams.get('refresh') === '1';
    const mode  = req.nextUrl.searchParams.get('mode') || 'standard'; // 'standard' | 'gocrazy'

    const company = await getCompany(email);
    if (!company || !company.description?.trim()) {
      return NextResponse.json({ noProfile: true });
    }

    // v2: Go Crazy schema changed (asymScore/insight/signals/...). Versioned key
    // abandons old-shape caches so a fresh build runs automatically on next view.
    const cacheKey = `treddit:subreddits:v3:${mode}:${email}`;

    if (!force) {
      try {
        const cached = await redis(['GET', cacheKey]) as string | null;
        if (cached) return NextResponse.json({ ...JSON.parse(cached), cached: true, company });
      } catch { /* cache miss */ }
    }

    if (mode === 'gocrazy') {
      const result = await findSubredditsGoCrazy(
        company.description.trim(),
        company.goal?.trim() || undefined,
      );
      // Enrich subscriber counts, then drop subs with < 10k members (too small for Go Crazy)
      const enriched = (await Promise.all(
        result.matches.map(async (m) => {
          const asym = (m as { asymScore?: number }).asymScore ?? 0;
          return { ...m, subscribers: await fetchSubscriberCount(m.subreddit), top: asym >= 7.5 };
        })
      )).filter(m => m.subscribers >= 10_000);
      const payload = { ...result, matches: enriched, generatedAt: new Date().toISOString() };
      try { await redis(['SET', cacheKey, JSON.stringify(payload), 'EX', String(CACHE_TTL)]); } catch { /* non-fatal */ }
      return NextResponse.json({ ...payload, company });
    }

    // Standard mode
    const result = await findSubreddits(
      company.description.trim(),
      company.goal?.trim() || undefined,
      company.website?.trim() || undefined,
            company.idealUser?.trim() || undefined,
    );
    const enriched: SubredditMatch[] = await Promise.all(
            result.matches.map(async (m) => ({ ...m, subscribers: await fetchSubscriberCount(m.subreddit) }))
    );
    const payload = { ...result, matches: enriched, generatedAt: new Date().toISOString() };
    try { await redis(['SET', cacheKey, JSON.stringify(payload), 'EX', String(CACHE_TTL)]); } catch { /* non-fatal */ }
    return NextResponse.json({ ...payload, company });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[subreddits]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
