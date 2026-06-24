import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // TypeScript errors now FAIL the build — ignoreBuildErrors:true let a broken
  // activateSubscription() call ship to production unnoticed (June 2026 audit).
  eslint: {
    ignoreDuringBuilds: true,
  },
  async redirects() {
    return [
      // Onboarding wizard retired — Command is the single setup surface now.
      { source: '/onboarding', destination: '/command', permanent: true },
    ];
  },
  async rewrites() {
    return [
      {
        source: "/ingest/static/:path*",
        destination: "https://us-assets.i.posthog.com/static/:path*",
      },
      {
        source: "/ingest/:path*",
        destination: "https://us.i.posthog.com/:path*",
      },
      {
        source: "/ingest/decide",
        destination: "https://us.i.posthog.com/decide",
      },
    ];
  },
  skipTrailingSlashRedirect: true,
};

export default nextConfig;
