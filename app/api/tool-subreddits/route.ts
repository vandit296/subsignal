import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { isLifetimeAccount } from '@/lib/upstash';
import { findSubreddits, findSubredditsGoCrazy } from '@/lib/claude';

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
  if (!q) return NextResponse.json({ error: 'Paste a startup description.' }, { status: 400 });

  const [std, crazy] = await Promise.allSettled([findSubreddits(q), findSubredditsGoCrazy(q)]);

  type M = { subreddit: string; assessment?: string; why?: string; insight?: string };
  const fit = std.status === 'fulfilled' ? ((std.value.matches || []) as M[]).slice(0, 8) : [];
  const gems = crazy.status === 'fulfilled' ? ((crazy.value.matches || []) as M[]).slice(0, 6) : [];

  return NextResponse.json({
    fit: fit.map(m => ({ sub: m.subreddit, why: m.assessment || m.why || '' })),
    gems: gems.map(m => ({ sub: m.subreddit, why: m.insight || m.why || '' })),
  });
}
