'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, signIn } from 'next-auth/react';
import Link from 'next/link';

const SIGNALS = ['SaaS', 'entrepreneur', 'startups', 'indiehackers', 'webdev'];

const FEATURES = [
  { label: 'Subreddit Scout' },
  { label: 'AI Signal Feed' },
  { label: 'Keyword Watch' },
  { label: 'Post Analysis' },
];

function HexLogo({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
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
  const [inputFocused, setInputFocused] = useState(false);
  const router = useRouter();
  const { data: session } = useSession();

  function handleScan(e: FormEvent) {
    e.preventDefault();
    const sub = value.replace(/^r\//, '').trim();
    if (sub) router.push(`/scout/${sub}`);
  }

  return (
    <main style={{
      minHeight: '100vh',
      background: 'var(--void)',
      color: 'var(--t1)',
      fontFamily: 'var(--font-ui)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      position: 'relative',
      overflow: 'hidden',
    }}>

      {/* ── Atmospheric depth layers ── */}
      <div style={{
        position: 'fixed',
        top: 0, left: '50%',
        transform: 'translateX(-50%)',
        width: 1000, height: 560,
        background: 'radial-gradient(ellipse 55% 55% at 50% 15%, rgba(74,143,255,0.075) 0%, transparent 70%)',
        pointerEvents: 'none',
        zIndex: 0,
      }} />
      <div style={{
        position: 'fixed',
        top: 0, left: '50%',
        transform: 'translateX(-50%)',
        width: 600, height: 400,
        background: 'radial-gradient(ellipse 40% 40% at 50% 8%, rgba(74,143,255,0.04) 0%, transparent 65%)',
        pointerEvents: 'none',
        zIndex: 0,
      }} />

      {/* ── Top-right auth ── */}
      <div style={{
        position: 'absolute', top: 24, right: 28,
        display: 'flex', gap: 8, zIndex: 10,
      }}>
        {session ? (
          <Link
            href="/feed"
            className="btn-void-primary"
            style={{ padding: '7px 16px', fontSize: 12, letterSpacing: '0.025em' }}
          >
            Open app →
          </Link>
        ) : (
          <>
            <button
              onClick={() => signIn('google', { callbackUrl: '/feed' })}
              className="btn-void"
              style={{ padding: '7px 16px', fontSize: 12, letterSpacing: '0.025em' }}
            >
              Sign in
            </button>
            <Link
              href="/upgrade"
              className="btn-void-solid"
              style={{ padding: '7px 16px', fontSize: 12, letterSpacing: '0.025em' }}
            >
              Get access
            </Link>
          </>
        )}
      </div>

      {/* ── Hero: Logo + Wordmark + Subheadline ── */}
      <section style={{
        paddingTop: 118,
        paddingBottom: 52,
        textAlign: 'center',
        position: 'relative',
        zIndex: 1,
      }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}>

          {/* Logo with glow halo */}
          <div style={{ position: 'relative', marginBottom: 22 }}>
            <div style={{
              position: 'absolute',
              inset: -16,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(74,143,255,0.14) 0%, transparent 68%)',
              filter: 'blur(10px)',
              pointerEvents: 'none',
            }} />
            <HexLogo size={50} />
          </div>

          {/* Wordmark */}
          <h1 style={{
            fontSize: 'clamp(52px, 8vw, 78px)',
            fontWeight: 700,
            letterSpacing: '-0.045em',
            color: 'var(--t1)',
            margin: '0 0 15px',
            lineHeight: 1,
          }}>
            Treddit
          </h1>

          {/* Strategic subheadline */}
          <p style={{
            color: 'var(--t2)',
            fontSize: 'clamp(14px, 1.7vw, 15.5px)',
            margin: 0,
            letterSpacing: '0.01em',
            fontWeight: 400,
            lineHeight: 1.55,
            maxWidth: 320,
          }}>
            Understand where and how to win on Reddit.
          </p>
        </div>
      </section>

      {/* ── Search input ── */}
      <section style={{
        width: '100%', maxWidth: 572,
        padding: '0 28px 20px',
        position: 'relative', zIndex: 1,
      }}>
        <form onSubmit={handleScan}>
          <div style={{
            display: 'flex',
            background: inputFocused
              ? 'rgba(18,18,26,0.95)'
              : 'var(--surface)',
            border: inputFocused
              ? '1px solid rgba(74,143,255,0.32)'
              : '0.5px solid var(--border)',
            borderRadius: 11,
            padding: '6px 6px 6px 18px',
            boxShadow: inputFocused
              ? '0 0 0 3px rgba(74,143,255,0.07), 0 4px 20px rgba(0,0,0,0.28)'
              : '0 2px 10px rgba(0,0,0,0.18)',
            transition: 'border-color 0.18s ease, box-shadow 0.18s ease, background 0.18s ease',
          }}>
            <span style={{
              color: inputFocused ? 'var(--blue)' : 'var(--t4)',
              fontSize: 15,
              alignSelf: 'center',
              marginRight: 3,
              fontWeight: 500,
              transition: 'color 0.18s ease',
              flexShrink: 0,
              letterSpacing: '-0.01em',
            }}>
              r/
            </span>
            <input
              type="text"
              value={value}
              onChange={e => setValue(e.target.value)}
              onFocus={() => setInputFocused(true)}
              onBlur={() => setInputFocused(false)}
              placeholder="enter any subreddit..."
              autoFocus
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: 'var(--t1)',
                fontSize: 15,
                padding: '11px 6px',
                fontFamily: 'var(--font-ui)',
                letterSpacing: '0.01em',
              }}
            />
            <button
              type="submit"
              disabled={!value.trim()}
              style={{
                padding: '10px 22px',
                fontSize: 13,
                fontWeight: 500,
                letterSpacing: '0.02em',
                borderRadius: 7,
                border: 'none',
                background: value.trim()
                  ? 'linear-gradient(160deg, #3d80f0 0%, #2460d0 100%)'
                  : 'var(--overlay)',
                color: value.trim() ? 'rgba(255,255,255,0.95)' : 'var(--t4)',
                cursor: value.trim() ? 'pointer' : 'not-allowed',
                fontFamily: 'var(--font-ui)',
                whiteSpace: 'nowrap',
                flexShrink: 0,
                transition: 'all 0.16s ease',
                boxShadow: value.trim()
                  ? '0 1px 8px rgba(36,96,208,0.35), inset 0 1px 0 rgba(255,255,255,0.12)'
                  : 'none',
              }}
              onMouseEnter={e => {
                if (value.trim()) {
                  e.currentTarget.style.background = 'linear-gradient(160deg, #4d8fff 0%, #3470e0 100%)';
                  e.currentTarget.style.boxShadow = '0 3px 14px rgba(36,96,208,0.45), inset 0 1px 0 rgba(255,255,255,0.15)';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }
              }}
              onMouseLeave={e => {
                if (value.trim()) {
                  e.currentTarget.style.background = 'linear-gradient(160deg, #3d80f0 0%, #2460d0 100%)';
                  e.currentTarget.style.boxShadow = '0 1px 8px rgba(36,96,208,0.35), inset 0 1px 0 rgba(255,255,255,0.12)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }
              }}
            >
              Analyse →
            </button>
          </div>
        </form>

        {/* Quick-pick chips */}
        <div style={{
          display: 'flex', flexWrap: 'nowrap', gap: 6,
          justifyContent: 'center', marginTop: 15,
          alignItems: 'center',
        }}>
          <span style={{
            color: 'var(--t4)', fontSize: 11,
            letterSpacing: '0.05em', marginRight: 4,
          }}>
            Try
          </span>
          {SIGNALS.map(sub => (
            <button
              key={sub}
              onClick={() => router.push(`/scout/${sub}`)}
              style={{
                cursor: 'pointer',
                border: '0.5px solid rgba(255,255,255,0.07)',
                background: 'rgba(255,255,255,0.025)',
                borderRadius: 20,
                padding: '3px 11px',
                fontSize: 12,
                color: 'var(--t3)',
                fontFamily: 'var(--font-ui)',
                transition: 'all 0.14s ease',
                whiteSpace: 'nowrap',
                letterSpacing: '0.01em',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = 'rgba(74,143,255,0.28)';
                e.currentTarget.style.color = 'var(--blue)';
                e.currentTarget.style.background = 'rgba(74,143,255,0.06)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)';
                e.currentTarget.style.color = 'var(--t3)';
                e.currentTarget.style.background = 'rgba(255,255,255,0.025)';
              }}
            >
              r/{sub}
            </button>
          ))}
        </div>
      </section>

      {/* ── Intelligence mode selector ── */}
      <section style={{
        width: '100%', maxWidth: 620,
        padding: '22px 28px 0',
        borderTop: '0.5px solid rgba(255,255,255,0.05)',
        position: 'relative', zIndex: 1,
      }}>
        <div style={{ display: 'flex', gap: 5, justifyContent: 'center', flexWrap: 'nowrap' }}>
          {FEATURES.map((f, i) => (
            <button
              key={f.label}
              onClick={() => setActiveFeature(i)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                padding: '8px 15px',
                borderRadius: 7,
                cursor: 'pointer',
                fontFamily: 'var(--font-ui)',
                fontSize: 12,
                letterSpacing: '0.015em',
                fontWeight: activeFeature === i ? 500 : 400,
                border: activeFeature === i
                  ? '0.5px solid rgba(74,143,255,0.28)'
                  : '0.5px solid rgba(255,255,255,0.05)',
                background: activeFeature === i
                  ? 'rgba(74,143,255,0.08)'
                  : 'rgba(255,255,255,0.02)',
                color: activeFeature === i ? 'var(--blue)' : 'var(--t4)',
                transition: 'all 0.16s ease',
                whiteSpace: 'nowrap',
                boxShadow: activeFeature === i
                  ? 'inset 0 1px 0 rgba(74,143,255,0.12), 0 1px 6px rgba(0,0,0,0.12)'
                  : 'none',
              }}
              onMouseEnter={e => {
                if (activeFeature !== i) {
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                  e.currentTarget.style.color = 'var(--t2)';
                  e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                }
              }}
              onMouseLeave={e => {
                if (activeFeature !== i) {
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)';
                  e.currentTarget.style.color = 'var(--t4)';
                  e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                }
              }}
            >
              <span style={{
                width: 5,
                height: 5,
                borderRadius: '50%',
                flexShrink: 0,
                background: activeFeature === i ? 'var(--blue)' : 'var(--t4)',
                opacity: activeFeature === i ? 1 : 0.35,
                boxShadow: activeFeature === i ? '0 0 5px rgba(74,143,255,0.7)' : 'none',
                transition: 'all 0.16s ease',
              }} />
              {f.label}
            </button>
          ))}
        </div>
      </section>

    </main>
  );
}
