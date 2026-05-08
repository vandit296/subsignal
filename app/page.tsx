'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

const POPULAR = ['SaaS', 'entrepreneur', 'startups', 'indiehackers', 'webdev', 'marketing', 'smallbusiness'];

export default function Home() {
  const [value, setValue] = useState('');
  const router = useRouter();

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const sub = value.replace(/^r\//, '').trim();
    if (sub) router.push(`/dashboard/${sub}`);
  }

  return (
    <main className="min-h-screen bg-[#0f0f11] flex flex-col items-center justify-center px-4">
      {/* Logo */}
      <div className="flex items-center gap-3 mb-10">
        <div className="w-3 h-3 rounded-full bg-orange-500" />
        <span className="text-white text-2xl font-bold tracking-tight">SubSignal</span>
      </div>

      {/* Headline */}
      <h1 className="text-white text-4xl md:text-5xl font-bold text-center mb-4 leading-tight">
        Deep Reddit intelligence<br />
        <span className="text-orange-500">for founders</span>
      </h1>
      <p className="text-zinc-400 text-lg text-center mb-12 max-w-lg">
        Paste any subreddit. Get AI-powered community DNA, audience intel,
        risk flags, and the exact playbook to win organically.
      </p>

      {/* Input */}
      <form onSubmit={handleSubmit} className="w-full max-w-md">
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
            className="bg-orange-500 hover:bg-orange-400 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold px-6 py-3.5 rounded-xl transition-colors text-sm"
          >
            Analyze →
          </button>
        </div>
      </form>

      {/* Popular subreddits */}
      <div className="mt-8 flex flex-wrap gap-2 justify-center max-w-md">
        <span className="text-zinc-600 text-xs self-center">Try:</span>
        {POPULAR.map(sub => (
          <button
            key={sub}
            onClick={() => router.push(`/dashboard/${sub}`)}
            className="text-xs bg-[#18181b] hover:bg-zinc-700 border border-zinc-800 text-zinc-400 hover:text-white px-3 py-1.5 rounded-full transition-colors"
          >
            r/{sub}
          </button>
        ))}
      </div>

      {/* Footer */}
      <p className="mt-16 text-zinc-700 text-xs text-center">
        Pulls live Reddit data · Analyzed by Claude AI · Results in ~15 seconds
      </p>
    </main>
  );
}
