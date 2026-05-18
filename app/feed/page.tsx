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

const CATEGORIES: { key: ThreadCategory | 'all'; label: string; emoji: string; description: string }[] = [
  { key: 'all',        label: 'All',         emoji: '📋', description: 'Every relevant thread' },
  { key: 'ideal_user', label: 'Ideal User',  emoji: '🎯', description: 'Your ICP is in this thread — best to engage' },
  { key: 'competition',label: 'Competition', emoji: '⚔️', description: 'Competitor mentions & comparisons' },
  { key: 'industry',   label: 'Industry',    emoji: '🏭', description: 'Trends & topics in your space' },
  { key: 'interesting',label: 'Interesting', emoji: '💡', description: 'Loosely related, worth reading' },
];

function timeAgo(utc: number): string {
  const diff = Math.floor(Date.now() / 1000 - utc);
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function ScoreBadge({ score }: { score: number }) {
  const cls = score >= 9
    ? 'bg-green-500/20 text-green-400 border-green-500/30'
    : score >= 7
    ? 'bg-hot text-hot border-hot-border'
    : 'bg-overlay text-t2 border-cyan-border';
  return (
    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${cls} flex-shrink-0`}>
      {score}/10
    </span>
  );
}

function CategoryPill({ category }: { category: ThreadCategory }) {
  const map: Record<ThreadCategory, { label: string; cls: string }> = {
    ideal_user:  { label: '🎯 Ideal User',  cls: 'bg-green-500/10 text-green-400 border-green-500/20' },
    competition: { label: '⚔️ Competition', cls: 'bg-red-500/10 text-red-400 border-red-500/20' },
    industry:    { label: '🏭 Industry',    cls: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
    interesting: { label: '💡 Interesting', cls: 'bg-overlay text-t2 border-cyan-border' },
  };
  const { label, cls } = map[category] ?? map.interesting;
  return (
    <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded border ${cls}`}>{label}</span>
  );
}

