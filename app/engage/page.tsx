'use client';

import { useEffect, useState } from 'react';
import { ScoredThread } from '@/types';
import Link from 'next/link';

interface EngageResult {
  threads: ScoredThread[];
  subreddits: string[];
  productDescription: string;
  goal: string;
  generatedAt: string;
  error?: string;
}

function timeAgo(utc: number): string {
  const diff = Math.floor(Date.now() / 1000 - utc);
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 8 ? 'bg-green-500/20 text-green-400 border-green-500/30'
    : score >= 6 ? 'bg-hot text-hot border-hot-border'
    : 'bg-overlay text-t2 border-cyan-border';
  return (
    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${color}`}>
      {score}/10
    </span>
  );
}

export default function EngagePage() {
  const [data, setData] = useState<EngageResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [drafting, setDrafting] = useState<string | null>(null); // thread id being drafted
  const [draftText, setDraftText] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch('/api/engage')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <div className="w-6 h-6 border-2 border-hot-border border-t-transparent rounded-none animate-spin" />
        <p className="text-t2 text-sm">Scanning threads across your subreddits…</p>
      </div>
    );
  }

  if (!data || data.error === 'no_config') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 px-8 text-center">
        <div className="text-4xl">🔥</div>
        <h2 className="text-t1 text-xl font-bold">Set up your product first</h2>
        <p className="text-t2 text-sm max-w-xs">
          Engage needs to know what you're building and which subreddits to monitor.
        </p>
        <Link href="/alerts" className="bg-hot hover:bg-hot text-t1 text-sm font-semibold px-5 py-2.5 rounded-none transition-colors">
          Set up in Settings →
        </Link>
      </div>
    );
  }

  if (data.error === 'no_subreddits') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 px-8 text-center">
        <div className="text-4xl">📭</div>
        <h2 className="text-t1 text-xl font-bold">No subreddits monitored yet</h2>
        <p className="text-t2 text-sm max-w-xs">Add subreddits to monitor in Settings.</p>
        <Link href="/alerts" className="bg-hot hover:bg-hot text-t1 text-sm font-semibold px-5 py-2.5 rounded-none transition-colors">
          Add subreddits →
        </Link>
      </div>
    );
  }

  const threads = data.threads ?? [];

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-t1 text-2xl font-bold">Engage</h1>
            <p className="text-t2 text-sm mt-1">
              Threads where your comment would genuinely help · across {data.subreddits.length} subreddits
            </p>
          </div>
          <button
            onClick={() => { setLoading(true); fetch('/api/engage').then(r => r.json()).then(d => { setData(d); setLoading(false); }); }}
            className="text-t3 hover:text-hot text-xs transition-colors"
          >
            ↺ Refresh
          </button>
        </div>
        {/* Monitored subreddits pills */}
        <div className="flex gap-1.5 flex-wrap mt-3">
          {data.subreddits.map(s => (
            <span key={s} className="text-[10px] bg-overlay border border-cyan-border text-t2 px-2 py-0.5 rounded-none">
              r/{s}
            </span>
          ))}
        </div>
      </div>

      {threads.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-3xl mb-3">😴</div>
          <p className="text-t2 text-sm">No high-relevance threads in the last 48 hours.</p>
          <p className="text-t3 text-xs mt-1">Check back later or add more subreddits.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {threads.map(t => (
            <div key={t.id} className="bg-surface border border-cyan-border rounded-none p-4 hover:border-cyan-border transition-colors">
              {/* Thread header */}
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-t3 text-[10px]">r/{t.subreddit}</span>
                    <span className="text-t3 text-[10px]">·</span>
                    <span className="text-t3 text-[10px]">{timeAgo(t.createdUtc)}</span>
                    <span className="text-t3 text-[10px]">·</span>
                    <span className="text-t3 text-[10px]">↑ {t.score} · {t.numComments} comments</span>
                  </div>
                  <a
                    href={t.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-t1 text-sm font-medium leading-snug hover:text-hot transition-colors"
                  >
                    {t.title}
                  </a>
                </div>
                <ScoreBadge score={t.relevanceScore} />
              </div>

              {/* AI signals */}
              <div className="mt-3 space-y-2">
                <div className="flex items-start gap-2">
                  <span className="text-[10px] text-t3 uppercase tracking-widest mt-0.5 flex-shrink-0 w-16">Why</span>
                  <p className="text-t2 text-xs leading-relaxed">{t.relevanceReason}</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-[10px] text-t3 uppercase tracking-widest mt-0.5 flex-shrink-0 w-16">Angle</span>
                  <p className="text-hot text-xs leading-relaxed">{t.engagementAngle}</p>
                </div>
              </div>

              {/* Draft comment toggle */}
              <div className="mt-3 pt-3 border-t border-cyan-border/60">
                {drafting === t.id ? (
                  <div className="space-y-2">
                    <textarea
                      value={draftText[t.id] ?? ''}
                      onChange={e => setDraftText(prev => ({ ...prev, [t.id]: e.target.value }))}
                      placeholder="Write your comment draft here…"
                      rows={4}
                      className="w-full bg-panel border border-cyan-border rounded-none px-3 py-2 text-t1 text-xs resize-none outline-none focus:border-hot-border transition-colors placeholder-t3"
                    />
                    <div className="flex gap-2">
                      <a
                        href={t.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 text-center text-xs bg-hot hover:bg-hot text-t1 font-semibold py-2 rounded-none transition-colors"
                      >
                        Open thread to post →
                      </a>
                      <button
                        onClick={() => setDrafting(null)}
                        className="text-t3 hover:text-t2 text-xs px-3 py-2 transition-colors"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setDrafting(t.id)}
                    className="text-xs text-t2 hover:text-hot transition-colors"
                  >
                    ✍️ Draft a comment
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
