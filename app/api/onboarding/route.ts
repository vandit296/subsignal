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
    idealUser: string;
    goal: string;
    subreddits: string[];
    alertEmail: string;
    linkedinUrl?: string;
    twitterUrl?: string;
    deckUrl?: string;
  };

  const { name, website, description, idealUser, goal, subreddits, alertEmail, linkedinUrl, twitterUrl, deckUrl } = body;

  if (!name?.trim() || !description?.trim() || !goal) {
    return NextResponse.json({ error: 'Product name, description, and goal are required' }, { status: 400 });
  }

  const userId = session.user.email;

  await saveCompany({
    userId,
    name: name.trim(),
    website: website?.trim() ?? '',
    description: description.trim(),
    idealUser: idealUser?.trim() ?? '',
    goal,
    subreddits: (subreddits ?? []).map(s => s.toLowerCase()),
    alertEmail: alertEmail ?? userId,
    linkedinUrl: linkedinUrl?.trim() || undefined,
    twitterUrl: twitterUrl?.trim() || undefined,
    deckUrl: deckUrl?.trim() || undefined,
    updatedAt: new Date().toISOString(),
  });

  await upsertUser({
    email: userId,
    name: session.user.name ?? '',
    image: session.user.image ?? undefined,
    onboardingComplete: true,
  });

  return NextResponse.json({ ok: true });
}
