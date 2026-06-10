import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { isLifetimeAccount } from '@/lib/upstash';
import { findSubreddits, findSubredditsGoCrazy } from '@/lib/claude';
import { fetchUrlText } from '@/lib/intelligence';

export const runtime = 'nodejs';
export const maxDuration = 120;

// Internal, owner-only: paste a startup description → best-fit subs (Radar) +
// non-obvious gems (Go Crazy), for quick copy-paste replies.
export async function GET(req: NextRequest) {
  const session = await getSession();
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isLifetimeAccount(email)) return NextResponse.json({ error: 'Owner-only tool.' }, { status: 403 });

  const q = (req.nextUrl.searchParams.get('q') || '').trim();
  if (!q) return NextResponse.json({ error: 'Paste a startup description or company URL.' }, { status: 400 });

  // If they pasted a URL (no spaces, has a dot), fetch the page (SSRF-safe) and use it.
  const isUrl = /^https?:\/\//i.test(q) || (/^[^\s]+\.[^\s]{2,}$/.test(q) && !q.includes(' '));
  let description = q;
  let urlContent: string | undefined;
  if (isUrl) {
    const text = await fetchUrlText(q);
    if (text) { urlContent = text; description = `Company URL: ${q}`; }
  }
  const crazyInput = urlContent ? `${description}\n\n${urlContent}` : description;

  const [std, crazy] = await Promise.allSettled([
    findSubreddits(description, undefined, urlContent),
    findSubredditsGoCrazy(crazyInput),
  ]);

  type M = { subreddit: string; assessment?: string; why?: string; insight?: string };
  const fit = std.status === 'fulfilled' ? ((std.value.matches || []) as M[]).slice(0, 8) : [];
  const gems = crazy.status === 'fulfilled' ? ((crazy.value.matches || []) as M[]).slice(0, 6) : [];

  return NextResponse.json({
    fit: fit.map(m => ({ sub: m.subreddit, short: m.assessment || m.why || '', long: m.why || m.assessment || '' })),
    gems: gems.map(m => ({ sub: m.subreddit, short: m.insight || m.why || '', long: m.insight || m.why || '' })),
  });
}
