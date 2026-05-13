'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

const POPULAR = ['SaaS', 'entrepreneur', 'startups', 'indiehackers', 'webdev', 'marketing', 'smallbusiness'];

export default function AnalyzePage() {
  const [value, setValue] = useState('');
  const router = useRouter();

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const sub = value.replace(/^r\//, '').trim();
    if (sub) router.push(`/dashboard/${sub}`);
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-8">
      <h1 className="text-white text-3xl font-bold mb-2">Subreddit Deep Dive</h1>
      <p className="text-zinc-500 text-sm mb-10 text-center max-w-sm">
        Full AI intelligence report — community DNA, audience signals, timing, risk flags.
      </p>

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

      <div className="mt-6 flex flex-wrap gap-2 justify-center max-w-md">
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
    </div>
  );
}
