'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, signIn } from 'next-auth/react';
import Link from 'next/link';

const POPULAR = ['SaaS', 'entrepreneur', 'startups', 'indiehackers', 'webdev', 'marketing'];

const FEATURES = [
  { icon: '🔥', title: 'Feed', desc: 'Morning digest of threads your product can genuinely help with — scored by AI.' },
  { icon: '📡', title: 'Watch', desc: 'Monitor any keyword across all of Reddit. Never miss a conversation.' },
  { icon: '✍️', title: 'Compose', desc: 'Guided post flow: idea → subreddit → inspiration → draft → score.' },
  { icon: '🔍', title: 'Scout', desc: 'Full community DNA report — timing, post formats, audience signals, risk flags.' },
];

export default function Home() {
  const [value, setValue] = useState('');
  const router = useRouter();
  const { data: session } = useSession();

  function handleScout(e: FormEvent) {
    e.preventDefault();
    const sub = value.replace(/^r\//, '').trim();
    if (sub) router.push(`/scout/${sub}`);
  }

  return (
    <main className="min-h-screen bg-[#0f0f11] flex flex-col">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-zinc-900/60">
        <div className="flex items-center gap-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-orange-500" />
          <span className="text-white font-bold text-base tracking-tight">SubSignal</span>
        </div>
        <div className="flex items-center gap-3">
          {session ? (
            <Link
              href="/feed"
              className="bg-orange-500 hover:bg-orange-400 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              Open app →
            </Link>
          ) : (
            <>
              <button
                onClick={() => signIn('google', { callbackUrl: '/feed' })}
                className="text-zinc-400 hover:text-white text-sm transition-colors"
              >
                Sign in
              </button>
              <button
                onClick={() => signIn('google', { callbackUrl: '/feed' })}
                className="bg-orange-500 hover:bg-orange-400 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
              >
                Get started free
              </button>
            </>
          )}
        </div>
      </nav>

      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-20">
        {/* Badge */}
        <div className="flex items-center gap-2 bg-orange-500/10 border border-orange-500/20 rounded-full px-4 py-1.5 text-orange-400 text-xs font-semibold mb-8">
          ✦ Reddit intelligence for founders
        </div>

        <h1 className="text-white text-5xl md:text-6xl font-bold text-center mb-5 leading-[1.1] max-w-3xl">
          Win on Reddit.<br />
          <span className="text-orange-500">Organically.</span>
        </h1>

        <p className="text-zinc-400 text-lg text-center mb-10 max-w-xl leading-relaxed">
          SubSignal tells you exactly where to engage, what to post, and when to post it — so every Reddit comment builds real distribution.
        </p>

        {/* Scout search bar */}
        <form onSubmit={handleScout} className="w-full max-w-md mb-4">
          <div className="flex gap-2">
            <div className="flex-1 flex items-center bg-[#18181b] border border-zinc-700 rounded-xl px-4 gap-2 focus-within:border-orange-500 transition-colors">
              <span className="text-zinc-500 text-sm font-medium">r/</span>
              <input
                type="text"
                value={value}
                onChange={e => setValue(e.target.value)}
                placeholder="SaaS"
                className="flex-1 bg-transparent text-white py-3.5 outline-none placeholder-zinc-600 text-base"
                autoFocus
              />
            </div>
            <button
              type="submit"
              disabled={!value.trim()}
              className="bg-orange-500 hover:bg-orange-400 disabled:opacity-40 text-white font-semibold px-6 py-3.5 rounded-xl transition-colors text-sm whitespace-nowrap"
            >
              Scout →
            </button>
          </div>
        </form>

        <div className="flex flex-wrap gap-2 justify-center max-w-md mb-14">
          <span className="text-zinc-600 text-xs self-center">Try:</span>
          {POPULAR.map(sub => (
            <button
              key={sub}
              onClick={() => router.push(`/scout/${sub}`)}
              className="text-xs bg-[#18181b] hover:bg-zinc-700 border border-zinc-800 text-zinc-400 hover:text-white px-3 py-1.5 rounded-full transition-colors"
            >
              r/{sub}
            </button>
          ))}
        </div>

        {/* Feature grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl w-full mb-14">
          {FEATURES.map(f => (
            <div
              key={f.title}
              className="bg-[#18181b] border border-zinc-800 rounded-xl p-4 hover:border-zinc-700 transition-colors"
            >
              <div className="text-2xl mb-3">{f.icon}</div>
              <p className="text-white text-sm font-semibold mb-1">{f.title}</p>
              <p className="text-zinc-600 text-[11px] leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>

        {/* CTA */}
        {!session && (
          <div className="text-center">
            <button
              onClick={() => signIn('google', { callbackUrl: '/feed' })}
              className="inline-flex items-center gap-2.5 bg-white hover:bg-zinc-100 text-zinc-900 font-bold text-base py-4 px-8 rounded-2xl transition-colors mb-3"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Start free — 3 days, no card
            </button>
            <p className="text-zinc-600 text-xs">Then $25/month · Cancel anytime</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="text-center py-6 border-t border-zinc-900 text-zinc-700 text-xs">
        SubSignal · Built for founders · Powered by Claude AI
      </footer>
    </main>
  );
}
