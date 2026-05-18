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
      <h1 className="text-t1 text-3xl font-bold mb-2">Subreddit Deep Dive</h1>
      <p className="text-t2 text-sm mb-10 text-center max-w-sm">
        Full AI intelligence report — community DNA, audience signals, timing, risk flags.
      </p>

      <form onSubmit={handleSubmit} className="w-full max-w-md">
        <div className="flex gap-2">
          <div className="flex-1 flex items-center bg-surface border border-cyan-border rounded-none px-4 gap-2 focus-within:border-hot-border transition-colors">
            <span className="text-t2 text-sm font-medium">r/</span>
            <input
              type="text"
              value={value}
              onChange={e => setValue(e.target.value)}
              placeholder="SaaS"
              className="flex-1 bg-transparent text-t1 py-3.5 outline-none placeholder-t3 text-base"
              autoFocus
            />
          </div>
          <button
            type="submit"
            disabled={!value.trim()}
            className="bg-hot hover:bg-hot disabled:opacity-40 disabled:cursor-not-allowed text-t1 font-semibold px-6 py-3.5 rounded-none transition-colors text-sm"
          >
            Analyze →
          </button>
        </div>
      </form>

      <div className="mt-6 flex flex-wrap gap-2 justify-center max-w-md">
        <span className="text-t3 text-xs self-center">Try:</span>
        {POPULAR.map(sub => (
          <button
            key={sub}
            onClick={() => router.push(`/dashboard/${sub}`)}
            className="text-xs bg-surface hover:bg-overlay border border-cyan-border text-t2 hover:text-t1 px-3 py-1.5 rounded-none transition-colors"
          >
            r/{sub}
          </button>
        ))}
      </div>
    </div>
  );
}
