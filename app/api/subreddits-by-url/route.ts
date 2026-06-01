import { NextRequest, NextResponse } from 'next/server';
import { findSubreddits } from '@/lib/claude';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url');
  if (!url) return NextResponse.json({ error: 'url param required' }, { status: 400 });

  // Fetch the product page content
  let urlContent = '';
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Treddit/1.0)' },
      signal: AbortSignal.timeout(8000),
    });
    const html = await res.text();
    // Strip tags, collapse whitespace, cap at 3000 chars
    urlContent = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 3000);
  } catch {
    // If fetch fails, still proceed — Claude will work from the URL alone
    urlContent = `Could not fetch page content for ${url}`;
  }

  try {
    const result = await findSubreddits(
      `Product URL: ${url}`,
      'Find the best Reddit communities where this product\'s target users are active',
      urlContent,
    );
    // Return in same shape as /api/subreddits so Radar renders identically
    return NextResponse.json({ ...result, matches: result.matches });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Analysis failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
