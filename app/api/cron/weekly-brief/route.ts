import { NextRequest, NextResponse } from 'next/server';
import { getAllBriefUsers } from '@/lib/upstash';

export async function GET(req: NextRequest) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get all users who have an active subscription
  const users = await getAllBriefUsers();

  const results: { email: string; ok: boolean; error?: string }[] = [];
  const baseUrl = process.env.NEXTAUTH_URL || 'https://treddit.live';

  for (const email of users) {
    try {
      const res = await fetch(`${baseUrl}/api/brief/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.CRON_SECRET}`,
        },
        body: JSON.stringify({ email }),
      });
      results.push({ email, ok: res.ok });
    } catch (err) {
      results.push({ email, ok: false, error: String(err) });
    }
  }

  return NextResponse.json({ results });
}
