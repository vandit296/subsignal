'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { SubredditMatch, FinderResult, CompanyProfile } from '@/types';

const UI = 'var(--font-ui)';

const LOADING_MESSAGES = [
  'Reading your product profile…',
  'Mapping community DNA…',
  'Scoring narrative fit…',
  'Fetching community sizes…',
  'Ranking by strategic fit…',
  'Almost there…',
];

function formatSubscribers(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}k`;
  return n.toString();
}

// ── Score badge ───────────────────────────────────────────────────────────────

function ScoreBadge({ score }: { score: number }) {
  const { color, bg, border } =
    score >= 8.5
      ? { color: '#34D399', bg: 'rgba(52,211,153,0.08)', border: 'rgba(52,211,153,0.20)' }
      : score >= 7
      ? { color: 'var(--blue)', bg: 'rgba(74,143,255,0.08)', border: 'rgba(74,143,255,0.20)' }
      : { color: '#FBBF24', bg: 'rgba(251,191,36,0.08)', border: 'rgba(251,191,36,0.20)' };
  return (
    <div style={{
      flexShrink: 0, textAlign: 'center', padding: '6px 12px',
      borderRadius: 8, border: `0.5px solid ${border}`, background: bg,
    }}>
      <span style={{ fontSize: 18, fontWeight: 700, color, display: 'block', lineHeight: 1.1 }}>
        {score.toFixed(1)}
      </span>
      <span style={{ fontSize: 10, color: 'var(--t4)' }}>/ 10</span>
    </div>
  );
}

// ── Bar ───────────────────────────────────────────────────────────────────────

function Bar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 11, color: 'var(--t3)' }}>{label}</span>
        <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--t2)' }}>{value}</span>
      </div>
      <div style={{ height: 3, background: 'var(--overlay)', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${value * 10}%`, background: color, borderRadius: 99 }} />
      </div>
    </div>
  );
}

// ── MatchCard ─────────────────────────────────────────────────────────────────

