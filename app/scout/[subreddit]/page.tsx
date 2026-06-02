import { track } from '@/lib/posthog';
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { SubredditAnalysis } from '@/types';
import Dashboard from '@/components/Dashboard';
import CinematicLoader from '@/components/CinematicLoader';

export type Period = '1week' | '1month' | '3months' | '1year' | 'alltime';

export default function ScoutPage() {
  const params = useParams();
  const router = useRouter();
  const subreddit = params.subreddit as string;

  const [analysis, setAnalysis] = useState<SubredditAnalysis | null>(null);
  const [showCinematic, setShowCinematic] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingMsg, setLoadingMsg] = useState('Connecting to Reddit API\u2026');
  const [period, setPeriod] = useState<Period>('1year');

  const runAnalysis = useCallback((sub: string, p: Period, bust = false) => {
    setError(null);
    setAnalysis(null);
    setShowCinematic(true);

    const messages = [
      'Initialising intelligence sweep\u2026',
      'Ingesting 12 months of community signal\u2026',
      'Parsing behavioural patterns\u2026',
      'Mapping narrative territories\u2026',
      'Profiling audience psychographics\u2026',
      'Detecting opportunity vectors\u2026',
      'Running asymmetry analysis\u2026',
      'Calibrating fit scores\u2026',
      'Synthesising intelligence brief\u2026',
      'Finalising your report\u2026',
    ];
    let i = 0;
    setLoadingMsg(messages[0]);
    const interval = setInterval(() => {
      i = (i + 1) % messages.length;
      setLoadingMsg(messages[i]);
    }, 1800);

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

  // Track current sub in localStorage (for recent scouts)
  useEffect(() => {
    if (subreddit && typeof window !== 'undefined') {
      try {
        const key = 'treddit_recent_subs';
        const existing: string[] = JSON.parse(localStorage.getItem(key) ?? '[]');
        const updated = [subreddit, ...existing.filter(s => s !== subreddit)].slice(0, 8);
        localStorage.setItem(key, JSON.stringify(updated));
      } catch { /* ignore */ }
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

  // \u2500\u2500 Error state \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
  if (error) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--void)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: '0 16px', fontFamily: 'var(--font-ui)' }}>
        <div style={{ color: 'var(--danger)', fontSize: 16, fontWeight: 600 }}>Analysis failed</div>
        <div style={{ color: 'var(--t2)', fontSize: 14, textAlign: 'center', maxWidth: 380 }}>{error}</div>
        <button
          onClick={() => router.push('/')}
          style={{ marginTop: 8, background: 'var(--panel)', border: '0.5px solid var(--border)', color: 'var(--t1)', fontSize: 13, fontWeight: 500, padding: '10px 20px', borderRadius: 8, cursor: 'pointer', fontFamily: 'var(--font-ui)' }}
        >
          \u2190 Try another subreddit
        </button>
      </div>
    );
  }

  return (
    <>
      {/* \u2500\u2500 Dashboard content \u2014 rendered as soon as data arrives \u2500\u2500 */}
      {analysis && (
        <Dashboard
          analysis={analysis}
          period={period}
          onPeriodChange={handlePeriodChange}
          onRefresh={handleRefresh}
          onBack={() => router.push('/')}
        />
      )}

      {/* \u2500\u2500 Cinematic overlay \u2014 sits on top until reveal completes \u2500\u2500 */}
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
