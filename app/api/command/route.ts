import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getUser, getCompany, trialDaysRemaining } from '@/lib/upstash';

export async function GET() {
  const session = await getSession();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [user, company] = await Promise.all([
    getUser(session.user.email),
    getCompany(session.user.email),
  ]);

  const trialDays = user ? trialDaysRemaining(user) : 0;

  return NextResponse.json({
    user: user ? {
      email: user.email,
      name: user.name,
      subscriptionStatus: user.subscriptionStatus,
      trialDaysRemaining: trialDays,
      onboardingComplete: user.onboardingComplete,
    } : null,
    company: company ?? null,
  });
}
