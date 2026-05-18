'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession, signIn } from 'next-auth/react';
import { SubredditAnalysis } from '@/types';
import Dashboard from '@/components/Dashboard';

export type Period = '1week' | '1month' | '3months' | '1year' | 'alltime';

export default function ScoutPage() {
  const params = useParams();
  const router = useRouter();
  const subreddit = params.subreddit as string;
  const { data: session, status } = useSession();

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

  // Remember the last analyzed subreddit so /scout can redirect back to it
  useEffect(() => {
    if (subreddit && typeof window !== 'undefined') {
      localStorage.setItem('subsignal_last_scout_sub', subreddit);
    }
  }, [subreddit]);

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
      <div className="min-h-screen bg-void flex flex-col items-center justify-center gap-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-2.5 h-2.5 rounded-none bg-hot" />
          <span className="text-t1 font-bold text-lg">Treddit</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-hot-border border-t-transparent rounded-none animate-spin" />
          <span className="text-t2 text-sm">{loadingMsg}</span>
        </div>
        <div className="text-t3 text-xs mt-2">
          Scouting r/{subreddit} · This takes ~15 seconds
        </div>
      </div>
    );
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

  if (!analysis) return null;

  // Blur while loading auth state too — prevents flash of unblurred content
  const isLoggedIn = status === 'authenticated';
  const shouldBlur = !isLoggedIn; // covers both 'loading' and 'unauthenticated'

  return (
    <div className="relative">
      {/* Dashboard content — always rendered so blurred version looks real */}
      <div className={shouldBlur ? 'blur-sm pointer-events-none select-none' : ''}>
        <Dashboard
          analysis={analysis}
          period={period}
          onPeriodChange={handlePeriodChange}
          onRefresh={handleRefresh}
          onBack={() => router.push('/')}
        />
      </div>

      {/* Auth gate overlay — shown when not logged in (not while auth is loading) */}
      {!isLoggedIn && status !== 'loading' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-void/60 backdrop-blur-sm px-4">
          <div className="bg-surface border border-cyan-border rounded-none p-8 max-w-sm w-full text-center shadow-2xl">
            {/* Logo */}
            <div className="flex items-center justify-center gap-2.5 mb-6">
              <div className="w-2.5 h-2.5 rounded-none bg-hot" />
              <span className="text-t1 font-bold text-base tracking-tight">Treddit</span>
            </div>

            <h2 className="text-t1 text-xl font-bold mb-2">
              See the full analysis for r/{subreddit}
            </h2>
            <p className="text-t2 text-sm mb-6 leading-relaxed">
              Opportunity score, audience signals, post formats, timing data, and AI-powered playbook — all unlocked free for 3 days.
            </p>

            {/* Benefits */}
            <div className="space-y-2 mb-6 text-left">
              {[
                '🔍 Community DNA + culture analysis',
                '📊 Top post formats with real examples',
                '⏱️ Best days & times to post',
                '🎯 Engagement angles tailored to your product',
              ].map(b => (
                <div key={b} className="flex items-center gap-2">
                  <span className="text-xs text-t2">{b}</span>
                </div>
              ))}
            </div>

            <button
              onClick={() =>
                signIn('google', {
                  callbackUrl: `/scout/${subreddit}`,
                })
              }
              className="w-full flex items-center justify-center gap-2.5 bg-panel hover:bg-overlay text-t1 border border-cyan-border font-semibold text-sm py-3 px-5 rounded-none transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Continue with Google — it&apos;s free
            </button>
            <p className="text-t3 text-[11px] mt-3">3-day free trial · No credit card · Cancel anytime</p>
          </div>
        </div>
      )}
    </div>
  );
}
