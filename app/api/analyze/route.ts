import { NextRequest, NextResponse } from 'next/server';
import { fetchSubredditData } from '@/lib/reddit-arctic';
import { analyzeSubreddit } from '@/lib/claude';
import { getAlertConfig } from '@/lib/upstash';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const subreddit = searchParams.get('subreddit')?.replace(/^r\//, '').trim();

  if (!subreddit) {
    return NextResponse.json({ error: 'subreddit param required' }, { status: 400 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not set' }, { status: 500 });
  }

  try {
    // Fetch Reddit data and alert config in parallel
    const [redditData, alertConfig] = await Promise.all([
      fetchSubredditData(subreddit),
      getAlertConfig().catch(() => null),
    ]);

    const hasProductContext = !!alertConfig?.productDescription;

    const analysis = await analyzeSubreddit(subreddit, redditData, {
      productDescription: alertConfig?.productDescription,
      goal: alertConfig?.goal,
    });

    return NextResponse.json({
      ...analysis,
      hasProductContext,
      subscribers: redditData.about.subscribers,
      createdUtc: redditData.about.created_utc,
      over18: redditData.about.over18,
      publicDescription: redditData.about.public_description,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[analyze]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
