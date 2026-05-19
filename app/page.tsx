'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, signIn } from 'next-auth/react';
import Link from 'next/link';

const SIGNALS = ['SaaS', 'entrepreneur', 'startups', 'indiehackers', 'webdev', 'smallbusiness'];

const FEATURES = [
  { title:'Community DNA',   desc:'Decode the culture, dominant voices, and unwritten rules of any subreddit before you engage.' },
  { title:'Audience Intel',  desc:'Map the exact pain points, vocabulary, and decision triggers of your target community.' },
  { title:'Signal Stream',   desc:'Monitor keywords and trends in real time across every subreddit you care about.' },
  { title:'Post Synthesis',  desc:'Generate posts tuned to each community\'s voice, tone, and acceptance patterns.' },
  { title:'Risk Flags',      desc:'Surface banned topics, moderation patterns, and landmines before they get you removed.' },
  { title:'Subreddit Match', desc:'Input your product — get ranked subreddits by audience fit and organic opportunity score.' },
];

function Logo() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <polygon points="10,1 18,5.5 18,14.5 10,19 2,14.5 2,5.5"
        stroke="var(--blue)" strokeWidth="1.1" fill="none"/>
      <polygon points="10,5 14,7.5 14,12.5 10,15 6,12.5 6,7.5"
        fill="var(--blue)" opacity="0.15"/>
      <circle cx="10" cy="10" r="2" fill="var(--blue)"/>
    </svg>
  );
}

