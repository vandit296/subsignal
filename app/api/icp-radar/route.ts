import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getCompany, consumeBuildQuota } from '@/lib/upstash';
import { buildIcpBatch, getTodayBatch, cacheTodayBatch, nextDropUtc } from '@/lib/icp-radar';

export const runtime = 'nodejs';
export const maxDuration = 300; // first build sweeps + scores; then it's daily-cached

export async function GET(req: NextRequest) {
  const session = await getSession();
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Daily drip: one batch per UTC day. Once today's exists, always serve it.
  const cached = await getTodayBatch(email);
  if (cached) return NextResponse.json({ ...cached, cached: true });

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
    return NextResponse.json({ ...batch, cached: false });
  } catch (err) {
    console.error('[icp-radar]', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'build_failed', message: 'Could not build your ICP batch — try again shortly.' }, { status: 502 });
  }
}
