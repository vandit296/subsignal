import { withAuth, NextRequestWithAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

// Only these routes require authentication — everything else is open
const AUTH_REQUIRED = ['/command', '/onboarding'];

// All other routes are public — no login needed to browse, use feed, scout, etc.
const PUBLIC_PATHS = [
  '/', '/auth', '/scout', '/feed', '/watch', '/compose', '/radar',
  '/upgrade', '/api', '/terms', '/privacy', '/refund', '/cookies', '/ingest',
];

// ── Per-IP rate limiting (edge backstop to the Vercel WAF) ────────────────────
const RL_EXEMPT = ['/api/auth', '/api/billing/webhook', '/api/cron']; // never throttle these
const RL_EXPENSIVE = [
  '/api/subreddits-by-url', '/api/subreddits', '/api/topic-watch', '/api/intelligence-feed',
  '/api/post-similar', '/api/thread-comments', '/api/track', '/api/brief',
  '/api/analyze', '/api/scout', '/api/distribute', '/api/radar',
];
const RL_WINDOW = 60;          // seconds
const RL_DEFAULT = 60;         // req/window/IP for normal API routes
const RL_TIGHT = 15;           // req/window/IP for Claude-backed routes

async function rlRedis(cmd: unknown[]): Promise<unknown> {
  const url = process.env.UPSTASH_REDIS_REST_URL, token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(cmd),
      cache: 'no-store',
    });
    return ((await r.json()) as { result: unknown }).result;
  } catch { return null; }
}

// Returns a 429 response if the caller is over the limit, else null. Fails open.
async function rateLimit(req: NextRequestWithAuth): Promise<NextResponse | null> {
  const path = req.nextUrl.pathname;
  if (!path.startsWith('/api') || RL_EXEMPT.some(p => path.startsWith(p))) return null;
  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim();
  if (!ip) return null;
  const tight = RL_EXPENSIVE.some(p => path.startsWith(p));
  const limit = tight ? RL_TIGHT : RL_DEFAULT;
  const key = `treddit:mw:${ip}:${tight ? 'x' : 'd'}:${Math.floor(Date.now() / (RL_WINDOW * 1000))}`;
  const count = (await rlRedis(['INCR', key])) as number | null;
  if (count === null) return null;                 // Redis down → fail open
  if (count === 1) await rlRedis(['EXPIRE', key, String(RL_WINDOW)]);
  if (count > limit) {
    return NextResponse.json(
      { error: 'Too many requests. Please slow down and try again shortly.' },
      { status: 429, headers: { 'Retry-After': String(RL_WINDOW) } },
    );
  }
  return null;
}

export default withAuth(
  async function middleware(req: NextRequestWithAuth) {
    const { pathname } = req.nextUrl;
    const token = req.nextauth.token;

    // Rate-limit API traffic first (edge backstop for cost/abuse protection).
    const limited = await rateLimit(req);
    if (limited) return limited;

    // Pass through public routes immediately — no token check needed
    if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
      return NextResponse.next();
    }

    // Routes that need auth (/command, /onboarding) — redirect to signin if no token
    if (!token) {
      return NextResponse.redirect(new URL('/auth/signin', req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized({ token, req }) {
        const { pathname } = req.nextUrl;
        // Public routes — always allow through (no auth required)
        const publicPaths = [
          '/', '/auth', '/scout', '/feed', '/watch', '/compose', '/radar',
          '/upgrade', '/api', '/terms', '/privacy', '/refund', '/cookies', '/ingest',
        ];
        if (publicPaths.some(p => pathname.startsWith(p))) return true;
        // Auth-gated routes (/command, /onboarding) require a token
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
