import { NextRequest, NextResponse } from 'next/server';
import { getAllBriefUsers, getCompany } from '@/lib/upstash';
import { buildFeed, cacheFeed } from '@/lib/intelligence';

export const runtime = 'nodejs';
export const maxDuration = 300;

// Pre-builds each active user's intelligence feed and caches it, so /feed reads
// are instant. Heavy work (wide Arctic sweep + Claude scoring) happens here,
// off the request path.
export async function GET(req: NextRequest) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const users = await getAllBriefUsers();
  const results: Array<Record<string, unknown>> = [];

  // Cap per run to stay within the function budget; the cron repeats.
  for (const email of users.slice(0, 12)) {
    try {
      const c = await getCompany(email);
      if (!c?.description) { results.push({ email, skipped: 'no company profile' }); continue; }
      const feed = await buildFeed({ description: c.description, name: (c as { name?: string }).name, goal: (c as { goal?: string }).goal }, email);
      await cacheFeed(email, feed);
      results.push({ email, opportunities: feed.opportunities.length, indexed: feed.stats.indexed });
    } catch (e) {
      results.push({ email, error: e instanceof Error ? e.message.slice(0, 100) : 'error' });
    }
  }

  return NextResponse.json({ ok: true, built: results.length, results });
}
