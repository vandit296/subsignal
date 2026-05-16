'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { useState } from 'react';

const NAV = [
  { href: '/feed',    icon: '🔥', label: 'Feed',    sub: 'Threads to engage' },
  { href: '/watch',   icon: '📡', label: 'Watch',   sub: 'Keyword monitoring' },
  { href: '/compose', icon: '✍️',  label: 'Compose', sub: 'Guided post flow' },
  { href: '/scout',   icon: '🔍', label: 'Scout',   sub: 'Subreddit deep dive' },
];

const BOTTOM = [
  { href: '/command', icon: '⚙️', label: 'Command' },
];

function TrialBadge({ trialEnd }: { trialEnd: string }) {
  const days = Math.max(0, Math.ceil((new Date(trialEnd).getTime() - Date.now()) / 86400_000));
  if (days === 0) return null;
  return (
    <div className="mx-3 mb-3 bg-orange-500/10 border border-orange-500/20 rounded-lg px-3 py-2">
      <p className="text-orange-400 text-[10px] font-semibold">{days}d left in trial</p>
      <Link href="/upgrade" className="text-[10px] text-orange-300/70 hover:text-orange-300 transition-colors">
        Upgrade for $25/mo →
      </Link>
    </div>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const { data: session } = useSession();
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);

  // Full-screen pages — no sidebar
  const fullscreen =
    path === '/' ||
    path.startsWith('/auth') ||
    path.startsWith('/onboarding') ||
    path.startsWith('/upgrade');
  if (fullscreen) return <>{children}</>;

  const trialEnd = (session as unknown as { user: { trialStartAt?: string } })?.user?.trialStartAt
    ? new Date(new Date((session as unknown as { user: { trialStartAt?: string } }).user.trialStartAt!).getTime() + 3 * 86400_000).toISOString()
    : null;

  const isOnTrial = trialEnd && new Date(trialEnd) > new Date();

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
            const active = path === item.href || path.startsWith(item.href + '/');
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

        {/* Trial badge */}
        {isOnTrial && trialEnd && <TrialBadge trialEnd={trialEnd} />}

        {/* Bottom nav */}
        <div className="space-y-1 border-t border-zinc-900 pt-4 mt-2">
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

          {/* User avatar */}
          {session?.user && (
            <div className="relative mt-2">
              <button
                onClick={() => setAvatarMenuOpen(o => !o)}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-zinc-800/50 transition-colors"
              >
                {session.user.image ? (
                  <img
                    src={session.user.image}
                    alt={session.user.name ?? ''}
                    className="w-6 h-6 rounded-full flex-shrink-0"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-orange-500/30 flex items-center justify-center flex-shrink-0">
                    <span className="text-orange-400 text-[10px] font-bold">
                      {(session.user.name ?? '?')[0].toUpperCase()}
                    </span>
                  </div>
                )}
                <div className="text-left flex-1 min-w-0">
                  <p className="text-zinc-300 text-xs font-medium truncate">{session.user.name}</p>
                  <p className="text-zinc-600 text-[10px] truncate">{session.user.email}</p>
                </div>
              </button>

              {avatarMenuOpen && (
                <div className="absolute bottom-full left-0 right-0 mb-1 bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-xl z-50">
                  <Link
                    href="/command"
                    onClick={() => setAvatarMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2.5 text-zinc-400 hover:text-white hover:bg-zinc-800 text-xs transition-colors"
                  >
                    ⚙️ Settings
                  </Link>
                  <Link
                    href="/upgrade"
                    onClick={() => setAvatarMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2.5 text-orange-400 hover:text-orange-300 hover:bg-zinc-800 text-xs transition-colors"
                  >
                    ⚡ Upgrade to Pro
                  </Link>
                  <button
                    onClick={() => { setAvatarMenuOpen(false); signOut({ callbackUrl: '/' }); }}
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 text-xs transition-colors border-t border-zinc-800"
                  >
                    → Sign out
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 ml-56 min-h-screen">
        {children}
      </main>
    </div>
  );
}
