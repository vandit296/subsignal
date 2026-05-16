import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { saveCompany, upsertUser } from '@/lib/upstash';

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json() as {
    name: string;
    website?: string;
    description: string;
    goal: string;
    subreddits: string[];
    alertEmail: string;
  };

  const { name, website, description, goal, subreddits, alertEmail } = body;

  if (!name?.trim() || !description?.trim() || !goal || !subreddits?.length) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const userId = session.user.email;

  // Save company profile
  await saveCompany({
    userId,
    name: name.trim(),
    website: website?.trim() ?? '',
    description: description.trim(),
    goal,
    subreddits: subreddits.map(s => s.toLowerCase()),
    alertEmail: alertEmail ?? userId,
    updatedAt: new Date().toISOString(),
  });

  // Mark onboarding complete on user record
  await upsertUser({
    email: userId,
    name: session.user.name ?? '',
    image: session.user.image ?? undefined,
    onboardingComplete: true,
  });

  return NextResponse.json({ ok: true });
}
