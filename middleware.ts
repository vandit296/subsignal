import { withAuth, NextRequestWithAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

// Routes that require login (but NOT trial check — they show upgrade wall themselves)
const AUTH_REQUIRED = ['/feed', '/watch', '/compose', '/command', '/onboarding'];
// Routes that also require an active trial or subscription
const PAID_REQUIRED = ['/feed', '/watch', '/compose'];

// Public routes — the authorized callback allows these through, so the middleware
// body must also skip them to avoid a redirect loop (e.g. /auth/signin with no token)
const PUBLIC_PATHS = ['/', '/auth', '/scout', '/upgrade', '/api'];

export default withAuth(
  function middleware(req: NextRequestWithAuth) {
    const { pathname } = req.nextUrl;
    const token = req.nextauth.token;

    // Pass through public routes immediately — no token check needed
    if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
      return NextResponse.next();
    }

    // Not logged in → redirect to signin
    if (!token) {
      return NextResponse.redirect(new URL('/auth/signin', req.url));
    }

    // Onboarding gate — if onboarding not complete, redirect to /onboarding
    // (except when already on /onboarding or auth routes)
    const onboardingComplete = token['onboardingComplete'] as boolean | undefined;
    if (!onboardingComplete && !pathname.startsWith('/onboarding') && !pathname.startsWith('/api')) {
      // Allow /scout (public blurred view) and /upgrade without onboarding
      if (!pathname.startsWith('/scout') && !pathname.startsWith('/upgrade')) {
        return NextResponse.redirect(new URL('/onboarding', req.url));
      }
    }

    // Trial / subscription gate for paid routes
    if (PAID_REQUIRED.some(p => pathname.startsWith(p))) {
      const status = token['subscriptionStatus'] as string | undefined;
      if (status === 'expired' || status === 'cancelled') {
        return NextResponse.redirect(new URL('/upgrade', req.url));
      }
      if (status === 'trial') {
        const trialStart = token['trialStartAt'] as string | undefined;
        if (trialStart) {
          const trialEnd = new Date(trialStart).getTime() + 3 * 86400_000;
          if (Date.now() > trialEnd) {
            return NextResponse.redirect(new URL('/upgrade', req.url));
          }
        }
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized({ token, req }) {
        const { pathname } = req.nextUrl;
        // Public routes — always allow
        const publicPaths = ['/', '/auth', '/scout', '/upgrade', '/api'];
        if (publicPaths.some(p => pathname.startsWith(p))) return true;
        // Everything else requires auth
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
