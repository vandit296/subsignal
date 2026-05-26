'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ScoredThread } from '@/types';

interface Props {
  subreddit: string;
}

function timeAgo(utc: number): string {
  const diff = Math.floor(Date.now() / 1000) - utc;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function RelevanceBadge({ score }: { score: number }) {
  const cfg =
    score >= 9
      ? { label: 'Perfect match', bg: 'rgba(34,197,94,0.1)',  color: 'var(--green)',  border: 'rgba(34,197,94,0.25)' }
      : score >= 7
      ? { label: 'Strong match',  bg: 'var(--blue-dim)',      color: 'var(--blue)',   border: 'var(--blue-border)' }
      : { label: 'Good match',    bg: 'var(--amber-dim)',     color: 'var(--amber)',  border: 'var(--amber-border)' };

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      fontSize: 11, fontWeight: 600,
      padding: '3px 9px', borderRadius: 20,
      background: cfg.bg, color: cfg.color,
      border: `0.5px solid ${cfg.border}`,
      flexShrink: 0,
    }}>
      {score}/10 · {cfg.label}
    </span>
  );
}

function ThreadCard({ thread }: { thread: ScoredThread }) {
  const redditUrl = `https://reddit.com/r/${thread.subreddit}/comments/${thread.id}`;
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? 'var(--panel)' : 'var(--surface)',
        border: `0.5px solid ${hovered ? 'rgba(255,255,255,0.11)' : 'var(--border)'}`,
        borderRadius: 12, padding: 20,
        marginBottom: 10,
        transition: 'border-color 0.14s, background 0.14s',
        position: 'relative',
      }}
    >
      {/* Badge — top right */}
      <div style={{ position: 'absolute', top: 20, right: 20 }}>
        <RelevanceBadge score={thread.relevanceScore} />
      </div>

      {/* Title */}
      <a
        href={redditUrl}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'block',
          fontSize: 14, fontWeight: 500, color: 'var(--t1)',
          lineHeight: 1.5, marginBottom: 10,
          paddingRight: 120,
          textDecoration: 'none',
          transition: 'color 0.12s',
        }}
        onMouseEnter={e => (e.currentTarget.style.color = 'var(--blue)')}
        onMouseLeave={e => (e.currentTarget.style.color = 'var(--t1)')}
      >
        {thread.title}
      </a>

      {/* Meta */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        fontSize: 11.5, color: 'var(--t3)', marginBottom: 14,
      }}>
        <span>↑ {thread.score}</span>
        <span>💬 {thread.numComments}</span>
        <span>{timeAgo(thread.createdUtc)}</span>
        <span style={{ color: 'var(--t4)' }}>r/{thread.subreddit}</span>
      </div>

      {/* AI reasoning */}
      <div style={{
        display: 'flex', gap: 10,
        padding: '12px 14px',
        background: 'rgba(74,143,255,0.04)',
        borderRadius: 8,
        border: '0.5px solid rgba(74,143,255,0.1)',
        marginBottom: 10,
      }}>
        <span style={{ fontSize: 11, color: 'var(--blue)', marginTop: 2, flexShrink: 0 }}>→</span>
        <p style={{ fontSize: 12.5, color: 'var(--t1)', lineHeight: 1.65 }}>
          {thread.relevanceReason}
        </p>
      </div>

      {/* Engagement angle */}
      <div style={{
        padding: '10px 14px',
        background: 'var(--overlay)',
        borderRadius: 8,
        marginBottom: 14,
      }}>
        <div style={{
          fontSize: 10.5, fontWeight: 600, letterSpacing: '0.06em',
          color: 'var(--t4)', textTransform: 'uppercase',
          marginBottom: 5,
        }}>
          How to engage
        </div>
        <p style={{ fontSize: 12.5, color: 'var(--t2)', lineHeight: 1.6 }}>
          {thread.engagementAngle}
        </p>
      </div>

      {/* CTA */}
      <a
        href={redditUrl}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          fontSize: 12, fontWeight: 500, color: 'var(--t3)',
          textDecoration: 'none', transition: 'color 0.12s',
        }}
        onMouseEnter={e => (e.currentTarget.style.color = 'var(--t1)')}
        onMouseLeave={e => (e.currentTarget.style.color = 'var(--t3)')}
      >
        View thread on Reddit
        <span style={{ fontSize: 11 }}>↗</span>
      </a>
    </div>
  );
}

