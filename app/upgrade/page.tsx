'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

const MODULES = [
  { code: 'SCT-01', label: 'Scout', desc: 'Full community DNA reports on any subreddit' },
  { code: 'WCH-02', label: 'Watch', desc: 'Real-time keyword monitoring across Reddit' },
  { code: 'FED-03', label: 'Feed', desc: 'Daily threads ranked by signal relevance' },
  { code: 'CMP-04', label: 'Compose', desc: 'AI-guided post drafts per subreddit' },
  { code: 'TMG-05', label: 'Timing Intel', desc: 'Optimal post windows by community' },
  { code: 'DGT-06', label: 'Daily Digest', desc: 'High-opportunity thread summaries' },
];

export default function UpgradePage() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);

  async function handleCheckout() {
    if (!session?.user?.email) return;
    setLoading(true);
    try {
      const res = await fetch('/api/billing/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: session.user.email }),
      });
      const data = await res.json() as { checkoutUrl?: string; error?: string };
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        alert(data.error ?? 'Failed to start checkout');
        setLoading(false);
      }
    } catch {
      alert('Something went wrong. Please try again.');
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--void)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '48px 16px',
      position: 'relative',
    }}>
      {/* Scanlines */}
      <div className="scanlines" style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }} />
      <div className="scanline-sweep" style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 1 }} />

      <div style={{ position: 'relative', zIndex: 2, width: '100%', maxWidth: 520 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <svg width="28" height="28" viewBox="0 0 28 28" style={{ display: 'inline-block', marginBottom: 10 }}>
            <polygon points="14,2 20,10 26,10 20,18 22,26 14,21 6,26 8,18 2,10 8,10" fill="none" stroke="var(--cyan)" strokeWidth="1.5" opacity="0.4" />
            <polygon points="14,5 19,11 24,11 19,17 21,24 14,19 7,24 9,17 4,11 9,11" fill="none" stroke="var(--cyan)" strokeWidth="1" opacity="0.7" />
            <circle cx="14" cy="14" r="2" fill="var(--cyan)" />
          </svg>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.2em', color: 'var(--t3)', textTransform: 'uppercase' }}>TREDDIT · SIGNAL INTELLIGENCE</div>
        </div>

        {/* Trial warning badge */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          background: 'var(--hot-dim)',
          border: '1px solid var(--hot-border)',
          padding: '6px 14px',
          marginBottom: 28,
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          letterSpacing: '0.15em',
          color: 'var(--hot)',
          textTransform: 'uppercase',
          width: '100%',
          boxSizing: 'border-box' as const,
          clipPath: 'polygon(8px 0%, 100% 0%, calc(100% - 8px) 100%, 0% 100%)',
        }}>
          <span style={{ width: 6, height: 6, background: 'var(--hot)', display: 'inline-block', animation: 'void-blink 1s step-end infinite' }} />
          WARNING · TRIAL PERIOD EXPIRED · ACCESS RESTRICTED
        </div>

        {/* Main pricing card */}
        <div className="cb" style={{
          background: 'var(--surface)',
          padding: '32px 28px',
          marginBottom: 16,
          position: 'relative',
        }}>
          {/* Plan header */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 4 }}>
              <span className="tag tag-cyan">OPERATOR · TIER-1</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--t3)', letterSpacing: '0.1em' }}>BILLED MONTHLY</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 16, marginBottom: 6 }}>
              <span style={{ fontFamily: 'var(--font-ui)', fontSize: 56, fontWeight: 900, color: 'var(--t1)', lineHeight: 1 }}>$25</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--t3)', letterSpacing: '0.1em' }}>/ MO</span>
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--t3)', letterSpacing: '0.08em' }}>
              CANCEL ANYTIME · TAX HANDLED GLOBALLY · SSL ENCRYPTED
            </div>
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: 'var(--cyan-border)', marginBottom: 24, opacity: 0.5 }} />

          {/* Module list */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--t3)', letterSpacing: '0.2em', marginBottom: 14, textTransform: 'uppercase' }}>
              MODULES UNLOCKED
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {MODULES.map(m => (
                <div key={m.code} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <div style={{
                    width: 18,
                    height: 18,
                    background: 'var(--cyan-dim)',
                    border: '1px solid var(--cyan-border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    marginTop: 2,
                  }}>
                    <div style={{ width: 6, height: 6, background: 'var(--cyan)' }} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--cyan)', letterSpacing: '0.15em' }}>{m.code}</span>
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--t1)', fontWeight: 600, marginBottom: 2 }}>{m.label}</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--t3)', lineHeight: 1.4 }}>{m.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* CTA button */}
          <button
            onClick={handleCheckout}
            disabled={loading}
            className="btn-void-hot"
            style={{ width: '100%', padding: '16px 0', fontSize: 13, letterSpacing: '0.15em' }}
          >
            {loading ? 'CONNECTING TO PAYMENT NODE…' : 'ACTIVATE OPERATOR ACCESS →'}
          </button>

          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--t4)', textAlign: 'center', marginTop: 12, letterSpacing: '0.1em' }}>
            SECURE CHECKOUT VIA RAZORPAY · ENCRYPTED TUNNEL ACTIVE
          </div>
        </div>

        {/* Trust row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 24, marginBottom: 24 }}>
          {[
            { label: 'SECURE', val: '256-BIT SSL' },
            { label: 'GLOBAL TAX', val: 'AUTO-HANDLED' },
            { label: 'CANCEL', val: 'ANYTIME' },
          ].map(t => (
            <div key={t.label} style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--t4)', letterSpacing: '0.15em' }}>{t.label}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--cyan)', letterSpacing: '0.1em' }}>{t.val}</div>
            </div>
          ))}
        </div>

        {session && (
          <div style={{ textAlign: 'center' }}>
            <Link href="/feed" style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              color: 'var(--t3)',
              textDecoration: 'none',
              letterSpacing: '0.1em',
            }}>
              ← RETURN TO FEED
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
