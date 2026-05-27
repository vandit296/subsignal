import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getBrief, markBriefViewed, hasBriefForToday } from '@/lib/upstash';

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date') ?? new Date().toISOString().slice(0, 10);

    const brief = await getBrief(session.user.email, date);
    const hasToday = await hasBriefForToday(session.user.email);

    if (brief && date === new Date().toISOString().slice(0, 10)) {
      await markBriefViewed(session.user.email, date);
    }

    return NextResponse.json({ brief, hasToday });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[/api/brief] ERROR:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
