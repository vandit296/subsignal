import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getBrief, getNextEditionNumber } from '@/lib/upstash';
import { sendMorningBrief } from '@/lib/email';

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const email = session.user.email;
  const today = new Date().toISOString().split('T')[0];
  const brief = await getBrief(email, today);
  if (!brief) {
    return NextResponse.json({ error: 'No brief found for today' }, { status: 404 });
  }

  const edition = await getNextEditionNumber(email);
  const result = await sendMorningBrief(email, brief, Math.max(1, edition - 1));

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({ ok: true, sentTo: email, edition });
}
