'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  interface Window { Razorpay: any; Paddle: any; }
}

function loadRazorpay(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) { resolve(); return; }
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Razorpay SDK failed to load'));
    document.head.appendChild(s);
  });
}

let paddleInited = false;
function loadPaddle(): Promise<void> {
  return new Promise((resolve, reject) => {
    const token = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN;
    if (!token) { reject(new Error('Paddle client token not set')); return; }
    const init = () => {
      if (!paddleInited) {
        window.Paddle.Environment.set('production');
        window.Paddle.Initialize({ token });
        paddleInited = true;
      }
      resolve();
    };
    if (window.Paddle) { init(); return; }
    const s = document.createElement('script');
    s.src = 'https://cdn.paddle.com/paddle/v2/paddle.js';
    s.onload = init;
    s.onerror = () => reject(new Error('Paddle SDK failed to load'));
    document.head.appendChild(s);
  });
}

const FREE_LIMITS = [
  { label: 'Scout reports',    note: '3 / month' },
  { label: 'Keyword signals',  note: '3 tracked' },
  { label: 'AI-composed drafts', note: '5 / month' },
  { label: 'Thread monitoring', note: 'daily refresh' },
  { label: 'Intelligence model', note: 'Standard' },
];

const PRO_SIGNALS = [
  'Discover where your product category wins on Reddit',
  'Track high-intent conversations before they peak',
  'Understand community DNA at strategic depth',
  'Surface positioning gaps and messaging angles',
  'Monitor Reddit continuously, not periodically',
  'Detect pain patterns before they become trends',
];

const PRO_CAPACITY = [
  { label: 'Scout reports',      value: 'Unlimited' },
  { label: 'Keyword signals',    value: 'Unlimited' },
  { label: 'AI-composed drafts', value: 'Unlimited' },
  { label: 'Thread monitoring',  value: 'Real-time' },
  { label: 'Intelligence model', value: 'Claude Sonnet (latest)' },
];

