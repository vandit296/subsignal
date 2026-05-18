'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { useState, useEffect } from 'react';

const NAV = [
  { href: '/scout',   code: 'MOD-01', label: 'SCOUT',   sub: 'Subreddit deep dive' },
  { href: '/feed',    code: 'MOD-02', label: 'FEED',    sub: 'Live signal stream' },
  { href: '/watch',   code: 'MOD-03', label: 'WATCH',   sub: 'Keyword monitoring' },
  { href: '/compose', code: 'MOD-04', label: 'COMPOSE', sub: 'Post synthesis' },
  { href: '/find',    code: 'MOD-05', label: 'FIND',    sub: 'Subreddit match' },
  { href: '/alerts',  code: 'MOD-06', label: 'ALERTS',  sub: 'Signal triggers' },
];

const BOTTOM = [
  { href: '/command', code: 'SYS', label: 'COMMAND' },
];

/* ── Treddit logomark ── */
function TredditMark() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <polygon points="10,1 18,5.5 18,14.5 10,19 2,14.5 2,5.5" stroke="var(--cyan)" strokeWidth="1.2" fill="none"/>
      <polygon points="10,5 14,7.5 14,12.5 10,15 6,12.5 6,7.5" fill="var(--cyan)" opacity="0.15"/>
      <circle cx="10" cy="10" r="2" fill="var(--cyan)"/>
    </svg>
  );
}

