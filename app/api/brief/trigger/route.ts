import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: 'Server config error' }, { status: 500 });

  const baseUrl = process.env.NEXTAUTH_URL || 'https://treddit.live';
  try {
    const resp = await fetch(`${baseUrl}/api/brief/generate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${secret}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: session.user.email }),
    });
    const data = await resp.json();
    return NextResponse.json(data, { status: resp.status });
  } catch (err) {
    return NextResponse.json({ error: 'Generation failed' }, { status: 500 });
  }
}
