'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { SubredditAnalysis } from '@/types';
import Dashboard from '@/components/Dashboard';

export type Period = '1week' | '1month' | '3months' | '1year' | 'alltime';

export default function DashboardPage() {
  const params = useParams();
  const router = useRouter();
  const subreddit = params.subreddit as string;

  const [analysis, setAnalysis] = useState<SubredditAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingMsg, setLoadingMsg] = useState('Fetching subreddit data...');
  const [period, setPeriod] = useState<Period>('1year');

  const runAnalysis = useCallback((sub: string, p: Period, bust = false) => {
    setLoading(true);
    setError(null);
    setAnalysis(null);

    const messages = [
      'Fetching subreddit data...',
      'Reading top posts...',
      'Analyzing community rules...',
      'Running AI intelligence scan...',
      'Scoring opportunity metrics...',
      'Almost there...',
    ];
    let i = 0;
    setLoadingMsg(messages[0]);
    const interval = setInterval(() => {
      i = (i + 1) % messages.length;
      setLoadingMsg(messages[i]);
    }, 2500);

    const url = `/api/analyze?subreddit=${encodeURIComponent(sub)}&period=${p}${bust ? '&bust=1' : ''}`;
    fetch(url)
      .then(res => res.json())
      .then(data => {
        clearInterval(interval);
        if (data.error) throw new Error(data.error);
        setAnalysis(data);
        setLoading(false);
      })
      .catch(err => {
        clearInterval(interval);
        setError(err.message);
        setLoading(false);
      });

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!subreddit) return;
    return runAnalysis(subreddit, period);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subreddit, period]);

  function handlePeriodChange(p: Period) {
    setPeriod(p);
  }

  function handleRefresh() {
    runAnalysis(subreddit, period, true);
  }

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

  return (
    <Dashboard
      analysis={analysis}
      period={period}
      onPeriodChange={handlePeriodChange}
      onRefresh={handleRefresh}
      onBack={() => router.push('/')}
    />
  );
}
