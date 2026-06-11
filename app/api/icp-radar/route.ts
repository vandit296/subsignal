import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getCompany, consumeBuildQuota } from '@/lib/upstash';
import {
  buildIcpBatch, getTodayBatch, cacheTodayBatch, nextDropUtc,
  utcDate, isRecentDate, getBatchForDate, listAvailableDates,
} from '@/lib/icp-radar';

export const runtime = 'nodejs';
export const maxDuration = 300; // first build sweeps + scores; then it's daily-cached

export async function GET(req: NextRequest) {
  const session = await getSession();
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const today = utcDate();
  const dateParam = req.nextUrl.searchParams.get('date')?.trim();

  // ── History read: a past day (read-only — past batches are never rebuilt) ──
  if (dateParam && dateParam !== today) {
    if (!isRecentDate(dateParam)) {
      return NextResponse.json({
        error: 'out_of_range',
        message: 'ICP Radar history covers the last 3 days only.',
        availableDates: await listAvailableDates(email), nextDropUtc: nextDropUtc(),
      });
    }
    const past = await getBatchForDate(email, dateParam);
    const availableDates = await listAvailableDates(email);
    if (!past) {
      return NextResponse.json({ archived: true, empty: true, date: dateParam, availableDates, nextDropUtc: nextDropUtc() });
    }
    return NextResponse.json({ ...past, cached: true, archived: true, availableDates });
  }

  // ── Today: daily drip — one batch per UTC day, served from cache once built ──
  const cached = await getTodayBatch(email);
  if (cached) return NextResponse.json({ ...cached, cached: true, availableDates: await listAvailableDates(email) });

  const company = await getCompany(email);
  if (!company?.description?.trim()) {
    return NextResponse.json({ noProfile: true, nextDropUtc: nextDropUtc() });
  }

  // Building a batch costs a Claude sweep + person-scoring. Cap forced builds per
  // day so retries/refreshes can't burn the global LLM budget. Normal use hits
  // the daily cache after the first build of the day.
  if (!(await consumeBuildQuota(email, 'icp-radar', 3))) {
    return NextResponse.json(
      { error: 'quota_exceeded', message: "Today's batch is still being prepared — refresh in a moment.", nextDropUtc: nextDropUtc() },
      { status: 429 },
    );
  }

  try {
    const batch = await buildIcpBatch(
      { description: company.description, name: (company as { name?: string }).name, goal: (company as { goal?: string }).goal },
      email,
    );
    await cacheTodayBatch(email, batch);
    return NextResponse.json({ ...batch, cached: false, availableDates: await listAvailableDates(email) });
  } catch (err) {
    console.error('[icp-radar]', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'build_failed', message: 'Could not build your ICP batch — try again shortly.' }, { status: 502 });
  }
}
