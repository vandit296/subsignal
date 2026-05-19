'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, signIn } from 'next-auth/react';
import Link from 'next/link';

const SIGNALS = ['SaaS', 'entrepreneur', 'startups', 'indiehackers', 'webdev', 'smallbusiness'];

const FEATURES = [
  {
    label: 'Subreddit Scout',
    headline: 'Understand any community before you engage',
    desc: 'Community DNA, audience profiles, unwritten rules, risk flags — everything you need to post with confidence and not get burned.',
  },
  {
    label: 'AI Signal Feed',
    headline: 'Surface what matters, skip the noise',
    desc: 'An AI-curated stream of threads ranked by relevance to your product — buying intent, pain points, and brand mentions rise to the top.',
  },
  {
    label: 'Keyword Watch',
    headline: 'Never miss a relevant conversation',
    desc: 'Set keywords and get alerted the moment someone posts about your problem space. Real-time monitoring across every subreddit you track.',
  },
  {
    label: 'Post Analysis',
    headline: 'Know what will land before you hit post',
    desc: 'Paste any draft post and get an instant read on how the community will respond — tone fit, risk flags, and suggestions to improve.',
  },
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
  const [activeFeature, setActiveFeature] = useState(0);
  const router = useRouter();
  const { data: session } = useSession();

  function handleScan(e: FormEvent) {
    e.preventDefault();
    const sub = value.replace(/^r\//, '').trim();
    if (sub) router.push(`/scout/${sub}`);
  }

  const feat = FEATURES[activeFeature];

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
            <Link href="/feed" className="btn-void-primary" style={{ padding:'8px 16px' }}>Open app →</Link>
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
        padding:'80px 24px 72px', position:'relative', overflow:'hidden',
      }}>
        {/* Ambient glow */}
        <div style={{
          position:'absolute', top:'-5%', left:'50%', transform:'translateX(-50%)',
          width:560, height:280,
          background:'radial-gradient(ellipse at center, rgba(74,143,255,0.07) 0%, transparent 65%)',
          pointerEvents:'none',
        }} />

        <div style={{ position:'relative', zIndex:1, maxWidth:600, width:'100%', textAlign:'center' }}>

          {/* Status chip */}
          <div style={{
            display:'inline-flex', alignItems:'center', gap:7, marginBottom:28,
            background:'rgba(74,143,255,0.07)', border:'0.5px solid var(--blue-border)',
            borderRadius:20, padding:'5px 14px',
          }}>
            <span className="live-dot" />
            <span style={{ fontSize:12, color:'var(--blue)', fontWeight:500 }}>Monitoring Reddit in real time</span>
          </div>

          {/* Headline */}
          <h1 style={{
            fontSize:'clamp(28px,4.8vw,52px)', fontWeight:700, lineHeight:1.09,
            letterSpacing:'-0.03em', marginBottom:18, color:'var(--t1)',
          }}>
            Know what Reddit thinks<br />
            <span style={{ color:'var(--blue)' }}>before you post it</span>
          </h1>

          <p style={{
            color:'var(--t2)', fontSize:17, lineHeight:1.72,
            maxWidth:440, margin:'0 auto 44px',
          }}>
            Deep intelligence from any subreddit — community DNA, audience signals and risk flags.
          </p>

          {/* Search */}
          <form onSubmit={handleScan} style={{ width:'100%', maxWidth:520, margin:'0 auto 14px' }}>
            <div style={{
              display:'flex', gap:0,
              background:'var(--surface)', border:'0.5px solid var(--border)',
              borderRadius:12, padding:'6px 6px 6px 16px',
            }}>
              <span style={{ color:'var(--t4)', fontSize:15, alignSelf:'center', marginRight:4 }}>r/</span>
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
          <div style={{ display:'flex', flexWrap:'wrap', gap:6, justifyContent:'center' }}>
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
                onMouseEnter={e => { (e.currentTarget.style.borderColor='var(--blue-border)'); (e.currentTarget.style.color='var(--blue)'); }}
                onMouseLeave={e => { (e.currentTarget.style.borderColor='var(--border)'); (e.currentTarget.style.color='var(--t3)'); }}
              >
                r/{sub}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── Feature selector ── */}
      <section style={{ borderTop:'0.5px solid var(--border)', padding:'56px 32px 72px', maxWidth:820, margin:'0 auto', width:'100%' }}>

        {/* Radio-style selectors */}
        <div style={{ display:'flex', gap:8, justifyContent:'center', flexWrap:'wrap', marginBottom:32 }}>
          {FEATURES.map((f, i) => (
            <button
              key={f.label}
              onClick={() => setActiveFeature(i)}
              style={{
                display:'flex', alignItems:'center', gap:8,
                padding:'9px 18px', borderRadius:20, cursor:'pointer',
                fontFamily:'var(--font-ui)', fontSize:13, fontWeight: activeFeature === i ? 500 : 400,
                border: activeFeature === i ? '0.5px solid var(--blue-border)' : '0.5px solid var(--border)',
                background: activeFeature === i ? 'var(--blue-dim)' : 'var(--surface)',
                color: activeFeature === i ? 'var(--blue)' : 'var(--t3)',
                transition:'all 0.16s',
              }}
            >
              {/* Radio dot */}
              <span style={{
                width:7, height:7, borderRadius:'50%', flexShrink:0,
                border: activeFeature === i ? 'none' : '1.5px solid var(--t4)',
                background: activeFeature === i ? 'var(--blue)' : 'transparent',
                transition:'all 0.16s',
              }} />
              {f.label}
            </button>
          ))}
        </div>

        {/* Feature detail */}
        <div
          key={activeFeature}
          style={{
            background:'var(--surface)', border:'0.5px solid var(--border)',
            borderRadius:14, padding:'32px 36px',
            animation:'void-slide-up 0.25s ease both',
          }}
        >
          <div style={{
            display:'inline-flex', alignItems:'center', gap:6,
            background:'var(--blue-dim)', border:'0.5px solid var(--blue-border)',
            borderRadius:20, padding:'3px 12px', marginBottom:16,
          }}>
            <span style={{ width:5, height:5, borderRadius:'50%', background:'var(--blue)', display:'inline-block' }} />
            <span style={{ fontSize:11, color:'var(--blue)', fontWeight:500 }}>{feat.label}</span>
          </div>
          <h3 style={{ fontSize:22, fontWeight:600, letterSpacing:'-0.02em', color:'var(--t1)', marginBottom:12 }}>
            {feat.headline}
          </h3>
          <p style={{ fontSize:15, color:'var(--t2)', lineHeight:1.75, maxWidth:500 }}>
            {feat.desc}
          </p>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ textAlign:'center', padding:'48px 24px 80px', borderTop:'0.5px solid var(--border)' }}>
        <div style={{
          display:'inline-flex', alignItems:'center', gap:7,
          background:'var(--hot-dim)', border:'0.5px solid var(--hot-border)',
          borderRadius:20, padding:'5px 14px', marginBottom:24,
        }}>
          <span style={{ fontSize:12, color:'var(--hot)', fontWeight:500 }}>Early access</span>
        </div>
        <h2 style={{ fontSize:28, fontWeight:700, letterSpacing:'-0.025em', marginBottom:12, color:'var(--t1)' }}>
          Start reading the room
        </h2>
        <p style={{ color:'var(--t2)', fontSize:15, maxWidth:340, margin:'0 auto 32px', lineHeight:1.7 }}>
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
