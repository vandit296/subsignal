import { NextRequest, NextResponse } from 'next/server';
import { registerUserForBrief, getAllBriefUsers } from '@/lib/upstash';

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== 'Bearer ' + (process.env.CRON_SECRET || '')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const users = await getAllBriefUsers();
  return NextResponse.json({ ok: true, count: users.length, users });
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== 'Bearer ' + (process.env.CRON_SECRET || '')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const body = await req.json() as { emails: string[] };
  const emails: string[] = (body.emails ?? []).map((e: string) => e.trim().toLowerCase()).filter(Boolean);
  if (!emails.length) return NextResponse.json({ error: 'No emails' }, { status: 400 });
  const results: Record<string, string> = {};
  for (const email of emails) {
    try { await registerUserForBrief(email); results[email] = 'registered'; }
    catch (e) { results[email] = 'error:' + String(e); }
  }
  const registered = Object.values(results).filter(v => v === 'registered').length;
  return NextResponse.json({ ok: true, registered, results });
}