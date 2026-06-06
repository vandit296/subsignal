import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { buildTopicFeed, getTopicFeed, cacheTopicFeed } from '@/lib/intelligence';

export const runtime = 'nodejs';
export const maxDuration = 300; // first build sweeps + scores; then cached

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const topic = (searchParams.get('topic') || searchParams.get('q') || '').trim();
  if (!topic) return NextResponse.json({ error: 'topic required' }, { status: 400 });

  const rebuild = searchParams.get('rebuild') === '1';
  if (!rebuild) {
    const cached = await getTopicFeed(topic);
    if (cached) return NextResponse.json({ ...cached, cached: true });
  }
  const feed = await buildTopicFeed(topic);
  await cacheTopicFeed(topic, feed);
  return NextResponse.json({ ...feed, cached: false });
}
