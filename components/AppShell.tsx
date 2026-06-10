'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signIn, signOut } from 'next-auth/react';
import { useState, useEffect, type ReactElement } from 'react';

// ── Inline SVG icons ────────────────────────────────────────────────────────

function IconScout() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <circle cx="12" cy="12" r="3"/>
      <line x1="12" y1="2" x2="12" y2="5"/>
      <line x1="12" y1="19" x2="12" y2="22"/>
      <line x1="2" y1="12" x2="5" y2="12"/>
      <line x1="19" y1="12" x2="22" y2="12"/>
    </svg>
  );
}

function IconFeed() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"/>
      <line x1="12" y1="20" x2="12" y2="4"/>
      <line x1="6" y1="20" x2="6" y2="14"/>
      <path d="M3 20h18"/>
    </svg>
  );
}

function IconWatch() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  );
}

function IconRadar() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9"/>
      <circle cx="12" cy="12" r="5" strokeDasharray="3 2"/>
      <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/>
      <line x1="12" y1="3" x2="12" y2="12"/>
    </svg>
  );
}

function IconDistribute() {
  return (
    <svg width={16} height={16} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <circle cx="13" cy="3" r="1.5"/>
      <circle cx="3" cy="8" r="1.5"/>
      <circle cx="13" cy="13" r="1.5"/>
      <line x1="4.3" y1="7.2" x2="11.7" y2="3.8"/>
      <line x1="4.3" y1="8.8" x2="11.7" y2="12.2"/>
    </svg>
  );
}

function IconCommand() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="4 17 10 11 4 5"/>
      <line x1="12" y1="19" x2="20" y2="19"/>
    </svg>
  );
}

function IconSettings() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  );
}

function IconAlerts() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
      <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
    </svg>
  );
}


function IconHire() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2"/>
      <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
      <line x1="12" y1="12" x2="12" y2="16"/>
      <line x1="10" y1="14" x2="14" y2="14"/>
    </svg>
  );
}

function IconBrief() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1z"/>
      <line x1="8" y1="10" x2="16" y2="10"/>
      <line x1="8" y1="14" x2="16" y2="14"/>
      <line x1="8" y1="6" x2="12" y2="6"/>
    </svg>
  );
}

function Logo() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <polygon
        points="12,2 21,7 21,17 12,22 3,17 3,7"
        stroke="var(--blue)" strokeWidth="1.2" fill="none"
      />
      <polygon
        points="12,6 17,9 17,15 12,18 7,15 7,9"
        fill="var(--blue)" opacity="0.12"
      />
      <circle cx="12" cy="12" r="2.5" fill="var(--blue)"/>
    </svg>
  );
}

