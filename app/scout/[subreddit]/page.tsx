import { track } from '@/lib/posthog';
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession, signIn } from 'next-auth/react';
import { SubredditAnalysis } from '@/types';
import Dashboard from '@/components/Dashboard';
import CinematicLoader from '@/components/CinematicLoader';

export type Period = '1week' | '1month' | '3months' | '1year' | 'alltime';

// Static preview insight — feels specific, implies depth, teases what's locked
const PREVIEW_INSIGHTS = [
  'Posts framed as founder decisions — not product announcements — consistently outperform in this community. The top 12% share a common narrative structure that triggers...',
  'This community responds 3.4× stronger to question-framed titles over statement-framed. Engagement peaks cluster around a specific temporal window each week...',
  'The highest-performing threads here use a tension-then-resolution structure. Direct pitches underperform by 2.8× relative to problem-first framing...',
];

export default function ScoutPage() {
  const params = useParams();
  const router = useRouter();
  const subreddit = params.subreddit as string;
  const { data: session, status } = useSession();

  const [analysis, setAnalysis] = useState<SubredditAnalysis | null>(null);
  const [showCinematic, setShowCinematic] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingMsg, setLoadingMsg] = useState('Connecting to Reddit API…');
  const [period, setPeriod] = useState<Period>('1year');
  const [ctaHovered, setCtaHovered] = useState(false);

  // Pick a stable preview insight per subreddit
  const previewInsight = PREVIEW_INSIGHTS[
    subreddit?.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % PREVIEW_INSIGHTS.length
  ] ?? PREVIEW_INSIGHTS[0];

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
        // Don't touch showCinematic here — CinematicLoader owns the reveal.
        // Setting analysis triggers the cinematic sequence.
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

  // ── Error state ───────────────────────────────────────────────────────────
  if (error) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--void)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: '0 16px', fontFamily: 'var(--font-ui)' }}>
        <div style={{ color: 'var(--danger)', fontSize: 16, fontWeight: 600 }}>Analysis failed</div>
        <div style={{ color: 'var(--t2)', fontSize: 14, textAlign: 'center', maxWidth: 380 }}>{error}</div>
        <button
          onClick={() => router.push('/')}
          style={{ marginTop: 8, background: 'var(--panel)', border: '0.5px solid var(--border)', color: 'var(--t1)', fontSize: 13, fontWeight: 500, padding: '10px 20px', borderRadius: 8, cursor: 'pointer', fontFamily: 'var(--font-ui)' }}
        >
          ← Try another subreddit
        </button>
      </div>
    );
  }

  const isLoggedIn = status === 'authenticated';
  const shouldBlur = !isLoggedIn;

  return (
    <>
      {/* ── Dashboard content — rendered as soon as data arrives ── */}
      {analysis && (
        <div className="relative">
          <div style={{
            filter: shouldBlur ? 'blur(2px)' : 'none',
            pointerEvents: shouldBlur ? 'none' : 'auto',
            userSelect: shouldBlur ? 'none' : 'auto',
            transition: 'filter 0.3s ease',
          }}>
            <Dashboard
              analysis={analysis}
              period={period}
              onPeriodChange={handlePeriodChange}
              onRefresh={handleRefresh}
              onBack={() => router.push('/')}
            />
          </div>

          {/* Intelligence unlock gate */}
          {!isLoggedIn && status !== 'loading' && (
            <div
              style={{
                position: 'fixed',
                inset: 0,
                zIndex: 50,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '16px',
                background: 'rgba(12,12,15,0.78)',
                backdropFilter: 'blur(2px)',
                WebkitBackdropFilter: 'blur(2px)',
              }}
            >
              <div
                style={{
                  width: '100%',
                  maxWidth: 460,
                  background: 'linear-gradient(160deg, #17171C 0%, #131317 55%, #0F0F14 100%)',
                  border: '1px solid rgba(240,236,228,0.06)',
                  boxShadow: [
                    '0 0 0 1px rgba(240,236,228,0.025)',
                    '0 40px 100px rgba(0,0,0,0.75)',
                    '0 12px 40px rgba(0,0,0,0.5)',
                    '0 0 80px rgba(74,143,255,0.04)',
                  ].join(', '),
                  padding: '40px 40px 32px',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {/* Ambient top glow */}
                <div style={{
                  position: 'absolute',
                  top: -80,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: 320,
                  height: 160,
                  background: 'radial-gradient(ellipse, rgba(74,143,255,0.07) 0%, transparent 70%)',
                  pointerEvents: 'none',
                }} />

                {/* Logo mark */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 32 }}>
                  <svg width="15" height="15" viewBox="0 0 20 20" fill="none">
                    <polygon points="10,1 18,5.5 18,14.5 10,19 2,14.5 2,5.5" stroke="var(--blue)" strokeWidth="1.3" fill="none" />
                    <circle cx="10" cy="10" r="2.5" fill="var(--blue)" opacity="0.9" />
                  </svg>
                  <span style={{ color: 'var(--t4)', fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                    Treddit Intelligence
                  </span>
                </div>

                {/* Intelligence preview card */}
                <div style={{
                  background: 'rgba(74,143,255,0.035)',
                  border: '1px solid rgba(74,143,255,0.11)',
                  padding: '14px 16px 0',
                  marginBottom: 30,
                  position: 'relative',
                  overflow: 'hidden',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                    <div style={{
                      width: 5, height: 5, borderRadius: '50%',
                      background: 'var(--blue)',
                      boxShadow: '0 0 6px rgba(74,143,255,0.6)',
                    }} />
                    <span style={{ color: 'var(--blue)', fontSize: 10, fontWeight: 600, letterSpacing: '0.13em', textTransform: 'uppercase' }}>
                      Signal Preview · r/{subreddit}
                    </span>
                  </div>
                  <p style={{ color: 'var(--t2)', fontSize: 13, lineHeight: 1.65, margin: '0 0 36px', fontStyle: 'italic' }}>
                    &ldquo;{previewInsight}&rdquo;
                  </p>
                  <div style={{
                    position: 'absolute', bottom: 0, left: 0, right: 0, height: 52,
                    background: 'linear-gradient(to bottom, transparent 0%, #141419 100%)',
                    display: 'flex', alignItems: 'flex-end', padding: '0 16px 10px',
                  }}>
                    <span style={{ color: 'var(--t4)', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                      ··· intelligence locked
                    </span>
                  </div>
                </div>

                <h2 style={{ color: 'var(--t1)', fontSize: 22, fontWeight: 700, lineHeight: 1.2, letterSpacing: '-0.02em', margin: '0 0 10px' }}>
                  Unlock the full intelligence layer
                </h2>
                <p style={{ color: 'var(--t3)', fontSize: 14, lineHeight: 1.6, margin: '0 0 26px' }}>
                  Deep community analysis for r/{subreddit} — audience signals, narrative patterns, and tactical playbook.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 11, marginBottom: 28 }}>
                  {[
                    'Audience behavior patterns and optimal engagement windows',
                    'Winning narrative structures with real community examples',
                    'AI-generated engagement angles tailored to your product',
                  ].map(item => (
                    <div key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: 11 }}>
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ marginTop: 2, flexShrink: 0, opacity: 0.7 }}>
                        <path d="M2 6l3 3 5-6" stroke="var(--blue)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <span style={{ color: 'var(--t2)', fontSize: 13, lineHeight: 1.5 }}>{item}</span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => signIn('google', { callbackUrl: `/scout/${subreddit}` })}
                  onMouseEnter={() => setCtaHovered(true)}
                  onMouseLeave={() => setCtaHovered(false)}
                  style={{
                    width: '100%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                    background: ctaHovered ? 'rgba(240,236,228,0.09)' : 'rgba(240,236,228,0.055)',
                    border: '1px solid',
                    borderColor: ctaHovered ? 'rgba(240,236,228,0.16)' : 'rgba(240,236,228,0.09)',
                    color: 'var(--t1)', fontSize: 14, fontWeight: 600, letterSpacing: '-0.01em',
                    padding: '13px 20px', cursor: 'pointer',
                    transition: 'background 0.15s ease, border-color 0.15s ease',
                    marginBottom: 18,
                    boxShadow: ctaHovered ? '0 4px 20px rgba(0,0,0,0.3)' : 'none',
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  Continue with Google — free
                </button>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ color: 'var(--t4)', fontSize: 11, letterSpacing: '0.02em' }}>
                    Free plan available — no credit card required
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Cinematic overlay — sits on top until reveal completes ── */}
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