export default function UpgradePage() {
  const { data: session } = useSession();
  const [loading, setLoading]           = useState(false);
  const [isIndia, setIsIndia]           = useState<boolean | null>(null);
  const [forceGlobal, setForceGlobal]   = useState(false);
  const [coupon, setCoupon]             = useState('');
  const [couponStatus, setCouponStatus] = useState<'idle' | 'applied' | 'invalid'>('idle');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('intl') === '1') { setForceGlobal(true); setIsIndia(false); return; }
    fetch('/api/geo')
      .then(r => r.json())
      .then(({ country }: { country: string }) => setIsIndia(country === 'IN'))
      .catch(() => setIsIndia(false));
  }, []);

  function applyCoupon() {
    const code = coupon.trim().toUpperCase();
    if (!code) return;
    setCoupon(code);
    setCouponStatus('applied');
  }

  async function handleCheckout() {
    if (!session?.user?.email) { window.location.href = '/auth/signin?callbackUrl=/upgrade'; return; }
    setLoading(true);
    try {
      const res = await fetch('/api/billing/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: 'pro',
          ...(forceGlobal && { forceGlobal: true }),
          ...(couponStatus === 'applied' && coupon && { coupon }),
        }),
      });
      const data = await res.json() as {
        provider?: 'razorpay' | 'paddle'; checkoutUrl?: string; transactionId?: string;
        subscriptionId?: string; keyId?: string;
        couponApplied?: boolean;
        error?: string; detail?: string;
      };

      if (data.error) {
        // If coupon-related error, mark invalid
        if (coupon && /offer|coupon|discount|invalid/i.test(data.error)) {
          setCouponStatus('invalid');
          setLoading(false);
          return;
        }
        alert([data.error, data.detail].filter(Boolean).join('\n\n') || 'Something went wrong. Please try again.');
        setLoading(false);
        return;
      }

      if (data.provider === 'paddle') {
        // Preferred: open the Paddle.js overlay with the transaction the backend created.
        if (process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN && data.transactionId) {
          try {
            await loadPaddle();
            window.Paddle.Checkout.open({ transactionId: data.transactionId });
            setLoading(false);
            return;
          } catch (e) {
            console.error('Paddle overlay failed, falling back to redirect', e);
          }
        }
        // Fallback (client token not set yet, or overlay failed to load).
        if (data.checkoutUrl) { window.location.href = data.checkoutUrl; return; }
        alert('Checkout is temporarily unavailable. Please try again.');
        setLoading(false);
        return;
      }
      if (!data.subscriptionId || !data.keyId) { alert('Something went wrong. Please try again.'); setLoading(false); return; }

      await loadRazorpay();
      new window.Razorpay({
        key:             data.keyId,
        subscription_id: data.subscriptionId,
        name:            'Treddit',
        description:     'Reddit Growth Intelligence',
        prefill:         { email: session.user.email, name: session.user.name ?? session.user.email },
        theme:           { color: '#ffffff' },
        handler:         () => { window.location.href = '/command?upgraded=1'; },
        modal:           { ondismiss: () => setLoading(false) },
      }).open();
    } catch (err) {
      console.error(err);
      alert('Something went wrong. Please try again.');
      setLoading(false);
    }
  }

  const proPrice = isIndia === null ? '—' : isIndia ? '₹3,999' : '$49';
  return (
    <>
      <style>{`
        .plan-free-cta:hover { background: rgba(255,255,255,0.055) !important; color: rgba(255,255,255,0.55) !important; }
        .plan-pro-cta:hover:not(:disabled) { box-shadow: 0 2px 8px rgba(0,0,0,0.4), 0 8px 28px rgba(0,0,0,0.25) !important; transform: translateY(-1px); }
        .plan-pro-cta:active:not(:disabled) { transform: translateY(0); }
        .plan-free-cta, .plan-pro-cta { transition: background 0.18s ease, color 0.18s ease, box-shadow 0.18s ease, transform 0.14s ease; }
        .coupon-input::placeholder { color: rgba(255,255,255,0.18); }
        .coupon-input:focus { outline: none; border-color: rgba(255,255,255,0.22) !important; }
        .coupon-apply:hover { color: rgba(255,255,255,0.65) !important; border-color: rgba(255,255,255,0.22) !important; }
      `}</style>
      <div style={{ minHeight: '100vh', background: 'var(--void)', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '100px 24px 88px', position: 'relative', overflow: 'hidden', fontFamily: 'var(--font-ui)' }}>
        <div style={{ position: 'fixed', top: -160, left: '50%', transform: 'translateX(-50%)', width: 900, height: 580, background: 'radial-gradient(ellipse at 50% 30%, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.012) 30%, transparent 62%)', pointerEvents: 'none', zIndex: 0 }} />
        <div style={{ position: 'fixed', top: '15%', right: '5%', width: 600, height: 600, background: 'radial-gradient(ellipse at 55% 45%, rgba(210,180,110,0.016) 0%, transparent 60%)', pointerEvents: 'none', zIndex: 0 }} />
        <div style={{ position: 'fixed', top: '28%', left: '5%', width: 440, height: 440, background: 'radial-gradient(ellipse at 45% 50%, rgba(90,120,180,0.01) 0%, transparent 60%)', pointerEvents: 'none', zIndex: 0 }} />
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, height: 220, background: 'linear-gradient(to top, rgba(0,0,0,0.35) 0%, transparent 100%)', pointerEvents: 'none', zIndex: 0 }} />
        <div className="scanlines" style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }} />
        <div style={{ position: 'relative', zIndex: 2, width: '100%', maxWidth: 880 }}>
          <div style={{ textAlign: 'center', marginBottom: 88 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 40, opacity: 0.4 }}>
              <svg width="13" height="13" viewBox="0 0 28 28" fill="none"><polygon points="14,2 20,10 26,10 20,18 22,26 14,21 6,26 8,18 2,10 8,10" stroke="white" strokeWidth="1.5" /><circle cx="14" cy="14" r="2.5" fill="white" /></svg>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.26em', color: 'white', textTransform: 'uppercase' }}>Treddit</span>
            </div>
            <h1 style={{ fontSize: 'clamp(30px, 5.5vw, 46px)', fontWeight: 700, color: 'rgba(255,255,255,0.92)', margin: '0 0 22px', letterSpacing: '-0.04em', lineHeight: 1.08 }}>Reddit intelligence,<br />at two depths.</h1>
            <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.32)', margin: '0 auto', maxWidth: 360, lineHeight: 1.75, letterSpacing: '-0.01em' }}>Explore the surface for free.<br />Activate the full intelligence layer<br />when you&apos;re ready to operate.</p>
            {isIndia && new Date() < new Date('2026-08-01') && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginTop: 28, padding: '10px 20px', background: 'rgba(255, 180, 0, 0.08)', border: '1px solid rgba(255, 180, 0, 0.25)', borderRadius: 6 }}>
                <span style={{ fontSize: 13, color: 'rgba(255, 200, 80, 0.9)', fontFamily: 'var(--font-mono)', letterSpacing: '0.04em' }}>🎉 First month 50% off — automatically applied at checkout · Valid till 31 July 2026</span>
              </div>
            )}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 14, alignItems: 'start' }}>

            {/* Free plan */}
            <div style={{ background: 'rgba(255,255,255,0.016)', padding: '38px 32px 32px' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.24em', color: 'rgba(255,255,255,0.22)', textTransform: 'uppercase', marginBottom: 20 }}>Explore</div>
              <div style={{ marginBottom: 6 }}><span style={{ fontSize: 52, fontWeight: 800, color: 'rgba(255,255,255,0.3)', letterSpacing: '-0.045em', lineHeight: 1 }}>Free</span></div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.18)', marginBottom: 40, letterSpacing: '-0.005em' }}>No card required. Always free.</div>
              <div style={{ marginBottom: 36 }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.16em', color: 'rgba(255,255,255,0.18)', textTransform: 'uppercase', marginBottom: 22 }}>Included</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {FREE_LIMITS.map(s => (<div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 16 }}><span style={{ fontSize: 13, color: 'rgba(255,255,255,0.36)', letterSpacing: '-0.01em' }}>{s.label}</span><span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.04em', flexShrink: 0 }}>{s.note}</span></div>))}
                </div>
              </div>
              <Link href={session ? '/command' : '/auth/signin'} className="plan-free-cta" style={{ display: 'block', width: '100%', padding: '14px 0', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 600, letterSpacing: '0.16em', color: 'rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.028)', border: 'none', textDecoration: 'none', textTransform: 'uppercase', boxSizing: 'border-box' }}>{session ? 'Continue exploring' : 'Explore for free'}</Link>
            </div>

            {/* Pro plan */}
            <div style={{ background: 'rgba(255,255,255,0.042)', padding: '38px 32px 32px', position: 'relative', boxShadow: '0 0 0 1px rgba(255,255,255,0.065), 0 4px 8px rgba(0,0,0,0.14), 0 16px 36px rgba(0,0,0,0.22), 0 52px 88px rgba(0,0,0,0.32), 0 0 64px rgba(255,255,255,0.014) inset' }}>
              <div style={{ position: 'absolute', top: 0, left: 32, width: 44, height: 2, background: 'rgba(255,255,255,0.72)', borderRadius: '0 0 2px 2px' }} />
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.24em', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', marginBottom: 20 }}>Operate</div>
              <div style={{ marginBottom: 4 }}><span style={{ fontSize: 52, fontWeight: 800, color: 'rgba(255,255,255,0.94)', letterSpacing: '-0.045em', lineHeight: 1 }}>{proPrice}</span><span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 400, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.12em', marginLeft: 10 }}>/ mo</span></div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.28)', marginBottom: 40, letterSpacing: '-0.005em' }}>Cancel anytime · 14-day refund guarantee</div>
              <div style={{ marginBottom: 28 }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.16em', color: 'rgba(255,255,255,0.28)', textTransform: 'uppercase', marginBottom: 22 }}>What you can do</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {PRO_SIGNALS.map(s => (<div key={s} style={{ display: 'flex', alignItems: 'flex-start', gap: 13 }}><div style={{ width: 3, height: 3, borderRadius: '50%', background: 'rgba(255,255,255,0.4)', marginTop: 6, flexShrink: 0 }} /><span style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 1.55, letterSpacing: '-0.01em' }}>{s}</span></div>))}
                </div>
              </div>
              <div style={{ marginBottom: 28 }}>
                <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', marginBottom: 20 }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
                  {PRO_CAPACITY.map(c => (<div key={c.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 16 }}><span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', letterSpacing: '-0.01em' }}>{c.label}</span><span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.04em', flexShrink: 0, fontWeight: c.value === 'Unlimited' ? 600 : 400 }}>{c.value}</span></div>))}
                </div>
              </div>

              {/* Coupon code input */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', gap: 0 }}>
                  <input
                    className="coupon-input"
                    type="text"
                    value={coupon}
                    onChange={e => { setCoupon(e.target.value.toUpperCase()); setCouponStatus('idle'); }}
                    onKeyDown={e => e.key === 'Enter' && applyCoupon()}
                    placeholder="PROMO CODE"
                    maxLength={32}
                    style={{
                      flex: 1,
                      background: 'rgba(255,255,255,0.04)',
                      border: couponStatus === 'applied' ? '1px solid rgba(255,255,255,0.28)' : couponStatus === 'invalid' ? '1px solid rgba(255,80,80,0.4)' : '1px solid rgba(255,255,255,0.09)',
                      borderRight: 'none',
                      color: couponStatus === 'invalid' ? 'rgba(255,120,120,0.8)' : 'rgba(255,255,255,0.75)',
                      fontFamily: 'var(--font-mono)',
                      fontSize: 11,
                      letterSpacing: '0.12em',
                      padding: '10px 12px',
                    }}
                  />
                  <button
                    className="coupon-apply"
                    onClick={applyCoupon}
                    style={{
                      background: couponStatus === 'applied' ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.03)',
                      border: couponStatus === 'applied' ? '1px solid rgba(255,255,255,0.28)' : '1px solid rgba(255,255,255,0.09)',
                      color: couponStatus === 'applied' ? 'rgba(255,255,255,0.65)' : 'rgba(255,255,255,0.3)',
                      fontFamily: 'var(--font-mono)',
                      fontSize: 9,
                      letterSpacing: '0.14em',
                      padding: '10px 14px',
                      cursor: 'pointer',
                      textTransform: 'uppercase' as const,
                      whiteSpace: 'nowrap' as const,
                      transition: 'color 0.15s ease, border-color 0.15s ease',
                    }}
                  >
                    {couponStatus === 'applied' ? '✓ Applied' : 'Apply'}
                  </button>
                </div>
                {couponStatus === 'invalid' && (
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'rgba(255,100,100,0.65)', letterSpacing: '0.08em', marginTop: 6 }}>
                    Invalid or expired code
                  </div>
                )}
              </div>

              <button onClick={handleCheckout} disabled={loading} className="plan-pro-cta" style={{ width: '100%', padding: '15px 0', fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, letterSpacing: '0.16em', color: 'rgba(0,0,0,0.82)', background: loading ? 'rgba(255,255,255,0.5)' : 'linear-gradient(180deg, rgba(255,255,255,0.97) 0%, rgba(238,238,238,0.95) 100%)', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', textTransform: 'uppercase', display: 'block', boxSizing: 'border-box', boxShadow: '0 1px 2px rgba(0,0,0,0.2), 0 4px 14px rgba(0,0,0,0.18)' }}>{loading ? 'Connecting…' : 'Unlock Intelligence Layer'}</button>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'rgba(255,255,255,0.16)', textAlign: 'center', marginTop: 12, letterSpacing: '0.1em' }}>Secure checkout · Razorpay (IN) or Paddle (Global)</div>
            </div>
          </div>

          <div style={{ textAlign: 'center', marginTop: 80 }}>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.18)', margin: '0 auto 28px', maxWidth: 420, lineHeight: 1.85, letterSpacing: '-0.01em' }}>Reddit is the most honest signal of what people<br />actually think, need, and fear.<br />Treddit makes that intelligence continuous.</p>
            {session && (<Link href="/command" style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'rgba(255,255,255,0.18)', textDecoration: 'none', letterSpacing: '0.12em' }}>← back to command</Link>)}
          </div>
        </div>
      </div>
    </>
  );
}