export default function Opportunities({ subreddit }: Props) {
  const router = useRouter();
  const [threads, setThreads] = useState<ScoredThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [rescoring, setRescoring] = useState(false);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fresh, setFresh] = useState(false);

  function loadThreads(force = false) {
    const url = `/api/threads/relevant?subreddit=${encodeURIComponent(subreddit)}${force ? '&force=1' : ''}`;
    return fetch(url)
      .then(r => r.json())
      .then(data => {
        if (data.needsSetup) { setNeedsSetup(true); return; }
        if (data.error) throw new Error(data.error);
        setThreads(data.threads ?? []);
        setFresh(data.fresh);
      })
      .catch(err => setError(err.message));
  }

  useEffect(() => {
    loadThreads(false).finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subreddit]);

  async function handleRescore() {
    setRescoring(true);
    setError(null);
    await loadThreads(true);
    setRescoring(false);
  }

  if (loading || rescoring) {
    return (
      <div style={{ maxWidth: 740, margin: '0 auto', padding: '64px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
        <div style={{
          width: 18, height: 18, borderRadius: '50%',
          border: '2px solid rgba(74,143,255,0.3)',
          borderTopColor: 'var(--blue)',
          animation: 'spin 0.7s linear infinite',
        }} />
        <p style={{ fontSize: 13.5, color: 'var(--t2)', fontWeight: 500 }}>
          {rescoring ? `Re-scoring r/${subreddit}...` : `Scanning r/${subreddit} for opportunities...`}
        </p>
        <p style={{ fontSize: 12, color: 'var(--t3)' }}>
          Scoring threads for relevance to your product — this takes ~15 seconds
        </p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (needsSetup) {
    return (
      <div style={{ maxWidth: 740, margin: '0 auto', padding: '64px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, textAlign: 'center' }}>
        <div style={{ fontSize: 36 }}>🔔</div>
        <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--t1)' }}>Set up Thread Alerts first</h3>
        <p style={{ fontSize: 13, color: 'var(--t2)', maxWidth: 360, lineHeight: 1.65 }}>
          Treddit needs to know about your product to score threads for relevance. Takes 30 seconds.
        </p>
        <button
          onClick={() => router.push('/command')}
          style={{
            background: 'linear-gradient(135deg, #4a8fff, #3b7de0)',
            border: 'none', borderRadius: 10,
            padding: '11px 24px',
            color: '#fff', fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-ui)',
            cursor: 'pointer', marginTop: 4,
            boxShadow: '0 4px 24px rgba(74,143,255,0.2)',
          }}
        >
          Set up alerts →
        </button>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ maxWidth: 740, margin: '0 auto', padding: '32px 24px' }}>
        <div style={{
          background: 'var(--danger-dim)', border: '0.5px solid var(--danger-border)',
          borderRadius: 10, padding: '12px 16px',
          color: 'var(--danger)', fontSize: 13,
        }}>
          {error}
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 740, margin: '0 auto', padding: '32px 24px 64px', fontFamily: 'var(--font-ui)' }}>

      {/* ── Header panel ── */}
      <div style={{
        background: 'var(--surface)',
        border: '0.5px solid var(--blue-border)',
        borderRadius: 12, padding: '18px 20px',
        marginBottom: 24, position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent, rgba(74,143,255,0.5), transparent)' }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{
              width: 6, height: 6, borderRadius: '50%', background: 'var(--blue)',
              display: 'inline-block', animation: 'aipulse 2s ease-in-out infinite',
            }} />
            <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', color: 'var(--blue)', textTransform: 'uppercase' }}>
              Thread Opportunities — r/{subreddit.toUpperCase()}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {fresh && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--green)' }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--green)', display: 'inline-block' }} />
                Just scored
              </div>
            )}
            <button
              onClick={handleRescore}
              style={{
                fontSize: 11, fontWeight: 500, color: 'var(--t3)',
                background: 'var(--overlay)', border: '0.5px solid var(--border)',
                borderRadius: 6, padding: '4px 10px', cursor: 'pointer',
                fontFamily: 'var(--font-ui)', transition: 'color 0.12s, border-color 0.12s',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--t1)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--t3)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
            >
              ↺ Re-score
            </button>
          </div>
        </div>
        <p style={{ fontSize: 13, color: 'var(--t2)', lineHeight: 1.7 }}>
          Threads from the last 48 hours where your product would genuinely help — scored by relevance, not popularity. Low-upvote threads included.
        </p>
      </div>

      {threads.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
          <div style={{ fontSize: 28, marginBottom: 4 }}>🔍</div>
          <p style={{ fontSize: 14, color: 'var(--t2)', fontWeight: 500 }}>No strong matches found in the last 48 hours</p>
          <p style={{ fontSize: 12, color: 'var(--t3)' }}>Try rescoring to pick up new threads, or check your alert settings.</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
            <button
              onClick={handleRescore}
              style={{
                fontSize: 13, fontWeight: 600, color: '#fff',
                background: 'linear-gradient(135deg, #4a8fff, #3b7de0)',
                border: 'none', borderRadius: 8,
                padding: '10px 20px', cursor: 'pointer',
                fontFamily: 'var(--font-ui)',
                boxShadow: '0 4px 16px rgba(74,143,255,0.25)',
              }}
            >
              ↺ Re-score now
            </button>
            <button
              onClick={() => router.push('/command')}
              style={{
                fontSize: 12, color: 'var(--t3)',
                background: 'none', border: '0.5px solid var(--border)',
                borderRadius: 8, padding: '10px 16px',
                cursor: 'pointer', fontFamily: 'var(--font-ui)',
              }}
            >
              Alert settings →
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Meta row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <span style={{ fontSize: 13, color: 'var(--t2)' }}>
              <strong style={{ color: 'var(--t1)', fontWeight: 600 }}>{threads.length} {threads.length === 1 ? 'opportunity' : 'opportunities'}</strong> found
            </span>
            <button
              onClick={() => router.push('/command')}
              style={{
                fontSize: 12, color: 'var(--t3)', background: 'none', border: 'none',
                cursor: 'pointer', fontFamily: 'var(--font-ui)', transition: 'color 0.12s',
              }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--t1)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--t3)')}
            >
              Manage alerts →
            </button>
          </div>

          {/* Cards */}
          {threads.map(thread => (
            <ThreadCard key={thread.id} thread={thread} />
          ))}
        </>
      )}
    </div>
  );
}
