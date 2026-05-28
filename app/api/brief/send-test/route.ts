import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getLatestBrief, getUserEditionCount } from '@/lib/upstash';
import { sendMorningBrief } from '@/lib/email';

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const email = session.user.email;
  const brief = await getLatestBrief(email);
  if (!brief) {
    return NextResponse.json({ error: 'No brief found' }, { status: 404 });
  }

  const edition = await getUserEditionCount(email);
  const result = await sendMorningBrief(email, brief, edition);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({ ok: true, sentTo: email, edition });
}
