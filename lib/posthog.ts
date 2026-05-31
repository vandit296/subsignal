'use client';

import posthog from 'posthog-js';

let initialized = false;

export function initPostHog() {
  if (initialized || typeof window === 'undefined') return;
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) {
    console.warn('[PostHog] NEXT_PUBLIC_POSTHOG_KEY is not set');
    return;
  }
  posthog.init(key, {
    api_host: '/ingest',
    ui_host: 'https://us.posthog.com',
    capture_pageview: false, // we track manually via useEffect
    capture_pageleave: true,
    autocapture: true,
    persistence: 'localStorage+cookie',
  });
  initialized = true;
}

export function identifyUser(email: string, properties?: Record<string, unknown>) {
  if (typeof window === 'undefined') return;
  posthog.identify(email, properties);
}

export function track(event: string, properties?: Record<string, unknown>) {
  if (typeof window === 'undefined') return;
  posthog.capture(event, properties);
}

export function resetUser() {
  if (typeof window === 'undefined') return;
  posthog.reset();
}
