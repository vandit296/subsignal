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

      {/* ── HUD NAV ── */}
      <nav style={{
        display:'flex', alignItems:'center', justifyContent:'space-between',
        padding:'0 24px', height:48,
        borderBottom:'1px solid var(--cyan-border)',
        background:'rgba(0,3,8,0.92)', backdropFilter:'blur(8px)',
        position:'sticky', top:0, zIndex:50,
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <TredditMark />
          <span style={{ color:'var(--cyan)', fontSize:13, fontWeight:700, letterSpacing:'0.14em' }}>TREDDIT</span>
          <span style={{ color:'var(--t4)', fontSize:9, marginLeft:4 }}>SIGNAL INTELLIGENCE</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          {session ? (
            <Link href="/feed" className="btn-void-primary">
              ENTER SYSTEM →
            </Link>
          ) : (
            <>
              <button
                onClick={() => signIn('google', { callbackUrl: '/feed' })}
                className="btn-void"
              >
                SIGN IN
              </button>
              <Link href="/upgrade" className="btn-void-hot">
                GET ACCESS
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* ── HERO ── */}
      <section style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'60px 24px 40px', position:'relative', overflow:'hidden' }}>
        {/* CRT scanlines overlay */}
        <div className="scanlines" style={{ position:'absolute', inset:0, pointerEvents:'none', zIndex:1 }} />

        <div style={{ position:'relative', zIndex:2, width:'100%', maxWidth:700, textAlign:'center' }}>

          {/* Status tag */}
          <div style={{ display:'inline-flex', alignItems:'center', gap:8, marginBottom:24 }}>
            <span className="live-dot" />
            <span className="tag tag-cyan">NEURAL FEED ACTIVE</span>
          </div>

          {/* Headline */}
          <h1 style={{ fontSize:'clamp(28px,5vw,56px)', fontWeight:900, lineHeight:1.05, letterSpacing:'-0.02em', marginBottom:20, color:'var(--t1)' }}>
            KNOW WHAT REDDIT<br />
            <span style={{ color:'var(--cyan)', textShadow:'0 0 30px rgba(0,212,255,0.4)' }}>THINKS BEFORE</span><br />
            THEY POST IT
          </h1>

          <p style={{ color:'var(--t2)', fontSize:14, lineHeight:1.7, maxWidth:500, margin:'0 auto 36px', letterSpacing:'0.02em' }}>
            Neural-grade signal extraction from any subreddit. Community DNA, audience intel, risk flags, and the exact playbook to win organically.
          </p>

          {/* Search */}
          <form onSubmit={handleAnalyze} style={{ width:'100%', marginBottom:16 }}>
            <div style={{ display:'flex', gap:8, alignItems:'stretch' }}>
              <div style={{
                flex:1, display:'flex', alignItems:'center', gap:8,
                border:'1px solid var(--cyan-border)', background:'rgba(0,212,255,0.03)',
                padding:'0 16px', position:'relative',
              }}>
                {/* Corner brackets */}
                <div style={{ position:'absolute', top:0, left:0, width:8, height:8, borderTop:'1px solid var(--cyan)', borderLeft:'1px solid var(--cyan)' }} />
                <div style={{ position:'absolute', top:0, right:0, width:8, height:8, borderTop:'1px solid var(--cyan)', borderRight:'1px solid var(--cyan)' }} />
                <div style={{ position:'absolute', bottom:0, left:0, width:8, height:8, borderBottom:'1px solid var(--cyan)', borderLeft:'1px solid var(--cyan)' }} />
                <div style={{ position:'absolute', bottom:0, right:0, width:8, height:8, borderBottom:'1px solid var(--cyan)', borderRight:'1px solid var(--cyan)' }} />
                <span style={{ color:'var(--cyan)', fontSize:12, fontWeight:700 }}>r/</span>
                <input
                  type="text"
                  value={value}
                  onChange={e => setValue(e.target.value)}
                  placeholder="enter subreddit signal..."
                  autoFocus
                  style={{
                    flex:1, background:'transparent', border:'none', outline:'none',
                    color:'var(--t1)', fontSize:13, padding:'14px 0',
                    fontFamily:'var(--font-mono)', letterSpacing:'0.04em',
                  }}
                />
              </div>
              <button
                type="submit"
                disabled={!value.trim()}
                className="btn-void-primary"
                style={{ padding:'14px 24px', fontSize:12 }}
              >
                SCAN →
              </button>
            </div>
          </form>

          {/* Quick signals */}
          <div style={{ display:'flex', flexWrap:'wrap', gap:6, justifyContent:'center', marginBottom:40 }}>
            <span style={{ color:'var(--t4)', fontSize:9, letterSpacing:'0.12em', alignSelf:'center' }}>SIGNALS:</span>
            {SIGNALS.map(sub => (
              <button
                key={sub}
                onClick={() => router.push(`/scout/${sub}`)}
                className="tag tag-muted"
                style={{ cursor:'pointer', border:'none', background:'var(--overlay)' }}
              >
                r/{sub}
              </button>
            ))}
          </div>

          {/* Stats */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:1, border:'1px solid var(--cyan-border)', background:'var(--cyan-border)' }}>
            {STATS.map(s => (
              <div key={s.lbl} className="stat-cell" style={{ background:'var(--surface)', padding:'14px 12px' }}>
                <div className="stat-num" style={{ color:'var(--cyan)', fontSize:18 }}>{s.val}</div>
                <div className="stat-lbl">{s.lbl}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURE GRID ── */}
      <section style={{ padding:'60px 24px', maxWidth:1000, margin:'0 auto', width:'100%' }}>
        <div style={{ textAlign:'center', marginBottom:40 }}>
          <div className="tag tag-violet" style={{ marginBottom:12 }}>SYSTEM MODULES</div>
          <h2 style={{ fontSize:24, fontWeight:800, letterSpacing:'-0.01em', color:'var(--t1)' }}>
            FULL INTELLIGENCE STACK
          </h2>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))', gap:16 }}>
          {FEATURES.map(f => (
            <div key={f.code} className="cb" style={{ padding:'20px' }}>
              <div style={{ color:'var(--t4)', fontSize:8, letterSpacing:'0.14em', marginBottom:6 }}>{f.code}</div>
              <div style={{ color:'var(--cyan)', fontSize:12, fontWeight:700, letterSpacing:'0.1em', marginBottom:8 }}>{f.title}</div>
              <div style={{ color:'var(--t3)', fontSize:11, lineHeight:1.6 }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ textAlign:'center', padding:'60px 24px 80px', borderTop:'1px solid var(--cyan-border)' }}>
        <div className="tag tag-hot" style={{ marginBottom:16 }}>EARLY ACCESS</div>
        <h2 style={{ fontSize:28, fontWeight:900, letterSpacing:'-0.02em', marginBottom:12 }}>
          DEPLOY YOUR SIGNAL STACK
        </h2>
        <p style={{ color:'var(--t3)', fontSize:13, marginBottom:28, maxWidth:400, margin:'0 auto 28px' }}>
          Full access for ₹2,000/mo. Cancel any time. No lock-in.
        </p>
        <div style={{ display:'flex', gap:12, justifyContent:'center' }}>
          <Link href="/upgrade" className="btn-void-hot" style={{ padding:'14px 32px', fontSize:13 }}>
            GET FULL ACCESS →
          </Link>
          <Link href="/find" className="btn-void" style={{ padding:'14px 32px', fontSize:13 }}>
            FIND MY SUBREDDITS
          </Link>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ borderTop:'1px solid var(--cyan-border)', padding:'16px 24px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <TredditMark />
          <span style={{ color:'var(--t4)', fontSize:9, letterSpacing:'0.1em' }}>TREDDIT // SIGNAL INTELLIGENCE</span>
        </div>
        <span style={{ color:'var(--t4)', fontSize:9 }}>LIVE REDDIT DATA · CLAUDE AI · &lt;15s ANALYSIS</span>
      </footer>

    </main>
  );
}
