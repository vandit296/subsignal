'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { SubredditAnalysis } from '@/types';
import Dashboard from '@/components/Dashboard';
import CinematicLoader from '@/components/CinematicLoader';

export type Period = '1week' | '1month' | '3months' | '1year' | 'alltime';

export default function DashboardPage() {
  const params = useParams();
  const router = useRouter();
  const subreddit = params.subreddit as string;

  const [analysis, setAnalysis] = useState<SubredditAnalysis | null>(null);
  const [showCinematic, setShowCinematic] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingMsg, setLoadingMsg] = useState('Connecting to Reddit API…');
  const [period, setPeriod] = useState<Period>('1year');

  const runAnalysis = useCallback((sub: string, p: Period, bust = false) => {
    setError(null);
    setAnalysis(null);
    setShowCinematic(true);

    const messages = [
      'Initialising intelligence sweep…',
      'Ingesting 12 months of community signal…',
      'Parsing behavioural patterns…',
      'Mapping narrative territories…',
      'Profiling audience psychographics…',
      'Detecting opportunity vectors…',
      'Running asymmetry analysis…',
      'Calibrating fit scores…',
      'Synthesising intelligence brief…',
      'Finalising your report…',
    ];
    let i = 0;
    setLoadingMsg(messages[0]);
    const interval = setInterval(() => { i = (i + 1) % messages.length; setLoadingMsg(messages[i]); }, 1800);

    const url = `/api/analyze?subreddit=${encodeURIComponent(sub)}&period=${p}${bust ? '&bust=1' : ''}`;
    fetch(url)
      .then(res => res.json())
      .then(data => {
        clearInterval(interval);
        if (data.error) throw new Error(data.error);
        setAnalysis(data);
      })
      .catch(err => {
        clearInterval(interval);
        setError(err.message);
        setShowCinematic(false);
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

  if (error) {
    return (
      <div className="min-h-screen bg-void flex flex-col items-center justify-center gap-4 px-4">
        <div className="text-red-400 text-lg font-semibold">Analysis failed</div>
        <div className="text-t2 text-sm text-center max-w-sm">{error}</div>
        <button
          onClick={() => router.push('/')}
          className="mt-4 bg-hot hover:bg-hot text-t1 text-sm font-medium px-5 py-2.5 rounded-none transition-colors"
        >
          ← Try another subreddit
        </button>
      </div>
    );
  }

  return (
    <>
      {analysis && (
        <Dashboard
          analysis={analysis}
          period={period}
          onPeriodChange={handlePeriodChange}
          onRefresh={handleRefresh}
          onBack={() => router.push('/')}
        />
      )}
      {showCinematic && (
        <CinematicLoader
          loadingMsg={loadingMsg}
          subreddit={subreddit}
          triggered={!!analysis}
          onRevealComplete={() => setShowCinematic(false)}
        />
      )}
    </>
  );
}
