import type { Metadata } from 'next';
import './globals.css';
import AppShell from '@/components/AppShell';
import SessionProvider from '@/components/SessionProvider';
import PostHogProvider from '@/components/PostHogProvider';
import PolicyFooter from '@/components/PolicyFooter';

export const metadata: Metadata = {
  metadataBase: new URL('https://treddit.live'),
  title: 'Treddit — Signal Intelligence',
  description: 'Know what Reddit thinks before you utter a word.',
  openGraph: {
    title: 'Treddit — Signal Intelligence',
    description: 'Know what Reddit thinks before you utter a word.',
    url: 'https://treddit.live',
    siteName: 'Treddit',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Treddit — Signal Intelligence',
    description: 'Know what Reddit thinks before you utter a word.',
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
