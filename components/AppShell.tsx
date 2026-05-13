'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV = [
  { href: '/engage',  icon: '🔥', label: 'Engage',  sub: 'Threads to comment on' },
  { href: '/track',   icon: '📡', label: 'Track',   sub: 'Keyword monitoring' },
  { href: '/post',    icon: '✍️',  label: 'Post',    sub: 'Guided posting flow' },
  { href: '/analyze', icon: '🔍', label: 'Analyze', sub: 'Subreddit deep dive' },
];

const BOTTOM = [
  { href: '/alerts',  icon: '⚙️',  label: 'Settings' },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();

  // Pages that use the full-screen layout (no sidebar)
  const fullscreen = path === '/' || path.startsWith('/dashboard');
  if (fullscreen) return <>{children}</>;

  return (
    <div className="flex min-h-screen bg-[#0f0f11]">
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 border-r border-zinc-900 flex flex-col py-5 px-3 fixed h-full z-20">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 px-2 mb-8">
          <div className="w-2.5 h-2.5 rounded-full bg-orange-500 flex-shrink-0" />
          <span className="text-white font-bold text-base tracking-tight">SubSignal</span>
        </Link>

        {/* Main nav */}
        <nav className="flex-1 space-y-1">
          {NAV.map(item => {
            const active = path.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-start gap-3 px-3 py-2.5 rounded-lg transition-colors group ${
                  active
                    ? 'bg-orange-500/10 text-orange-400'
                    : 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/50'
                }`}
              >
                <span className="text-base leading-none mt-0.5">{item.icon}</span>
                <div>
                  <div className={`text-sm font-medium leading-none ${active ? 'text-orange-400' : ''}`}>
                    {item.label}
                  </div>
                  <div className="text-[10px] text-zinc-600 mt-1 leading-none">{item.sub}</div>
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Bottom nav */}
        <div className="space-y-1 border-t border-zinc-900 pt-4 mt-4">
          {BOTTOM.map(item => {
            const active = path.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sm ${
                  active
                    ? 'text-orange-400 bg-orange-500/10'
                    : 'text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800/50'
                }`}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 ml-56 min-h-screen">
        {children}
      </main>
    </div>
  );
}