function ThreadCard({ t, expanded, onToggle }: {
  t: ScoredThread; expanded: boolean; onToggle: () => void;
}) {
  const [draftOpen, setDraftOpen] = useState(false);
  const [draftText, setDraftText] = useState('');

  const isTopPick = t.relevanceScore >= 9 && t.category === 'ideal_user';

  return (
    <div className={`bg-surface border rounded-none transition-all ${
      isTopPick ? 'border-green-500/25' : 'border-cyan-border'
    } hover:border-cyan-border`}>
      <button onClick={onToggle} className="w-full text-left px-4 py-3">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="text-t3 text-[10px]">r/{t.subreddit}</span>
              <span className="text-t3 text-[10px]">·</span>
              <span className="text-t3 text-[10px]">{timeAgo(t.createdUtc)}</span>
              <span className="text-t3 text-[10px]">·</span>
              <span className="text-t3 text-[10px]">↑{t.score} · {t.numComments}c</span>
              <CategoryPill category={t.category} />
            </div>
            <p className="text-t1 text-sm font-medium leading-snug line-clamp-2">{t.title}</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 mt-0.5">
            <ScoreBadge score={t.relevanceScore} />
            <span className="text-t3 text-[10px]">{expanded ? '▲' : '▼'}</span>
          </div>
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-cyan-border/60 pt-3">
          <div className="space-y-2 mb-3">
            <div className="flex items-start gap-3">
              <span className="text-[9px] text-t3 uppercase tracking-widest mt-0.5 w-12 flex-shrink-0">Why</span>
              <p className="text-t2 text-xs leading-relaxed">{t.relevanceReason}</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-[9px] text-t3 uppercase tracking-widest mt-0.5 w-12 flex-shrink-0">Angle</span>
              <p className="text-hot text-xs leading-relaxed">{t.engagementAngle}</p>
            </div>
          </div>

          {draftOpen ? (
            <div className="space-y-2">
              <textarea
                value={draftText}
                onChange={e => setDraftText(e.target.value)}
                placeholder="Draft your comment here…"
                rows={3}
                className="w-full bg-panel border border-cyan-border rounded-none px-3 py-2 text-t1 text-xs resize-none outline-none focus:border-hot-border transition-colors placeholder-t3"
              />
              <div className="flex gap-2">
                <a href={t.url} target="_blank" rel="noopener noreferrer"
                  className="flex-1 text-center text-xs bg-hot hover:bg-hot text-t1 font-semibold py-2 rounded-none transition-colors">
                  Open thread →
                </a>
                <button onClick={() => setDraftOpen(false)}
                  className="text-t3 hover:text-t2 text-xs px-3 transition-colors">
                  Close
                </button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <button onClick={() => setDraftOpen(true)}
                className="text-xs bg-overlay hover:bg-overlay text-t1 px-3 py-1.5 rounded-none transition-colors">
                ✍️ Draft comment
              </button>
              <a href={t.url} target="_blank" rel="noopener noreferrer"
                className="text-xs text-t2 hover:text-hot px-3 py-1.5 transition-colors">
                Open thread ↗
              </a>
            </div>
          )}
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
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <div className="w-6 h-6 border-2 border-hot-border border-t-transparent rounded-none animate-spin" />
        <p className="text-t2 text-sm">Categorizing threads across your subreddits…</p>
      </div>
    );
  }

  if (!data || data.error || !data.subreddits) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 px-8 text-center">
        <div className="text-4xl">📡</div>
        <h2 className="text-t1 text-xl font-bold">Set up Command first</h2>
        <p className="text-t2 text-sm max-w-sm leading-relaxed">
          Add your product description, ideal user, and subreddits to monitor.<br />
          <span className="text-t3">Feed will then categorize threads for you automatically.</span>
        </p>
        <Link href="/command" className="bg-hot hover:bg-hot text-t1 text-sm font-semibold px-5 py-2.5 rounded-none transition-colors">
          Go to Command →
        </Link>
      </div>
    );
  }

  const threads = data.threads ?? [];

  const countFor = (key: ThreadCategory | 'all') =>
    key === 'all' ? threads.length : threads.filter(t => t.category === key).length;

  const filtered = activeTab === 'all'
    ? threads
    : threads.filter(t => t.category === activeTab);

  const activeCat = CATEGORIES.find(c => c.key === activeTab)!;

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-t1 text-2xl font-bold">Feed</h1>
          <p className="text-t2 text-sm mt-0.5">
            Threads from {data.subreddits.length} subreddits · categorized for your goal in{' '}
            <Link href="/command" className="text-t2 hover:text-hot transition-colors underline underline-offset-2">Command</Link>
          </p>
        </div>
        <button onClick={() => load(true)} className="text-t3 hover:text-hot text-xs transition-colors mt-1">
          ↺ Refresh
        </button>
      </div>

      {/* Category tabs */}
      <div className="flex gap-2 mb-2 overflow-x-auto pb-1">
        {CATEGORIES.map(cat => {
          const count = countFor(cat.key);
          const isActive = activeTab === cat.key;
          return (
            <button
              key={cat.key}
              onClick={() => { setActiveTab(cat.key); setExpandedId(null); }}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-none border transition-colors whitespace-nowrap text-xs ${
                isActive
                  ? 'bg-hot border-hot-border text-hot'
                  : 'bg-surface border-cyan-border text-t2 hover:text-t1 hover:border-cyan-border'
              }`}
            >
              <span>{cat.emoji}</span>
              <span className="font-medium">{cat.label}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-none ${isActive ? 'bg-hot text-hot' : 'bg-overlay text-t3'}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Category description */}
      <p className="text-t3 text-xs mb-5">{activeCat.description}</p>

      {/* Thread list */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-3xl mb-3">
            {activeTab === 'ideal_user' ? '🎯' : activeTab === 'competition' ? '⚔️' : '😴'}
          </div>
          <p className="text-t2 text-sm">
            {activeTab === 'ideal_user'
              ? 'No ideal user threads in the last 48h. Try refreshing or adding more subreddits.'
              : activeTab === 'competition'
              ? 'No competitor mentions found in the last 48h.'
              : 'Nothing in this category right now.'}
          </p>
          {activeTab === 'ideal_user' && (
            <p className="text-t3 text-xs mt-2">
              Make sure your ideal user description in{' '}
              <Link href="/command" className="text-hot hover:underline">Command</Link> is specific.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(t => (
            <ThreadCard
              key={t.id}
              t={t}
              expanded={expandedId === t.id}
              onToggle={() => setExpandedId(expandedId === t.id ? null : t.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
