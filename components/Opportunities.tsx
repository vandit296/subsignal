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
    score >= 9 ? { label: 'Perfect match', cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' } :
    score >= 7 ? { label: 'Strong match',  cls: 'bg-blue-500/15 text-blue-400 border-blue-500/30' } :
                 { label: 'Good match',    cls: 'bg-amber-500/15 text-amber-400 border-amber-500/30' };
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-none border ${cfg.cls}`}>
      {score}/10 · {cfg.label}
    </span>
  );
}

function ThreadCard({ thread }: { thread: ScoredThread }) {
  const redditUrl = `https://reddit.com/r/${thread.subreddit}/comments/${thread.id}`;
  return (
    <div className="bg-panel border border-cyan-border hover:border-cyan-border rounded-none p-5 transition-colors space-y-3">
      {/* Title + badge */}
      <div className="flex items-start justify-between gap-3">
        <a
          href={redditUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-t1 font-medium text-sm leading-snug hover:text-hot transition-colors flex-1"
        >
          {thread.title}
        </a>
        <RelevanceBadge score={thread.relevanceScore} />
      </div>

      {/* Meta */}
      <div className="flex items-center gap-3 text-t3 text-xs">
        <span>↑ {thread.score}</span>
        <span>💬 {thread.numComments}</span>
        <span>{timeAgo(thread.createdUtc)}</span>
      </div>

      {/* Why it's relevant */}
      <div className="flex items-start gap-2">
        <span className="text-hot text-xs mt-0.5 flex-shrink-0">→</span>
        <p className="text-t1 text-xs leading-relaxed">{thread.relevanceReason}</p>
      </div>

      {/* How to engage */}
      <div className="bg-overlay rounded-none px-3 py-2.5">
        <span className="text-t2 text-xs font-medium">How to engage: </span>
        <span className="text-t2 text-xs leading-relaxed">{thread.engagementAngle}</span>
      </div>

      {/* CTA */}
      <a
        href={redditUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-xs text-hot hover:text-hot transition-colors"
      >
        View thread on Reddit ↗
      </a>
    </div>
  );
}

export default function Opportunities({ subreddit }: Props) {
  const router = useRouter();
  const [threads, setThreads] = useState<ScoredThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fresh, setFresh] = useState(false);

  useEffect(() => {
    fetch(`/api/threads/relevant?subreddit=${encodeURIComponent(subreddit)}`)
      .then(r => r.json())
      .then(data => {
        if (data.needsSetup) { setNeedsSetup(true); return; }
        if (data.error) throw new Error(data.error);
        setThreads(data.threads ?? []);
        setFresh(data.fresh);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [subreddit]);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 flex flex-col items-center gap-4">
        <div className="w-5 h-5 border-2 border-hot-border border-t-transparent rounded-none animate-spin" />
        <p className="text-t2 text-sm">Scanning r/{subreddit} for opportunities...</p>
        <p className="text-t3 text-xs">Scoring threads for relevance to your product — this takes ~15 seconds</p>
      </div>
    );
  }

  if (needsSetup) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 flex flex-col items-center gap-4 text-center">
        <div className="text-4xl">🔔</div>
        <h3 className="text-t1 font-semibold text-lg">Set up Thread Alerts first</h3>
        <p className="text-t2 text-sm max-w-sm">
          Treddit needs to know about your product to score threads for relevance. Takes 30 seconds.
        </p>
        <button
          onClick={() => router.push('/alerts')}
          className="bg-hot hover:bg-hot text-t1 font-semibold text-sm px-6 py-3 rounded-none transition-colors"
        >
          Set up alerts →
        </button>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <div className="bg-red-500/10 border border-red-500/30 rounded-none p-4 text-red-400 text-sm">{error}</div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-5">
      {/* Header */}
      <div className="bg-[#0d0d1f] border border-indigo-950 rounded-none p-5">
        <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold mb-2">
          <span>✦</span>
          <span>THREAD OPPORTUNITIES — r/{subreddit.toUpperCase()}</span>
          {fresh && <span className="ml-auto text-emerald-400 text-xs font-normal">● Just scored</span>}
        </div>
        <p className="text-t2 text-sm leading-relaxed">
          Threads from the last 48 hours where your product would genuinely help — scored by relevance, not popularity. Low-upvote threads included.
        </p>
      </div>

      {threads.length === 0 ? (
        <div className="text-center py-12 space-y-2">
          <div className="text-2xl">🔍</div>
          <p className="text-t2 text-sm">No strong matches found in the last 48 hours</p>
          <p className="text-t3 text-xs">Treddit will keep checking daily. Check back tomorrow.</p>
          <button
            onClick={() => router.push('/alerts')}
            className="mt-4 text-xs text-hot hover:text-hot transition-colors underline underline-offset-4"
          >
            Manage your alert settings →
          </button>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <span className="text-t2 text-sm">
              {threads.length} {threads.length === 1 ? 'opportunity' : 'opportunities'} found
            </span>
            <button
              onClick={() => router.push('/alerts')}
              className="text-xs text-t2 hover:text-t1 transition-colors"
            >
              Manage alerts →
            </button>
          </div>
          <div className="space-y-3">
            {threads.map(thread => (
              <ThreadCard key={thread.id} thread={thread} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
