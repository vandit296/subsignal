'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, signIn } from 'next-auth/react';
import Link from 'next/link';

const SIGNALS = ['SaaS', 'entrepreneur', 'startups', 'indiehackers', 'webdev', 'smallbusiness', 'marketing'];

const FEATURES = [
  { code:'SYS-01', title:'COMMUNITY DNA', desc:'Decode the psychological profile, dominant culture, and hidden power structures of any subreddit.' },
  { code:'SYS-02', title:'AUDIENCE INTEL', desc:'Map the exact demographics, pain points, and decision triggers of your target community.' },
  { code:'SYS-03', title:'SIGNAL STREAM', desc:'Real-time monitoring of keywords and trends across all tracked subreddits.' },
  { code:'SYS-04', title:'POST SYNTHESIS', desc:'Generate context-aware posts tuned to each subreddit\'s voice and acceptance patterns.' },
  { code:'SYS-05', title:'RISK FLAGS', desc:'Identify community landmines, banned topics, and patterns that get posts removed.' },
  { code:'SYS-06', title:'MATCH ENGINE', desc:'Input your product — get ranked subreddits by audience fit and organic opportunity score.' },
];

const STATS = [
  { val:'47K+', lbl:'SUBREDDITS INDEXED' },
  { val:'2.1B', lbl:'POSTS ANALYZED' },
  { val:'<15s', lbl:'FULL ANALYSIS' },
  { val:'99.1%', lbl:'SIGNAL UPTIME' },
];

function TredditMark() {
  return (
    <svg width="24" height="24" viewBox="0 0 20 20" fill="none">
      <polygon points="10,1 18,5.5 18,14.5 10,19 2,14.5 2,5.5" stroke="var(--cyan)" strokeWidth="1.2" fill="none"/>
      <polygon points="10,5 14,7.5 14,12.5 10,15 6,12.5 6,7.5" fill="var(--cyan)" opacity="0.15"/>
      <circle cx="10" cy="10" r="2" fill="var(--cyan)"/>
    </svg>
  );
}

