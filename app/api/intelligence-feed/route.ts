import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getCompany, consumeBuildQuota } from '@/lib/upstash';
import { buildFeed, cacheFeed, getCachedFeed, fetchUrlText, urlFeedKey, getFeedByKey, setFeedByKey } from '@/lib/intelligence';

export const runtime = 'nodejs';
export const maxDuration = 300; // first build is slow; cron keeps it warm afterward

export async function GET(req: NextRequest) {
  const session = await getSession();
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const descOverride = searchParams.get('description')?.trim();   // test any company live
  const urlParam = searchParams.get('url')?.trim();               // homepage "Find customers now"
  const rebuild = searchParams.get('rebuild') === '1';

  // Forced/override builds skip the cache and cost real money (Claude + Arctic
  // sweep) — cap them per user per day. Normal lazy builds are self-limiting
  // via the 12h cache and stay unmetered.
  const QUOTA_MSG = 'Daily rebuild limit reached — cached results are still available. Resets tomorrow.';

  // URL path: fetch the site, build a feed from it, cache by URL (shared).
  if (urlParam) {
    const key = urlFeedKey(urlParam);
    if (!rebuild) { const c = await getFeedByKey(key); if (c) return NextResponse.json({ ...c, cached: true }); }
    if (!(await consumeBuildQuota(email, 'intel-url', 10))) {
      return NextResponse.json({ error: 'quota_exceeded', message: QUOTA_MSG }, { status: 429 });
    }
    const text = await fetchUrlText(urlParam);
    if (!text || text.length < 80) {
      return NextResponse.json({ error: 'no_company', message: 'Could not read that URL — try another, or add your company in Command.' });
    }
    const name = urlParam.replace(/^https?:\/\//, '').replace(/^www\./, '').split(/[/?#]/)[0];
    const feed = await buildFeed({ description: text, name });
    await setFeedByKey(key, feed);
    return NextResponse.json({ ...feed, cached: false });
  }

  // Serve cache fast (unless testing an override or forcing a rebuild)
  if (!descOverride && !rebuild) {
    const cached = await getCachedFeed(email);
    if (cached) return NextResponse.json({ ...cached, cached: true });
  }

  if ((descOverride || rebuild) && !(await consumeBuildQuota(email, 'intel-feed', 10))) {
    return NextResponse.json({ error: 'quota_exceeded', message: QUOTA_MSG }, { status: 429 });
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
