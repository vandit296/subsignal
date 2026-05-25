import { NextRequest, NextResponse } from 'next/server';
import { fetchSubredditData } from '@/lib/reddit-arctic';
import { analyzeSubreddit } from '@/lib/claude';
import {
  getCachedAnalysis, cacheAnalysis,
  getUser, getCompany,
  getScoutUsageThisMonth, incrementScoutUsage,
  isFreeTierUser, FREE_SCOUT_LIMIT,
} from '@/lib/upstash';
import { getSession } from '@/lib/auth';

const VALID_PERIODS = new Set(['1week', '1month', '3months', '1year', 'alltime']);

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const subreddit = searchParams.get('subreddit')?.replace(/^r\//, '').trim();
  const period    = searchParams.get('period') ?? '1year';
  const bust      = searchParams.get('bust') === '1';

  if (!subreddit) {
    return NextResponse.json({ error: 'subreddit param required' }, { status: 400 });
  }
  if (!VALID_PERIODS.has(period)) {
    return NextResponse.json({ error: 'invalid period param' }, { status: 400 });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not set' }, { status: 500 });
  }

  // ── Free tier Scout limit ────────────────────────────────────────────────────
  const session = await getSession();
  const email   = session?.user?.email ?? null;

  if (email) {
    const appUser = await getUser(email).catch(() => null);
    if (appUser && isFreeTierUser(appUser)) {
      const used = await getScoutUsageThisMonth(email);
      if (used >= FREE_SCOUT_LIMIT) {
        return NextResponse.json(
          { error: 'scout_limit_reached', used, limit: FREE_SCOUT_LIMIT },
          { status: 402 }
        );
      }
    }
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
      console.warn('[analyze] cache read failed:', e);
    }
  }

  // ── Live analysis ────────────────────────────────────────────────────────────
  try {
    // Use the user's Command profile for product context if available
    const company = email ? await getCompany(email).catch(() => null) : null;

    const [redditData] = await Promise.all([
      fetchSubredditData(subreddit, period),
    ]);

    const analysis = await analyzeSubreddit(subreddit, redditData, {
      productDescription: company?.description,
      goal: company?.goal,
    });

    // Increment Scout usage counter for free tier users (after successful analysis)
    if (email) {
      const appUser = await getUser(email).catch(() => null);
      if (appUser && isFreeTierUser(appUser)) {
        await incrementScoutUsage(email).catch(() => null);
      }
    }

    const result = {
      ...analysis,
      hasProductContext: !!company?.description,
      period,
      cached: false,
      subscribers:       redditData.about.subscribers,
      createdUtc:        redditData.about.created_utc,
      over18:            redditData.about.over18,
      publicDescription: redditData.about.public_description,
    };

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
