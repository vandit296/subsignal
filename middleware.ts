import { withAuth, NextRequestWithAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

// Only these routes require authentication — everything else is open
const AUTH_REQUIRED = ['/command', '/onboarding'];

// All other routes are public — no login needed to browse, use feed, scout, etc.
const PUBLIC_PATHS = [
  '/', '/auth', '/scout', '/feed', '/watch', '/compose', '/radar',
  '/upgrade', '/api', '/terms', '/privacy', '/refund', '/cookies', '/ingest',
];

export default withAuth(
  function middleware(req: NextRequestWithAuth) {
    const { pathname } = req.nextUrl;
    const token = req.nextauth.token;

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
