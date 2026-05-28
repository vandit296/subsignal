import { NextRequest, NextResponse } from 'next/server';
import { getBrief, markEmailSentToday } from '@/lib/upstash';
import { sendMorningBrief } from '@/lib/email';

export async function POST(req: NextRequest) {
  const { email } = await req.json() as { email: string };
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