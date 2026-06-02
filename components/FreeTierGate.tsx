'use client';

import Link from 'next/link';

export function isFreeTier(user: any): boolean {
  if (!user) return false;
  if (user.subscriptionStatus === 'active') return false;
  if (!user.trialStartAt) return false;
  const trialEnd = new Date(user.trialStartAt).getTime() + 3 * 86_400_000;
  return Date.now() > trialEnd;
}

interface FreeTierGateProps {
  title?: string;
  message?: string;
}

export function FreeTierGate({ title = 'Free plan', message = 'This feature requires an active subscription.' }: FreeTierGateProps) {
  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      minHeight: '60vh', padding: '40px 24px', textAlign: 'center',
    }}>
      <div style={{
        width: 48, height: 48, borderRadius: '50%',
        background: 'rgba(74,143,255,0.1)', border: '0.5px solid rgba(74,143,255,0.25)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 22, marginBottom: 20,
      }}>🔒</div>
      <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--t1)', marginBottom: 8, letterSpacing: '-0.02em' }}>
        {title}
      </div>
      <div style={{ fontSize: 13, color: 'var(--t3)', lineHeight: 1.6, maxWidth: 340, marginBottom: 28 }}>
        {message}
      </div>
      <Link href="/upgrade" style={{
        display: 'inline-block', padding: '10px 24px',
        background: 'var(--blue)', color: '#fff',
        borderRadius: 8, fontSize: 13, fontWeight: 600,
        textDecoration: 'none', letterSpacing: '-0.01em',
      }}>
        Upgrade →
      </Link>
    </div>
  );
}
