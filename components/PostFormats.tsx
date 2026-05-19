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
    <div className="bg-surface rounded-xl p-5" style={{ border:'0.5px solid var(--border)' }}>
      <div className="flex items-center justify-between mb-4">
        <span style={{ color:'var(--t2)', fontSize:12, fontWeight:600 }}>Top post formats</span>
        <span style={{ color:'var(--t4)', fontSize:12 }}>by avg score</span>
      </div>
      <div className="space-y-2">
        {formats.map(f => (
          <div key={f.rank} className="rounded-lg overflow-hidden" style={{ background:'var(--panel)' }}>
            <button
              onClick={() => setExpanded(expanded === f.rank ? null : f.rank)}
              className="w-full px-3 py-2.5 text-left"
            >
              <div className="flex items-center gap-2 mb-1.5">
                <span style={{ color:'var(--t4)', fontSize:11, fontWeight:600, width:16 }}>#{f.rank}</span>
                <span style={{ color:'var(--t1)', fontSize:13, flex:1 }}>{f.name}</span>
                <span style={{ color:'var(--blue)', fontSize:12, fontWeight:600 }}>{fmtScore(f.avgScore)}</span>
                <span style={{ color:'var(--t4)', fontSize:11, marginLeft:2 }}>
                  {expanded === f.rank ? '▲' : '▼'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1 rounded overflow-hidden" style={{ background:'var(--overlay)' }}>
                  <div
                    className="h-full rounded"
                    style={{ width:`${(f.avgScore / max) * 100}%`, background:'#4A8FFF' }}
                  />
                </div>
              </div>
            </button>

            {expanded === f.rank && (
              <div className="px-3 pb-3 pt-2.5 space-y-2.5" style={{ borderTop:'0.5px solid var(--border)' }}>
                <p style={{ color:'var(--t2)', fontSize:13, lineHeight:1.65 }}>{f.description}</p>

                {(f.examples && f.examples.length > 0) ? (
                  <div className="space-y-1.5">
                    <span style={{ color:'var(--t4)', fontSize:11 }}>Example posts</span>
                    {f.examples.map((ex, i) => (
                      <div key={i} className="rounded-lg px-3 py-2 flex items-start gap-2" style={{ background:'var(--overlay)' }}>
                        <div className="flex-1 min-w-0">
                          <p style={{ color:'var(--t1)', fontSize:12, lineHeight:1.5 }} className="line-clamp-2">{ex.title}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span style={{ color:'var(--blue)', fontSize:11, fontWeight:600 }}>↑ {fmtScore(ex.score)}</span>
                            {ex.createdUtc > 0 && (
                              <span style={{ color:'var(--t4)', fontSize:11 }}>{timeAgo(ex.createdUtc)}</span>
                            )}
                          </div>
                        </div>
                        {ex.url && (
                          <a
                            href={ex.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color:'var(--blue)', fontSize:11, fontWeight:500, flexShrink:0, marginTop:2 }}
                          >
                            View →
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                ) : f.exampleUrl ? (
                  <div className="flex items-start gap-1.5">
                    <span style={{ color:'var(--t4)', fontSize:12, marginTop:2, flexShrink:0 }}>e.g.</span>
                    <div className="flex-1">
                      <span style={{ color:'var(--t2)', fontSize:12, fontStyle:'italic' }}>&ldquo;{f.example}&rdquo;</span>
                      <a
                        href={f.exampleUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ display:'block', color:'var(--blue)', fontSize:12, marginTop:4 }}
                      >
                        View on Reddit →
                      </a>
                    </div>
                  </div>
                ) : (
                  <p style={{ color:'var(--t2)', fontSize:12, fontStyle:'italic' }}>&ldquo;{f.example}&rdquo;</p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
