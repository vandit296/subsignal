import type { Metadata } from 'next';
import './globals.css';
import AppShell from '@/components/AppShell';
import SessionProvider from '@/components/SessionProvider';
import PolicyFooter from '@/components/PolicyFooter';

const APP_URL = 'https://treddit.live';

export const metadata: Metadata = {
  title: 'Treddit — Reddit Intelligence',
  description: 'Understand any Reddit community in depth. Scout audiences, track high-intent threads, and surface what your market cares about.',
  metadataBase: new URL(APP_URL),
  openGraph: {
    type: 'website',
    url: APP_URL,
    siteName: 'Treddit',
    title: 'Treddit — Reddit Intelligence',
    description: 'Understand any Reddit community in depth. Scout audiences, track high-intent threads, and surface what your market cares about.',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'Treddit' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Treddit — Reddit Intelligence',
    description: 'Understand any Reddit community in depth. Scout audiences, track high-intent threads, and surface what your market cares about.',
    images: ['/og.png'],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full antialiased" style={{ background: 'var(--void)', color: 'var(--t1)', fontFamily: 'var(--font-ui)' }}>
        <SessionProvider>
          <AppShell>{children}</AppShell>
          <PolicyFooter />
        </SessionProvider>
      </body>
    </html>
  );
}
