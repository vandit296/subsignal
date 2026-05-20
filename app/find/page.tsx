'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { FinderResult, SubredditMatch } from '@/types';

const GOALS = [
  { id: 'early-users',  label: 'Get early users' },
  { id: 'feedback',     label: 'Get feedback' },
  { id: 'signups',      label: 'Drive signups' },
  { id: 'brand',        label: 'Build brand awareness' },
  { id: 'community',    label: 'Build a community' },
];

function formatSubscribers(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
  return n.toString();
}

function ScoreBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <span className="text-t2 text-xs">{label}</span>
        <span className="text-t2 text-xs font-medium">{value}/10</span>
      </div>
      <div className="h-1 bg-overlay rounded-none overflow-hidden">
        <div
          className={`h-full rounded-none ${color}`}
          style={{ width: `${value * 10}%` }}
        />
      </div>
    </div>
  );
}

function MatchCard({ match, rank }: { match: SubredditMatch; rank: number }) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);

  const score = match.overallScore;
  const scoreColor =
    score >= 8 ? 'text-emerald-400' :
    score >= 6 ? 'text-blue-400' :
    score >= 4 ? 'text-amber-400' : 'text-red-400';
  const scoreBg =
    score >= 8 ? 'bg-emerald-500/10 border-emerald-500/20' :
    score >= 6 ? 'bg-blue-500/10 border-blue-500/20' :
    score >= 4 ? 'bg-amber-500/10 border-amber-500/20' : 'bg-red-500/10 border-red-500/20';

  return (
    <div className="bg-panel border border-cyan-border hover:border-cyan-border rounded-none overflow-hidden transition-colors">
      <div className="p-5">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-t3 text-sm font-mono flex-shrink-0">#{rank}</span>
            <div className="min-w-0">
              <button
                onClick={() => router.push(`/dashboard/${match.subreddit}`)}
                className="text-t1 font-semibold text-base hover:text-hot transition-colors text-left truncate block"
              >
                r/{match.subreddit}
              </button>
              {match.subscribers ? (
                <div className="text-t2 text-xs mt-0.5">
                  {formatSubscribers(match.subscribers)} members
                </div>
              ) : null}
            </div>
          </div>
          <div className={`flex flex-col items-center px-3 py-1.5 rounded-none border flex-shrink-0 ${scoreBg}`}>
            <span className={`text-xl font-bold ${scoreColor}`}>{score.toFixed(1)}</span>
            <span className="text-t3 text-xs">/ 10</span>
          </div>
        </div>

        {/* Assessment — the punchy one-liner */}
        <div className="flex items-start gap-2 mb-3 bg-overlay rounded-none px-3 py-2.5">
          <span className="text-hot text-xs mt-0.5 flex-shrink-0">→</span>
          <p className="text-t1 text-sm font-medium leading-snug">{match.assessment}</p>
        </div>

        {/* Why — expandable deeper reasoning */}
        <div>
          <button
            onClick={() => setExpanded(v => !v)}
            className="text-t2 hover:text-t1 text-xs transition-colors flex items-center gap-1"
          >
            {expanded ? '▲ Hide reasoning' : '▼ Why this subreddit?'}
          </button>
          {expanded && (
            <p className="text-t2 text-sm mt-2 leading-relaxed">{match.why}</p>
          )}
        </div>

        {/* Score bars */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 mt-4">
          <ScoreBar label="Audience Fit"       value={match.audienceFit}      color="bg-hot" />
          <ScoreBar label="Engagement"          value={match.engagement}       color="bg-blue-500" />
          <ScoreBar label="Low Competition"     value={match.competition}      color="bg-emerald-500" />
          <ScoreBar label="Founder Friendly"    value={match.founderFriendly}  color="bg-purple-500" />
        </div>
      </div>

      {/* CTA */}
      <div className="border-t border-cyan-border px-5 py-3 flex items-center justify-between">
        <span className="text-t3 text-xs">Get the full intelligence report</span>
        <button
          onClick={() => router.push(`/dashboard/${match.subreddit}`)}
          className="text-hot hover:text-hot text-xs font-medium transition-colors"
        >
          Analyze r/{match.subreddit} →
        </button>
      </div>
    </div>
  );
}

const LOADING_MESSAGES = [
  'Understanding your product...',
  'Identifying your target persona...',
  'Scanning Reddit communities...',
  'Scoring audience fit...',
  'Fetching community sizes...',
  'Ranking by strategic fit...',
  'Almost there...',
];

