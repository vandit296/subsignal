'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import { initPostHog, identifyUser, track } from '@/lib/posthog';

export default function PostHogProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const pathname = usePathname();

  // Init once on mount
  useEffect(() => {
    initPostHog();
  }, []);

  // Identify user when session loads
  useEffect(() => {
    const email = session?.user?.email;
    if (email) {
      identifyUser(email, {
        name: session.user?.name ?? undefined,
        email,
      });
    }
  }, [session]);

  // Track page views on route change
  useEffect(() => {
    track('$pageview', { path: pathname });
  }, [pathname]);

  return <>{children}</>;
}
