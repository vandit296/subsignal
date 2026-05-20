'use client';

import { useState } from 'react';
import { PostPrediction } from '@/types';

interface Props {
  subreddit: string;
}

const VERDICT_CONFIG = {
  Strong:   { color: 'var(--green)',  ring: '#22c55e', accent: 'rgba(34,197,94,0.4)'  },
  Good:     { color: 'var(--blue)',   ring: '#4a8fff', accent: 'rgba(74,143,255,0.4)' },
  Mediocre: { color: 'var(--amber)',  ring: '#f59e0b', accent: 'rgba(245,158,11,0.4)' },
  Weak:     { color: 'var(--danger)', ring: '#ef4444', accent: 'rgba(239,68,68,0.4)'  },
};

function ScoreRing({ score, verdict }: { score: number; verdict: string }) {
  const cfg = VERDICT_CONFIG[verdict as keyof typeof VERDICT_CONFIG] ?? VERDICT_CONFIG.Mediocre;
  const r = 50;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, flexShrink: 0 }}>
      <div style={{ position: 'relative', width: 120, height: 120 }}>
        <svg width="120" height="120" viewBox="0 0 120 120" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="60" cy="60" r={r} fill="none" stroke="var(--overlay)" strokeWidth="10" />
          <circle
            cx="60" cy="60" r={r} fill="none"
            stroke={cfg.ring} strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 0.8s ease' }}
          />
        </svg>
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontSize: 32, fontWeight: 700, color: 'var(--t1)', lineHeight: 1 }}>{score}</span>
          <span style={{ fontSize: 11, color: 'var(--t3)', marginTop: 2 }}>/ 100</span>
        </div>
      </div>
      <span style={{ fontSize: 15, fontWeight: 600, color: cfg.color }}>{verdict}</span>
    </div>
  );
}