export default function FindPage() {
  const router = useRouter();
  const [description, setDescription] = useState('');
  const [goal, setGoal] = useState('');
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const [productUrl, setProductUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('');
  const [result, setResult] = useState<FinderResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const TEMPLATE = `My product is [describe what it does in 1–2 sentences].
Target user: [who uses this — job title, situation, the pain they feel].
ICP: [ideal customer — company size, stage, or context].
Market: [what category or space this competes in].`;

  function useTemplate() {
    setDescription(TEMPLATE);
  }

  function handleGoalChip(id: string, label: string) {
    if (selectedGoalId === id) {
      setSelectedGoalId(null);
      setGoal('');
    } else {
      setSelectedGoalId(id);
      setGoal(label);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!description.trim() || description.trim().length < 10) return;

    setLoading(true);
    setError(null);
    setResult(null);

    let i = 0;
    setLoadingMsg(LOADING_MESSAGES[0]);
    const interval = setInterval(() => {
      i = (i + 1) % LOADING_MESSAGES.length;
      setLoadingMsg(LOADING_MESSAGES[i]);
    }, 2500);

    try {
      const res = await fetch('/api/find-subreddits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: description.trim(),
          goal: goal.trim() || undefined,
          productUrl: productUrl.trim() || undefined,
        }),
      });
      const data = await res.json();
      clearInterval(interval);
      if (data.error) throw new Error(data.error);
      setResult(data);
    } catch (err: unknown) {
      clearInterval(interval);
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-void text-t1">
      {/* Top bar */}
      <div className="sticky top-0 z-10 bg-void border-b border-panel px-6 py-3 flex items-center gap-4">
        <button
          onClick={() => router.push('/')}
          className="text-t2 hover:text-t1 text-sm transition-colors"
        >
          ← Back
        </button>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-none bg-hot" />
          <span className="text-t1 font-bold text-sm">Treddit</span>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-t1 text-3xl font-bold mb-2">Find Your Subreddits</h1>
          <p className="text-t2 text-base">
            Tell us about your product and what you're trying to achieve. Treddit will find the communities that actually match — with a clear reason why each one is worth your time.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Product description */}
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <label className="text-t1 text-sm font-semibold">
                  What's your product? <span className="text-red-500">*</span>
                </label>
                <p className="text-t2 text-xs mt-0.5 leading-relaxed">
                  The more detail, the sharper the results. A great answer covers: what the product does, who it's for, your ICP, and the market you're in.
                </p>
              </div>
              <button
                type="button"
                onClick={useTemplate}
                disabled={loading}
                className="flex-shrink-0 text-xs text-hot hover:text-hot border border-hot-border hover:border-hot-border px-2.5 py-1 rounded-none transition-colors whitespace-nowrap"
              >
                Use template
              </button>
            </div>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder={`e.g. "A tool that helps indie hackers track competitor pricing automatically — no more manual spreadsheets. Target user is solo founders. ICP is early-stage B2B SaaS. Market is competitive intelligence."`}
              rows={5}
              disabled={loading}
              className="w-full bg-panel border border-cyan-border rounded-none px-4 py-3 text-t1 text-sm placeholder-t3 focus:outline-none focus:border-hot-border transition-colors resize-none"
            />
          </div>

          {/* Product URL */}
          <div className="space-y-1.5">
            <label className="text-t1 text-sm font-semibold">
              Product URL <span className="text-t2 text-xs font-normal">(optional — we'll read your site for extra context)</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-t2 text-sm">🔗</span>
              <input
                type="url"
                value={productUrl}
                onChange={e => setProductUrl(e.target.value)}
                placeholder="https://yourproduct.com"
                disabled={loading}
                className="w-full bg-panel border border-cyan-border rounded-none pl-9 pr-4 py-3 text-t1 text-sm placeholder-t3 focus:outline-none focus:border-hot-border transition-colors"
              />
            </div>
          </div>

          {/* Goal chips + freeform */}
          <div className="space-y-2">
            <label className="text-t2 text-xs font-medium uppercase tracking-wide">
              What's your goal? <span className="text-t3">(optional but helps)</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {GOALS.map(g => (
                <button
                  key={g.id}
                  type="button"
                  disabled={loading}
                  onClick={() => handleGoalChip(g.id, g.label)}
                  className={`px-3 py-1.5 rounded-none text-xs font-medium border transition-colors ${
                    selectedGoalId === g.id
                      ? 'bg-hot border-hot-border text-hot'
                      : 'bg-panel border-cyan-border text-t2 hover:border-cyan-border hover:text-t1'
                  }`}
                >
                  {g.label}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={goal}
              onChange={e => { setGoal(e.target.value); setSelectedGoalId(null); }}
              placeholder={`Or describe your own goal — e.g. "I want to attract solo founders struggling with cold outreach"`}
              disabled={loading}
              className="w-full bg-panel border border-cyan-border rounded-none px-4 py-3 text-t1 text-sm placeholder-t3 focus:outline-none focus:border-hot-border transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={loading || description.trim().length < 10}
            className="w-full bg-hot hover:bg-hot disabled:bg-overlay disabled:text-t3 text-t1 font-semibold text-sm py-3.5 rounded-none transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-none animate-spin" />
                {loadingMsg}
              </>
            ) : (
              <>
                <span>🔍</span>
                Find My Subreddits
              </>
            )}
          </button>
        </form>

        {/* Error */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-none p-4 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-5 animate-in fade-in duration-300">
            {/* Target persona */}
            <div className="bg-[#0d0d1f] border border-indigo-950 rounded-none p-5">
              <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold mb-2">
                <span>✦</span>
                <span>YOUR TARGET PERSONA</span>
              </div>
              <p className="text-t1 text-sm leading-relaxed">{result.targetPersona}</p>
            </div>

            {/* Result count */}
            <div className="flex items-center justify-between">
              <span className="text-t2 text-sm">
                {result.matches.length} subreddits ranked by strategic fit
              </span>
              <button
                onClick={() => { setResult(null); setDescription(''); setGoal(''); setSelectedGoalId(null); setProductUrl(''); }}
                className="text-t2 hover:text-t1 text-xs transition-colors"
              >
                ← Search again
              </button>
            </div>

            {/* Cards */}
            <div className="space-y-3">
              {result.matches.map((match, i) => (
                <MatchCard key={match.subreddit} match={match} rank={i + 1} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
