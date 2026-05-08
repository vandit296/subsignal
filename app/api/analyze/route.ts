import { NextRequest, NextResponse } from 'next/server';
import { analyzeSubreddit } from '@/lib/claude';
import { RedditData } from '@/types';

// Reddit data is now fetched client-side (browser) to avoid datacenter IP blocks.
// This route only handles Claude analysis.
export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not set' }, { status: 500 });
  }

  try {
    const body = await req.json();
    const { subreddit, redditData } = body as { subreddit: string; redditData: RedditData };

    if (!subreddit || !redditData) {
      return NextResponse.json({ error: 'subreddit and redditData required' }, { status: 400 });
    }

    const analysis = await analyzeSubreddit(subreddit, redditData);
    return NextResponse.json(analysis);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[analyze]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
