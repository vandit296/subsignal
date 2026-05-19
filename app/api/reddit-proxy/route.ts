export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';

// Runs on Vercel Edge Runtime (Cloudflare IPs) — not blocked by Reddit
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const path = searchParams.get('path');

  if (!path) {
    return NextResponse.json({ error: 'path required' }, { status: 400 });
  }

  const url = `https://www.reddit.com${path}`;

  const res = await fetch(url, {
    headers: {
      'User-Agent': 'SubSignal/1.0 (subreddit intelligence tool)',
      'Accept': 'application/json',
    },
  });

  if (!res.ok) {
    return NextResponse.json(
      { error: `Reddit fetch failed: ${res.status} ${path}` },
      { status: res.status }
    );
  }

  const data = await res.json();
  return NextResponse.json(data);
}
