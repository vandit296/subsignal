import { track } from '@/lib/posthog';
'use client';

import { useEffect, useState } from 'react';
import { ScoredThread, ThreadCategory } from '@/types';
import Link from 'next/link';

interface EngageResult {
  threads: ScoredThread[];
  subreddits: string[];
  productDescription: string;
  goal: string;
  generatedAt: string;
  error?: string;
}

const CATEGORIES: { key: ThreadCategory | 'all'; label: string; symbol: string; description: string }[] = [
  { key: 'all',        label: 'All',         symbol: '○',  description: 'Every relevant thread across your monitored subreddits' },
  { key: 'ideal_user', label: 'Ideal User',  symbol: '◎',  description: 'Your ICP is in this thread — best threads to engage with now' },
  { key: 'competition',label: 'Competition', symbol: '⊗',  description: 'Competitor mentions and comparison discussions' },
  { key: 'industry',   label: 'Industry',    symbol: '◈',  description: 'Trends and topics shaping your space' },
  { key: 'interesting',label: 'Interesting', symbol: '◇',  description: 'Loosely related threads worth keeping an eye on' },
];

function timeAgo(utc: number): string {
  const diff = Math.floor(Date.now() / 1000 - utc);
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function ScoreBadge({ score }: { score: number }) {
  const style = score >= 9
    ? { background: 'var(--green-dim)', color: 'var(--green)', border: '1px solid var(--green-border)' }
    : score >= 7
    ? { background: 'var(--blue-dim)', color: 'var(--blue)', border: '1px solid var(--blue-border)' }
    : { background: 'rgba(255,255,255,0.04)', color: 'var(--t3)', border: '1px solid rgba(255,255,255,0.07)' };
  return (
    <span style={{
      ...style,
      fontSize: 11, fontWeight: 700, padding: '3px 8px',
      borderRadius: 5, letterSpacing: '-0.02em', flexShrink: 0,
      fontFamily: 'var(--font-ui)',
    }}>
      {score.toFixed(1)}
    </span>
  );
}

function CategoryPill({ category }: { category: ThreadCategory }) {
  const map: Record<ThreadCategory, { label: string; symbol: string; style: React.CSSProperties }> = {
    ideal_user:  { label: 'Ideal User',  symbol: '◎', style: { background: 'var(--green-dim)',  color: 'var(--green)' } },
    competition: { label: 'Competition', symbol: '⊗', style: { background: 'var(--danger-dim)', color: 'var(--danger)' } },
    industry:    { label: 'Industry',    symbol: '◈', style: { background: 'var(--blue-dim)',   color: 'var(--blue)' } },
    interesting: { label: 'Interesting', symbol: '◇', style: { background: 'rgba(255,255,255,0.04)', color: 'var(--t4)' } },
  };
  const { label, symbol, style } = map[category] ?? map.interesting;
  return (
    <span style={{
      ...style,
      display: 'inline-flex', alignItems: 'center', gap: 3,
      fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 4,
      fontFamily: 'var(--font-ui)', flexShrink: 0,
    }}>
      {symbol} {label}
    </span>
  );
}

function ThreadCard({ t, rank, expanded, onToggle }: {
  t: ScoredThread; rank: number; expanded: boolean; onToggle: () => void;
}) {
  const [draftOpen, setDraftOpen] = useState(false);
  const [draftText, setDraftText] = useState('');
  const isTopPick = t.relevanceScore >= 9 && t.category === 'ideal_user';

  const cardStyle: React.CSSProperties = {
    borderRadius: 8,
    overflow: 'hidden',
    border: expanded
      ? '1px solid rgba(255,255,255,0.08)'
      : isTopPick
      ? '1px solid rgba(34,197,94,0.1)'
      : '1px solid transparent',
    background: expanded
      ? 'var(--surface)'
      : isTopPick
      ? 'rgba(34,197,94,0.015)'
      : 'transparent',
    transition: 'all 0.12s',
    cursor: 'pointer',
  };

  return (
    <div style={cardStyle}
      onMouseEnter={e => { if (!expanded) { (e.currentTarget as HTMLElement).style.background = 'var(--surface)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.07)'; }}}
      onMouseLeave={e => { if (!expanded) { (e.currentTarget as HTMLElement).style.background = isTopPick ? 'rgba(34,197,94,0.015)' : 'transparent'; (e.currentTarget as HTMLElement).style.borderColor = isTopPick ? 'rgba(34,197,94,0.1)' : 'transparent'; }}}
    >
      {/* Main row */}
      <button onClick={onToggle} style={{
        width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer',
        padding: '11px 14px', display: 'block', fontFamily: 'var(--font-ui)',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          {/* Rank */}
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--t4)', minWidth: 18, textAlign: 'right', paddingTop: 2, flexShrink: 0 }}>
            {rank}
          </div>
          {/* Body */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 5, flexWrap: 'nowrap', overflow: 'hidden' }}>
              <span style={{ fontSize: 11, color: 'var(--blue)', fontWeight: 500, whiteSpace: 'nowrap' }}>r/{t.subreddit}</span>
              <span style={{ fontSize: 10, color: 'var(--t4)' }}>·</span>
              <span style={{ fontSize: 11, color: 'var(--t4)', whiteSpace: 'nowrap' }}>{timeAgo(t.createdUtc)}</span>
              <span style={{ fontSize: 10, color: 'var(--t4)' }}>·</span>
              <span style={{ fontSize: 11, color: 'var(--t4)', whiteSpace: 'nowrap' }}>↑{t.score} · {t.numComments}c</span>
              <span style={{ width: 4, flexShrink: 0 }} />
              <CategoryPill category={t.category} />
            </div>
            <p style={{
              fontSize: 13.5, fontWeight: 500, color: 'var(--t1)', lineHeight: 1.45,
              display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
              overflow: 'hidden', letterSpacing: '-0.01em', margin: 0,
            }}>{t.title}</p>
          </div>
          {/* Right */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
            <ScoreBadge score={t.relevanceScore} />
            <span style={{ fontSize: 10, color: 'var(--t4)' }}>{expanded ? '▲' : '▼'}</span>
          </div>
        </div>
      </button>

      {/* Expanded */}
      {expanded && (
        <div style={{ padding: '0 14px 14px 44px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 0 }}>
            <div style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
              <span style={{ fontSize: 10, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '0.07em', minWidth: 36, paddingTop: 1, flexShrink: 0, fontWeight: 500 }}>Why</span>
              <p style={{ fontSize: 12.5, color: 'var(--t2)', lineHeight: 1.6, margin: 0 }}>{t.relevanceReason}</p>
            </div>
            <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
              <span style={{ fontSize: 10, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '0.07em', minWidth: 36, paddingTop: 1, flexShrink: 0, fontWeight: 500 }}>Angle</span>
              <p style={{ fontSize: 12.5, color: 'var(--orange)', lineHeight: 1.6, margin: 0 }}>{t.engagementAngle}</p>
            </div>

            {draftOpen ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <textarea
                  value={draftText}
                  onChange={e => setDraftText(e.target.value)}
                  placeholder="Draft your comment here…"
                  rows={3}
                  style={{
                    width: '100%', background: 'var(--panel)', border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 7, padding: '8px 12px', color: 'var(--t1)', fontSize: 12.5,
                    resize: 'none', outline: 'none', fontFamily: 'var(--font-ui)', lineHeight: 1.5,
                  }}
                />
                <div style={{ display: 'flex', gap: 6 }}>
                  <a href={t.url} target="_blank" rel="noopener noreferrer" style={{
                    flex: 1, textAlign: 'center', fontSize: 12, fontWeight: 600, padding: '7px 14px',
                    borderRadius: 6, background: 'var(--blue)', color: '#fff', textDecoration: 'none',
                    fontFamily: 'var(--font-ui)',
                  }}>
                    Open thread →
                  </a>
                  <button onClick={() => setDraftOpen(false)} style={{
                    fontSize: 12, color: 'var(--t3)', background: 'none', border: '1px solid rgba(255,255,255,0.07)',
                    borderRadius: 6, padding: '7px 12px', cursor: 'pointer', fontFamily: 'var(--font-ui)',
                  }}>
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button onClick={() => setDraftOpen(true)} style={{
                  display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px',
                  borderRadius: 6, fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font-ui)',
                  border: '1px solid rgba(255,255,255,0.08)', background: 'var(--panel)', color: 'var(--t2)',
                  transition: 'all 0.12s',
                }}>
                  ✍️ Draft reply
                </button>
                <a href={t.url} target="_blank" rel="noopener noreferrer" style={{
                  display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px',
                  borderRadius: 6, fontSize: 12, fontFamily: 'var(--font-ui)',
                  background: 'transparent', border: '1px solid transparent', color: 'var(--t3)',
                  textDecoration: 'none', transition: 'all 0.12s',
                }}>
                  Open thread ↗
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function FeedPage() {
  const [data, setData] = useState<EngageResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ThreadCategory | 'all'>('ideal_user');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  function load(bust = false) {
    setLoading(true);
    fetch(bust ? '/api/engage?bust=1' : '/api/engage')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: 20, fontFamily: 'var(--font-ui)' }}>
        <div style={{ width: 24, height: 24, border: '2px solid rgba(255,255,255,0.08)', borderTop: '2px solid var(--blue)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <p style={{ color: 'var(--t3)', fontSize: 13 }}>Categorizing threads across your subreddits…</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    );
  }

  if (!data || data.error || !data.subreddits) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: 16, padding: '0 32px', textAlign: 'center', fontFamily: 'var(--font-ui)' }}>
        <div style={{ fontSize: 36 }}>📡</div>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--t1)', letterSpacing: '-0.03em' }}>Set up Command first</h2>
        <p style={{ fontSize: 13, color: 'var(--t2)', maxWidth: 340, lineHeight: 1.6 }}>
          Add your product description, ideal user, and subreddits to monitor.{' '}
          <span style={{ color: 'var(--t3)' }}>Feed will then categorize threads for you automatically.</span>
        </p>
        <Link href="/command" style={{
          background: 'var(--blue)', color: '#fff', fontSize: 13, fontWeight: 600,
          padding: '8px 18px', borderRadius: 7, textDecoration: 'none', fontFamily: 'var(--font-ui)',
        }}>
          Go to Command →
        </Link>
      </div>
    );
  }

  const threads = data.threads ?? [];
  const countFor = (key: ThreadCategory | 'all') =>
    key === 'all' ? threads.length : threads.filter(t => t.category === key).length;
  const filtered = activeTab === 'all' ? threads : threads.filter(t => t.category === activeTab);
  const activeCat = CATEGORIES.find(c => c.key === activeTab)!;

  return (
    <div style={{ background: 'var(--void)', minHeight: '100vh', fontFamily: 'var(--font-ui)' }}>

      {/* Sticky top bar */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        height: 52, background: 'rgba(9,9,11,0.96)', borderBottom: '0.5px solid rgba(255,255,255,0.06)',
        backdropFilter: 'blur(16px)',
      }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--t1)' }}>Signal Feed</div>
          <div style={{ fontSize: 11, color: 'var(--t4)', marginTop: 1 }}>
            {data.subreddits.length} subreddits · ranked for{' '}
            <Link href="/command" style={{ color: 'var(--t4)', textDecoration: 'underline', textDecorationColor: 'rgba(255,255,255,0.15)', textUnderlineOffset: 2 }}>your goal</Link>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {data.generatedAt && (
            <span style={{ fontSize: 11, color: 'var(--t4)', padding: '3px 8px', background: 'rgba(255,255,255,0.03)', borderRadius: 5, border: '1px solid rgba(255,255,255,0.05)' }}>
              {new Date(data.generatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button onClick={() => load(true)} style={{
            fontSize: 12, color: 'var(--t3)', background: 'none', border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 6, padding: '5px 11px', cursor: 'pointer', fontFamily: 'var(--font-ui)',
            display: 'flex', alignItems: 'center', gap: 5,
          }}>
            ↺ Refresh
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <div style={{ padding: '16px 24px 0', maxWidth: 760, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, overflowX: 'auto', paddingBottom: 2 }}>
          {CATEGORIES.map(cat => {
            const count = countFor(cat.key);
            const isActive = activeTab === cat.key;
            const accentColor =
              cat.key === 'ideal_user'  ? 'var(--green)'  :
              cat.key === 'competition' ? 'var(--danger)'  :
              cat.key === 'industry'    ? 'var(--blue)'   :
              cat.key === 'interesting' ? 'var(--t3)'     : 'var(--blue)';
            const accentDim =
              cat.key === 'ideal_user'  ? 'var(--green-dim)'  :
              cat.key === 'competition' ? 'var(--danger-dim)'  :
              cat.key === 'industry'    ? 'var(--blue-dim)'   :
              cat.key === 'interesting' ? 'rgba(255,255,255,0.04)' : 'var(--blue-dim)';
            const accentBorder =
              cat.key === 'ideal_user'  ? 'var(--green-border)'  :
              cat.key === 'competition' ? 'var(--danger-border)'  :
              cat.key === 'industry'    ? 'var(--blue-border)'   :
              cat.key === 'interesting' ? 'rgba(255,255,255,0.08)' : 'var(--blue-border)';

            return (
              <button
                key={cat.key}
                onClick={() => { setActiveTab(cat.key); setExpandedId(null); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px',
                  borderRadius: 20, fontSize: 12, fontWeight: 500, cursor: 'pointer',
                  fontFamily: 'var(--font-ui)', whiteSpace: 'nowrap', transition: 'all 0.12s',
                  border: isActive ? `1px solid ${accentBorder}` : '1px solid transparent',
                  background: isActive ? accentDim : 'transparent',
                  color: isActive ? accentColor : 'var(--t3)',
                }}
              >
                <span style={{ fontSize: 11 }}>{cat.symbol}</span>
                {cat.label}
                <span style={{
                  fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 10,
                  minWidth: 18, textAlign: 'center',
                  background: isActive ? `color-mix(in srgb, ${accentColor} 15%, transparent)` : 'rgba(255,255,255,0.05)',
                  color: isActive ? accentColor : 'var(--t4)',
                }}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '12px 24px 48px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <span style={{ fontSize: 11, color: 'var(--t4)' }}>{activeCat.description}</span>
          <span style={{ fontSize: 11, color: 'var(--t4)' }}>{filtered.length} thread{filtered.length !== 1 ? 's' : ''}</span>
        </div>

        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px 0' }}>
            <div style={{ fontSize: 28, marginBottom: 12 }}>
              {activeTab === 'ideal_user' ? '◎' : activeTab === 'competition' ? '⊗' : '◇'}
            </div>
            <p style={{ color: 'var(--t2)', fontSize: 13 }}>
              {activeTab === 'ideal_user'
                ? 'No ideal user threads in the last 48h. Try refreshing or adding more subreddits.'
                : activeTab === 'competition'
                ? 'No competitor mentions found in the last 48h.'
                : 'Nothing in this category right now.'}
            </p>
            {activeTab === 'ideal_user' && (
              <p style={{ color: 'var(--t4)', fontSize: 12, marginTop: 8 }}>
                Make sure your ideal user description in{' '}
                <Link href="/command" style={{ color: 'var(--blue)', textDecoration: 'none' }}>Command</Link> is specific.
              </p>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {filtered.map((t, i) => (
              <ThreadCard
                key={t.id}
                t={t}
                rank={i + 1}
                expanded={expandedId === t.id}
                onToggle={() => setExpandedId(expandedId === t.id ? null : t.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
