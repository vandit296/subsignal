import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getUser, getEmailPrefs, saveEmailPrefs, isLifetimeAccount, EmailPrefs } from '@/lib/upstash';

export const runtime = 'nodejs';

function isPaid(status?: string, email?: string): boolean {
  return (!!email && isLifetimeAccount(email)) || status === 'active';
}

export async function GET() {
  const session = await getSession();
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const [prefs, user] = await Promise.all([getEmailPrefs(email), getUser(email)]);
  return NextResponse.json({ prefs, paid: isPaid(user?.subscriptionStatus, email) });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json() as { prefs?: EmailPrefs };
  if (!body.prefs) return NextResponse.json({ error: 'prefs required' }, { status: 400 });

  const user = await getUser(email);
  const paid = isPaid(user?.subscriptionStatus, email);

  // Free users may only configure the free channel + global toggle/timezone.
  // Paid channels are forced off for non-paid accounts (crons gate too, but keep store honest).
  const incoming = body.prefs;
  const next: EmailPrefs = {
    ...incoming,
    postsOfDay: incoming.postsOfDay,
    dailyNews: paid ? incoming.dailyNews : { ...incoming.dailyNews, enabled: false },
    feed: paid ? incoming.feed : { ...incoming.feed, enabled: false },
    topic: paid ? incoming.topic : { ...incoming.topic, enabled: false },
    updatedAt: new Date().toISOString(),
  };
  await saveEmailPrefs(email, next);
  return NextResponse.json({ ok: true, prefs: next, paid });
}
