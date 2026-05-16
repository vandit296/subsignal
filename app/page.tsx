'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, signIn } from 'next-auth/react';
import Link from 'next/link';

const POPULAR = ['SaaS', 'entrepreneur', 'startups', 'indiehackers', 'webdev', 'smallbusiness', 'marketing'];

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
            <button
              onClick={() => signIn('google', { callbackUrl: '/feed' })}
              className="text-zinc-400 hover:text-white text-sm transition-colors"
            >
              Sign in
            </button>
          )}
        </div>
      </nav>

      {/* Main — centered subreddit input */}
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-2xl">
          {/* Centered logo */}
          <div className="flex items-center gap-3 justify-center mb-8">
            <div className="w-4 h-4 rounded-full bg-orange-500" />
            <span className="text-white font-bold text-2xl tracking-tight">SubSignal</span>
          </div>

          {/* Heading */}
          <h1 className="text-white text-6xl font-bold text-center leading-[1.1] mb-5">
            Deep Reddit intelligence<br />
            <span className="text-orange-500">for founders</span>
          </h1>

          <p className="text-zinc-400 text-center text-lg mb-10 leading-relaxed max-w-xl mx-auto">
            Paste any subreddit. Get AI-powered community DNA, audience intel, risk flags, and the exact playbook to win organically.
          </p>

          <form onSubmit={handleAnalyze} className="w-full mb-5">
            <div className="flex gap-3">
              <div className="flex-1 flex items-center bg-[#18181b] border border-zinc-700 rounded-2xl px-5 gap-2 focus-within:border-orange-500 transition-colors">
                <span className="text-zinc-500 text-base font-medium">r/</span>
                <input
                  type="text"
                  value={value}
                  onChange={e => setValue(e.target.value)}
                  placeholder="SaaS"
                  className="flex-1 bg-transparent text-white py-5 outline-none placeholder-zinc-600 text-lg"
                  autoFocus
                />
              </div>
              <button
                type="submit"
                disabled={!value.trim()}
                className="bg-orange-500 hover:bg-orange-400 disabled:opacity-40 text-white font-bold px-8 py-5 rounded-2xl transition-colors text-base whitespace-nowrap"
              >
                Analyze →
              </button>
            </div>
          </form>

          <div className="flex flex-wrap gap-2 justify-center mb-8">
            <span className="text-zinc-600 text-sm self-center">Try:</span>
            {POPULAR.map(sub => (
              <button
                key={sub}
                onClick={() => router.push(`/scout/${sub}`)}
                className="text-sm bg-[#18181b] hover:bg-zinc-700 border border-zinc-800 text-zinc-400 hover:text-white px-4 py-2 rounded-full transition-colors"
              >
                r/{sub}
              </button>
            ))}
          </div>

          <div className="text-center">
            <Link
              href="/find"
              className="text-zinc-500 hover:text-zinc-300 text-sm transition-colors"
            >
              Don&apos;t know which subreddit? Find the right ones for your product →
            </Link>
          </div>
        </div>
      </div>

      <footer className="text-center py-6 text-zinc-600 text-sm">
        Pulls live Reddit data · Analyzed by Claude AI · Results in ~15 seconds
      </footer>
    </main>
  );
}