export default function Home() {
  const [value, setValue] = useState('');
  const router = useRouter();
  const { data: session } = useSession();

  function handleAnalyze(e: FormEvent) {
    e.preventDefault();
    const sub = value.replace(/^r\//, '').trim();
    if (sub) router.push(`/scout/${sub}`);
  }

  return (
    <main style={{ minHeight:'100vh', background:'var(--void)', color:'var(--t1)', fontFamily:'var(--font-mono)', display:'flex', flexDirection:'column' }}>

      {/* ── Top scan bar ── */}
      <div className="void-progress-track">
        <div className="void-progress-bar" />
      </div>

      {/* ── HUD NAV ── */}
      <nav style={{
        display:'flex', alignItems:'center', justifyContent:'space-between',
        padding:'0 28px', height:50,
        borderBottom:'1px solid var(--cyan-border)',
        background:'rgba(0,3,8,0.94)', backdropFilter:'blur(10px)',
        position:'sticky', top:0, zIndex:50,
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <TredditMark />
          <span style={{ color:'var(--cyan)', fontSize:13, fontWeight:700, letterSpacing:'0.14em' }}>TREDDIT</span>
          <span style={{ color:'var(--t4)', fontSize:9, marginLeft:6, letterSpacing:'0.08em' }}>SIGNAL INTELLIGENCE</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          {session ? (
            <Link href="/feed" className="btn-void-primary" style={{ padding:'10px 20px', fontSize:11 }}>
              ENTER SYSTEM →
            </Link>
          ) : (
            <>
              <button
                onClick={() => signIn('google', { callbackUrl: '/feed' })}
                className="btn-void"
                style={{ padding:'10px 18px' }}
              >
                SIGN IN
              </button>
              <Link href="/upgrade" className="btn-void-hot" style={{ padding:'10px 18px', fontSize:10 }}>
                GET ACCESS
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* ── HERO ── */}
      <section style={{
        flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
        padding:'70px 24px 50px', position:'relative', overflow:'hidden',
      }}>
        {/* Ambient glow behind hero */}
        <div style={{
          position:'absolute', top:'20%', left:'50%', transform:'translateX(-50%)',
          width:600, height:300, borderRadius:'50%',
          background:'radial-gradient(ellipse, rgba(0,212,255,0.07) 0%, transparent 70%)',
          pointerEvents:'none', zIndex:0,
        }} />

        {/* CRT scanlines overlay */}
        <div className="scanlines" style={{ position:'absolute', inset:0, pointerEvents:'none', zIndex:1 }} />

        <div style={{ position:'relative', zIndex:2, width:'100%', maxWidth:720, textAlign:'center' }}>

          {/* Status tag */}
          <div style={{ display:'inline-flex', alignItems:'center', gap:8, marginBottom:28 }}>
            <span className="live-dot" />
            <span className="tag tag-cyan">NEURAL FEED ACTIVE</span>
          </div>

          {/* Headline */}
          <h1 style={{
            fontSize:'clamp(30px,5.5vw,60px)', fontWeight:900, lineHeight:1.04,
            letterSpacing:'-0.02em', marginBottom:22, color:'var(--t1)',
          }}>
            KNOW WHAT REDDIT<br />
            <span style={{ color:'var(--cyan)', textShadow:'0 0 40px rgba(0,212,255,0.35)' }}>THINKS BEFORE</span><br />
            THEY POST IT
          </h1>

          <p style={{ color:'var(--t2)', fontSize:15, lineHeight:1.75, maxWidth:520, margin:'0 auto 40px', letterSpacing:'0.01em', fontFamily:'var(--font-ui)' }}>
            Neural-grade signal extraction from any subreddit. Community DNA, audience intel, risk flags, and the exact playbook to win organically.
          </p>

          {/* Search */}
          <form onSubmit={handleAnalyze} style={{ width:'100%', marginBottom:20 }}>
            <div style={{ display:'flex', gap:8, alignItems:'stretch' }}>
              <div style={{
                flex:1, display:'flex', alignItems:'center', gap:8,
                border:'1px solid var(--cyan-border)', background:'rgba(0,212,255,0.04)',
                padding:'0 16px', position:'relative',
                transition:'border-color 0.18s ease',
              }}>
                {/* Corner brackets */}
                <div style={{ position:'absolute', top:0, left:0, width:10, height:10, borderTop:'1.5px solid var(--cyan)', borderLeft:'1.5px solid var(--cyan)' }} />
                <div style={{ position:'absolute', top:0, right:0, width:10, height:10, borderTop:'1.5px solid var(--cyan)', borderRight:'1.5px solid var(--cyan)' }} />
                <div style={{ position:'absolute', bottom:0, left:0, width:10, height:10, borderBottom:'1.5px solid var(--cyan)', borderLeft:'1.5px solid var(--cyan)' }} />
                <div style={{ position:'absolute', bottom:0, right:0, width:10, height:10, borderBottom:'1.5px solid var(--cyan)', borderRight:'1.5px solid var(--cyan)' }} />
                <span style={{ color:'var(--cyan)', fontSize:13, fontWeight:700, opacity:0.85 }}>r/</span>
                <input
                  type="text"
                  value={value}
                  onChange={e => setValue(e.target.value)}
                  placeholder="enter subreddit name..."
                  autoFocus
                  style={{
                    flex:1, background:'transparent', border:'none', outline:'none',
                    color:'var(--t1)', fontSize:14, padding:'16px 0',
                    fontFamily:'var(--font-mono)', letterSpacing:'0.04em',
                  }}
                />
              </div>
              <button
                type="submit"
                disabled={!value.trim()}
                className="btn-void-primary"
                style={{ padding:'16px 28px', fontSize:12 }}
              >
                SCAN →
              </button>
            </div>
          </form>

          {/* Quick signals */}
          <div style={{ display:'flex', flexWrap:'wrap', gap:6, justifyContent:'center', marginBottom:48 }}>
            <span style={{ color:'var(--t4)', fontSize:9, letterSpacing:'0.12em', alignSelf:'center' }}>SIGNALS:</span>
            {SIGNALS.map(sub => (
              <button
                key={sub}
                onClick={() => router.push(`/scout/${sub}`)}
                className="tag tag-muted"
                style={{ cursor:'pointer', border:'none', background:'rgba(240,248,255,0.05)', fontFamily:'var(--font-mono)' }}
              >
                r/{sub}
              </button>
            ))}
          </div>

          {/* Stats */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:1, border:'1px solid var(--cyan-border)', background:'var(--cyan-border)' }}>
            {STATS.map(s => (
              <div key={s.lbl} className="stat-cell" style={{ background:'var(--surface)', padding:'18px 12px' }}>
                <div className="stat-num" style={{ color:'var(--cyan)', fontSize:22, fontFamily:'var(--font-ui)' }}>{s.val}</div>
                <div className="stat-lbl" style={{ color:'var(--t3)', fontSize:9 }}>{s.lbl}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURE GRID ── */}
      <section style={{ padding:'64px 24px', maxWidth:1040, margin:'0 auto', width:'100%' }}>
        <div style={{ textAlign:'center', marginBottom:44 }}>
          <div className="tag tag-violet" style={{ marginBottom:14 }}>SYSTEM MODULES</div>
          <h2 style={{ fontSize:26, fontWeight:800, letterSpacing:'-0.01em', color:'var(--t1)' }}>
            FULL INTELLIGENCE STACK
          </h2>
          <p style={{ color:'var(--t3)', fontSize:13, marginTop:10, fontFamily:'var(--font-ui)' }}>
            Every tool you need to understand, penetrate, and win any Reddit community.
          </p>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(290px,1fr))', gap:16 }}>
          {FEATURES.map(f => (
            <div key={f.code} className="cb" style={{ padding:'22px 20px' }}>
              <div style={{ color:'var(--t4)', fontSize:8, letterSpacing:'0.14em', marginBottom:6 }}>{f.code}</div>
              <div style={{ color:'var(--cyan)', fontSize:12, fontWeight:700, letterSpacing:'0.10em', marginBottom:10 }}>{f.title}</div>
              <div style={{ color:'var(--t2)', fontSize:12, lineHeight:1.65, fontFamily:'var(--font-ui)' }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ textAlign:'center', padding:'64px 24px 88px', borderTop:'1px solid var(--cyan-border)' }}>
        <div className="tag tag-hot" style={{ marginBottom:18 }}>EARLY ACCESS</div>
        <h2 style={{ fontSize:30, fontWeight:900, letterSpacing:'-0.02em', marginBottom:14, color:'var(--t1)' }}>
          DEPLOY YOUR SIGNAL STACK
        </h2>
        <p style={{ color:'var(--t2)', fontSize:14, marginBottom:32, maxWidth:400, margin:'0 auto 32px', lineHeight:1.7, fontFamily:'var(--font-ui)' }}>
          Full access for ₹2,000/mo. Cancel any time. No lock-in.
        </p>
        <div style={{ display:'flex', gap:14, justifyContent:'center' }}>
          <Link href="/upgrade" className="btn-void-hot" style={{ padding:'16px 36px', fontSize:13 }}>
            GET FULL ACCESS →
          </Link>
          <Link href="/find" className="btn-void" style={{ padding:'16px 36px', fontSize:13 }}>
            FIND MY SUBREDDITS
          </Link>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ borderTop:'1px solid var(--cyan-border)', padding:'16px 28px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <TredditMark />
          <span style={{ color:'var(--t4)', fontSize:9, letterSpacing:'0.10em' }}>TREDDIT // SIGNAL INTELLIGENCE</span>
        </div>
        <span style={{ color:'var(--t4)', fontSize:9 }}>LIVE REDDIT DATA · CLAUDE AI · &lt;15s ANALYSIS</span>
      </footer>

    </main>
  );
}
