'use client';

import { useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import { initPostHog, identifyUser, track } from '@/lib/posthog';

export default function PostHogProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const isMounted = useRef(false);

  // Init once on mount + fire first pageview
  useEffect(() => {
    initPostHog();
    track('$pageview', { path: pathname });
    isMounted.current = true;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Identify user when session loads
  useEffect(() => {
    const email = session?.user?.email;
    if (email) {
      identifyUser(email, { name: session.user?.name ?? undefined, email });
    }
  }, [session]);

  // Track subsequent route changes (skip the first — handled above)
  useEffect(() => {
    if (!isMounted.current) return;
    track('$pageview', { path: pathname });
  }, [pathname]);

  return <>{children}</>;
}
