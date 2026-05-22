'use client';

import { track } from '@/lib/posthog';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';

interface Thread {
  id: string;
  title: string;
  subreddit: string;
  score: number;
  numComments: number;
  createdUtc: number;
  url: string;
  snippet: string;
}

interface TrackResult {
  keyword: string;
  period: string;
  totalThreads: number;
  removedByAI: number;
  aiFiltered: boolean;
  threads: Thread[];
  subredditActivity: { subreddit: string; count: number }[];
  fetchedAt: string;
  error?: string;
}

interface RedditComment {
  id: string;
  author: string;
  body: string;
  score: number;
  createdUtc: number;
  depth: number;
}

interface RedditPost {
  title: string;
  body: string;
  author: string;
  score: number;
  numComments: number;
  createdUtc: number;
  subreddit: string;
  permalink: string;
}

interface ThreadData {
  post: RedditPost;
  comments: RedditComment[];
}

type Period = '1day' | '1week' | '1month';

const PERIOD_LABELS: Record<Period, string> = {
  '1day': 'Today',
  '1week': 'This week',
  '1month': 'This month',
};

// ── localStorage fallback (for unauthenticated visitors) ──────────────────────
const LS_KEY = 'subsignal_watch_keywords';
function lsGet(): string[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(LS_KEY) ?? '[]'); } catch { return []; }
}
function lsSet(kws: string[]) {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(LS_KEY, JSON.stringify(kws)); } catch {}
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function timeAgo(utc: number): string {
  const diff = Math.floor(Date.now() / 1000 - utc);
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function timeLabel(utc: number): string {
  const now = new Date();
  const date = new Date(utc * 1000);
  const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Highlight the keyword word-level within text
function highlightKeyword(text: string, keyword: string): React.ReactNode {
  if (!keyword || !text) return text;
  const safe = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${safe})`, 'gi'));
  return parts.map((p, i) =>
    p.toLowerCase() === keyword.toLowerCase()
      ? <mark key={i} style={{
          background: 'rgba(255, 213, 0, 0.32)',
          color: 'var(--t1)',
          fontWeight: 600,
          borderRadius: 3,
          padding: '0 2px',
        }}>{p}</mark>
      : p,
  );
}

// Check if text contains keyword
function containsKw(text: string, keyword: string): boolean {
  if (!keyword || !text) return false;
  return text.toLowerCase().includes(keyword.toLowerCase());
}

// ── Thread Drawer ─────────────────────────────────────────────────────────────
function ThreadDrawer({
  thread,
  keyword,
  onClose,
}: {
  thread: Thread;
  keyword: string;
  onClose: () => void;
}) {
  const [data, setData] = useState<ThreadData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    setData(null);
    fetch(`/api/thread-comments?url=${encodeURIComponent(thread.url)}`)
      .then(r => r.json())
      .then((d: ThreadData & { error?: string }) => {
        if (d.error) setError(d.error);
        else setData(d);
      })
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false));
  }, [thread.url]);

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const matchingCommentCount = data?.comments.filter(c => containsKw(c.body, keyword)).length ?? 0;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 40,
          background: 'rgba(0,0,0,0.55)',
          backdropFilter: 'blur(2px)',
          animation: 'fadeIn 0.18s ease',
        }}
      />

      {/* Drawer panel */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 50,
        width: 'min(600px, 100vw)',
        background: 'var(--bg)',
        borderLeft: '0.5px solid rgba(255,255,255,0.08)',
        display: 'flex', flexDirection: 'column',
        animation: 'slideIn 0.22s cubic-bezier(0.25,0.46,0.45,0.94)',
        boxShadow: '-8px 0 40px rgba(0,0,0,0.45)',
      }}>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          gap: 12, padding: '16px 20px',
          borderBottom: '0.5px solid rgba(255,255,255,0.06)',
          flexShrink: 0,
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5, flexWrap: 'wrap' }}>
              <span style={{
                fontSize: 10, color: 'var(--t4)', fontWeight: 600,
                textTransform: 'uppercase', letterSpacing: '0.07em',
              }}>
                r/{thread.subreddit}
              </span>
              <span style={{ opacity: 0.3, fontSize: 10 }}>·</span>
              <span style={{ fontSize: 10, color: 'var(--t4)' }}>{timeAgo(thread.createdUtc)}</span>
              {matchingCommentCount > 0 && (
                <>
                  <span style={{ opacity: 0.3, fontSize: 10 }}>·</span>
                  <span style={{
                    fontSize: 10, padding: '2px 7px', borderRadius: 4,
                    background: 'rgba(255, 213, 0, 0.12)',
                    border: '0.5px solid rgba(255, 213, 0, 0.25)',
                    color: 'rgba(255, 213, 0, 0.85)',
                    fontWeight: 500,
                  }}>
                    {matchingCommentCount} matching comment{matchingCommentCount !== 1 ? 's' : ''}
                  </span>
                </>
              )}
            </div>
            <h2 style={{
              fontSize: 14, fontWeight: 600, color: 'var(--t1)',
              margin: 0, lineHeight: 1.45, letterSpacing: '-0.01em',
            }}>
              {highlightKeyword(thread.title, keyword)}
            </h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <a
              href={thread.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: 11, padding: '5px 12px', borderRadius: 6,
                background: 'rgba(255,255,255,0.04)',
                border: '0.5px solid rgba(255,255,255,0.1)',
                color: 'var(--t3)', textDecoration: 'none',
                whiteSpace: 'nowrap', transition: 'all 0.14s ease',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                e.currentTarget.style.color = 'var(--t1)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                e.currentTarget.style.color = 'var(--t3)';
              }}
            >
              Open Reddit ↗
            </a>
            <button
              onClick={onClose}
              style={{
                width: 28, height: 28, borderRadius: 6, border: '0.5px solid rgba(255,255,255,0.08)',
                background: 'rgba(255,255,255,0.03)', color: 'var(--t4)',
                cursor: 'pointer', fontSize: 14, display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.14s ease',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                e.currentTarget.style.color = 'var(--t1)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                e.currentTarget.style.color = 'var(--t4)';
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 0 40px' }}>

          {loading && (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: 12, padding: '60px 0',
            }}>
              <div style={{
                width: 18, height: 18,
                border: '1.5px solid rgba(255,213,0,0.3)',
                borderTopColor: 'rgba(255,213,0,0.8)',
                borderRadius: '50%',
                animation: 'spin 0.7s linear infinite',
              }} />
              <span style={{ color: 'var(--t4)', fontSize: 12 }}>Loading comments…</span>
            </div>
          )}

          {error && (
            <div style={{
              margin: '20px', color: '#f87171', fontSize: 12,
              background: 'rgba(239,68,68,0.08)', border: '0.5px solid rgba(239,68,68,0.2)',
              borderRadius: 8, padding: '12px 16px',
            }}>
              {error}
            </div>
          )}

          {data && !loading && (
            <>
              {/* Post body */}
              {data.post.body && data.post.body.trim() && (
                <div style={{
                  margin: '16px 20px',
                  padding: '14px 16px',
                  borderRadius: 8,
                  background: containsKw(data.post.body, keyword)
                    ? 'rgba(255, 213, 0, 0.07)'
                    : 'rgba(255,255,255,0.025)',
                  border: containsKw(data.post.body, keyword)
                    ? '0.5px solid rgba(255, 213, 0, 0.2)'
                    : '0.5px solid rgba(255,255,255,0.05)',
                }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8,
                  }}>
                    <span style={{ fontSize: 11, color: 'var(--t4)', fontWeight: 500 }}>
                      u/{data.post.author}
                    </span>
                    <span style={{ opacity: 0.4, fontSize: 10 }}>·</span>
                    <span style={{ fontSize: 10, color: 'var(--t4)' }}>↑{data.post.score}</span>
                    {containsKw(data.post.body, keyword) && (
                      <>
                        <span style={{ opacity: 0.4, fontSize: 10 }}>·</span>
                        <span style={{
                          fontSize: 9, padding: '1px 6px', borderRadius: 3,
                          background: 'rgba(255, 213, 0, 0.15)',
                          color: 'rgba(255, 213, 0, 0.8)',
                          fontWeight: 600, letterSpacing: '0.04em',
                          textTransform: 'uppercase',
                        }}>match</span>
                      </>
                    )}
                  </div>
                  <p style={{
                    color: 'var(--t2)', fontSize: 13, lineHeight: 1.65,
                    margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                  }}>
                    {highlightKeyword(data.post.body, keyword)}
                  </p>
                </div>
              )}

              {/* Comments section header */}
              <div style={{
                padding: '12px 20px 8px',
                borderTop: '0.5px solid rgba(255,255,255,0.05)',
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <span style={{
                  fontSize: 10, fontWeight: 600, color: 'var(--t4)',
                  textTransform: 'uppercase', letterSpacing: '0.07em',
                }}>
                  Comments
                </span>
                <span style={{ fontSize: 10, color: 'var(--t4)', opacity: 0.6 }}>
                  {data.comments.length} loaded
                </span>
                {matchingCommentCount > 0 && (
                  <span style={{ fontSize: 10, color: 'rgba(255,213,0,0.7)' }}>
                    · {matchingCommentCount} contain &ldquo;{keyword}&rdquo;
                  </span>
                )}
              </div>

              {/* Comments list */}
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {data.comments.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--t4)', fontSize: 12 }}>
                    No comments yet
                  </div>
                ) : (
                  data.comments.map(c => {
                    const isMatch = containsKw(c.body, keyword);
                    // Skip empty/deleted comments unless they match
                    if (!c.body || c.body === '[deleted]' || c.body === '[removed]') return null;

                    return (
                      <div
                        key={c.id}
                        style={{
                          padding: '12px 20px',
                          paddingLeft: `${20 + Math.min(c.depth, 4) * 16}px`,
                          borderBottom: '0.5px solid rgba(255,255,255,0.03)',
                          // ── WHOLE COMMENT highlighted if it contains the keyword ──
                          background: isMatch
                            ? 'rgba(255, 213, 0, 0.07)'
                            : 'transparent',
                          borderLeft: isMatch
                            ? '2px solid rgba(255, 213, 0, 0.45)'
                            : c.depth > 0
                            ? '2px solid rgba(255,255,255,0.05)'
                            : 'none',
                          transition: 'background 0.14s',
                        }}
                      >
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5,
                        }}>
                          <span style={{ fontSize: 11, color: isMatch ? 'rgba(255,213,0,0.7)' : 'var(--t4)', fontWeight: 500 }}>
                            u/{c.author}
                          </span>
                          <span style={{ opacity: 0.4, fontSize: 10 }}>·</span>
                          <span style={{ fontSize: 10, color: 'var(--t4)' }}>↑{c.score}</span>
                          <span style={{ opacity: 0.4, fontSize: 10 }}>·</span>
                          <span style={{ fontSize: 10, color: 'var(--t4)' }}>{timeAgo(c.createdUtc)}</span>
                          {isMatch && (
                            <>
                              <span style={{ opacity: 0.4, fontSize: 10 }}>·</span>
                              <span style={{
                                fontSize: 9, padding: '1px 6px', borderRadius: 3,
                                background: 'rgba(255, 213, 0, 0.18)',
                                color: 'rgba(255, 213, 0, 0.85)',
                                fontWeight: 600, letterSpacing: '0.04em',
                                textTransform: 'uppercase',
                              }}>match</span>
                            </>
                          )}
                        </div>
                        <p style={{
                          color: isMatch ? 'var(--t2)' : 'var(--t3)',
                          fontSize: 13, lineHeight: 1.65, margin: 0,
                          whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                        }}>
                          {highlightKeyword(c.body, keyword)}
                        </p>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function WatchPage() {
  const { status: authStatus } = useSession();
  const isLoggedIn = authStatus === 'authenticated';

  const [input, setInput] = useState('');
  const [inputFocused, setInputFocused] = useState(false);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [activeKeyword, setActiveKeyword] = useState('');
  const [period, setPeriod] = useState<Period>('1week');
  const [result, setResult] = useState<TrackResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncPending, setSyncPending] = useState(false);
  const [selectedThread, setSelectedThread] = useState<Thread | null>(null);
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const closeDrawer = useCallback(() => setSelectedThread(null), []);

  // ── Load keywords ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (authStatus === 'loading') return;
    if (isLoggedIn) {
      fetch('/api/alert-settings')
        .then(r => r.json())
        .then(data => {
          const apiKws: string[] = data?.settings?.keywordWatch?.keywords ?? [];
          if (apiKws.length > 0) {
            setKeywords(apiKws);
            lsSet(apiKws);
          } else {
            const local = lsGet();
            setKeywords(local);
          }
        })
        .catch(() => setKeywords(lsGet()));
    } else {
      setKeywords(lsGet());
    }
  }, [authStatus, isLoggedIn]);

  // ── Persist keywords ───────────────────────────────────────────────────────
  function persistKeywords(kws: string[]) {
    setKeywords(kws);
    lsSet(kws);
    if (!isLoggedIn) return;

    setSyncPending(true);
    if (syncTimer.current) clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(async () => {
      try {
        await fetch('/api/alert-settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ keywordWatch: { keywords: kws } }),
        });
      } finally {
        setSyncPending(false);
      }
    }, 600);
  }

  // ── Search ─────────────────────────────────────────────────────────────────
  async function search(kw: string, p = period) {
    if (!kw.trim()) return;
    setLoading(true);
    setResult(null);
    setActiveKeyword(kw);
    setSelectedThread(null);
    try {
      const res = await fetch(`/api/track?keyword=${encodeURIComponent(kw)}&period=${p}`);
      const data = await res.json();
      setResult(data);
    } finally {
      setLoading(false);
    }
  }

  function addKeyword() {
    const kw = input.trim().toLowerCase();
    if (!kw || keywords.includes(kw)) return;
    const updated = [kw, ...keywords];
    persistKeywords(updated);
    setInput('');
    search(kw);
    track('keyword_added', { keyword: kw, total: updated.length });
  }

  function removeKeyword(kw: string) {
    const updated = keywords.filter(k => k !== kw);
    persistKeywords(updated);
    if (activeKeyword === kw) { setResult(null); setActiveKeyword(''); }
  }

  // ── Group threads by timeline ──────────────────────────────────────────────
  const threads = (result?.threads ?? []).slice().sort((a, b) => b.createdUtc - a.createdUtc);
  const grouped: { label: string; threads: Thread[] }[] = [];
  const seenLabels = new Map<string, Thread[]>();
  for (const t of threads) {
    const label = timeLabel(t.createdUtc);
    if (!seenLabels.has(label)) {
      const arr: Thread[] = [];
      seenLabels.set(label, arr);
      grouped.push({ label, threads: arr });
    }
    seenLabels.get(label)!.push(t);
  }

  return (
    <>
      <div style={{ maxWidth: 780, margin: '0 auto', padding: '36px 28px 60px', fontFamily: 'var(--font-ui)' }}>

        {/* ── Page header ── */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <h1 style={{ fontSize: 18, fontWeight: 600, color: 'var(--t1)', margin: 0, letterSpacing: '-0.02em' }}>
              Keyword Watch
            </h1>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              fontSize: 10, color: 'var(--hot)', letterSpacing: '0.06em',
              fontWeight: 500, textTransform: 'uppercase',
              background: 'var(--hot-dim)', border: '0.5px solid var(--hot-border)',
              padding: '2px 8px', borderRadius: 4,
            }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--hot)', display: 'inline-block', flexShrink: 0 }} />
              Live
            </span>
            {syncPending && (
              <span style={{ fontSize: 11, color: 'var(--t4)', marginLeft: 4 }}>syncing…</span>
            )}
          </div>
          <p style={{ color: 'var(--t3)', fontSize: 13, margin: 0, lineHeight: 1.5 }}>
            Track any keyword across all of Reddit. AI removes irrelevant matches using your product context from{' '}
            <a href="/command" style={{ color: 'var(--t3)', textDecoration: 'underline', textUnderlineOffset: 3, transition: 'color 0.14s' }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--hot)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--t3)'}
            >Command</a>.
            {isLoggedIn && (
              <span style={{ color: 'var(--t4)' }}>
                {' '}Keywords sync with your{' '}
                <a href="/settings/alerts" style={{ color: 'var(--t4)', textDecoration: 'underline', textUnderlineOffset: 3 }}>Email Alerts</a>.
              </span>
            )}
          </p>
        </div>

        {/* ── Keyword input ── */}
        <div style={{ marginBottom: 16 }}>
          <div style={{
            display: 'flex',
            background: inputFocused ? 'rgba(18,18,26,0.95)' : 'var(--surface)',
            border: inputFocused ? '1px solid rgba(255,94,30,0.3)' : '0.5px solid var(--border)',
            borderRadius: 10,
            padding: '6px 6px 6px 16px',
            boxShadow: inputFocused
              ? '0 0 0 3px rgba(255,94,30,0.07), 0 4px 20px rgba(0,0,0,0.22)'
              : '0 2px 8px rgba(0,0,0,0.15)',
            transition: 'border-color 0.18s ease, box-shadow 0.18s ease',
          }}>
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addKeyword(); }}
              onFocus={() => setInputFocused(true)}
              onBlur={() => setInputFocused(false)}
              placeholder="e.g. pre-seed, investor list, pitch deck…"
              style={{
                flex: 1, background: 'transparent', border: 'none', outline: 'none',
                color: 'var(--t1)', fontSize: 14, padding: '10px 8px',
                fontFamily: 'var(--font-ui)', letterSpacing: '0.01em',
              }}
            />
            <button
              onClick={addKeyword}
              disabled={!input.trim()}
              style={{
                padding: '9px 20px', fontSize: 13, fontWeight: 500, letterSpacing: '0.025em',
                borderRadius: 7, border: 'none',
                background: input.trim()
                  ? 'linear-gradient(160deg, #ff6820 0%, #e84e08 100%)'
                  : 'var(--overlay)',
                color: input.trim() ? 'rgba(255,255,255,0.95)' : 'var(--t4)',
                cursor: input.trim() ? 'pointer' : 'not-allowed',
                fontFamily: 'var(--font-ui)', whiteSpace: 'nowrap', flexShrink: 0,
                transition: 'all 0.16s ease',
                boxShadow: input.trim() ? '0 1px 8px rgba(232,78,8,0.35)' : 'none',
              }}
            >
              Track →
            </button>
          </div>
        </div>

        {/* ── Keyword chips ── */}
        {keywords.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 28, alignItems: 'center' }}>
            {keywords.map(kw => (
              <button
                key={kw}
                onClick={() => search(kw)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  fontSize: 12, padding: '4px 10px', borderRadius: 6,
                  border: activeKeyword === kw
                    ? '0.5px solid rgba(255,94,30,0.35)'
                    : '0.5px solid rgba(255,255,255,0.07)',
                  background: activeKeyword === kw
                    ? 'rgba(255,94,30,0.09)'
                    : 'rgba(255,255,255,0.03)',
                  color: activeKeyword === kw ? 'var(--hot)' : 'var(--t3)',
                  cursor: 'pointer', fontFamily: 'var(--font-ui)',
                  transition: 'all 0.14s ease',
                  fontWeight: activeKeyword === kw ? 500 : 400,
                }}
                onMouseEnter={e => {
                  if (activeKeyword !== kw) {
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.14)';
                    e.currentTarget.style.color = 'var(--t1)';
                  }
                }}
                onMouseLeave={e => {
                  if (activeKeyword !== kw) {
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)';
                    e.currentTarget.style.color = 'var(--t3)';
                  }
                }}
              >
                {activeKeyword === kw && (
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--hot)', flexShrink: 0, boxShadow: '0 0 5px rgba(255,94,30,0.6)' }} />
                )}
                {kw}
                <span
                  onClick={e => { e.stopPropagation(); removeKeyword(kw); }}
                  style={{ color: 'var(--t4)', fontSize: 10, lineHeight: 1, cursor: 'pointer', marginLeft: 2, transition: 'color 0.12s' }}
                  onMouseEnter={e => e.currentTarget.style.color = '#f87171'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--t4)'}
                >✕</span>
              </button>
            ))}
          </div>
        )}

        {/* ── Loading ── */}
        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '48px 0', justifyContent: 'center' }}>
            <div style={{
              width: 18, height: 18,
              border: '1.5px solid var(--hot-border)',
              borderTopColor: 'transparent',
              borderRadius: '50%',
              animation: 'spin 0.7s linear infinite',
            }} />
            <span style={{ color: 'var(--t3)', fontSize: 13 }}>
              Scanning all of Reddit for &ldquo;{activeKeyword}&rdquo;…
            </span>
          </div>
        )}

        {/* ── Error ── */}
        {result && !loading && result.error && (
          <div style={{
            color: '#f87171', fontSize: 13,
            background: 'rgba(239,68,68,0.08)', border: '0.5px solid rgba(239,68,68,0.2)',
            borderRadius: 8, padding: '12px 16px',
          }}>
            Could not fetch results: {result.error}
          </div>
        )}

        {/* ── Results ── */}
        {result && !loading && !result.error && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Stats row */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--t1)', letterSpacing: '-0.01em' }}>
                  &ldquo;{result.keyword}&rdquo;
                </span>
                <span style={{ fontSize: 12, color: 'var(--t3)' }}>
                  {result.totalThreads} relevant threads across all subreddits
                </span>
                {result.aiFiltered && result.removedByAI > 0 && (
                  <span style={{
                    fontSize: 11, background: 'rgba(74,222,128,0.08)',
                    border: '0.5px solid rgba(74,222,128,0.2)', color: 'var(--green)',
                    padding: '2px 8px', borderRadius: 4, letterSpacing: '0.01em',
                  }}>
                    ✓ {result.removedByAI} removed by AI
                  </span>
                )}
              </div>

              {/* Period pills */}
              <div style={{ display: 'flex', gap: 4 }}>
                {(Object.entries(PERIOD_LABELS) as [Period, string][]).map(([p, label]) => (
                  <button
                    key={p}
                    onClick={() => { setPeriod(p); search(activeKeyword, p); }}
                    style={{
                      padding: '5px 12px', fontSize: 12,
                      fontWeight: period === p ? 500 : 400, borderRadius: 6,
                      border: period === p ? '0.5px solid rgba(255,94,30,0.28)' : '0.5px solid rgba(255,255,255,0.05)',
                      background: period === p ? 'rgba(255,94,30,0.08)' : 'transparent',
                      color: period === p ? 'var(--hot)' : 'var(--t3)',
                      cursor: 'pointer', fontFamily: 'var(--font-ui)', transition: 'all 0.15s ease',
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Top subreddits */}
            {result.subredditActivity.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 10, color: 'var(--t4)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', flexShrink: 0 }}>
                  Top sources:
                </span>
                {result.subredditActivity.slice(0, 6).map(s => (
                  <span
                    key={s.subreddit}
                    style={{
                      fontSize: 11, padding: '2px 8px', borderRadius: 5,
                      background: 'rgba(255,255,255,0.04)',
                      border: '0.5px solid rgba(255,255,255,0.07)',
                      color: 'var(--t4)',
                    }}
                  >
                    r/{s.subreddit} <span style={{ opacity: 0.55 }}>·</span> {s.count}
                  </span>
                ))}
              </div>
            )}

            {/* Thread feed */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {threads.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--t4)', fontSize: 13 }}>
                  No relevant threads found
                </div>
              ) : (
                grouped.map(group => (
                  <div key={group.label} style={{ marginBottom: 24 }}>
                    {/* Timeline label */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                      <span style={{
                        fontSize: 10, fontWeight: 600, color: 'var(--t4)',
                        textTransform: 'uppercase', letterSpacing: '0.08em',
                        whiteSpace: 'nowrap', flexShrink: 0,
                      }}>
                        {group.label}
                      </span>
                      <div style={{ flex: 1, height: '0.5px', background: 'rgba(255,255,255,0.06)' }} />
                    </div>

                    {/* Thread cards */}
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      {group.threads.map((t, i) => (
                        <div
                          key={t.id}
                          style={{
                            padding: '14px 16px', borderRadius: 8,
                            transition: 'background 0.14s ease', cursor: 'default',
                            background: selectedThread?.id === t.id
                              ? 'rgba(255,255,255,0.04)'
                              : 'transparent',
                            borderBottom: i < group.threads.length - 1
                              ? '0.5px solid rgba(255,255,255,0.04)'
                              : 'none',
                          }}
                          onMouseEnter={e => {
                            if (selectedThread?.id !== t.id)
                              e.currentTarget.style.background = 'rgba(255,255,255,0.025)';
                          }}
                          onMouseLeave={e => {
                            if (selectedThread?.id !== t.id)
                              e.currentTarget.style.background = 'transparent';
                          }}
                        >
                          {/* Clickable title → opens drawer */}
                          <button
                            onClick={() => setSelectedThread(t)}
                            style={{
                              display: 'block', width: '100%', textAlign: 'left',
                              background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                              color: 'var(--t1)', fontSize: 13.5,
                              fontWeight: 500, lineHeight: 1.45, textDecoration: 'none',
                              marginBottom: 6, letterSpacing: '-0.01em', transition: 'color 0.14s ease',
                              fontFamily: 'var(--font-ui)',
                            }}
                            onMouseEnter={e => e.currentTarget.style.color = 'var(--hot)'}
                            onMouseLeave={e => e.currentTarget.style.color = 'var(--t1)'}
                          >
                            {highlightKeyword(t.title, result.keyword)}
                          </button>
                          <div style={{
                            display: 'flex', alignItems: 'center', gap: 6,
                            fontSize: 11, color: 'var(--t4)',
                            marginBottom: t.snippet ? 7 : 0, letterSpacing: '0.01em',
                          }}>
                            <span style={{ color: 'var(--t3)', fontWeight: 500 }}>r/{t.subreddit}</span>
                            <span style={{ opacity: 0.4 }}>·</span>
                            <span>{timeAgo(t.createdUtc)}</span>
                            <span style={{ opacity: 0.4 }}>·</span>
                            <span>↑{t.score}</span>
                            <span style={{ opacity: 0.4 }}>·</span>
                            <span>{t.numComments} comments</span>
                            {/* Open in Reddit link */}
                            <span style={{ opacity: 0.4 }}>·</span>
                            <a
                              href={t.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={e => e.stopPropagation()}
                              style={{ color: 'var(--t4)', textDecoration: 'none', transition: 'color 0.12s' }}
                              onMouseEnter={e => e.currentTarget.style.color = 'var(--t2)'}
                              onMouseLeave={e => e.currentTarget.style.color = 'var(--t4)'}
                            >
                              reddit ↗
                            </a>
                          </div>
                          {t.snippet && (
                            <p style={{
                              color: 'var(--t4)', fontSize: 12, margin: 0, lineHeight: 1.6,
                              display: '-webkit-box', WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical', overflow: 'hidden',
                            }}>
                              {highlightKeyword(t.snippet, result.keyword)}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ── Empty state ── */}
        {!result && !loading && keywords.length === 0 && (
          <div style={{ textAlign: 'center', padding: '64px 0' }}>
            <div style={{ fontSize: 32, marginBottom: 16, opacity: 0.7 }}>📡</div>
            <p style={{ color: 'var(--t2)', fontSize: 14, margin: '0 0 6px' }}>
              Add a keyword to start tracking it across all of Reddit.
            </p>
            <p style={{ color: 'var(--t4)', fontSize: 12, margin: 0 }}>
              AI filters out off-topic matches using your product context.
            </p>
          </div>
        )}

        {!result && !loading && keywords.length > 0 && (
          <div style={{ textAlign: 'center', padding: '48px 0' }}>
            <p style={{ color: 'var(--t4)', fontSize: 13, margin: 0 }}>
              Click a keyword above to see recent mentions across Reddit.
            </p>
          </div>
        )}

        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
          @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
          @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
        `}</style>
      </div>

      {/* ── Thread drawer (rendered outside main container so it covers full viewport) ── */}
      {selectedThread && result && (
        <ThreadDrawer
          thread={selectedThread}
          keyword={result.keyword}
          onClose={closeDrawer}
        />
      )}
    </>
  );
}