export default function PostPredictor({ subreddit }: Props) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PostPrediction | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch('/api/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subreddit, title: title.trim(), body: body.trim() }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResult(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  const verdictCfg = result
    ? VERDICT_CONFIG[result.verdict as keyof typeof VERDICT_CONFIG] ?? VERDICT_CONFIG.Mediocre
    : null;

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '32px 24px 64px', fontFamily: 'var(--font-ui)' }}>

      {/* ── AI Context Panel ── */}
      <div style={{
        background: 'var(--surface)',
        border: '0.5px solid var(--blue-border)',
        borderRadius: 12, padding: '18px 20px',
        marginBottom: 28, position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent, rgba(74,143,255,0.5), transparent)' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
          <span style={{
            width: 6, height: 6, borderRadius: '50%', background: 'var(--blue)',
            display: 'inline-block',
            animation: 'aipulse 2s ease-in-out infinite',
          }} />
          <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', color: 'var(--blue)', textTransform: 'uppercase' }}>
            Post Success Predictor — r/{subreddit.toUpperCase()}
          </span>
        </div>
        <p style={{ fontSize: 13, color: 'var(--t2)', lineHeight: 1.7 }}>
          Paste your draft below. Treddit will{' '}
          <span style={{ color: 'var(--t1)', fontWeight: 500 }}>compare it against the top-performing posts</span>{' '}
          in this subreddit and tell you exactly what's working and what's not — before you hit Post.
        </p>
      </div>

      {/* ── Form ── */}
      {!result && (
        <form onSubmit={handleSubmit}>
          {/* Title */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', color: 'var(--t3)', textTransform: 'uppercase' }}>
                Post Title
              </span>
              <span style={{ fontSize: 11, color: 'var(--danger)' }}>*</span>
            </div>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder={`What would you title your post on r/${subreddit}?`}
              maxLength={300}
              disabled={loading}
              style={{
                width: '100%', background: 'var(--surface)',
                border: '0.5px solid var(--border)',
                borderRadius: 10, padding: '12px 16px',
                color: 'var(--t1)', fontSize: 13.5, fontFamily: 'var(--font-ui)',
                outline: 'none', transition: 'border-color 0.15s, box-shadow 0.15s',
              }}
              onFocus={e => { e.target.style.borderColor = 'var(--blue-border)'; e.target.style.boxShadow = '0 0 0 3px rgba(74,143,255,0.06)'; }}
              onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none'; }}
            />
            <div style={{ fontSize: 11, color: 'var(--t4)', textAlign: 'right', marginTop: 5 }}>
              {title.length} / 300
            </div>
          </div>

          {/* Body */}
          <div style={{ marginBottom: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', color: 'var(--t3)', textTransform: 'uppercase' }}>
                Body Text
              </span>
              <span style={{ fontSize: 11, color: 'var(--t4)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>
                — optional
              </span>
            </div>
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder="Paste the body of your post here, or leave blank to score title-only..."
              rows={6}
              disabled={loading}
              style={{
                width: '100%', background: 'var(--surface)',
                border: '0.5px solid var(--border)',
                borderRadius: 10, padding: '12px 16px',
                color: 'var(--t1)', fontSize: 13.5, fontFamily: 'var(--font-ui)',
                outline: 'none', resize: 'none', lineHeight: 1.65,
                transition: 'border-color 0.15s, box-shadow 0.15s',
              }}
              onFocus={e => { e.target.style.borderColor = 'var(--blue-border)'; e.target.style.boxShadow = '0 0 0 3px rgba(74,143,255,0.06)'; }}
              onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none'; }}
            />
          </div>

          {/* CTA */}
          <button
            type="submit"
            disabled={loading || !title.trim()}
            style={{
              width: '100%', marginTop: 20,
              background: loading || !title.trim()
                ? 'var(--overlay)'
                : 'linear-gradient(135deg, #4a8fff, #3b7de0)',
              border: 'none', borderRadius: 10,
              padding: '13px 20px',
              color: loading || !title.trim() ? 'var(--t3)' : '#fff',
              fontSize: 13.5, fontWeight: 600, fontFamily: 'var(--font-ui)',
              cursor: loading || !title.trim() ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              transition: 'opacity 0.14s',
              boxShadow: loading || !title.trim() ? 'none' : '0 4px 24px rgba(74,143,255,0.2)',
            }}
          >
            {loading ? (
              <>
                <div style={{
                  width: 14, height: 14, borderRadius: '50%',
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderTopColor: '#fff',
                  animation: 'spin 0.7s linear infinite',
                }} />
                Analyzing against r/{subreddit}...
              </>
            ) : (
              <>
                <span>⚡</span>
                Score My Post
              </>
            )}
          </button>
        </form>
      )}

      {/* ── Error ── */}
      {error && (
        <div style={{
          background: 'var(--danger-dim)', border: '0.5px solid var(--danger-border)',
          borderRadius: 10, padding: '12px 16px',
          color: 'var(--danger)', fontSize: 13, marginTop: 16,
        }}>
          {error}
        </div>
      )}

      {/* ── Results ── */}
      {result && verdictCfg && (
        <div style={{ animation: 'fadein 0.25s ease' }}>

          {/* Score card */}
          <div style={{
            background: 'var(--surface)', border: '0.5px solid var(--border)',
            borderRadius: 12, padding: '24px',
            display: 'flex', alignItems: 'center', gap: 28,
            marginBottom: 16, position: 'relative', overflow: 'hidden',
          }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, transparent, ${verdictCfg.accent}, transparent)` }} />
            <ScoreRing score={result.score} verdict={result.verdict} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--t1)', marginBottom: 8, lineHeight: 1.3 }}>
                {result.verdict === 'Strong' ? 'Strong post — minimal changes needed' :
                 result.verdict === 'Good' ? 'Good post with room to improve' :
                 result.verdict === 'Mediocre' ? 'Needs work before posting' :
                 'Significant revisions recommended'}
              </div>
              <p style={{ fontSize: 13, color: 'var(--t2)', lineHeight: 1.7 }}>{result.summary}</p>
            </div>
          </div>

          {/* What's working */}
          {result.working.length > 0 && (
            <div style={{
              background: 'var(--surface)', border: '0.5px solid var(--border)',
              borderRadius: 12, overflow: 'hidden', marginBottom: 12,
            }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '12px 18px', borderBottom: '0.5px solid var(--border)',
                fontSize: 12, fontWeight: 600, color: 'var(--green)',
                background: 'rgba(34,197,94,0.04)',
              }}>
                <span>✓</span> What&apos;s Working
              </div>
              {result.working.map((item, i) => (
                <div key={i} style={{
                  display: 'flex', gap: 12, padding: '14px 18px',
                  borderBottom: i < result.working.length - 1 ? '0.5px solid var(--border)' : 'none',
                }}>
                  <div style={{
                    width: 20, height: 20, borderRadius: 6, flexShrink: 0, marginTop: 1,
                    background: 'rgba(34,197,94,0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, color: 'var(--green)',
                  }}>✓</div>
                  <div>
                    <div style={{ fontSize: 13, color: 'var(--t1)', fontWeight: 500, marginBottom: 3 }}>{item.label}</div>
                    <div style={{ fontSize: 12, color: 'var(--t2)', lineHeight: 1.65 }}>{item.detail}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* What's killing it */}
          {result.killing.length > 0 && (
            <div style={{
              background: 'var(--surface)', border: '0.5px solid var(--border)',
              borderRadius: 12, overflow: 'hidden', marginBottom: 12,
            }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '12px 18px', borderBottom: '0.5px solid var(--border)',
                fontSize: 12, fontWeight: 600, color: 'var(--danger)',
                background: 'rgba(239,68,68,0.04)',
              }}>
                <span>✗</span> What&apos;s Killing It
              </div>
              {result.killing.map((item, i) => (
                <div key={i} style={{
                  display: 'flex', gap: 12, padding: '14px 18px',
                  borderBottom: i < result.killing.length - 1 ? '0.5px solid var(--border)' : 'none',
                }}>
                  <div style={{
                    width: 20, height: 20, borderRadius: 6, flexShrink: 0, marginTop: 1,
                    background: 'rgba(239,68,68,0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, color: 'var(--danger)',
                  }}>✗</div>
                  <div>
                    <div style={{ fontSize: 13, color: 'var(--t1)', fontWeight: 500, marginBottom: 3 }}>{item.label}</div>
                    <div style={{ fontSize: 12, color: 'var(--t2)', lineHeight: 1.65 }}>{item.detail}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Reset */}
          <button
            onClick={() => { setResult(null); setTitle(''); setBody(''); setError(null); }}
            style={{
              width: '100%', background: 'none',
              border: '0.5px solid var(--border)',
              borderRadius: 10, padding: '11px 20px',
              color: 'var(--t3)', fontSize: 13, fontFamily: 'var(--font-ui)',
              cursor: 'pointer', marginTop: 8,
              transition: 'color 0.12s, border-color 0.12s',
            }}
            onMouseEnter={e => { (e.target as HTMLElement).style.color = 'var(--t1)'; (e.target as HTMLElement).style.borderColor = 'rgba(255,255,255,0.14)'; }}
            onMouseLeave={e => { (e.target as HTMLElement).style.color = 'var(--t3)'; (e.target as HTMLElement).style.borderColor = 'var(--border)'; }}
          >
            ← Score a different post
          </button>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadein { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
      `}</style>
    </div>
  );
}
