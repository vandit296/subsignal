import { NextRequest, NextResponse } from 'next/server';
import { fetchSubredditData } from '@/lib/reddit-arctic';
import { analyzeSubreddit } from '@/lib/claude';
import { getAlertConfig, getCachedAnalysis, cacheAnalysis } from '@/lib/upstash';

const VALID_PERIODS = new Set(['1week', '1month', '3months', '1year', 'alltime']);

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const subreddit = searchParams.get('subreddit')?.replace(/^r\//, '').trim();
  const period = searchParams.get('period') ?? '1year';
  const bust = searchParams.get('bust') === '1'; // ?bust=1 forces fresh analysis

  if (!subreddit) {
    return NextResponse.json({ error: 'subreddit param required' }, { status: 400 });
  }

  if (!VALID_PERIODS.has(period)) {
    return NextResponse.json({ error: 'invalid period param' }, { status: 400 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not set' }, { status: 500 });
  }

  // ── Cache check ──────────────────────────────────────────────────────────────
  if (!bust) {
    try {
      const cached = await getCachedAnalysis(subreddit, period);
      if (cached) {
        console.log(`[analyze] cache hit: r/${subreddit} period=${period}`);
        return NextResponse.json(cached);
      }
    } catch (e) {
      // Cache failure is non-fatal — fall through to live analysis
      console.warn('[analyze] cache read failed:', e);
    }
  }

  // ── Live analysis ────────────────────────────────────────────────────────────
  try {
    const [redditData, alertConfig] = await Promise.all([
      fetchSubredditData(subreddit, period),
      getAlertConfig().catch(() => null),
    ]);

    const hasProductContext = !!alertConfig?.productDescription;

    const analysis = await analyzeSubreddit(subreddit, redditData, {
      productDescription: alertConfig?.productDescription,
      goal: alertConfig?.goal,
    });

    const result = {
      ...analysis,
      hasProductContext,
      period,
      cached: false,
      subscribers: redditData.about.subscribers,
      createdUtc: redditData.about.created_utc,
      over18: redditData.about.over18,
      publicDescription: redditData.about.public_description,
    };

    // Store in cache (non-fatal if it fails)
    cacheAnalysis(subreddit, period, result).catch(e =>
      console.warn('[analyze] cache write failed:', e)
    );

    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[analyze]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
