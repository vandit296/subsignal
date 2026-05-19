'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { useState, useEffect } from 'react';

const NAV = [
  { href: '/scout',   label: 'Scout',   sub: 'Subreddit analysis' },
  { href: '/feed',    label: 'Feed',     sub: 'Signal stream' },
  { href: '/watch',   label: 'Watch',   sub: 'Keyword alerts' },
  { href: '/compose', label: 'Compose', sub: 'Post synthesis' },
  { href: '/find',    label: 'Find',    sub: 'Subreddit match' },
  { href: '/alerts',  label: 'Alerts',  sub: 'Intent triggers' },
];

function Logo() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
      <polygon points="10,1 18,5.5 18,14.5 10,19 2,14.5 2,5.5"
        stroke="var(--blue)" strokeWidth="1.1" fill="none"/>
      <polygon points="10,5 14,7.5 14,12.5 10,15 6,12.5 6,7.5"
        fill="var(--blue)" opacity="0.15"/>
      <circle cx="10" cy="10" r="2" fill="var(--blue)"/>
    </svg>
  );
}

function Avatar({ src, name }: { src?: string | null; name?: string | null }) {
  if (src) {
    return <img src={src} alt={name ?? ''} style={{ width:26, height:26, borderRadius:'50%', flexShrink:0 }} />;
  }
  return (
    <div style={{
      width:26, height:26, borderRadius:'50%', flexShrink:0,
      background:'var(--blue-dim)', border:'0.5px solid var(--blue-border)',
      display:'flex', alignItems:'center', justifyContent:'center',
    }}>
      <span style={{ color:'var(--blue)', fontSize:10, fontWeight:600 }}>
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
    <div style={{ display:'flex', minHeight:'100vh', background:'var(--void)' }}>
      <ProgressBar />

      {/* ── Top bar ── */}
      <header style={{
        position:'fixed', top:0, left:0, right:0, height:42, zIndex:50,
        background:'rgba(12,12,15,0.94)',
        borderBottom:'0.5px solid var(--border)',
        backdropFilter:'blur(16px)',
        display:'flex', alignItems:'center', justifyContent:'space-between',
        padding:'0 18px',
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <Logo />
          <span style={{ color:'var(--t1)', fontSize:14, fontWeight:600, fontFamily:'var(--font-ui)', letterSpacing:'-0.01em' }}>
            Treddit
          </span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <span className="live-dot" />
          <span style={{ color:'var(--t4)', fontSize:12 }}>Live</span>
        </div>
      </header>

      {/* ── Sidebar ── */}
      <aside style={{
        width:152, flexShrink:0,
        borderRight:'0.5px solid var(--border)',
        display:'flex', flexDirection:'column',
        position:'fixed', top:42, bottom:0, left:0,
        zIndex:40, background:'rgba(12,12,15,0.97)',
        padding:'12px 0',
        overflowY:'auto',
      }}>

        {/* Nav */}
        <nav style={{ flex:1, display:'flex', flexDirection:'column', gap:1 }}>
          {NAV.map(item => {
            const active = path === item.href || path.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display:'block', padding:'8px 14px',
                  borderLeft: active ? '2px solid var(--blue)' : '2px solid transparent',
                  background: active ? 'var(--blue-dim)' : 'transparent',
                  textDecoration:'none', transition:'all 0.14s',
                }}
              >
                <div style={{
                  fontSize:13, fontWeight: active ? 500 : 400,
                  color: active ? 'var(--blue)' : 'var(--t2)',
                  fontFamily:'var(--font-ui)', marginBottom:2,
                }}>{item.label}</div>
                <div style={{
                  fontSize:11, color:'var(--t4)',
                  fontFamily:'var(--font-ui)', lineHeight:1.3,
                }}>{item.sub}</div>
              </Link>
            );
          })}
        </nav>

        {/* Trial */}
        {daysLeft > 0 && (
          <div style={{ margin:'8px 10px', padding:'8px 10px', background:'var(--hot-dim)', border:'0.5px solid var(--hot-border)', borderRadius:8 }}>
            <div style={{ fontSize:12, fontWeight:500, color:'var(--hot)', marginBottom:3 }}>{daysLeft}d left on trial</div>
            <Link href="/upgrade" style={{ fontSize:11, color:'var(--t3)', textDecoration:'none' }}>Upgrade →</Link>
          </div>
        )}

        {/* Bottom */}
        <div style={{ borderTop:'0.5px solid var(--border)', paddingTop:8 }}>
          <Link
            href="/command"
            style={{
              display:'block', padding:'8px 14px',
              borderLeft: path.startsWith('/command') ? '2px solid var(--blue)' : '2px solid transparent',
              background: path.startsWith('/command') ? 'var(--blue-dim)' : 'transparent',
              textDecoration:'none', transition:'all 0.14s',
            }}
          >
            <div style={{
              fontSize:13, fontWeight: path.startsWith('/command') ? 500 : 400,
              color: path.startsWith('/command') ? 'var(--blue)' : 'var(--t3)',
              fontFamily:'var(--font-ui)',
            }}>Settings</div>
          </Link>

          {/* User */}
          {session?.user && (
            <div style={{ position:'relative', margin:'6px 10px 2px' }}>
              <button
                onClick={() => setMenuOpen(o => !o)}
                style={{ width:'100%', display:'flex', alignItems:'center', gap:8, padding:'6px 4px', background:'none', border:'none', cursor:'pointer' }}
              >
                <Avatar src={session.user.image} name={session.user.name} />
                <span style={{ color:'var(--t2)', fontSize:12, fontFamily:'var(--font-ui)', fontWeight:400, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flex:1, textAlign:'left' }}>
                  {session.user.name}
                </span>
              </button>

              {menuOpen && (
                <div style={{
                  position:'absolute', bottom:'calc(100% + 6px)', left:0, right:0,
                  background:'var(--panel)', border:'0.5px solid var(--border)',
                  borderRadius:10, overflow:'hidden', zIndex:100,
                  boxShadow:'0 8px 32px rgba(0,0,0,0.4)',
                }}>
                  <Link href="/command" onClick={() => setMenuOpen(false)}
                    style={{ display:'block', padding:'9px 14px', color:'var(--t2)', fontSize:13, textDecoration:'none' }}>
                    Settings
                  </Link>
                  <Link href="/upgrade" onClick={() => setMenuOpen(false)}
                    style={{ display:'block', padding:'9px 14px', color:'var(--hot)', fontSize:13, textDecoration:'none' }}>
                    Upgrade
                  </Link>
                  <button
                    onClick={() => { setMenuOpen(false); signOut({ callbackUrl:'/' }); }}
                    style={{ width:'100%', display:'block', padding:'9px 14px', color:'var(--t3)', fontSize:13, textAlign:'left', background:'none', border:'none', borderTop:'0.5px solid var(--border)', cursor:'pointer', fontFamily:'var(--font-ui)' }}
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
      <main style={{ flex:1, marginLeft:152, marginTop:42, minHeight:'calc(100vh - 42px)' }}>
        {children}
      </main>
    </div>
  );
}
