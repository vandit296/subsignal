import { NextRequest, NextResponse } from 'next/server';
import { expandPool, getPoolStats } from '@/lib/subreddit-pool';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = await expandPool(25);
  const stats  = await getPoolStats();

  console.log(`[expand-subreddit-pool] unlocked ${result.previous}→${result.current} | total pool: ${stats.total}`);

  return NextResponse.json({ ok: true, ...result, stats });
}
