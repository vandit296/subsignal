import { NextRequest, NextResponse } from 'next/server';
import { getBrief, markEmailSentToday } from '@/lib/upstash';
import { sendMorningBrief } from '@/lib/email';
import { getSession } from '@/lib/auth';

const ADMIN_EMAIL = 'vandit296@gmail.com';

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.user?.email || session.user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json().catch(() => ({})) as { email?: string };
  const { email } = body;
  if (!email) return NextResponse.json({ error: 'email required' }, { status: 400 });

  const baseUrl = process.env.NEXTAUTH_URL || 'https://treddit.live';
  const cronSecret = process.env.CRON_SECRET || '';

  const genRes = await fetch(baseUrl + '/api/brief/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + cronSecret },
    body: JSON.stringify({ email }),
  });
  const genData = await genRes.json() as { ok: boolean; briefDate?: string; error?: string };
  if (!genData.ok) return NextResponse.json({ error: 'generation failed', detail: genData }, { status: 500 });

  const today = genData.briefDate ?? new Date().toISOString().slice(0, 10);
  const brief = await getBrief(email, today);
  if (!brief) return NextResponse.json({ error: 'brief not found after generation' }, { status: 500 });

  const result = await sendMorningBrief(email, brief, brief.edition);
  if (!result.ok) return NextResponse.json({ error: 'send failed', detail: result.error }, { status: 500 });

  await markEmailSentToday(email, 'morning-brief');
  return NextResponse.json({ ok: true, email, briefDate: today, edition: brief.edition });
}