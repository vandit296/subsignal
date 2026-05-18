'use client';

import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function SignInContent() {
  const params = useSearchParams();
  const callbackUrl = params.get('callbackUrl') ?? '/feed';

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--void)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '32px 16px',
      position: 'relative',
    }}>
      {/* Scanlines */}
      <div className="scanlines" style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }} />
      <div className="scanline-sweep" style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 1 }} />

      <div style={{ position: 'relative', zIndex: 2, width: '100%', maxWidth: 380 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <svg width="40" height="40" viewBox="0 0 40 40" style={{ display: 'inline-block', marginBottom: 14 }}>
            {/* Outer ring */}
            <circle cx="20" cy="20" r="17" fill="none" stroke="var(--cyan)" strokeWidth="1" opacity="0.2" />
            <circle cx="20" cy="20" r="17" fill="none" stroke="var(--cyan)" strokeWidth="1" opacity="0.6"
              strokeDasharray="28 80" strokeDashoffset="0" />
            {/* Inner mark */}
            <line x1="20" y1="4" x2="20" y2="14" stroke="var(--cyan)" strokeWidth="1.5" opacity="0.9" />
            <line x1="20" y1="26" x2="20" y2="36" stroke="var(--cyan)" strokeWidth="1.5" opacity="0.9" />
            <line x1="4" y1="20" x2="14" y2="20" stroke="var(--cyan)" strokeWidth="1.5" opacity="0.9" />
            <line x1="26" y1="20" x2="36" y2="20" stroke="var(--cyan)" strokeWidth="1.5" opacity="0.9" />
            <circle cx="20" cy="20" r="3" fill="var(--cyan)" opacity="0.9" />
            <circle cx="20" cy="20" r="6" fill="none" stroke="var(--cyan)" strokeWidth="1" opacity="0.4" />
            {/* Hot dot */}
            <circle cx="20" cy="14" r="1.5" fill="var(--hot)" />
          </svg>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 20, fontWeight: 800, color: 'var(--t1)', letterSpacing: '-0.02em', marginBottom: 4 }}>
            TREDDIT
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.25em', color: 'var(--t4)', textTransform: 'uppercase' }}>
            NEURAL SIGNAL INTELLIGENCE
          </div>
        </div>

        {/* Main card */}
        <div className="cb" style={{
          background: 'var(--surface)',
          padding: '32px 28px',
          marginBottom: 20,
        }}>
          <div style={{ marginBottom: 24, textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--cyan)', letterSpacing: '0.2em', marginBottom: 10 }}>
              AUTHENTICATION · NODE ACCESS
            </div>
            <div style={{ fontFamily: 'var(--font-ui)', fontSize: 22, fontWeight: 800, color: 'var(--t1)', marginBottom: 6 }}>
              INITIALISE ACCESS
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--t3)', letterSpacing: '0.05em', lineHeight: 1.6 }}>
              3-DAY FREE TRIAL · NO CREDIT CARD REQUIRED
            </div>
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: 'var(--cyan-border)', marginBottom: 24, opacity: 0.4 }} />

          {/* Google button */}
          <button
            onClick={() => signIn('google', { callbackUrl })}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 12,
              background: 'rgba(232,244,255,0.06)',
              border: '1px solid rgba(232,244,255,0.15)',
              color: 'var(--t1)',
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              letterSpacing: '0.12em',
              padding: '14px 20px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              outline: 'none',
              clipPath: 'polygon(6px 0%, 100% 0%, calc(100% - 6px) 100%, 0% 100%)',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,212,255,0.08)';
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--cyan-border)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(232,244,255,0.06)';
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(232,244,255,0.15)';
            }}
          >
            {/* Google SVG */}
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            AUTHENTICATE VIA GOOGLE
          </button>

          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 9,
            color: 'var(--t4)',
            textAlign: 'center',
            marginTop: 16,
            lineHeight: 1.8,
            letterSpacing: '0.05em',
          }}>
            BY PROCEEDING YOU AGREE TO OUR{' '}
            <a href="#" style={{ color: 'var(--t3)', textDecoration: 'underline' }}>TERMS</a>
            {' '}AND{' '}
            <a href="#" style={{ color: 'var(--t3)', textDecoration: 'underline' }}>PRIVACY PROTOCOL</a>
          </div>
        </div>

        {/* Feature nodes */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          {[
            { code: 'LIV', label: 'LIVE DATA' },
            { code: 'NEU', label: 'NEURAL AI' },
            { code: 'SEC', label: 'ENCRYPTED' },
          ].map(f => (
            <div key={f.code} style={{
              background: 'var(--surface)',
              border: '1px solid var(--cyan-border)',
              padding: '12px 8px',
              textAlign: 'center',
            }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--cyan)', letterSpacing: '0.2em', marginBottom: 4 }}>{f.code}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--t3)', letterSpacing: '0.1em' }}>{f.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense>
      <SignInContent />
    </Suspense>
  );
}
