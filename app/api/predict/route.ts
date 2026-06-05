import { NextRequest, NextResponse } from 'next/server';
import { fetchSubredditData } from '@/lib/reddit-arctic';
import { predictPost } from '@/lib/claude';
import { getSession } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { subreddit, title, body } = await req.json();

    if (!subreddit || !title) {
      return NextResponse.json(
        { error: 'subreddit and title are required' },
        { status: 400 }
      );
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'ANTHROPIC_API_KEY not set' }, { status: 500 });
    }

    const sub = (subreddit as string).replace(/^r\//, '').trim();
    const redditData = await fetchSubredditData(sub);
    const prediction = await predictPost(sub, redditData, title as string, body as string ?? '');

    return NextResponse.json(prediction);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[predict]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
