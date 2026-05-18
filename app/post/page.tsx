'use client';

import { useState } from 'react';

// ── Types ──────────────────────────────────────────────────────────────────────

interface SubredditMatch {
  subreddit: string;
  assessment: string;
  why: string;
  audienceFit: number;
  engagement: number;
  competition: number;
  founderFriendly: number;
  overallScore: number;
}

interface SimilarPost {
  title: string;
  score: number;
  numComments: number;
  url: string;
  flair: string | null;
  createdUtc: number;
  why: string;
}

interface SimilarResult {
  tone: string;
  toneAdvice: string;
  similarPosts: SimilarPost[];
}

interface PredictItem { label: string; detail: string; }
interface Prediction {
  score: number;
  verdict: string;
  summary: string;
  working: PredictItem[];
  killing: PredictItem[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(utc: number) {
  const diff = Math.floor(Date.now() / 1000 - utc);
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 86400 * 30) return `${Math.floor(diff / 86400)}d ago`;
  return `${Math.floor(diff / 86400 / 30)}mo ago`;
}

function ScoreBar({ value, max = 10 }: { value: number; max?: number }) {
  return (
    <div className="h-1 bg-overlay rounded flex-1">
      <div className="h-full rounded bg-hot" style={{ width: `${(value / max) * 100}%` }} />
    </div>
  );
}

// ── Step indicator ────────────────────────────────────────────────────────────

const STEPS = ['Idea', 'Subreddit', 'Inspiration', 'Draft & Score'];

function StepBar({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-0 mb-8">
      {STEPS.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <div key={i} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center">
              <div className={`w-7 h-7 rounded-none flex items-center justify-center text-xs font-bold border-2 transition-colors ${
                done ? 'bg-hot border-hot-border text-t1'
                  : active ? 'border-hot-border text-hot bg-transparent'
                  : 'border-cyan-border text-t3'
              }`}>
                {done ? '✓' : i + 1}
              </div>
              <span className={`text-[10px] mt-1 ${active ? 'text-hot' : done ? 'text-t2' : 'text-t3'}`}>
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-px mx-1 mb-4 ${done ? 'bg-hot' : 'bg-overlay'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function PostPage() {
  const [step, setStep] = useState(0);

  // Step 1: idea
  const [idea, setIdea] = useState('');

  // Step 2: subreddit
  const [subreddits, setSubreddits] = useState<SubredditMatch[]>([]);
  const [loadingSubs, setLoadingSubs] = useState(false);
  const [selectedSub, setSelectedSub] = useState('');

  // Step 3: similar posts
  const [similar, setSimilar] = useState<SimilarResult | null>(null);
  const [loadingSimilar, setLoadingSimilar] = useState(false);

  // Step 4: draft & score
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [loadingPredict, setLoadingPredict] = useState(false);

  // ── Handlers ────────────────────────────────────────────────────────────────

  async function findSubreddits() {
    if (!idea.trim()) return;
    setLoadingSubs(true);
    try {
      const res = await fetch('/api/find-subreddits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: idea }),
      });
      const data = await res.json();
      setSubreddits(data.matches?.slice(0, 5) ?? []);
      setStep(1);
    } finally {
      setLoadingSubs(false);
    }
  }

  async function pickSubreddit(sub: string) {
    setSelectedSub(sub);
    setLoadingSimilar(true);
    setStep(2);
    try {
      const res = await fetch(
        `/api/post-similar?subreddit=${encodeURIComponent(sub)}&idea=${encodeURIComponent(idea)}`
      );
      const data = await res.json();
      setSimilar(data);
    } finally {
      setLoadingSimilar(false);
    }
  }

  async function scorePost() {
    if (!title.trim()) return;
    setLoadingPredict(true);
    try {
      const res = await fetch('/api/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subreddit: selectedSub, title, body }),
      });
      const data = await res.json();
      setPrediction(data);
    } finally {
      setLoadingPredict(false);
    }
  }

  const verdictColor = prediction
    ? prediction.score >= 75 ? 'text-green-400'
    : prediction.score >= 55 ? 'text-hot'
    : 'text-red-400'
    : '';

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <div className="mb-6">
        <h1 className="text-t1 text-2xl font-bold">Post</h1>
        <p className="text-t2 text-sm mt-1">
          Guided flow — find the right subreddit, learn what works, draft and score before you post.
        </p>
      </div>

      <StepBar current={step} />

      {/* ── Step 0: Idea ───────────────────────────────────────────────────────── */}
      {step === 0 && (
        <div className="space-y-4">
          <div>
            <label className="text-t2 text-xs font-semibold uppercase tracking-widest block mb-2">
              What do you want to post about?
            </label>
            <textarea
              value={idea}
              onChange={e => setIdea(e.target.value)}
              placeholder="e.g. I built a tool that helps founders find which subreddits to post in. Want to share it with indie hackers and get early users."
              rows={5}
              className="w-full bg-surface border border-cyan-border rounded-none px-4 py-3 text-t1 text-sm resize-none outline-none focus:border-hot-border transition-colors placeholder-t3"
              autoFocus
            />
          </div>
          <button
            onClick={findSubreddits}
            disabled={!idea.trim() || loadingSubs}
            className="w-full bg-hot hover:bg-hot disabled:opacity-40 text-t1 font-semibold py-3 rounded-none transition-colors text-sm flex items-center justify-center gap-2"
          >
            {loadingSubs ? (
              <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-none animate-spin" /> Finding best subreddits…</>
            ) : 'Find best subreddits →'}
          </button>
        </div>
      )}

      {/* ── Step 1: Pick subreddit ─────────────────────────────────────────────── */}
      {step >= 1 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-t1 font-semibold text-sm">Pick your subreddit</h2>
              <p className="text-t3 text-xs mt-0.5">Based on your idea, these are your best bets.</p>
            </div>
            <button onClick={() => { setStep(0); setSubreddits([]); setSelectedSub(''); setSimilar(null); setPrediction(null); }}
              className="text-t3 hover:text-t2 text-xs transition-colors">
              ← Back
            </button>
          </div>

          <div className="space-y-2.5">
            {subreddits.map(s => {
              const isSelected = selectedSub === s.subreddit;
              return (
                <button
                  key={s.subreddit}
                  onClick={() => pickSubreddit(s.subreddit)}
                  className={`w-full text-left bg-surface border rounded-none p-4 transition-colors ${
                    isSelected ? 'border-hot-border bg-hot' : 'border-cyan-border hover:border-cyan-border'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-t1 text-sm font-semibold">r/{s.subreddit}</span>
                        <span className="text-hot text-xs font-bold">{s.overallScore.toFixed(1)}/10</span>
                      </div>
                      <p className="text-t2 text-xs leading-relaxed">{s.assessment}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-2 mt-3">
                    {[
                      ['Audience', s.audienceFit],
                      ['Engagement', s.engagement],
                      ['Market Gap', s.competition],
                      ['Founder ♥', s.founderFriendly],
                    ].map(([label, val]) => (
                      <div key={label as string}>
                        <div className="text-t3 text-[10px] mb-1">{label as string}</div>
                        <div className="flex items-center gap-1.5">
                          <ScoreBar value={val as number} />
                          <span className="text-t2 text-[10px] w-4">{val as number}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Step 2: Inspiration ────────────────────────────────────────────────── */}
      {step >= 2 && (
        <div className="mt-6 space-y-4">
          <div className="border-t border-cyan-border pt-6">
            <h2 className="text-t1 font-semibold text-sm mb-1">
              Viral posts to inspire yours — r/{selectedSub}
            </h2>
            <p className="text-t3 text-xs">Posts with similar topic or angle that performed well.</p>
          </div>

          {loadingSimilar ? (
            <div className="flex items-center gap-3 py-6">
              <div className="w-4 h-4 border-2 border-hot-border border-t-transparent rounded-none animate-spin" />
              <span className="text-t2 text-sm">Finding similar viral posts…</span>
            </div>
          ) : similar && (
            <div className="space-y-3">
              {/* Tone guide */}
              <div className="bg-indigo-950/40 border border-indigo-900/50 rounded-none p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-indigo-400 text-xs font-bold uppercase tracking-widest">✦ Winning Tone</span>
                  <span className="text-indigo-300 text-xs font-semibold">{similar.tone}</span>
                </div>
                <p className="text-t2 text-xs leading-relaxed">{similar.toneAdvice}</p>
              </div>

              {similar.similarPosts.map((p, i) => (
                <div key={i} className="bg-surface border border-cyan-border rounded-none p-3.5">
                  <div className="flex items-center gap-2 mb-1 text-[10px] text-t3">
                    <span>↑ {p.score}</span>
                    <span>·</span>
                    <span>{p.numComments} comments</span>
                    <span>·</span>
                    <span>{timeAgo(p.createdUtc)}</span>
                    {p.flair && <><span>·</span><span className="text-t2">{p.flair}</span></>}
                  </div>
                  <a href={p.url} target="_blank" rel="noopener noreferrer"
                    className="text-t1 text-xs font-medium hover:text-hot transition-colors leading-snug block">
                    {p.title}
                  </a>
                  <p className="text-hot/70 text-[10px] mt-1.5 leading-relaxed">{p.why}</p>
                </div>
              ))}

              <button
                onClick={() => setStep(3)}
                className="w-full bg-hot hover:bg-hot text-t1 font-semibold py-3 rounded-none transition-colors text-sm mt-2"
              >
                Draft my post →
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Step 3: Draft & Score ─────────────────────────────────────────────── */}
      {step >= 3 && (
        <div className="mt-6 space-y-4">
          <div className="border-t border-cyan-border pt-6">
            <h2 className="text-t1 font-semibold text-sm mb-1">Draft your post</h2>
            <p className="text-t3 text-xs">Write it, then score it before you hit submit.</p>
          </div>

          <div className="space-y-3">
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Post title…"
              className="w-full bg-surface border border-cyan-border rounded-none px-4 py-3 text-t1 text-sm outline-none focus:border-hot-border transition-colors placeholder-t3"
            />
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder="Post body (optional for title-only posts)…"
              rows={6}
              className="w-full bg-surface border border-cyan-border rounded-none px-4 py-3 text-t1 text-sm resize-none outline-none focus:border-hot-border transition-colors placeholder-t3"
            />
            <button
              onClick={scorePost}
              disabled={!title.trim() || loadingPredict}
              className="w-full bg-hot hover:bg-hot disabled:opacity-40 text-t1 font-semibold py-3 rounded-none transition-colors text-sm flex items-center justify-center gap-2"
            >
              {loadingPredict ? (
                <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-none animate-spin" /> Scoring…</>
              ) : '⚡ Score my post'}
            </button>
          </div>

          {/* Prediction result */}
          {prediction && (
            <div className="bg-surface border border-cyan-border rounded-none p-5 space-y-4">
              {/* Score */}
              <div className="flex items-center gap-4">
                <div className={`text-5xl font-black ${verdictColor}`}>{prediction.score}</div>
                <div>
                  <div className={`text-lg font-bold ${verdictColor}`}>{prediction.verdict}</div>
                  <p className="text-t2 text-xs leading-relaxed mt-0.5 max-w-sm">{prediction.summary}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="text-green-400 text-xs font-semibold mb-2">✓ What's working</div>
                  <div className="space-y-1.5">
                    {prediction.working.map((w, i) => (
                      <div key={i} className="bg-green-500/5 border border-green-500/10 rounded-none px-3 py-2">
                        <div className="text-green-300 text-xs font-medium">{w.label}</div>
                        <div className="text-t2 text-[10px] mt-0.5 leading-relaxed">{w.detail}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-red-400 text-xs font-semibold mb-2">✗ What's hurting</div>
                  <div className="space-y-1.5">
                    {prediction.killing.map((k, i) => (
                      <div key={i} className="bg-red-500/5 border border-red-500/10 rounded-none px-3 py-2">
                        <div className="text-red-300 text-xs font-medium">{k.label}</div>
                        <div className="text-t2 text-[10px] mt-0.5 leading-relaxed">{k.detail}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <a
                href={`https://reddit.com/r/${selectedSub}/submit`}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full text-center bg-[#ff4500] hover:bg-[#e03e00] text-t1 font-semibold py-3 rounded-none transition-colors text-sm"
              >
                Post to r/{selectedSub} →
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
