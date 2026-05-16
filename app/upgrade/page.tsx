'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

const FEATURES = [
  { icon: '🔥', label: 'Feed', desc: 'Daily thread feed ranked by relevance to your product' },
  { icon: '📡', label: 'Watch', desc: 'Monitor any keyword across Reddit in real time' },
  { icon: '✍️', label: 'Compose', desc: 'AI-guided post drafts optimized for each subreddit' },
  { icon: '🔍', label: 'Scout', desc: 'Full community DNA reports on any subreddit' },
  { icon: '⏱️', label: 'Timing intel', desc: 'Best days and hours to post for maximum reach' },
  { icon: '📧', label: 'Email digests', desc: 'Daily summary of high-opportunity threads' },
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
    <div className="min-h-screen bg-[#0f0f11] flex flex-col items-center justify-center px-4 py-16">
      {/* Logo */}
      <div className="flex items-center gap-2.5 mb-3">
        <div className="w-2.5 h-2.5 rounded-full bg-orange-500" />
        <span className="text-white font-bold text-xl tracking-tight">SubSignal</span>
      </div>

      <div className="w-full max-w-lg">
        {/* Hero */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-orange-500/10 border border-orange-500/20 rounded-full px-4 py-1.5 text-orange-400 text-xs font-semibold mb-5">
            ⚡ Your trial has ended
          </div>
          <h1 className="text-white text-3xl font-bold mb-3 leading-tight">
            Keep the Reddit edge you found
          </h1>
          <p className="text-zinc-500 text-base">
            SubSignal Pro gives you everything you need to win organically on Reddit — for the price of one good coffee a week.
          </p>
        </div>

        {/* Pricing card */}
        <div className="bg-[#18181b] border border-orange-500/30 rounded-2xl p-7 mb-5 relative overflow-hidden">
          {/* Glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-px bg-gradient-to-r from-transparent via-orange-500/60 to-transparent" />

          <div className="flex items-end gap-2 mb-1">
            <span className="text-white text-5xl font-bold">$25</span>
            <span className="text-zinc-500 text-sm mb-2">/ month</span>
          </div>
          <p className="text-zinc-600 text-xs mb-6">Billed monthly · Cancel anytime · MoR — taxes handled globally</p>

          {/* Features */}
          <div className="grid grid-cols-2 gap-3 mb-7">
            {FEATURES.map(f => (
              <div key={f.label} className="flex items-start gap-2.5">
                <span className="text-base leading-none mt-0.5">{f.icon}</span>
                <div>
                  <p className="text-zinc-300 text-xs font-medium leading-none">{f.label}</p>
                  <p className="text-zinc-600 text-[10px] mt-0.5 leading-snug">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={handleCheckout}
            disabled={loading}
            className="w-full bg-orange-500 hover:bg-orange-400 disabled:opacity-60 text-white font-bold text-base py-4 rounded-xl transition-colors"
          >
            {loading ? 'Redirecting…' : 'Subscribe — $25/mo →'}
          </button>

          <p className="text-zinc-700 text-[11px] text-center mt-3">
            Secure checkout via DoDo Payments · SSL encrypted
          </p>
        </div>

        {/* Trust signals */}
        <div className="flex items-center justify-center gap-6 text-zinc-600 text-xs">
          <span>🔒 Secure</span>
          <span>🌍 Global tax handled</span>
          <span>↩ Cancel anytime</span>
        </div>

        {session && (
          <div className="text-center mt-6">
            <Link href="/feed" className="text-zinc-600 hover:text-zinc-400 text-xs transition-colors">
              ← Back to app
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
