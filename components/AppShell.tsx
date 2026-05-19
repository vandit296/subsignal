'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { useState, useEffect } from 'react';

const NAV = [
  { href: '/scout',   label: 'Scout',   sub: 'Subreddit deep dive' },
  { href: '/feed',    label: 'Feed',    sub: 'Live signal stream' },
  { href: '/watch',   label: 'Watch',   sub: 'Keyword monitoring' },
  { href: '/compose', label: 'Compose', sub: 'Post synthesis' },
  { href: '/find',    label: 'Find',    sub: 'Subreddit match' },
  { href: '/alerts',  label: 'Alerts',  sub: 'Signal triggers' },
];

const BOTTOM = [
  { href: '/command', label: 'Settings' },
];

/* ── Logomark ── */
function TredditMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
      <polygon points="10,1 18,5.5 18,14.5 10,19 2,14.5 2,5.5" stroke="var(--cyan)" strokeWidth="1.2" fill="none"/>
      <polygon points="10,5 14,7.5 14,12.5 10,15 6,12.5 6,7.5" fill="var(--cyan)" opacity="0.18"/>
      <circle cx="10" cy="10" r="2" fill="var(--cyan)"/>
    </svg>
  );
}

/* ── Avatar ── */
function Avatar({ src, name }: { src?: string | null; name?: string | null }) {
  const style = { width: 26, height: 26, borderRadius: '50%' as const, flexShrink: 0 };
  if (src) return <img src={src} alt={name ?? ''} style={style} />;
  return (
    <div style={{ ...style, background: 'var(--cyan-dim)', border: '0.5px solid var(--cyan-border)', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <span style={{ color:'var(--cyan)', fontSize:10, fontWeight:600 }}>
        {(name ?? '?')[0].toUpperCase()}
      </span>
    </div>
  );
}

/* ── UTC clock ── */
function UtcClock() {
  const [time, setTime] = useState('');
  useEffect(() => {
    const tick = () => setTime(new Date().toUTCString().slice(17, 25));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return <span style={{ color:'var(--t4)', fontSize:11, fontFamily:'var(--font-mono)', letterSpacing:'0.04em' }}>{time} UTC</span>;
}

function VoidProgressBar() {
  return (
    <div className="void-progress-track">
      <div className="void-progress-bar" />
    </div>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const { data: session } = useSession();
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);

  const fullscreen =
    path === '/' ||
    path.startsWith('/auth') ||
    path.startsWith('/onboarding') ||
    path.startsWith('/upgrade');
  if (fullscreen) return <>{children}</>;

  const trialEnd = (session as unknown as { user: { trialStartAt?: string } })?.user?.trialStartAt
    ? new Date(new Date((session as unknown as { user: { trialStartAt?: string } }).user.trialStartAt!).getTime() + 3 * 86400_000).toISOString()
    : null;
  const daysLeft = trialEnd ? Math.max(0, Math.ceil((new Date(trialEnd).getTime() - Date.now()) / 86400_000)) : 0;
  const isOnTrial = daysLeft > 0;

  return (
    <div style={{ display:'flex', minHeight:'100vh', background:'var(--void)' }}>

      <VoidProgressBar />

      {/* ── Top bar ── */}
      <header style={{
        position:'fixed', top:0, left:0, right:0, height:40, zIndex:50,
        background:'rgba(11,11,14,0.95)', borderBottom:'0.5px solid rgba(237,233,224,0.08)',
        backdropFilter:'blur(12px)',
        display:'flex', alignItems:'center', justifyContent:'space-between',
        padding:'0 16px',
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <TredditMark />
          <span style={{ color:'var(--t1)', fontFamily:'var(--font-ui)', fontSize:13, fontWeight:600 }}>
            Treddit
          </span>
          <span style={{ color:'var(--t4)', fontSize:11, marginLeft:2, fontFamily:'var(--font-ui)' }}>/ signal intelligence</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:16 }}>
          <UtcClock />
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            <span className="live-dot" />
            <span style={{ color:'var(--t3)', fontSize:11, fontFamily:'var(--font-ui)' }}>Live</span>
          </div>
        </div>
      </header>

      {/* ── Sidebar ── */}
      <aside style={{
        width:148, flexShrink:0,
        borderRight:'0.5px solid rgba(237,233,224,0.07)',
        display:'flex', flexDirection:'column',
        position:'fixed', top:40, bottom:0, left:0,
        zIndex:40, background:'rgba(11,11,14,0.98)',
        padding:'10px 0',
        overflowY:'auto',
      }}>

        <nav style={{ flex:1 }}>
          {NAV.map(item => {
            const active = path === item.href || path.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display:'block',
                  padding:'8px 12px',
                  borderLeft: active ? '2px solid var(--cyan)' : '2px solid transparent',
                  background: active ? 'var(--cyan-dim)' : 'transparent',
                  textDecoration:'none',
                  transition:'all 0.15s',
                }}
              >
                <div style={{
                  color: active ? 'var(--cyan)' : 'var(--t2)',
                  fontSize:13, fontWeight: active ? 600 : 400,
                  fontFamily:'var(--font-ui)',
                  marginBottom:2,
                }}>{item.label}</div>
                <div style={{ color:'var(--t4)', fontSize:11, lineHeight:1.3, fontFamily:'var(--font-ui)' }}>{item.sub}</div>
              </Link>
            );
          })}
        </nav>

        {/* Metrics */}
        <div style={{ padding:'10px 12px', borderTop:'0.5px solid rgba(237,233,224,0.07)', borderBottom:'0.5px solid rgba(237,233,224,0.07)', margin:'8px 0' }}>
          <div style={{ color:'var(--t4)', fontSize:10, fontFamily:'var(--font-ui)', marginBottom:8 }}>Metrics</div>
          <div style={{ marginBottom:6 }}>
            <div style={{ color:'var(--cyan)', fontSize:18, fontWeight:600, fontFamily:'var(--font-ui)', lineHeight:1 }}>∞</div>
            <div style={{ color:'var(--t4)', fontSize:10, fontFamily:'var(--font-ui)', marginTop:2 }}>Subs tracked</div>
          </div>
          <div>
            <div style={{ color:'#22C55E', fontSize:11, fontWeight:500, fontFamily:'var(--font-ui)' }}>● Live</div>
            <div style={{ color:'var(--t4)', fontSize:10, fontFamily:'var(--font-ui)', marginTop:1 }}>Status</div>
          </div>
        </div>

        {/* Trial badge */}
        {isOnTrial && (
          <div style={{ margin:'4px 10px', padding:'6px 8px', border:'0.5px solid var(--hot-border)', background:'var(--hot-dim)', borderRadius:6 }}>
            <div style={{ color:'var(--hot)', fontSize:11, fontWeight:600, fontFamily:'var(--font-ui)' }}>{daysLeft}d remaining</div>
            <Link href="/upgrade" style={{ color:'var(--t3)', fontSize:10, textDecoration:'none', fontFamily:'var(--font-ui)' }}>Upgrade →</Link>
          </div>
        )}

        {/* Bottom nav */}
        <div style={{ padding:'0 0 8px' }}>
          {BOTTOM.map(item => {
            const active = path.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display:'block', padding:'8px 12px',
                  borderLeft: active ? '2px solid var(--violet)' : '2px solid transparent',
                  background: active ? 'var(--violet-dim)' : 'transparent',
                  textDecoration:'none',
                }}
              >
                <div style={{
                  color: active ? 'var(--violet)' : 'var(--t3)',
                  fontSize:13, fontFamily:'var(--font-ui)',
                  fontWeight: active ? 600 : 400,
                }}>{item.label}</div>
              </Link>
            );
          })}

          {/* User */}
          {session?.user && (
            <div style={{ position:'relative', margin:'6px 10px 0' }}>
              <button
                onClick={() => setAvatarMenuOpen(o => !o)}
                style={{ width:'100%', display:'flex', alignItems:'center', gap:8, padding:'6px 2px', background:'none', border:'none', cursor:'pointer' }}
              >
                <Avatar src={session.user.image} name={session.user.name} />
                <div style={{ textAlign:'left', flex:1, minWidth:0 }}>
                  <p style={{ color:'var(--t2)', fontSize:12, fontFamily:'var(--font-ui)', fontWeight:500, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    {session.user.name}
                  </p>
                </div>
              </button>

              {avatarMenuOpen && (
                <div style={{
                  position:'absolute', bottom:'calc(100% + 4px)', left:0, right:0,
                  background:'var(--panel)', border:'0.5px solid rgba(237,233,224,0.12)',
                  borderRadius:8, overflow:'hidden',
                  zIndex:100,
                }}>
                  <Link href="/command" onClick={() => setAvatarMenuOpen(false)}
                    style={{ display:'block', padding:'9px 12px', color:'var(--t2)', fontSize:12, fontFamily:'var(--font-ui)', textDecoration:'none' }}>
                    Settings
                  </Link>
                  <Link href="/upgrade" onClick={() => setAvatarMenuOpen(false)}
                    style={{ display:'block', padding:'9px 12px', color:'var(--hot)', fontSize:12, fontFamily:'var(--font-ui)', textDecoration:'none' }}>
                    Upgrade
                  </Link>
                  <button
                    onClick={() => { setAvatarMenuOpen(false); signOut({ callbackUrl: '/' }); }}
                    style={{ width:'100%', display:'block', padding:'9px 12px', color:'var(--t3)', fontSize:12, fontFamily:'var(--font-ui)', textAlign:'left', background:'none', border:'none', borderTop:'0.5px solid rgba(237,233,224,0.08)', cursor:'pointer' }}
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </aside>

      {/* ── Main content ── */}
      <main style={{ flex:1, marginLeft:148, marginTop:40, minHeight:'calc(100vh - 40px)' }}>
        {children}
      </main>

    </div>
  );
}