function MatchCard({ match, rank }: { match: SubredditMatch; rank: number }) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);

  return (
    <div style={{
      background: 'var(--surface)',
      border: '0.5px solid var(--border)',
      borderRadius: 10,
      overflow: 'hidden',
      transition: 'border-color 0.15s',
    }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(240,236,228,0.12)')}
      onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
    >
      <div style={{ padding: '16px 18px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{
                fontSize: 11, color: 'var(--t4)',
                fontFamily: "'SF Mono','Fira Code',monospace",
                minWidth: 18,
              }}>
                #{rank}
              </span>
              <button
                onClick={() => router.push(`/dashboard/${match.subreddit}`)}
                style={{
                  fontSize: 15, fontWeight: 600, color: 'var(--t1)',
                  letterSpacing: '-0.01em', background: 'none', border: 'none',
                  cursor: 'pointer', padding: 0, fontFamily: UI,
                  transition: 'color 0.12s',
                }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--blue)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--t1)')}
              >
                r/{match.subreddit}
              </button>
            </div>
            {match.subscribers ? (
              <div style={{ fontSize: 11.5, color: 'var(--t4)', marginTop: 2, paddingLeft: 28 }}>
                {formatSubscribers(match.subscribers)} members
              </div>
            ) : null}
          </div>
          <ScoreBadge score={match.overallScore} />
        </div>

        {/* Assessment */}
        <div style={{
          background: 'var(--overlay)', borderRadius: 7,
          padding: '9px 12px', marginBottom: 12,
          display: 'flex', gap: 8,
        }}>
          <span style={{ color: 'var(--blue)', fontSize: 12, flexShrink: 0, marginTop: 1 }}>→</span>
          <p style={{ fontSize: 13, color: 'var(--t1)', lineHeight: 1.5, fontWeight: 500, margin: 0 }}>
            {match.assessment}
          </p>
        </div>

        {/* Score bars */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 24px', marginBottom: 10 }}>
          <Bar label="Audience Fit"    value={match.audienceFit}     color="#34D399" />
          <Bar label="Engagement"      value={match.engagement}      color="var(--blue)" />
          <Bar label="Low Competition" value={match.competition}     color="#A78BFA" />
          <Bar label="Founder Friendly" value={match.founderFriendly} color="#FBBF24" />
        </div>

        {/* Expand */}
        <button
          onClick={() => setExpanded(v => !v)}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--t4)', fontSize: 12, padding: 0,
            display: 'flex', alignItems: 'center', gap: 4,
            fontFamily: UI, transition: 'color 0.12s',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--t2)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--t4)')}
        >
          {expanded ? '▲ Hide reasoning' : '▼ Why this subreddit?'}
        </button>
        {expanded && (
          <p style={{ fontSize: 12.5, color: 'var(--t3)', lineHeight: 1.6, marginTop: 8 }}>
            {match.why}
          </p>
        )}
      </div>

      {/* Footer CTA */}
      <div style={{
        borderTop: '0.5px solid var(--border)',
        padding: '10px 18px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{ fontSize: 11.5, color: 'var(--t4)' }}>Get the full intelligence report</span>
        <button
          onClick={() => router.push(`/dashboard/${match.subreddit}`)}
          style={{
            fontSize: 12, fontWeight: 500, color: 'var(--hot)',
            background: 'none', border: 'none', cursor: 'pointer',
            fontFamily: UI, padding: 0, transition: 'opacity 0.12s',
          }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '0.75')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
        >
          Analyze r/{match.subreddit} →
        </button>
      </div>
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState() {
  const router = useRouter();
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', textAlign: 'center',
      padding: '80px 32px', gap: 18,
    }}>
      <div style={{
        width: 52, height: 52, background: 'var(--surface)',
        border: '0.5px solid var(--border)', borderRadius: 14,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 22,
      }}>
        🧭
      </div>
      <div style={{ fontSize: 17, fontWeight: 600, color: 'var(--t1)', letterSpacing: '-0.02em' }}>
        Set up your product profile first
      </div>
      <p style={{ fontSize: 13, color: 'var(--t3)', lineHeight: 1.6, maxWidth: 320 }}>
        To find the right communities for you, Treddit needs to understand your product, target user, and ICP. Set these up in Command — takes about 2 minutes.
      </p>
      <button
        onClick={() => router.push('/command')}
        style={{
          background: 'var(--blue)', color: '#fff', border: 'none', borderRadius: 8,
          padding: '10px 22px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
          fontFamily: UI, transition: 'opacity 0.15s',
        }}
        onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
        onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
      >
        Set up in Command →
      </button>
      <p style={{ fontSize: 11.5, color: 'var(--t4)', lineHeight: 1.5 }}>
        Your profile powers Scout, Signal Feed, and Keyword Watch too.
      </p>
    </div>
  );
}

// ── Loading state ─────────────────────────────────────────────────────────────

function LoadingState({ message }: { message: string }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: '80px 32px', gap: 16,
    }}>
      <div style={{
        width: 20, height: 20, borderRadius: '50%',
        border: '2px solid rgba(74,143,255,0.25)',
        borderTopColor: 'var(--blue)',
        animation: 'spin 0.75s linear infinite',
      }} />
      <span style={{ fontSize: 13, color: 'var(--t3)' }}>{message}</span>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

interface SubredditsResponse extends FinderResult {
  noProfile?: boolean;
  cached?: boolean;
  company?: CompanyProfile;
  generatedAt?: string;
  error?: string;
}

