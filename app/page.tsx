'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, signIn } from 'next-auth/react';
import Link from 'next/link';

const SIGNALS = ['SaaS', 'entrepreneur', 'startups', 'indiehackers', 'webdev', 'smallbusiness', 'marketing'];

const FEATURES = [
  { code:'01', title:'Community DNA', desc:'Decode the psychological profile, dominant culture, and hidden power structures of any subreddit.' },
  { code:'02', title:'Audience Intel', desc:'Map the exact demographics, pain points, and decision triggers of your target community.' },
  { code:'03', title:'Signal Stream', desc:'Real-time monitoring of keywords and trends across all tracked subreddits.' },
  { code:'04', title:'Post Synthesis', desc:'Generate context-aware posts tuned to each subreddit\'s voice and acceptance patterns.' },
  { code:'05', title:'Risk Flags', desc:'Identify community landmines, banned topics, and patterns that get posts removed.' },
  { code:'06', title:'Match Engine', desc:'Input your product — get ranked subreddits by audience fit and organic opportunity score.' },
];

function TredditMark() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <polygon points="10,1 18,5.5 18,14.5 10,19 2,14.5 2,5.5" stroke="var(--cyan)" strokeWidth="1.2" fill="none"/>
      <polygon points="10,5 14,7.5 14,12.5 10,15 6,12.5 6,7.5" fill="var(--cyan)" opacity="0.18"/>
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
    <main style={{ minHeight:'100vh', background:'var(--void)', color:'var(--t1)', fontFamily:'var(--font-ui)', display:'flex', flexDirection:'column' }}>

      <div className="void-progress-track">
        <div className="void-progress-bar" />
      </div>

      {/* ── NAV ── */}
      <nav style={{
        display:'flex', alignItems:'center', justifyContent:'space-between',
        padding:'0 28px', height:48,
        borderBottom:'0.5px solid rgba(237,233,224,0.08)',
        background:'rgba(11,11,14,0.95)', backdropFilter:'blur(12px)',
        position:'sticky', top:0, zIndex:50,
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:9 }}>
          <TredditMark />
          <span style={{ color:'var(--t1)', fontSize:14, fontWeight:600 }}>Treddit</span>
          <span style={{ color:'var(--t4)', fontSize:12, marginLeft:2 }}>/ signal intelligence</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          {session ? (
            <Link href="/feed" className="btn-void-primary" style={{ padding:'8px 16px', fontSize:13 }}>
              Enter app →
            </Link>
          ) : (
            <>
              <button
                onClick={() => signIn('google', { callbackUrl: '/feed' })}
                className="btn-void"
                style={{ padding:'8px 16px', fontSize:13 }}
              >
                Sign in
              </button>
              <Link href="/upgrade" className="btn-void-hot" style={{ padding:'8px 16px', fontSize:13 }}>
                Get access
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* ── HERO ── */}
      <section style={{
        display:'flex', flexDirection:'column', alignItems:'center',
        padding:'64px 24px 52px', position:'relative', overflow:'hidden',
      }}>
        <div style={{
          position:'absolute', top:'15%', left:'50%', transform:'translateX(-50%)',
          width:480, height:220, borderRadius:'50%',
          background:'radial-gradient(ellipse, rgba(91,108,245,0.07) 0%, transparent 70%)',
          pointerEvents:'none',
        }} />

        <div style={{ position:'relative', zIndex:1, width:'100%', maxWidth:620, textAlign:'center' }}>

          <div style={{ display:'inline-flex', alignItems:'center', gap:8, marginBottom:26 }}>
            <span className="live-dot" />
            <span className="tag tag-cyan">Live</span>
          </div>

          <h1 style={{
            fontSize:'clamp(28px,4.5vw,50px)', fontWeight:700, lineHeight:1.1,
            letterSpacing:'-0.03em', marginBottom:18, color:'var(--t1)',
          }}>
            Know what Reddit thinks<br />
            <span style={{ color:'var(--cyan)' }}>before they post it</span>
          </h1>

          <p style={{ color:'var(--t2)', fontSize:16, lineHeight:1.7, maxWidth:460, margin:'0 auto 38px' }}>
            Deep signal extraction from any subreddit. Community DNA, audience intel, risk flags — the exact playbook to win organically.
          </p>

          {/* Search */}
          <form onSubmit={handleAnalyze} style={{ width:'100%', marginBottom:14 }}>
            <div style={{ display:'flex', gap:8, alignItems:'stretch' }}>
              <div style={{
                flex:1, display:'flex', alignItems:'center', gap:8,
                border:'0.5px solid rgba(237,233,224,0.15)', background:'var(--surface)',
                padding:'0 16px', borderRadius:10,
                transition:'border-color 0.18s',
              }}>
                <span style={{ color:'var(--t4)', fontSize:14, fontWeight:500 }}>r/</span>
                <input
                  type="text"
                  value={value}
                  onChange={e => setValue(e.target.value)}
                  placeholder="enter subreddit name..."
                  autoFocus
                  style={{
                    flex:1, background:'transparent', border:'none', outline:'none',
                    color:'var(--t1)', fontSize:15, padding:'14px 0',
                    fontFamily:'var(--font-ui)',
                  }}
                />
              </div>
              <button
                type="submit"
                disabled={!value.trim()}
                className="btn-void-primary"
                style={{ padding:'14px 24px', fontSize:14 }}
              >
                Scan →
              </button>
            </div>
          </form>

          {/* Quick signals */}
          <div style={{ display:'flex', flexWrap:'wrap', gap:6, justifyContent:'center' }}>
            <span style={{ color:'var(--t4)', fontSize:12, alignSelf:'center' }}>Try:</span>
            {SIGNALS.map(sub => (
              <button
                key={sub}
                onClick={() => router.push(`/scout/${sub}`)}
                className="tag tag-muted"
                style={{ cursor:'pointer', border:'none', background:'rgba(237,233,224,0.05)', fontFamily:'var(--font-ui)', fontSize:12 }}
              >
                r/{sub}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURE GRID ── */}
      <section style={{ padding:'48px 24px 64px', maxWidth:960, margin:'0 auto', width:'100%', borderTop:'0.5px solid rgba(237,233,224,0.07)' }}>
        <div style={{ textAlign:'center', marginBottom:36 }}>
          <p style={{ color:'var(--t4)', fontSize:12, marginBottom:10, letterSpacing:'0.04em' }}>SYSTEM MODULES</p>
          <h2 style={{ fontSize:24, fontWeight:600, letterSpacing:'-0.02em', color:'var(--t1)' }}>
            Full intelligence stack
          </h2>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(270px,1fr))', gap:10 }}>
          {FEATURES.map(f => (
            <div key={f.code} className="cb" style={{ padding:'18px 18px' }}>
              <div style={{ color:'var(--t4)', fontSize:11, marginBottom:6 }}>{f.code}</div>
              <div style={{ color:'var(--cyan)', fontSize:13, fontWeight:600, marginBottom:8 }}>{f.title}</div>
              <div style={{ color:'var(--t2)', fontSize:13, lineHeight:1.65 }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ textAlign:'center', padding:'48px 24px 72px', borderTop:'0.5px solid rgba(237,233,224,0.07)' }}>
        <span className="tag tag-hot" style={{ marginBottom:18, display:'inline-flex' }}>Early access</span>
        <h2 style={{ fontSize:28, fontWeight:700, letterSpacing:'-0.02em', marginBottom:12, color:'var(--t1)', marginTop:16 }}>
          Deploy your signal stack
        </h2>
        <p style={{ color:'var(--t2)', fontSize:14, marginBottom:28, maxWidth:360, margin:'0 auto 28px', lineHeight:1.7 }}>
          Full access for ₹2,000/mo. Cancel any time. No lock-in.
        </p>
        <div style={{ display:'flex', gap:12, justifyContent:'center' }}>
          <Link href="/upgrade" className="btn-void-hot" style={{ padding:'13px 32px', fontSize:14 }}>
            Get full access →
          </Link>
          <Link href="/find" className="btn-void" style={{ padding:'13px 32px', fontSize:14 }}>
            Find my subreddits
          </Link>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ borderTop:'0.5px solid rgba(237,233,224,0.07)', padding:'14px 28px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <TredditMark />
          <span style={{ color:'var(--t4)', fontSize:12 }}>Treddit</span>
        </div>
        <span style={{ color:'var(--t4)', fontSize:12 }}>Live Reddit data · Claude AI · &lt;15s analysis</span>
      </footer>

    </main>
  );
}