/* ── Chamfered avatar ── */
function ChamferAvatar({ src, name }: { src?: string | null; name?: string | null }) {
  const style = {
    clipPath: 'polygon(20% 0%,80% 0%,100% 20%,100% 80%,80% 100%,20% 100%,0% 80%,0% 20%)',
    width: 28, height: 28, flexShrink: 0,
  };
  if (src) return <img src={src} alt={name ?? ''} style={style} />;
  return (
    <div style={{ ...style, background: 'var(--violet-dim)', border: '1px solid var(--violet-border)', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <span style={{ color:'var(--violet)', fontSize:10, fontWeight:700 }}>
        {(name ?? '?')[0].toUpperCase()}
      </span>
    </div>
  );
}

/* ── Live UTC clock ── */
function UtcClock() {
  const [time, setTime] = useState('');
  useEffect(() => {
    const tick = () => setTime(new Date().toUTCString().slice(17, 25));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return <span style={{ color:'var(--t3)', fontSize:10, letterSpacing:'0.05em' }}>{time} UTC</span>;
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const { data: session } = useSession();
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);

  // Full-screen pages — no shell
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

      {/* ── HUD top bar ── */}
      <header style={{
        position:'fixed', top:0, left:0, right:0, height:36, zIndex:50,
        background:'rgba(0,3,8,0.92)', borderBottom:'1px solid var(--cyan-border)',
        backdropFilter:'blur(8px)',
        display:'flex', alignItems:'center', justifyContent:'space-between',
        padding:'0 16px',
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <TredditMark />
          <span style={{ color:'var(--cyan)', fontFamily:'var(--font-mono)', fontSize:11, fontWeight:700, letterSpacing:'0.12em' }}>
            TREDDIT
          </span>
          <span style={{ color:'var(--t4)', fontSize:10, marginLeft:4 }}>// SIGNAL INTELLIGENCE v2</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:16 }}>
          <UtcClock />
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            <span className="live-dot" />
            <span style={{ color:'var(--cyan)', fontSize:9, letterSpacing:'0.15em' }}>NEURAL FEED ACTIVE</span>
          </div>
        </div>
      </header>

      {/* ── Sidebar ── */}
      <aside style={{
        width:130, flexShrink:0,
        borderRight:'1px solid var(--cyan-border)',
        display:'flex', flexDirection:'column',
        position:'fixed', top:36, bottom:0, left:0,
        zIndex:40, background:'rgba(1,10,18,0.98)',
        padding:'12px 0',
        overflowY:'auto',
      }}>
        {/* Nav items */}
        <nav style={{ flex:1 }}>
          {NAV.map(item => {
            const active = path === item.href || path.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display:'block',
                  padding:'8px 10px',
                  borderLeft: active ? '2px solid var(--cyan)' : '2px solid transparent',
                  background: active ? 'var(--cyan-dim)' : 'transparent',
                  textDecoration:'none',
                  transition:'all 0.15s',
                }}
              >
                <div style={{ color:'var(--t4)', fontSize:8, letterSpacing:'0.12em', marginBottom:2 }}>{item.code}</div>
                <div style={{ color: active ? 'var(--cyan)' : 'var(--t2)', fontSize:10, fontWeight:700, letterSpacing:'0.1em' }}>{item.label}</div>
                <div style={{ color:'var(--t4)', fontSize:9, marginTop:2, lineHeight:1.3 }}>{item.sub}</div>
              </Link>
            );
          })}
        </nav>

        {/* Metrics block */}
        <div style={{ padding:'10px', borderTop:'1px solid var(--cyan-border)', borderBottom:'1px solid var(--cyan-border)', margin:'8px 0' }}>
          <div style={{ color:'var(--t4)', fontSize:8, letterSpacing:'0.12em', marginBottom:6 }}>METRICS</div>
          <div className="stat-cell" style={{ marginBottom:4 }}>
            <div className="stat-num" style={{ color:'var(--cyan)' }}>∞</div>
            <div className="stat-lbl">SUBS TRACKED</div>
          </div>
          <div className="stat-cell">
            <div className="stat-num" style={{ color:'var(--hot)' }}>LIVE</div>
            <div className="stat-lbl">STATUS</div>
          </div>
        </div>

        {/* Trial badge */}
        {isOnTrial && (
          <div style={{ margin:'4px 8px', padding:'6px 8px', border:'1px solid var(--hot-border)', background:'var(--hot-dim)' }}>
            <div style={{ color:'var(--hot)', fontSize:9, fontWeight:700, letterSpacing:'0.1em' }}>{daysLeft}D REMAINING</div>
            <Link href="/upgrade" style={{ color:'var(--t3)', fontSize:8, textDecoration:'none' }}>UPGRADE →</Link>
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
                  display:'block', padding:'8px 10px',
                  borderLeft: active ? '2px solid var(--violet)' : '2px solid transparent',
                  background: active ? 'var(--violet-dim)' : 'transparent',
                  textDecoration:'none',
                }}
              >
                <div style={{ color:'var(--t4)', fontSize:8, letterSpacing:'0.12em', marginBottom:2 }}>{item.code}</div>
                <div style={{ color: active ? 'var(--violet)' : 'var(--t3)', fontSize:10, fontWeight:700, letterSpacing:'0.1em' }}>{item.label}</div>
              </Link>
            );
          })}

          {/* User */}
          {session?.user && (
            <div style={{ position:'relative', margin:'6px 8px 0' }}>
              <button
                onClick={() => setAvatarMenuOpen(o => !o)}
                style={{ width:'100%', display:'flex', alignItems:'center', gap:6, padding:'6px 4px', background:'none', border:'none', cursor:'pointer' }}
              >
                <ChamferAvatar src={session.user.image} name={session.user.name} />
                <div style={{ textAlign:'left', flex:1, minWidth:0 }}>
                  <p style={{ color:'var(--t2)', fontSize:9, fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    {session.user.name}
                  </p>
                </div>
              </button>

              {avatarMenuOpen && (
                <div style={{
                  position:'absolute', bottom:'calc(100% + 4px)', left:0, right:0,
                  background:'var(--panel)', border:'1px solid var(--cyan-border)',
                  zIndex:100,
                }}>
                  <Link href="/command" onClick={() => setAvatarMenuOpen(false)}
                    style={{ display:'block', padding:'8px 10px', color:'var(--t2)', fontSize:9, textDecoration:'none', letterSpacing:'0.08em' }}>
                    SYS / SETTINGS
                  </Link>
                  <Link href="/upgrade" onClick={() => setAvatarMenuOpen(false)}
                    style={{ display:'block', padding:'8px 10px', color:'var(--hot)', fontSize:9, textDecoration:'none', letterSpacing:'0.08em' }}>
                    ⚡ UPGRADE
                  </Link>
                  <button
                    onClick={() => { setAvatarMenuOpen(false); signOut({ callbackUrl: '/' }); }}
                    style={{ width:'100%', display:'block', padding:'8px 10px', color:'var(--t3)', fontSize:9, textAlign:'left', background:'none', border:'none', borderTop:'1px solid var(--cyan-border)', cursor:'pointer', letterSpacing:'0.08em', fontFamily:'var(--font-mono)' }}
                  >
                    DISCONNECT
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </aside>

      {/* ── Main content ── */}
      <main style={{ flex:1, marginLeft:130, marginTop:36, minHeight:'calc(100vh - 36px)' }}>
        {children}
      </main>

    </div>
  );
}
