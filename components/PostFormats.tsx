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

export default function PostFormats({ formats }: { formats: PostFormat[] }) {
  const [expanded, setExpanded] = useState<number | null>(null);
  const max = formats[0]?.avgScore ?? 1;

  return (
    <div className="bg-surface border border-cyan-border rounded-none p-5">
      <div className="flex items-center justify-between mb-4">
        <span className="text-t2 text-xs font-semibold uppercase tracking-widest">Top Post Formats</span>
        <span className="text-t3 text-xs">by avg score</span>
      </div>
      <div className="space-y-2">
        {formats.map(f => (
          <div key={f.rank} className="bg-[#1c1c20] rounded-none overflow-hidden">
            {/* Header row */}
            <button
              onClick={() => setExpanded(expanded === f.rank ? null : f.rank)}
              className="w-full px-3 py-2.5 text-left"
            >
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-t3 text-xs font-bold w-4">#{f.rank}</span>
                <span className="text-t1 text-xs font-medium flex-1">{f.name}</span>
                <span className="text-hot text-xs font-semibold">{fmtScore(f.avgScore)}</span>
                <span className="text-t3 text-xs ml-1">
                  {expanded === f.rank ? '▲' : '▼'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1 bg-overlay rounded overflow-hidden">
                  <div
                    className="h-full rounded bg-hot opacity-60"
                    style={{ width: `${(f.avgScore / max) * 100}%` }}
                  />
                </div>
              </div>
            </button>

            {/* Expanded detail */}
            {expanded === f.rank && (
              <div className="px-3 pb-3 border-t border-cyan-border/60 pt-2.5 space-y-2.5">
                <p className="text-t2 text-xs leading-relaxed">{f.description}</p>

                {/* 3 example posts */}
                {(f.examples && f.examples.length > 0) ? (
                  <div className="space-y-1.5">
                    <span className="text-t3 text-[10px] uppercase tracking-widest">Example posts</span>
                    {f.examples.map((ex, i) => (
                      <div key={i} className="bg-panel rounded-none px-3 py-2 flex items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-t1 text-xs leading-snug line-clamp-2">{ex.title}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-hot text-[10px] font-semibold">↑ {fmtScore(ex.score)}</span>
                            {ex.createdUtc > 0 && (
                              <span className="text-t3 text-[10px]">{timeAgo(ex.createdUtc)}</span>
                            )}
                          </div>
                        </div>
                        {ex.url && (
                          <a
                            href={ex.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-shrink-0 text-hot hover:text-hot text-[10px] font-medium transition-colors mt-0.5"
                          >
                            View →
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                ) : f.exampleUrl ? (
                  /* Fallback for old data without examples[] */
                  <div className="flex items-start gap-1.5">
                    <span className="text-t3 text-xs mt-0.5 flex-shrink-0">e.g.</span>
                    <div className="flex-1">
                      <span className="text-t2 text-xs italic">&ldquo;{f.example}&rdquo;</span>
                      <a
                        href={f.exampleUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-hot hover:text-hot text-xs mt-1 transition-colors"
                      >
                        View on Reddit →
                      </a>
                    </div>
                  </div>
                ) : (
                  <p className="text-t2 text-xs italic">&ldquo;{f.example}&rdquo;</p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
