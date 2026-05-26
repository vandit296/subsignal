import { NextRequest, NextResponse } from 'next/server';
import { getSubscribedUsers } from '@/lib/upstash';

export async function GET(req: NextRequest) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get all users who have an active subscription
  let users: string[] = [];
  try {
    users = await getSubscribedUsers();
  } catch {
    // If getSubscribedUsers doesn't exist, fall back to founder email
    users = [process.env.FOUNDER_EMAIL || 'vandit296@gmail.com'];
  }

  const results: { email: string; ok: boolean; error?: string }[] = [];
  const baseUrl = process.env.NEXTAUTH_URL || 'https://treddit.in';

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
