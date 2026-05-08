'use client';

import { useState } from 'react';
import { PostPrediction } from '@/types';

interface Props {
  subreddit: string;
}

const VERDICT_CONFIG = {
  Strong: { color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30', ring: '#10b981' },
  Good:   { color: 'text-blue-400',    bg: 'bg-blue-500/10 border-blue-500/30',    ring: '#3b82f6' },
  Mediocre: { color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/30',  ring: '#f59e0b' },
  Weak:   { color: 'text-red-400',     bg: 'bg-red-500/10 border-red-500/30',      ring: '#ef4444' },
};

function ScoreRing({ score, verdict }: { score: number; verdict: string }) {
  const cfg = VERDICT_CONFIG[verdict as keyof typeof VERDICT_CONFIG] ?? VERDICT_CONFIG.Mediocre;
  const r = 54;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative w-36 h-36">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r={r} fill="none" stroke="#27272a" strokeWidth="10" />
          <circle
            cx="60" cy="60" r={r} fill="none"
            stroke={cfg.ring} strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 0.8s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-bold text-white">{score}</span>
          <span className="text-zinc-500 text-xs mt-0.5">/ 100</span>
        </div>
      </div>
      <span className={`text-lg font-semibold ${cfg.color}`}>{verdict}</span>
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

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-5">
      {/* Intro */}
      <div className="bg-[#0d0d1f] border border-indigo-950 rounded-xl p-5">
        <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold mb-2">
          <span>✦</span>
          <span>POST SUCCESS PREDICTOR — r/{subreddit.toUpperCase()}</span>
        </div>
        <p className="text-zinc-400 text-sm leading-relaxed">
          Paste your draft below. SubSignal will compare it against the top-performing posts in this
          subreddit and tell you exactly what's working and what's not — before you hit Post.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="space-y-1">
          <label className="text-zinc-400 text-xs font-medium uppercase tracking-wide">
            Post Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder={`What would you title your post on r/${subreddit}?`}
            maxLength={300}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-orange-500/60 transition-colors"
            disabled={loading}
          />
        </div>

        <div className="space-y-1">
          <label className="text-zinc-400 text-xs font-medium uppercase tracking-wide">
            Body Text <span className="text-zinc-600">(optional)</span>
          </label>
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            placeholder="Paste the body of your post here, or leave blank to score title-only..."
            rows={6}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-orange-500/60 transition-colors resize-none"
            disabled={loading}
          />
        </div>

        <button
          type="submit"
          disabled={loading || !title.trim()}
          className="w-full bg-orange-500 hover:bg-orange-400 disabled:bg-zinc-800 disabled:text-zinc-600 text-white font-semibold text-sm py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
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

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-4 animate-in fade-in duration-300">
          {/* Score + verdict + summary */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <ScoreRing score={result.score} verdict={result.verdict} />
              <div className="flex-1 text-center sm:text-left">
                <p className="text-zinc-300 text-sm leading-relaxed">{result.summary}</p>
              </div>
            </div>
          </div>

          {/* What's working */}
          {result.working.length > 0 && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-3 border-b border-zinc-800 bg-emerald-500/5">
                <span className="text-emerald-400 text-sm">✓</span>
                <span className="text-emerald-400 text-sm font-semibold">What's Working</span>
              </div>
              <div className="divide-y divide-zinc-800/60">
                {result.working.map((item, i) => (
                  <div key={i} className="px-5 py-4 flex gap-3">
                    <div className="mt-0.5 w-5 h-5 rounded-full bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
                      <span className="text-emerald-400 text-xs">✓</span>
                    </div>
                    <div>
                      <div className="text-white text-sm font-medium">{item.label}</div>
                      <div className="text-zinc-500 text-xs mt-0.5 leading-relaxed">{item.detail}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* What's killing it */}
          {result.killing.length > 0 && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-3 border-b border-zinc-800 bg-red-500/5">
                <span className="text-red-400 text-sm">✗</span>
                <span className="text-red-400 text-sm font-semibold">What's Killing It</span>
              </div>
              <div className="divide-y divide-zinc-800/60">
                {result.killing.map((item, i) => (
                  <div key={i} className="px-5 py-4 flex gap-3">
                    <div className="mt-0.5 w-5 h-5 rounded-full bg-red-500/15 flex items-center justify-center flex-shrink-0">
                      <span className="text-red-400 text-xs">✗</span>
                    </div>
                    <div>
                      <div className="text-white text-sm font-medium">{item.label}</div>
                      <div className="text-zinc-500 text-xs mt-0.5 leading-relaxed">{item.detail}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Score again CTA */}
          <button
            onClick={() => { setResult(null); setTitle(''); setBody(''); }}
            className="w-full border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-white text-sm py-2.5 rounded-lg transition-colors"
          >
            ← Score a different post
          </button>
        </div>
      )}
    </div>
  );
}
