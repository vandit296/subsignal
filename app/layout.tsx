import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import AppShell from '@/components/AppShell';
import SessionProvider from '@/components/SessionProvider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'SubSignal — Reddit Intelligence for Founders',
  description:
    'Deep subreddit intelligence powered by AI. Know exactly how to win organically on Reddit.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className={`${inter.className} min-h-full bg-[#0f0f11] antialiased`}>
        <SessionProvider>
          <AppShell>{children}</AppShell>
        </SessionProvider>
      </body>
    </html>
  );
}
