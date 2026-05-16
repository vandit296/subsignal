'use client';

import { useState, useEffect } from 'react';

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

interface SubredditActivity {
  subreddit: string;
  count: number;
  topScore: number;
}

interface TrackResult {
  keyword: string;
  period: string;
  totalThreads: number;
  removedByAI: number;
  aiFiltered: boolean;
  threads: Thread[];
  subredditActivity: SubredditActivity[];
  fetchedAt: string;
  error?: string;
}

type Period = '1day' | '1week' | '1month';

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

const PERIOD_LABELS: Record<Period, string> = {
  '1day': 'Today',
  '1week': 'This week',
  '1month': 'This month',
};

const SAVED_KEY = 'subsignal_watch_keywords';

function getSaved(): string[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(SAVED_KEY) ?? '[]'); } catch { return []; }
}
function saveToDisk(kws: string[]) {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(SAVED_KEY, JSON.stringify(kws)); } catch {}
}

function highlightKeyword(text: string, keyword: string): React.ReactNode {
  if (!keyword || !text) return text;
  const parts = text.split(new RegExp(`(${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
  return parts.map((p, i) =>
    p.toLowerCase() === keyword.toLowerCase()
      ? <strong key={i} className="text-white font-semibold">{p}</strong>
      : p
  );
}

export default function WatchPage() {
  const [input, setInput] = useState('');
  const [activeKeyword, setActiveKeyword] = useState('');
  const [period, setPeriod] = useState<Period>('1week');
  const [savedKeywords, setSavedKeywords] = useState<string[]>([]);
  const [result, setResult] = useState<TrackResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  // Load saved keywords from localStorage only after mount (avoids SSR hydration mismatch)
  useEffect(() => {
    setSavedKeywords(getSaved());
  }, []);

  async function search(kw: string, p = period) {
    if (!kw.trim()) return;
    setLoading(true);
    setResult(null);
    setActiveFilter(null);
    setActiveKeyword(kw);
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
    if (!kw || savedKeywords.includes(kw)) return;
    const updated = [kw, ...savedKeywords];
    setSavedKeywords(updated);
    saveToDisk(updated);
    setInput('');
    search(kw);
  }

  function removeKeyword(kw: string) {
    const updated = savedKeywords.filter(k => k !== kw);
    setSavedKeywords(updated);
    saveToDisk(updated);
    if (activeKeyword === kw) { setResult(null); setActiveKeyword(''); }
  }

  const visibleThreads = activeFilter
    ? (result?.threads ?? []).filter(t => t.subreddit === activeFilter)
    : (result?.threads ?? []);

  // Group threads by timeline label
  const grouped: { label: string; threads: Thread[] }[] = [];
  const seenLabels = new Map<string, Thread[]>();
  for (const t of visibleThreads) {
    const label = timeLabel(t.createdUtc);
    if (!seenLabels.has(label)) {
      const arr: Thread[] = [];
      seenLabels.set(label, arr);
      grouped.push({ label, threads: arr });
    }
    seenLabels.get(label)!.push(t);
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="mb-6">
        <h1 className="text-white text-2xl font-bold">Watch</h1>
        <p className="text-zinc-500 text-sm mt-1">
          Track any keyword across Reddit. AI removes irrelevant matches using your product context from{' '}
          <a href="/command" className="text-zinc-400 hover:text-orange-400 underline underline-offset-2 transition-colors">Command</a>.
        </p>
      </div>

      {/* Keyword input */}
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') addKeyword(); }}
          placeholder="e.g. pre-seed, investor list, pitch deck…"
          className="flex-1 bg-[#18181b] border border-zinc-700 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-orange-500 transition-colors placeholder-zinc-600"
        />
        <button
          onClick={addKeyword}
          disabled={!input.trim()}
          className="bg-orange-500 hover:bg-orange-400 disabled:opacity-40 text-white text-sm font-semibold px-5 py-3 rounded-xl transition-colors"
        >
          Track →
        </button>
      </div>

      {/* Saved keywords */}
      {savedKeywords.length > 0 && (
        <div className="flex gap-2 flex-wrap mb-6">
          {savedKeywords.map(kw => (
            <button
              key={kw}
              onClick={() => search(kw)}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-colors ${
                activeKeyword === kw
                  ? 'bg-orange-500/20 border-orange-500/40 text-orange-400'
                  : 'bg-[#18181b] border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500'
              }`}
            >
              {kw}
              <span
                onClick={e => { e.stopPropagation(); removeKeyword(kw); }}
                className="text-zinc-600 hover:text-red-400 transition-colors text-[10px] ml-0.5"
              >✕</span>
            </button>
          ))}
        </div>
      )}

      {loading && (
        <div className="flex items-center gap-3 py-12 justify-center">
          <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-zinc-500 text-sm">Scanning &ldquo;{activeKeyword}&rdquo; · filtering irrelevant matches…</span>
        </div>
      )}

      {result && !loading && (
        <div className="space-y-5">
          {/* Stats bar */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-white font-semibold text-sm">&ldquo;{result.keyword}&rdquo;</span>
              <span className="text-zinc-500 text-xs">{result.totalThreads} relevant threads</span>
              {result.aiFiltered && result.removedByAI > 0 && (
                <span className="text-xs bg-green-500/10 border border-green-500/20 text-green-400 px-2 py-0.5 rounded-full">
                  ✓ {result.removedByAI} irrelevant removed by AI
                </span>
              )}
              {result.aiFiltered && result.removedByAI === 0 && (
                <span className="text-xs text-zinc-600">✓ AI filtered</span>
              )}
            </div>
            <div className="flex items-center gap-1 bg-[#18181b] border border-zinc-800 rounded-lg p-1">
              {(Object.entries(PERIOD_LABELS) as [Period, string][]).map(([p, label]) => (
                <button
                  key={p}
                  onClick={() => { setPeriod(p); search(activeKeyword, p); }}
                  className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${
                    period === p ? 'bg-orange-500 text-white' : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Activity by subreddit */}
            <div className="bg-[#18181b] border border-zinc-800 rounded-xl p-4">
              <h3 className="text-zinc-400 text-xs font-semibold uppercase tracking-widest mb-3">
                Top subreddits
              </h3>
              <div className="space-y-2">
                {result.subredditActivity.slice(0, 10).map(s => {
                  const isActive = activeFilter === s.subreddit;
                  const maxCount = result.subredditActivity[0]?.count ?? 1;
                  return (
                    <button
                      key={s.subreddit}
                      onClick={() => setActiveFilter(isActive ? null : s.subreddit)}
                      className={`w-full text-left rounded-lg px-2.5 py-2 transition-colors ${
                        isActive ? 'bg-orange-500/10 border border-orange-500/20' : 'hover:bg-zinc-800/60'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-xs font-medium ${isActive ? 'text-orange-400' : 'text-zinc-300'}`}>
                          r/{s.subreddit}
                        </span>
                        <span className="text-zinc-600 text-[10px]">{s.count} posts</span>
                      </div>
                      <div className="h-0.5 bg-zinc-800 rounded">
                        <div className="h-full rounded bg-orange-500/50" style={{ width: `${(s.count / maxCount) * 100}%` }} />
                      </div>
                    </button>
                  );
                })}
              </div>
              {activeFilter && (
                <button onClick={() => setActiveFilter(null)} className="mt-3 text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors">
                  ✕ Clear filter
                </button>
              )}
            </div>

            {/* Thread list with timeline grouping */}
            <div className="lg:col-span-2 space-y-4">
              {visibleThreads.length === 0 ? (
                <div className="text-center py-12 text-zinc-600 text-sm">No relevant threads found</div>
              ) : (
                grouped.map(group => (
                  <div key={group.label}>
                    {/* Timeline label */}
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[10px] text-zinc-600 font-semibold uppercase tracking-widest">{group.label}</span>
                      <div className="flex-1 h-px bg-zinc-800" />
                    </div>
                    <div className="space-y-2">
                      {group.threads.map(t => (
                        <div key={t.id} className="bg-[#18181b] border border-zinc-800 rounded-xl p-4 hover:border-zinc-700 transition-colors">
                          <div className="flex items-center gap-2 mb-1.5 text-[10px] text-zinc-600">
                            <span>r/{t.subreddit}</span>
                            <span>·</span>
                            <span>{timeAgo(t.createdUtc)}</span>
                            <span>·</span>
                            <span>↑{t.score}</span>
                            <span>·</span>
                            <span>{t.numComments}c</span>
                          </div>
                          <a
                            href={t.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-zinc-200 text-sm font-medium leading-snug hover:text-orange-400 transition-colors"
                          >
                            {t.title}
                          </a>
                          {t.snippet && (
                            <p className="text-zinc-600 text-xs mt-1.5 leading-relaxed line-clamp-2">
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
        </div>
      )}

      {!result && !loading && savedKeywords.length === 0 && (
        <div className="text-center py-16">
          <div className="text-4xl mb-3">📡</div>
          <p className="text-zinc-500 text-sm">Add a keyword to start tracking it across Reddit.</p>
          <p className="text-zinc-600 text-xs mt-1">AI will filter out off-topic matches using your product context.</p>
        </div>
      )}
    </div>
  );
}
