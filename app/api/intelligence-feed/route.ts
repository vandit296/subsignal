import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getCompany } from '@/lib/upstash';
import { buildFeed, cacheFeed, getCachedFeed } from '@/lib/intelligence';

export const runtime = 'nodejs';
export const maxDuration = 300; // first build is slow; cron keeps it warm afterward

export async function GET(req: NextRequest) {
  const session = await getSession();
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const descOverride = searchParams.get('description')?.trim();   // test any company live
  const rebuild = searchParams.get('rebuild') === '1';

  // Serve cache fast (unless testing an override or forcing a rebuild)
  if (!descOverride && !rebuild) {
    const cached = await getCachedFeed(email);
    if (cached) return NextResponse.json({ ...cached, cached: true });
  }

  const company = descOverride
    ? { description: descOverride, name: searchParams.get('name') || undefined }
    : await getCompany(email);

  if (!company?.description) {
    return NextResponse.json({ error: 'no_company', message: 'Add your company in Command settings to build your intelligence feed.' });
  }

  const feed = await buildFeed(
    { description: company.description, name: (company as { name?: string }).name, goal: (company as { goal?: string }).goal },
    descOverride ? undefined : email,
  );
  if (!descOverride) await cacheFeed(email, feed);
  return NextResponse.json({ ...feed, cached: false });
}
