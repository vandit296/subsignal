import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getUser, getCompany, generateExtendToken, markLifecycleEmailSent, hasLifecycleEmailBeenSent } from '@/lib/upstash';
import { sendTrialExpired } from '@/lib/email';

const ADMIN_EMAIL = 'vandit296@gmail.com';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (session?.user?.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { emails } = await req.json() as { emails: string[] };
  const results: Record<string, string> = {};

  for (const email of emails) {
    try {
      const alreadySent = await hasLifecycleEmailBeenSent(email, 'trial-expired');
      if (alreadySent) { results[email] = 'already-sent'; continue; }

      const user = await getUser(email);
      if (!user) { results[email] = 'user-not-found'; continue; }

      const company = await getCompany(email);
      const extendToken = await generateExtendToken(email);
      await sendTrialExpired(email, user.name, company?.name ?? 'your product', extendToken);
      await markLifecycleEmailSent(email, 'trial-expired');
      results[email] = 'sent';
    } catch (err) {
      results[email] = `error:${String(err)}`;
    }
  }

  return NextResponse.json({ ok: true, results });
}
