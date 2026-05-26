import type { Metadata } from 'next';
import './globals.css';
import AppShell from '@/components/AppShell';
import SessionProvider from '@/components/SessionProvider';
import PostHogProvider from '@/components/PostHogProvider';
import PolicyFooter from '@/components/PolicyFooter';

export const metadata: Metadata = {
  metadataBase: new URL('https://treddit.live'),
  title: 'Treddit — Signal Intelligence',
  description: 'Neural-grade Reddit signal extraction. Know what your audience thinks before they post it.',
  openGraph: {
    title: 'Treddit — Signal Intelligence',
    description: 'Neural-grade Reddit signal extraction. Know what your audience thinks before they post it.',
    url: 'https://treddit.live',
    siteName: 'Treddit',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Treddit — Signal Intelligence',
    description: 'Neural-grade Reddit signal extraction. Know what your audience thinks before they post it.',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full antialiased" style={{ background: 'var(--void)', color: 'var(--t1)', fontFamily: 'var(--font-ui)' }}>
        <SessionProvider>
          <PostHogProvider>
            <AppShell>{children}</AppShell>
          </PostHogProvider>
          <PolicyFooter />
        </SessionProvider>
      </body>
    </html>
  );
}
