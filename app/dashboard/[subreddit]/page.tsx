'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { SubredditAnalysis } from '@/types';
import Dashboard from '@/components/Dashboard';
import { fetchSubredditData } from '@/lib/reddit';

export default function DashboardPage() {
  const params = useParams();
  const router = useRouter();
  const subreddit = params.subreddit as string;

  const [analysis, setAnalysis] = useState<SubredditAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingMsg, setLoadingMsg] = useState('Fetching subreddit data...');

  useEffect(() => {
    if (!subreddit) return;

    const messages = [
      'Fetching subreddit data...',
      'Reading top 100 posts...',
      'Analyzing community rules...',
      'Running AI intelligence scan...',
      'Scoring opportunity metrics...',
      'Almost there...',
    ];
    let i = 0;
    const interval = setInterval(() => {
      i = (i + 1) % messages.length;
      setLoadingMsg(messages[i]);
    }, 2500);

    async function run() {
      try {
        // Step 1: fetch Reddit data from the browser (bypasses server-side IP blocks)
        const redditData = await fetchSubredditData(subreddit);

        // Step 2: send to API route for Claude analysis
        const res = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subreddit, redditData }),
        });

        const data = await res.json();
        clearInterval(interval);
        if (data.error) throw new Error(data.error);
        setAnalysis(data);
        setLoading(false);
      } catch (err: unknown) {
        clearInterval(interval);
        setError(err instanceof Error ? err.message : 'Unknown error');
        setLoading(false);
      }
    }

    run();

    return () => clearInterval(interval);
  }, [subreddit]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f0f11] flex flex-col items-center justify-center gap-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-2.5 h-2.5 rounded-full bg-orange-500" />
          <span className="text-white font-bold text-lg">SubSignal</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-zinc-400 text-sm">{loadingMsg}</span>
        </div>
        <div className="text-zinc-700 text-xs mt-2">
          Analyzing r/{subreddit} · This takes ~15 seconds
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0f0f11] flex flex-col items-center justify-center gap-4 px-4">
        <div className="text-red-400 text-lg font-semibold">Analysis failed</div>
        <div className="text-zinc-500 text-sm text-center max-w-sm">{error}</div>
        <button
          onClick={() => router.push('/')}
          className="mt-4 bg-orange-500 hover:bg-orange-400 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
        >
          ← Try another subreddit
        </button>
      </div>
    );
  }

  if (!analysis) return null;

  return <Dashboard analysis={analysis} onBack={() => router.push('/')} />;
}