export default function SubredditsPage() {
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'no-profile' | 'generating' | 'done' | 'error'>('loading');
  const [loadingMsg, setLoadingMsg] = useState(LOADING_MESSAGES[0]);
  const [result, setResult] = useState<SubredditsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (refresh = false) => {
    setStatus(refresh ? 'generating' : 'loading');
    setError(null);

    let i = 0;
    setLoadingMsg(LOADING_MESSAGES[0]);
    const interval = setInterval(() => {
      i = (i + 1) % LOADING_MESSAGES.length;
      setLoadingMsg(LOADING_MESSAGES[i]);
    }, 2800);

    try {
      const url = refresh ? '/api/subreddits?refresh=1' : '/api/subreddits';
      const res = await fetch(url);
      const data = await res.json() as SubredditsResponse;
      clearInterval(interval);

      if (data.error) throw new Error(data.error);
      if (data.noProfile) {
        setStatus('no-profile');
        return;
      }
      setResult(data);
      setStatus('done');
    } catch (err: unknown) {
      clearInterval(interval);
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setStatus('error');
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const company = result?.company;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--void)', fontFamily: UI }}>
      {/* Page header */}
      <div style={{
        padding: '28px 32px 20px',
        borderBottom: '0.5px solid var(--border)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16,
      }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--t1)', marginBottom: 4 }}>
            Subreddits
          </h1>
          <p style={{ fontSize: 13, color: 'var(--t3)', lineHeight: 1.5 }}>
            Strategic intelligence on Reddit communities — matched to your product, ICP, and goal.
          </p>
        </div>
        {status === 'done' && (
          <button
            onClick={() => load(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '7px 13px', fontSize: 12, fontWeight: 500,
              background: 'var(--overlay)', border: '0.5px solid var(--border)',
              borderRadius: 8, color: 'var(--t3)', cursor: 'pointer',
              fontFamily: UI, transition: 'color 0.12s, border-color 0.12s',
              flexShrink: 0,
            }}
            onMouseEnter={e => {
              e.currentTarget.style.color = 'var(--t1)';
              e.currentTarget.style.borderColor = 'rgba(240,236,228,0.14)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.color = 'var(--t3)';
              e.currentTarget.style.borderColor = 'var(--border)';
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10"/>
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
            </svg>
            Refresh
          </button>
        )}
      </div>

      {/* Content */}
      {(status === 'loading' || status === 'generating') && (
        <LoadingState message={status === 'generating' ? loadingMsg : 'Loading your profile…'} />
      )}

      {status === 'no-profile' && <EmptyState />}

      {status === 'error' && (
        <div style={{ padding: '24px 32px' }}>
          <div style={{
            background: 'rgba(248,113,113,0.08)', border: '0.5px solid rgba(248,113,113,0.20)',
            borderRadius: 10, padding: '14px 16px',
            fontSize: 13, color: '#F87171',
          }}>
            {error}
          </div>
        </div>
      )}

      {status === 'done' && result && (
        <div>
          {/* Profile bar */}
          {company && (
            <div style={{
              margin: '20px 32px 0',
              background: 'var(--surface)',
              border: '0.5px solid rgba(74,143,255,0.18)',
              borderRadius: 10,
              padding: '12px 16px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#34D399', flexShrink: 0 }} />
                <p style={{ fontSize: 12.5, color: 'var(--t2)', lineHeight: 1.5, margin: 0 }}>
                  <strong style={{ color: 'var(--t1)', fontWeight: 600 }}>{company.name}</strong>
                  {company.description ? ` — ${company.description.slice(0, 80)}${company.description.length > 80 ? '…' : ''}` : ''}
                  {company.goal ? (
                    <> · Goal: <strong style={{ color: 'var(--t1)', fontWeight: 600 }}>{company.goal}</strong></>
                  ) : null}
                </p>
              </div>
              <button
                onClick={() => router.push('/command')}
                style={{
                  fontSize: 12, color: 'var(--blue)', background: 'none', border: 'none',
                  cursor: 'pointer', whiteSpace: 'nowrap', padding: 0, flexShrink: 0,
                  fontFamily: UI, transition: 'opacity 0.12s',
                }}
                onMouseEnter={e => (e.currentTarget.style.opacity = '0.7')}
                onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
              >
                Edit in Command →
              </button>
            </div>
          )}

          {/* Persona */}
          {result.targetPersona && (
            <div style={{
              margin: '16px 32px 0',
              background: 'rgba(13,13,31,0.8)',
              border: '0.5px solid rgba(99,102,241,0.15)',
              borderRadius: 10, padding: '12px 16px',
            }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                fontSize: 10, fontWeight: 600, letterSpacing: '0.07em',
                color: 'rgba(165,180,252,0.7)', textTransform: 'uppercase',
                marginBottom: 6,
              }}>
                <span>✦</span> Target persona
              </div>
              <p style={{ fontSize: 13, color: 'var(--t1)', lineHeight: 1.55, margin: 0 }}>
                {result.targetPersona}
              </p>
            </div>
          )}

          {/* Results */}
          <div style={{ padding: '20px 32px 60px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--t2)' }}>
                {result.matches.length} subreddits ranked by strategic fit
              </span>
              {result.cached && result.generatedAt && (
                <span style={{ fontSize: 11.5, color: 'var(--t4)' }}>
                  Cached · {new Date(result.generatedAt).toLocaleDateString()}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {result.matches.map((match, i) => (
                <MatchCard key={match.subreddit} match={match} rank={i + 1} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
