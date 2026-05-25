import { NextAuthOptions, getServerSession } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { upsertUser, getUser } from '@/lib/upstash';

// How often we re-fetch subscription/trial status from Redis into the JWT.
// Means a payment webhook takes at most this long to be reflected in the UI.
const TOKEN_REFRESH_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],

  pages: {
    signIn: '/auth/signin',
  },

  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false;
      // Upsert user in Redis — starts trial on first login
      await upsertUser({
        email: user.email,
        name: user.name ?? '',
        image: user.image ?? undefined,
      });
      return true;
    },

    async jwt({ token, user }) {
      // On sign-in: populate basic identity fields
      if (user) {
        token.email   = user.email;
        token.name    = user.name    ?? null;
        token.picture = user.image   ?? null;
      }

      // Refresh subscription/onboarding state from Redis periodically so that
      // payment webhooks and onboarding completion are reflected quickly.
      const email       = token.email as string | undefined;
      const lastRefresh = token.refreshedAt as number | undefined;
      const now         = Date.now();

      if (email && (!lastRefresh || now - lastRefresh > TOKEN_REFRESH_INTERVAL_MS)) {
        try {
          const appUser = await getUser(email);
          if (appUser) {
            token.subscriptionStatus = appUser.subscriptionStatus;
            token.trialStartAt       = appUser.trialStartAt;
            token.onboardingComplete = appUser.onboardingComplete;
          }
        } catch {
          // Redis unavailable — keep whatever is already in the token
        }
        token.refreshedAt = now;
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user && token.email) {
        session.user.email = token.email as string;
        session.user.name  = token.name  as string;
        session.user.image = token.picture as string;
        // Forward trial + subscription fields so client components can read them
        (session.user as any).trialStartAt       = token.trialStartAt       ?? null;
        (session.user as any).subscriptionStatus = token.subscriptionStatus ?? null;
        (session.user as any).onboardingComplete = token.onboardingComplete ?? false;
      }
      return session;
    },

    async redirect({ url, baseUrl }) {
      // After sign-in, redirect to /onboarding or /feed
      if (url.startsWith(baseUrl) || url.startsWith('/')) {
        return url;
      }
      return baseUrl + '/feed';
    },
  },

  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  secret: process.env.NEXTAUTH_SECRET,
};

export async function getSession() {
  return getServerSession(authOptions);
}
