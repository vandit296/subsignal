'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { useState } from 'react';

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

const INTELLIGENCE = [
  { href: '/scout',      label: 'Scout',        Icon: IconScout      },
  { href: '/feed',       label: 'Signal Feed',  Icon: IconFeed       },
  { href: '/watch',      label: 'Keyword Watch',Icon: IconWatch      },
  { href: '/radar',      label: 'Radar',        Icon: IconRadar      },
];

const BOTTOM = [
  { href: '/command',          label: 'Command',       Icon: IconCommand  },
  { href: '/settings/alerts',  label: 'Email Alerts',  Icon: IconAlerts   },
  { href: '/settings',         label: 'Settings',      Icon: IconSettings },
];

// ── NavItem ──────────────────────────────────────────────────────────────────

function NavItem({ href, label, Icon, path }: {
  href: string; label: string; Icon: () => JSX.Element; path: string;
}) {
  const active = path === href || path.startsWith(href + '/');
  return (
    <Link
      href={href}
      style={{
        display: 'flex', alignItems: 'center', gap: 9,
        padding: '7px 10px', borderRadius: 7, margin: '0 8px',
        background: active ? 'rgba(74,143,255,0.13)' : 'transparent',
        color: active ? 'var(--blue)' : 'var(--t3)',
        textDecoration: 'none',
        transition: 'background 0.12s, color 0.12s',
        fontWeight: active ? 500 : 400,
        fontSize: 13,
      }}
    >
      <span style={{ flexShrink: 0, opacity: active ? 1 : 0.65 }}>
        <Icon />
      </span>
      <span>{label}</span>
    </Link>
  );
}

// ── SectionLabel ─────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: string }) {
  return (
    <div style={{
      fontSize: 10.5, fontWeight: 600, letterSpacing: '0.07em',
      color: 'var(--t4)', padding: '0 18px', marginBottom: 4,
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

  const fullscreen =
    path === '/' ||
    path.startsWith('/auth') ||
    path.startsWith('/onboarding') ||
    path.startsWith('/upgrade');
  if (fullscreen) return <>{children}</>;

  const trialEnd = (session as any)?.user?.trialStartAt
    ? new Date(new Date((session as any).user.trialStartAt).getTime() + 3 * 86400_000).toISOString()
    : null;
  const daysLeft = trialEnd
    ? Math.max(0, Math.ceil((new Date(trialEnd).getTime() - Date.now()) / 86400_000))
    : 0;

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

          {/* Intelligence group */}
          <div>
            <SectionLabel>Intelligence</SectionLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {INTELLIGENCE.map(item => (
                <NavItem key={item.href} {...item} path={path} />
              ))}
            </div>
          </div>

        </nav>

        {/* Trial banner */}
        {daysLeft > 0 && (
          <div style={{ margin: '8px 12px', padding: '8px 10px', background: 'var(--hot-dim)', border: '0.5px solid var(--hot-border)', borderRadius: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--hot)', marginBottom: 3 }}>{daysLeft}d left on trial</div>
            <Link href="/upgrade" style={{ fontSize: 11, color: 'var(--t3)', textDecoration: 'none' }}>Upgrade →</Link>
          </div>
        )}

        {/* Bottom: Command + Settings + User */}
        <div style={{ borderTop: '0.5px solid var(--border)', paddingTop: 8, paddingBottom: 8 }}>
          {BOTTOM.map(item => (
            <NavItem key={item.href} {...item} path={path} />
          ))}

          {/* User */}
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
                  <Link href="/upgrade" onClick={() => setMenuOpen(false)}
                    style={{ display: 'block', padding: '9px 14px', color: 'var(--hot)', fontSize: 13, textDecoration: 'none' }}>
                    Upgrade
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
