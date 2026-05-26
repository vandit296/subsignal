import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getBrief } from '@/lib/upstash';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const brief = await getBrief(email);
  if (!brief) {
    return NextResponse.json({ brief: null });
  }

  return NextResponse.json({ brief });
}
