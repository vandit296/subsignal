import { NextRequest, NextResponse } from 'next/server';
import { getAllBriefUsers } from '@/lib/upstash';

// Runs at 06:00 UTC daily via vercel.json
// Generates the Morning Brief for every registered user who has a company profile

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const users = await getAllBriefUsers();
  const results: Record<string, string> = {};

  for (const email of users) {
    try {
      // Call the generate endpoint for each user
      const res = await fetch(`${process.env.NEXTAUTH_URL}/api/brief/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.CRON_SECRET}`,
        },
        body: JSON.stringify({ email }),
      });
      const data = await res.json() as { ok: boolean; briefDate?: string };
      results[email] = data.ok ? `generated:${data.briefDate}` : 'skipped';
    } catch (err) {
      results[email] = `error:${String(err)}`;
    }
  }

  const generated = Object.values(results).filter(v => v.startsWith('generated')).length;
  console.log(`[morning-brief] Generated for ${generated}/${users.length} users`);
  return NextResponse.json({ ok: true, results, generated, total: users.length });
}
