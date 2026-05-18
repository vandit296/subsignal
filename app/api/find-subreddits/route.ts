import { NextRequest, NextResponse } from 'next/server';
import { findSubreddits } from '@/lib/claude';
import { SubredditMatch } from '@/types';

const BASE = 'https://arctic-shift.photon-reddit.com';

async function fetchUrlContent(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Treddit/1.0)' },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return '';
    const html = await res.text();
    // Strip tags, collapse whitespace, truncate
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 3000);
    return text;
  } catch {
    return '';
  }
}

async function fetchSubscriberCount(subreddit: string): Promise<number> {
  try {
    const res = await fetch(
      `${BASE}/api/subreddits/search?subreddit=${encodeURIComponent(subreddit)}&limit=1`,
      { headers: { Accept: 'application/json' }, cache: 'no-store' }
    );
    if (!res.ok) return 0;
    const json = await res.json();
    const data = json.data as Record<string, unknown>[];
    return (data?.[0]?.subscribers as number) ?? 0;
  } catch {
    return 0;
  }
}

export async function POST(req: NextRequest) {
  try {
    const { description, goal, productUrl } = await req.json();

    if (!description || typeof description !== 'string' || description.trim().length < 10) {
      return NextResponse.json(
        { error: 'Please describe your product in at least 10 characters' },
        { status: 400 }
      );
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'ANTHROPIC_API_KEY not set' }, { status: 500 });
    }

    // Optionally fetch product URL content for extra context
    let urlContent: string | undefined;
    if (productUrl && typeof productUrl === 'string' && productUrl.startsWith('http')) {
      urlContent = await fetchUrlContent(productUrl.trim());
    }

    // Step 1: Claude identifies the best subreddits
    const result = await findSubreddits(
      description.trim(),
      goal && typeof goal === 'string' ? goal.trim() : undefined,
      urlContent
    );

    // Step 2: Enrich each match with real subscriber counts from Arctic Shift (parallel)
    const enriched: SubredditMatch[] = await Promise.all(
      result.matches.map(async (match) => ({
        ...match,
        subscribers: await fetchSubscriberCount(match.subreddit),
      }))
    );

    return NextResponse.json({ ...result, matches: enriched });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[find-subreddits]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