export default function Home() {
  const [value, setValue] = useState('');
  const router  = useRouter();
  const { data: session } = useSession();

  function handleScan(e: FormEvent) {
    e.preventDefault();
    const sub = value.replace(/^r\//, '').trim();
    if (sub) router.push(`/scout/${sub}`);
  }

  return (
    <main style={{ minHeight:'100vh', background:'var(--void)', color:'var(--t1)', fontFamily:'var(--font-ui)', display:'flex', flexDirection:'column' }}>

      <div className="void-progress-track"><div className="void-progress-bar" /></div>

      {/* ── Nav ── */}
      <nav style={{
        display:'flex', alignItems:'center', justifyContent:'space-between',
        padding:'0 32px', height:52,
        borderBottom:'0.5px solid var(--border)',
        background:'rgba(12,12,15,0.94)', backdropFilter:'blur(16px)',
        position:'sticky', top:0, zIndex:50,
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:9 }}>
          <Logo />
          <span style={{ color:'var(--t1)', fontSize:15, fontWeight:600, letterSpacing:'-0.01em' }}>Treddit</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          {session ? (
            <Link href="/feed" className="btn-void-primary" style={{ padding:'8px 16px' }}>
              Open app →
            </Link>
          ) : (
            <>
              <button onClick={() => signIn('google', { callbackUrl:'/feed' })} className="btn-void" style={{ padding:'8px 16px' }}>
                Sign in
              </button>
              <Link href="/upgrade" className="btn-void-solid" style={{ padding:'8px 18px' }}>
                Get access
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* ── Hero ── */}
      <section style={{
        display:'flex', flexDirection:'column', alignItems:'center',
        padding:'80px 24px 60px', position:'relative', overflow:'hidden',
      }}>
        {/* Ambient glow — only where important */}
        <div style={{
          position:'absolute', top:'-10%', left:'50%', transform:'translateX(-50%)',
          width:600, height:300,
          background:'radial-gradient(ellipse at center, rgba(74,143,255,0.07) 0%, transparent 65%)',
          pointerEvents:'none',
        }} />

        <div style={{ position:'relative', zIndex:1, maxWidth:620, width:'100%', textAlign:'center' }}>

          {/* Status chip */}
          <div style={{ display:'inline-flex', alignItems:'center', gap:7, marginBottom:28,
            background:'rgba(74,143,255,0.07)', border:'0.5px solid var(--blue-border)',
            borderRadius:20, padding:'5px 14px',
          }}>
            <span className="live-dot" />
            <span style={{ fontSize:12, color:'var(--blue)', fontWeight:500 }}>Monitoring Reddit in real time</span>
          </div>

          {/* Headline */}
          <h1 style={{
            fontSize:'clamp(30px,5vw,54px)', fontWeight:700, lineHeight:1.08,
            letterSpacing:'-0.03em', marginBottom:20, color:'var(--t1)',
          }}>
            Know what Reddit thinks<br />
            <span style={{ color:'var(--blue)' }}>before they post it</span>
          </h1>

          <p style={{
            color:'var(--t2)', fontSize:17, lineHeight:1.72,
            maxWidth:480, margin:'0 auto 44px', fontWeight:400,
          }}>
            Deep intelligence from any subreddit — community DNA, audience signals, risk flags, and the exact playbook to win organically.
          </p>

          {/* Search */}
          <form onSubmit={handleScan} style={{ width:'100%', maxWidth:540, margin:'0 auto 16px' }}>
            <div style={{
              display:'flex', gap:8,
              background:'var(--surface)', border:'0.5px solid var(--border)',
              borderRadius:12, padding:'6px 6px 6px 16px',
              transition:'border-color 0.18s',
              boxShadow:'0 0 0 0 var(--blue-glow)',
            }}>
              <span style={{ color:'var(--t4)', fontSize:15, alignSelf:'center', fontWeight:400 }}>r/</span>
              <input
                type="text"
                value={value}
                onChange={e => setValue(e.target.value)}
                placeholder="enter any subreddit..."
                autoFocus
                style={{
                  flex:1, background:'transparent', border:'none', outline:'none',
                  color:'var(--t1)', fontSize:15, padding:'10px 4px',
                  fontFamily:'var(--font-ui)',
                }}
              />
              <button
                type="submit"
                disabled={!value.trim()}
                className="btn-void-solid"
                style={{ padding:'10px 20px', fontSize:14, borderRadius:8 }}
              >
                Analyse →
              </button>
            </div>
          </form>

          {/* Quick picks */}
          <div style={{ display:'flex', flexWrap:'wrap', gap:6, justifyContent:'center', marginTop:8 }}>
            <span style={{ color:'var(--t4)', fontSize:12, alignSelf:'center' }}>Try</span>
            {SIGNALS.map(sub => (
              <button
                key={sub}
                onClick={() => router.push(`/scout/${sub}`)}
                style={{
                  cursor:'pointer', border:'0.5px solid var(--border)',
                  background:'var(--surface)', borderRadius:20,
                  padding:'3px 11px', fontSize:12, color:'var(--t3)',
                  fontFamily:'var(--font-ui)', transition:'all 0.14s',
                }}
                onMouseEnter={e => { (e.target as HTMLElement).style.borderColor = 'var(--blue-border)'; (e.target as HTMLElement).style.color = 'var(--blue)'; }}
                onMouseLeave={e => { (e.target as HTMLElement).style.borderColor = 'var(--border)'; (e.target as HTMLElement).style.color = 'var(--t3)'; }}
              >
                r/{sub}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── Feature grid ── */}
      <section style={{ padding:'56px 32px 72px', maxWidth:980, margin:'0 auto', width:'100%', borderTop:'0.5px solid var(--border)' }}>
        <div style={{ marginBottom:40 }}>
          <p style={{ color:'var(--t4)', fontSize:12, letterSpacing:'0.06em', marginBottom:10, textTransform:'uppercase' }}>Capabilities</p>
          <h2 style={{ fontSize:26, fontWeight:600, letterSpacing:'-0.02em', color:'var(--t1)' }}>
            Everything you need to understand any community
          </h2>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))', gap:10 }}>
          {FEATURES.map(f => (
            <div key={f.title} className="cb" style={{ padding:'20px 20px' }}>
              <div style={{ color:'var(--blue)', fontSize:14, fontWeight:500, marginBottom:8 }}>{f.title}</div>
              <div style={{ color:'var(--t3)', fontSize:13, lineHeight:1.68 }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ textAlign:'center', padding:'56px 24px 80px', borderTop:'0.5px solid var(--border)' }}>
        <div style={{
          display:'inline-flex', alignItems:'center', gap:7,
          background:'var(--hot-dim)', border:'0.5px solid var(--hot-border)',
          borderRadius:20, padding:'5px 14px', marginBottom:24,
        }}>
          <span style={{ fontSize:12, color:'var(--hot)', fontWeight:500 }}>Early access</span>
        </div>
        <h2 style={{ fontSize:30, fontWeight:700, letterSpacing:'-0.025em', marginBottom:14, color:'var(--t1)' }}>
          Start reading the room
        </h2>
        <p style={{ color:'var(--t2)', fontSize:15, marginBottom:32, maxWidth:360, margin:'0 auto 32px', lineHeight:1.7 }}>
          Full access for ₹2,000/mo. Cancel any time.
        </p>
        <div style={{ display:'flex', gap:12, justifyContent:'center' }}>
          <Link href="/upgrade" className="btn-void-solid" style={{ padding:'13px 32px', fontSize:15 }}>
            Get full access →
          </Link>
          <Link href="/find" className="btn-void" style={{ padding:'13px 32px', fontSize:15 }}>
            Find my subreddits
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ borderTop:'0.5px solid var(--border)', padding:'16px 32px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <Logo />
          <span style={{ color:'var(--t4)', fontSize:13 }}>Treddit</span>
        </div>
        <span style={{ color:'var(--t4)', fontSize:12 }}>Live Reddit data · Claude AI · &lt;15s analysis</span>
      </footer>
    </main>
  );
}
