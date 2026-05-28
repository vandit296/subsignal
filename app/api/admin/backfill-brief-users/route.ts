import { NextRequest, NextResponse } from 'next/server';
import { registerUserForBrief, getAllBriefUsers, getUser } from '@/lib/upstash';

// Admin endpoint: backfill users into the brief-users registry.
// POST { emails: string[] }  — registers specific emails
// POST { emails: [] }        — auto-discovers all subsignal:user:* keys via scan (future)
// GET                        — returns current registry contents

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const users = await getAllBriefUsers();
  return NextResponse.json({ ok: true, count: users.length, users });
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json() as { emails: string[] };
  const emails: string[] = (body.emails ?? []).map((e: string) => e.trim().toLowerCase()).filter(Boolean);

  if (!emails.length) {
    return NextResponse.json({ error: 'No emails provided' }, { status: 400 });
  }

  const results: Record<string, string> = {};
  for (const email of emails) {
    try {
      await registerUserForBrief(email);
      results[email] = 'registered';
    } catch (e) {
      results[email] = `error:${String(e)}`;
    }
  }

  const registered = Object.values(results).filter(v => v === 'registered').length;
  return NextResponse.json({ ok: true, registered, results });
}
