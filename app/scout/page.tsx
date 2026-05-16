'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

const POPULAR = ['SaaS', 'entrepreneur', 'startups', 'indiehackers', 'webdev', 'smallbusiness', 'marketing'];

export default function ScoutIndexPage() {
  const [value, setValue] = useState('');
  const router = useRouter();

  function handleAnalyze(e: FormEvent) {
    e.preventDefault();
    const sub = value.replace(/^r\//, '').trim();
    if (sub) router.push(`/scout/${sub}`);
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-screen px-6">
      <div className="w-full max-w-xl">
        <h1 className="text-white text-3xl font-bold text-center mb-2">Scout a subreddit</h1>
        <p className="text-zinc-500 text-sm text-center mb-8">
          Get a full community intelligence report — DNA, audience, timing, and your playbook.
        </p>

        <form onSubmit={handleAnalyze} className="w-full mb-5">
          <div className="flex gap-3">
            <div className="flex-1 flex items-center bg-[#18181b] border border-zinc-700 rounded-xl px-4 gap-2 focus-within:border-orange-500 transition-colors">
              <span className="text-zinc-500 text-sm font-medium">r/</span>
              <input
                type="text"
                value={value}
                onChange={e => setValue(e.target.value)}
                placeholder="SaaS"
                className="flex-1 bg-transparent text-white py-4 outline-none placeholder-zinc-600 text-base"
                autoFocus
              />
            </div>
            <button
              type="submit"
              disabled={!value.trim()}
              className="bg-orange-500 hover:bg-orange-400 disabled:opacity-40 text-white font-bold px-6 py-4 rounded-xl transition-colors text-sm whitespace-nowrap"
            >
              Analyze →
            </button>
          </div>
        </form>

        <div className="flex flex-wrap gap-2 justify-center">
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
      </div>
    </div>
  );
}
