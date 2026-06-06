export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';

// Runs on Vercel Edge Runtime (Cloudflare IPs) — not blocked by Reddit
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const path = searchParams.get('path');

  if (!path) {
    return NextResponse.json({ error: 'path required' }, { status: 400 });
  }

  // Build safely from a fixed base and confirm the host is still reddit.com.
  // (Prevents `?path=@evil.com` / `//evil.com` host-confusion SSRF.)
  let target: URL;
  try { target = new URL(path, 'https://www.reddit.com'); } catch { return NextResponse.json({ error: 'invalid path' }, { status: 400 }); }
  if (target.protocol !== 'https:' || target.hostname !== 'www.reddit.com') {
    return NextResponse.json({ error: 'invalid path' }, { status: 400 });
  }
  const url = target.toString();

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
