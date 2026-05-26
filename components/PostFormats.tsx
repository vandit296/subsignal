'use client';

import { useState } from 'react';
import { PostFormat } from '@/types';

function timeAgo(utc: number): string {
  const diff = Math.floor(Date.now() / 1000) - utc;
  if (diff < 60 * 60 * 24) return 'today';
  if (diff < 60 * 60 * 24 * 7) return `${Math.floor(diff / 86400)}d ago`;
  if (diff < 60 * 60 * 24 * 30) return `${Math.floor(diff / 86400 / 7)}w ago`;
  if (diff < 60 * 60 * 24 * 365) return `${Math.floor(diff / 86400 / 30)}mo ago`;
  return `${Math.floor(diff / 86400 / 365)}y ago`;
}

function fmtScore(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

const DEFAULT_VISIBLE = 2;

export default function PostFormats({ formats }: { formats: PostFormat[] }) {
  const [expanded, setExpanded] = useState<number | null>(null);
  const [showAllExamples, setShowAllExamples] = useState<Set<number>>(new Set());
  const [activeView, setActiveView] = useState<'formats' | 'posts'>('formats');
  const max = formats[0]?.avgScore ?? 1;

  function toggleShowAll(rank: number, e: React.MouseEvent) {
    e.stopPropagation();
    setShowAllExamples(prev => {
      const next = new Set(prev);
      if (next.has(rank)) next.delete(rank); else next.add(rank);
      return next;
    });
  }

  const allPosts = formats
    .flatMap(f => (f.examples ?? []).map(ex => ({ ...ex, formatName: f.name })))
    .filter(ex => ex.score > 0)
    .sort((a, b) => b.score - a.score);

  return (
    <div style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 10, padding: '16px 18px' }}>
      {/* Header + view toggle */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <span style={{ color: 'var(--t2)', fontSize: 12, fontWeight: 600 }}>Top post formats</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ color: 'var(--t4)', fontSize: 11, marginRight: 4 }}>by avg score</span>
          <div style={{ display: 'flex', background: 'var(--panel)', borderRadius: 6, border: '0.5px solid var(--border)', padding: 2, gap: 2 }}>
            {(['formats', 'posts'] as const).map(v => (
              <button
                key={v}
                onClick={() => setActiveView(v)}
                style={{
                  fontSize: 11, fontWeight: activeView === v ? 500 : 400,
                  padding: '3px 9px', borderRadius: 4,
                  background: activeView === v ? 'var(--blue-dim)' : 'transparent',
                  color: activeView === v ? 'var(--blue)' : 'var(--t4)',
                  border: activeView === v ? '0.5px solid var(--blue-border)' : '0.5px solid transparent',
                  cursor: 'pointer', fontFamily: 'var(--font-ui)',
                }}
              >
                {v === 'formats' ? `Formats (${formats.length})` : `Top Posts (${allPosts.length})`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── FORMATS VIEW ── */}
      {activeView === 'formats' && (
        <div className="space-y-2">
          {formats.map(f => {
            const showAll = showAllExamples.has(f.rank);
            const examples = f.examples ?? [];
            const visibleExamples = showAll ? examples : examples.slice(0, DEFAULT_VISIBLE);
            const hiddenCount = examples.length - DEFAULT_VISIBLE;

            return (
              <div key={f.rank} className="rounded-lg overflow-hidden" style={{ background: 'var(--panel)' }}>
                <button
                  onClick={() => setExpanded(expanded === f.rank ? null : f.rank)}
                  className="w-full px-3 py-2.5 text-left"
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <span style={{ color: 'var(--t4)', fontSize: 11, fontWeight: 600, width: 16 }}>#{f.rank}</span>
                    <span style={{ color: 'var(--t1)', fontSize: 13, flex: 1 }}>{f.name}</span>
                    <span style={{ color: 'var(--blue)', fontSize: 12, fontWeight: 600 }}>{fmtScore(f.avgScore)}</span>
                    <span style={{ color: 'var(--t4)', fontSize: 11, marginLeft: 2 }}>
                      {expanded === f.rank ? '▲' : '▼'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1 rounded overflow-hidden" style={{ background: 'var(--overlay)' }}>
                      <div
                        className="h-full rounded"
                        style={{ width: `${(f.avgScore / max) * 100}%`, background: '#4A8FFF' }}
                      />
                    </div>
                  </div>
                </button>

                {expanded === f.rank && (
                  <div className="px-3 pb-3 pt-2.5 space-y-2.5" style={{ borderTop: '0.5px solid var(--border)' }}>
                    <p style={{ color: 'var(--t2)', fontSize: 13, lineHeight: 1.65 }}>{f.description}</p>

                    {examples.length > 0 ? (
                      <div className="space-y-1.5">
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--t4)', fontSize: 11 }}>Example posts</span>
                          {hiddenCount > 0 && (
                            <button
                              onClick={e => toggleShowAll(f.rank, e)}
                              style={{
                                fontSize: 11, color: 'var(--blue)', background: 'none', border: 'none',
                                cursor: 'pointer', fontFamily: 'var(--font-ui)', padding: 0,
                              }}
                            >
                              {showAll ? '↑ Show less' : `↓ Show ${hiddenCount} more`}
                            </button>
                          )}
                        </div>
                        {visibleExamples.map((ex, i) => (
                          <div key={i} className="rounded-lg px-3 py-2 flex items-start gap-2" style={{ background: 'var(--overlay)' }}>
                            <div className="flex-1 min-w-0">
                              <p style={{ color: 'var(--t1)', fontSize: 12, lineHeight: 1.5 }} className="line-clamp-2">{ex.title}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <span style={{ color: 'var(--blue)', fontSize: 11, fontWeight: 600 }}>↑ {fmtScore(ex.score)}</span>
                                {ex.createdUtc > 0 && (
                                  <span style={{ color: 'var(--t4)', fontSize: 11 }}>{timeAgo(ex.createdUtc)}</span>
                                )}
                              </div>
                            </div>
                            {ex.url && (
                              <a
                                href={ex.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ color: 'var(--blue)', fontSize: 11, fontWeight: 500, flexShrink: 0, marginTop: 2 }}
                              >
                                View →
                              </a>
                            )}
                          </div>
                        ))}
                        {!showAll && hiddenCount > 0 && (
                          <button
                            onClick={e => toggleShowAll(f.rank, e)}
                            style={{
                              width: '100%', padding: '6px 0',
                              fontSize: 11, color: 'var(--t3)',
                              background: 'var(--overlay)', border: '0.5px solid var(--border)',
                              borderRadius: 6, cursor: 'pointer', fontFamily: 'var(--font-ui)',
                              transition: 'color 0.12s',
                            }}
                            onMouseEnter={e => (e.currentTarget.style.color = 'var(--t1)')}
                            onMouseLeave={e => (e.currentTarget.style.color = 'var(--t3)')}
                          >
                            + {hiddenCount} more example{hiddenCount !== 1 ? 's' : ''}
                          </button>
                        )}
                      </div>
                    ) : f.exampleUrl ? (
                      <div className="flex items-start gap-1.5">
                        <span style={{ color: 'var(--t4)', fontSize: 12, marginTop: 2, flexShrink: 0 }}>e.g.</span>
                        <div className="flex-1">
                          <span style={{ color: 'var(--t2)', fontSize: 12, fontStyle: 'italic' }}>&ldquo;{f.example}&rdquo;</span>
                          <a
                            href={f.exampleUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ display: 'block', color: 'var(--blue)', fontSize: 12, marginTop: 4 }}
                          >
                            View on Reddit →
                          </a>
                        </div>
                      </div>
                    ) : (
                      <p style={{ color: 'var(--t2)', fontSize: 12, fontStyle: 'italic' }}>&ldquo;{f.example}&rdquo;</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── TOP POSTS VIEW ── */}
      {activeView === 'posts' && (
        <div>
          {allPosts.length === 0 ? (
            <p style={{ color: 'var(--t4)', fontSize: 12, textAlign: 'center', padding: '16px 0' }}>
              No posts with scores available yet. Run a fresh analysis to populate.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {allPosts.map((post, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '8px 10px', borderRadius: 7,
                    background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.012)',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--overlay)')}
                  onMouseLeave={e => (e.currentTarget.style.background = i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.012)')}
                >
                  <span style={{ color: 'var(--t4)', fontSize: 11, fontWeight: 600, width: 20, flexShrink: 0, textAlign: 'right' }}>
                    {i + 1}
                  </span>
                  <div style={{ width: 60, flexShrink: 0 }}>
                    <div style={{ height: 3, background: 'var(--overlay)', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', borderRadius: 2, background: 'var(--blue)',
                        width: `${Math.min((post.score / (allPosts[0]?.score || 1)) * 100, 100)}%`,
                      }} />
                    </div>
                    <span style={{ color: 'var(--blue)', fontSize: 10, fontWeight: 600, display: 'block', marginTop: 2 }}>
                      ↑ {fmtScore(post.score)}
                    </span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {post.url ? (
                      <a
                        href={post.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: 'var(--t1)', fontSize: 12, lineHeight: 1.4, textDecoration: 'none' }}
                        onMouseEnter={e => (e.currentTarget.style.color = 'var(--blue)')}
                        onMouseLeave={e => (e.currentTarget.style.color = 'var(--t1)')}
                      >
                        {post.title}
                      </a>
                    ) : (
                      <span style={{ color: 'var(--t1)', fontSize: 12, lineHeight: 1.4 }}>{post.title}</span>
                    )}
                  </div>
                  <span style={{
                    fontSize: 10, color: 'var(--t4)',
                    background: 'var(--panel)', border: '0.5px solid var(--border)',
                    borderRadius: 4, padding: '2px 6px', flexShrink: 0,
                    whiteSpace: 'nowrap', maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {post.formatName}
                  </span>
                  {post.createdUtc > 0 && (
                    <span style={{ color: 'var(--t4)', fontSize: 10, flexShrink: 0 }}>{timeAgo(post.createdUtc)}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
