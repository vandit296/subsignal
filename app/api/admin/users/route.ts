import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const ADMIN_EMAIL = 'vandit296@gmail.com';

async function redis(command: unknown[]): Promise<unknown> {
  const url    = process.env.UPSTASH_REDIS_REST_URL!;
  const token  = process.env.UPSTASH_REDIS_REST_TOKEN!;
  const res    = await fetch(`${url}/pipeline`, {
    method:  'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body:    JSON.stringify([command]),
  });
  const json = await res.json() as { result: unknown }[];
  return json[0]?.result;
}

async function redisPipeline(commands: unknown[][]): Promise<unknown[]> {
  const url   = process.env.UPSTASH_REDIS_REST_URL!;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN!;
  const res   = await fetch(`${url}/pipeline`, {
    method:  'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body:    JSON.stringify(commands),
  });
  const json = await res.json() as { result: unknown }[];
  return json.map(j => j.result);
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (session?.user?.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Get all registered emails from the brief-users set
  const emails = (await redis(['SMEMBERS', 'treddit:brief-users']) as string[]) ?? [];

  if (emails.length === 0) return NextResponse.json({ users: [] });

  // Batch fetch user records + alert settings in one pipeline
  const userKeys     = emails.map(e => ['GET', `subsignal:user:${e.toLowerCase()}`]);
  const settingsKeys = emails.map(e => ['GET', `treddit:alert-settings:${e.toLowerCase()}`]);
  const results = await redisPipeline([...userKeys, ...settingsKeys]);

  const half = emails.length;
  const users = emails.map((email, i) => {
    const userRaw     = results[i] as string | null;
    const settingsRaw = results[half + i] as string | null;

    const user     = userRaw     ? JSON.parse(userRaw)     : null;
    const settings = settingsRaw ? JSON.parse(settingsRaw) : null;
    const keywords: string[] = settings?.keywordWatch?.keywords ?? [];

    const trialEnd = user?.trialStartAt
      ? new Date(new Date(user.trialStartAt).getTime() + 3 * 86400_000).toISOString()
      : null;

    return {
      email,
      name:               user?.name ?? '',
      status:             user?.subscriptionStatus ?? 'unknown',
      createdAt:          user?.createdAt ?? null,
      trialStartAt:       user?.trialStartAt ?? null,
      trialEnd,
      onboardingComplete: user?.onboardingComplete ?? false,
      subscriptionId:     user?.subscriptionId ?? null,
      keywordCount:       keywords.length,
      keywords,
    };
  });

  // Sort: active first, then trial, then expired, then by createdAt desc
  const order: Record<string, number> = { active: 0, trial: 1, expired: 2, cancelled: 3, unknown: 4 };
  users.sort((a, b) => {
    const sd = (order[a.status] ?? 4) - (order[b.status] ?? 4);
    if (sd !== 0) return sd;
    return (b.createdAt ?? '').localeCompare(a.createdAt ?? '');
  });

  const summary = {
    total:     users.length,
    active:    users.filter(u => u.status === 'active').length,
    trial:     users.filter(u => u.status === 'trial').length,
    expired:   users.filter(u => u.status === 'expired').length,
    cancelled: users.filter(u => u.status === 'cancelled').length,
  };

  return NextResponse.json({ users, summary });
}
