'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const POPULAR = ['SaaS', 'entrepreneur', 'startups', 'indiehackers', 'webdev', 'smallbusiness', 'marketing'];
const LAST_SUB_KEY = 'subsignal_last_scout_sub';

export default function ScoutIndexPage() {
  const [value, setValue] = useState('');
  const router = useRouter();

  // After mount: if there's a recent subreddit, jump straight to it
  useEffect(() => {
    const last = typeof window !== 'undefined' ? localStorage.getItem(LAST_SUB_KEY) : null;
    if (last) router.replace(`/scout/${last}`);
  }, [router]);

  function handleAnalyze(e: FormEvent) {
    e.preventDefault();
    const sub = value.replace(/^r\//, '').trim();
    if (sub) router.push(`/scout/${sub}`);
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-screen px-6">
      <div className="w-full max-w-xl">
        <h1 className="text-t1 text-3xl font-bold text-center mb-2">Scout a subreddit</h1>
        <p className="text-t2 text-sm text-center mb-8">
          Get a full community intelligence report — DNA, audience, timing, and your playbook.
        </p>

        <form onSubmit={handleAnalyze} className="w-full mb-5">
          <div className="flex gap-3">
            <div className="flex-1 flex items-center bg-surface border border-cyan-border rounded-none px-4 gap-2 focus-within:border-hot-border transition-colors">
              <span className="text-t2 text-sm font-medium">r/</span>
              <input
                type="text"
                value={value}
                onChange={e => setValue(e.target.value)}
                placeholder="SaaS"
                className="flex-1 bg-transparent text-t1 py-4 outline-none placeholder-t3 text-base"
                autoFocus
              />
            </div>
            <button
              type="submit"
              disabled={!value.trim()}
              className="bg-hot hover:bg-hot disabled:opacity-40 text-t1 font-bold px-6 py-4 rounded-none transition-colors text-sm whitespace-nowrap"
            >
              Analyze →
            </button>
          </div>
        </form>

        <div className="flex flex-wrap gap-2 justify-center">
          <span className="text-t3 text-xs self-center">Try:</span>
          {POPULAR.map(sub => (
            <button
              key={sub}
              onClick={() => router.push(`/scout/${sub}`)}
              className="text-xs bg-surface hover:bg-overlay border border-cyan-border text-t2 hover:text-t1 px-3 py-1.5 rounded-none transition-colors"
            >
              r/{sub}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