function Avatar({ src, name }: { src?: string | null; name?: string | null }) {
  if (src) {
    return <img src={src} alt={name ?? ''} style={{ width: 26, height: 26, borderRadius: '50%', flexShrink: 0 }} />;
  }
  return (
    <div style={{
      width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
      background: 'var(--blue-dim)', border: '0.5px solid var(--blue-border)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <span style={{ color: 'var(--blue)', fontSize: 10, fontWeight: 600 }}>
        {(name ?? '?')[0].toUpperCase()}
      </span>
    </div>
  );
}

function ProgressBar() {
  return (
    <div className="void-progress-track">
      <div className="void-progress-bar" />
    </div>
  );
}

// ── Nav structure ────────────────────────────────────────────────────────────

const SCAN = [
  { href: '/scout', label: 'Subreddit Scout', Icon: IconScout },
  { href: '/radar', label: 'Radar',           Icon: IconRadar },
];

const TRACK = [
  { href: '/brief', label: 'Daily Subreddit News', Icon: IconBrief },
  { href: '/feed',  label: 'Feed',                 Icon: IconFeed  },
  { href: '/watch', label: 'Topic Watch',           Icon: IconWatch },
];

const PUBLISH = [
  { href: '/distribute', label: 'Distribute', Icon: IconDistribute },
];

const HIRE = [
  { href: '/hire', label: 'Advisory', Icon: IconHire },
];

const BOTTOM = [
  { href: '/command',          label: 'Command',       Icon: IconCommand  },
  { href: '/settings/alerts',  label: 'Email Alerts',  Icon: IconAlerts   },
  { href: '/settings',         label: 'Settings',      Icon: IconSettings },
];

// ── NavItem ──────────────────────────────────────────────────────────────────

function NavItem({ href, label, Icon, path, badge, activeColor, activeBg, alwaysActive }: {
  href: string; label: string; Icon: () => ReactElement; path: string; badge?: boolean; activeColor?: string; activeBg?: string; alwaysActive?: boolean;
}) {
  const active = alwaysActive || path === href || path.startsWith(href + '/');
  return (
    <Link
      href={href}
      style={{
        display: 'flex', alignItems: 'center', gap: 9,
        padding: '7px 10px', borderRadius: 7, margin: '0 8px',
        background: active ? (activeBg ?? 'rgba(74,143,255,0.13)') : 'transparent',
        color: active ? (activeColor ?? 'var(--blue)') : 'var(--t3)',
        textDecoration: 'none',
        transition: 'background 0.12s, color 0.12s',
        fontWeight: active ? 500 : 400,
        fontSize: 13,
      }}
    >
      <span style={{ flexShrink: 0, opacity: active ? 1 : 0.65 }}>
        <Icon />
      </span>
      <span style={{ flex: 1 }}>{label}</span>
      {badge && (
        <span style={{
          width: 6, height: 6, borderRadius: '50%',
          background: 'var(--hot)', flexShrink: 0,
          boxShadow: '0 0 4px var(--hot)',
        }} />
      )}
    </Link>
  );
}

// ── SectionLabel ─────────────────────────────────────────────────────────────

function SectionLabel({ children, color }: { children: string; color?: string }) {
  return (
    <div style={{
      fontSize: 10.5, fontWeight: 600, letterSpacing: '0.07em',
      color: color ?? 'var(--t4)', padding: '0 18px', marginBottom: 4,
      textTransform: 'uppercase',
    }}>
      {children}
    </div>
  );
}

// ── AppShell ─────────────────────────────────────────────────────────────────

export default function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const { data: session } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const [briefUnread, setBriefUnread] = useState(false);

  useEffect(() => {
    if (!session?.user?.email) return;
    const today = new Date().toISOString().slice(0, 10);
    fetch(`/api/brief?date=${today}`)
      .then(r => r.ok ? r.json() : null)
      .then((data: { brief: { date: string } | null; hasToday: boolean } | null) => {
        if (data?.hasToday && data?.brief) {
          // brief exists but we check if viewed — if brief was just returned it was marked viewed,
          // so we only show dot if hasToday is true but no brief returned (edge case guarded by hasToday)
          // Actually: brief returned means it was just marked viewed in the API. We show dot if hasToday
          // and current path is NOT /brief (user hasn't seen it this session yet).
          if (path !== '/brief') {
            setBriefUnread(true);
          }
        }
      })
      .catch(() => null);
  }, [session?.user?.email, path]);

  const fullscreen =
    path === '/' ||
    path.startsWith('/auth') ||
    path.startsWith('/onboarding') ||
    path.startsWith('/upgrade');
  if (fullscreen) return <>{children}</>;

  const isAnon = !session?.user;

  // Trial state for signed-in users
  const trialDaysLeft = (() => {
    if (!session?.user) return null;
    const u = session.user as any;
    if (u.subscriptionStatus === 'active') return null;
    const trialStart = u.trialStartAt as string | undefined;
    if (!trialStart) return null;
    const trialEnd = new Date(trialStart).getTime() + 3 * 86_400_000;
    const ms = trialEnd - Date.now();
    return Math.ceil(ms / 86_400_000); // can be negative (expired)
  })();
  const trialExpired = trialDaysLeft !== null && trialDaysLeft <= 0;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--void)' }}>
      <ProgressBar />

      {/* ── Sidebar ── */}
      <aside style={{
        width: 220, flexShrink: 0,
        borderRight: '0.5px solid var(--border)',
        display: 'flex', flexDirection: 'column',
        position: 'fixed', top: 0, bottom: 0, left: 0,
        zIndex: 40, background: 'var(--void)',
        overflowY: 'auto',
      }}>

        {/* Brand */}
        <Link href="/" style={{
          display: 'flex', alignItems: 'center', gap: 9,
          padding: '18px 18px 16px',
          borderBottom: '0.5px solid var(--border)',
          textDecoration: 'none',
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'var(--blue-dim)', border: '0.5px solid var(--blue-border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <Logo />
          </div>
          <span style={{ color: 'var(--t1)', fontSize: 15, fontWeight: 700, letterSpacing: '-0.01em' }}>
            Treddit
          </span>
        </Link>

        {/* Nav */}
        <nav style={{ flex: 1, paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Scan group */}
          <div>
            <SectionLabel>Scan</SectionLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {SCAN.map(item => (
                <NavItem key={item.href} {...item} path={path} />
              ))}
            </div>
          </div>

          {/* Track group */}
          <div>
            <SectionLabel>Track</SectionLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {TRACK.map(item => (
                <NavItem key={item.href} {...item} path={path} badge={item.href === '/brief' && briefUnread} />
              ))}
            </div>
          </div>

          {/* Publish group */}
          <div>
            <SectionLabel>Publish</SectionLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {PUBLISH.map(item => (
                <NavItem key={item.href} {...item} path={path} />
              ))}
            </div>
          </div>

          {/* Partner group */}
          <div>
            <SectionLabel color="rgba(255,100,50,0.6)">Partner</SectionLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {HIRE.map(item => (
                <NavItem key={item.href} {...item} path={path} activeColor="#FF6B35" activeBg="rgba(255,69,0,0.1)" alwaysActive />
              ))}
            </div>
          </div>

        </nav>

        {/* Bottom: Command + Settings + User */}
        <div style={{ borderTop: '0.5px solid var(--border)', paddingTop: 8, paddingBottom: 8 }}>
          {BOTTOM.map(item => (
            <NavItem key={item.href} {...item} path={path} />
          ))}

          {/* Anonymous CTA */}
          {isAnon && (
            <div style={{ margin: '8px 8px 4px' }}>
              <button
                onClick={() => signIn()}
                style={{
                  width: '100%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                  padding: '8px 12px',
                  background: 'rgba(74,143,255,0.12)',
                  border: '0.5px solid rgba(74,143,255,0.3)',
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontFamily: 'var(--font-ui)',
                }}
              >
                <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--blue)' }}>Sign in</span>
              </button>
            </div>
          )}

          {/* Trial countdown — visible when on trial with ≤3 days left */}
          {!isAnon && trialDaysLeft !== null && !trialExpired && trialDaysLeft <= 3 && (
            <div style={{
              margin: '6px 12px 4px',
              padding: '8px 12px',
              background: 'rgba(201,152,32,0.07)',
              border: '0.5px solid rgba(201,152,32,0.25)',
              borderRadius: 8,
            }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: '#c99820', marginBottom: 2 }}>
                {trialDaysLeft === 0 ? 'Last day of trial' : `${trialDaysLeft}d left on trial`}
              </div>
              <Link href="/upgrade" style={{ fontSize: 11, color: 'var(--t3)', textDecoration: 'none' }}>
                Upgrade to keep access →
              </Link>
            </div>
          )}

          {/* Free plan badge — shown when trial has expired */}
          {!isAnon && trialExpired && (
            <div style={{
              margin: '6px 12px 4px',
              padding: '8px 12px',
              background: 'rgba(0,200,160,0.05)',
              border: '0.5px solid rgba(0,200,160,0.15)',
              borderRadius: 8,
            }}>
              <div style={{ fontSize: 11, fontWeight: 500, color: 'rgba(0,200,160,0.5)', marginBottom: 2, letterSpacing: '0.06em' }}>
                FREE PLAN
              </div>
              <Link href="/upgrade" style={{ fontSize: 11, color: 'var(--t3)', textDecoration: 'none' }}>
                Upgrade for full access →
              </Link>
            </div>
          )}

          {/* Upgrade nav item — always visible for signed-in users */}
          {!isAnon && (
            <Link href="/upgrade" style={{ textDecoration: 'none', display: 'block', margin: '4px 8px' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 9,
                padding: '7px 10px', borderRadius: 7,
                color: 'var(--t3)',
                fontSize: 13,
              }}>
                <span style={{ flexShrink: 0, opacity: 0.65, fontSize: 15 }}>⚡</span>
                <span>Upgrade</span>
              </div>
            </Link>
          )}

          {/* Authenticated user menu */}
          {session?.user && (
            <div style={{ position: 'relative', margin: '6px 8px 0' }}>
              <button
                onClick={() => setMenuOpen(o => !o)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                  padding: '7px 10px', background: 'none', border: 'none', cursor: 'pointer',
                  borderRadius: 7,
                }}
              >
                <Avatar src={session.user.image} name={session.user.name} />
                <span style={{
                  color: 'var(--t2)', fontSize: 12, fontWeight: 400,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  flex: 1, textAlign: 'left',
                }}>
                  {session.user.name}
                </span>
              </button>

              {menuOpen && (
                <div style={{
                  position: 'absolute', bottom: 'calc(100% + 6px)', left: 0, right: 0,
                  background: 'var(--panel)', border: '0.5px solid var(--border)',
                  borderRadius: 10, overflow: 'hidden', zIndex: 100,
                  boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                }}>
                  <Link href="/settings" onClick={() => setMenuOpen(false)}
                    style={{ display: 'block', padding: '9px 14px', color: 'var(--t2)', fontSize: 13, textDecoration: 'none' }}>
                    Settings
                  </Link>
                  <button
                    onClick={() => { setMenuOpen(false); signOut({ callbackUrl: '/' }); }}
                    style={{
                      width: '100%', display: 'block', padding: '9px 14px',
                      color: 'var(--t3)', fontSize: 13, textAlign: 'left',
                      background: 'none', border: 'none',
                      borderTop: '0.5px solid var(--border)',
                      cursor: 'pointer', fontFamily: 'var(--font-ui)',
                    }}
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </aside>

      {/* ── Main ── */}
      <main style={{ flex: 1, marginLeft: 220, minHeight: '100vh' }}>
        {children}
      </main>
    </div>
  );
}
