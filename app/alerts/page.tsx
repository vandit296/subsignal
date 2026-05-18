'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { AlertConfig, SubredditMatch } from '@/types';

const GOAL_PRESETS = [
  'Get early users',
  'Drive signups',
  'Build community',
  'Find beta testers',
  'Get product feedback',
  'Generate leads',
];

const TIMEZONES = [
  { label: 'UTC', value: 'UTC' },
  { label: 'US Eastern (ET)', value: 'America/New_York' },
  { label: 'US Central (CT)', value: 'America/Chicago' },
  { label: 'US Mountain (MT)', value: 'America/Denver' },
  { label: 'US Pacific (PT)', value: 'America/Los_Angeles' },
  { label: 'London (GMT/BST)', value: 'Europe/London' },
  { label: 'Paris / Berlin (CET)', value: 'Europe/Paris' },
  { label: 'Dubai (GST)', value: 'Asia/Dubai' },
  { label: 'India (IST)', value: 'Asia/Kolkata' },
  { label: 'Singapore (SGT)', value: 'Asia/Singapore' },
  { label: 'Tokyo (JST)', value: 'Asia/Tokyo' },
  { label: 'Sydney (AEST)', value: 'Australia/Sydney' },
];

function digestTimeLabel(tz: string) {
  try {
    const fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZoneName: 'short',
    });
    // 8am UTC as reference
    const utc8 = new Date('2024-01-15T08:00:00Z');
    return fmt.format(utc8);
  } catch {
    return '8:00 AM UTC';
  }
}

export default function AlertsPage() {
  const router = useRouter();
  const [config, setConfig] = useState<AlertConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Form state
  const [email, setEmail] = useState('');
  const [productDescription, setProductDescription] = useState('');
  const [productUrl, setProductUrl] = useState('');
  const [goal, setGoal] = useState('');
  const [subredditInput, setSubredditInput] = useState('');
  const [subreddits, setSubreddits] = useState<string[]>([]);
  const [timezone, setTimezone] = useState('UTC');
  const [alertFrequency, setAlertFrequency] = useState<'daily' | 'realtime'>('daily');

  // Subreddit suggestion state
  const [findingSubreddits, setFindingSubreddits] = useState(false);
  const [suggestions, setSuggestions] = useState<SubredditMatch[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    // Auto-detect timezone
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (tz) setTimezone(tz);
    } catch {}

    fetch('/api/alerts')
      .then(r => r.json())
      .then(data => {
        if (data && data.email) {
          setConfig(data);
          setEmail(data.email);
          setProductDescription(data.productDescription);
          setProductUrl(data.productUrl ?? '');
          setGoal(data.goal ?? '');
          setSubreddits(data.subreddits ?? []);
          setTimezone(data.timezone ?? 'UTC');
          setAlertFrequency(data.alertFrequency ?? 'daily');
        }
      })
      .finally(() => setLoading(false));
  }, []);

  async function autoFindSubreddits() {
    if (!productDescription.trim()) return;
    setFindingSubreddits(true);
    setSuggestions([]);
    setShowSuggestions(true);
    try {
      const res = await fetch('/api/find-subreddits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: productDescription, goal, productUrl }),
      });
      const data = await res.json();
      if (data.matches) {
        setSuggestions(data.matches.slice(0, 10));
      }
    } finally {
      setFindingSubreddits(false);
    }
  }

  function toggleSuggestion(sub: string) {
    setSubreddits(prev =>
      prev.includes(sub) ? prev.filter(s => s !== sub) : [...prev, sub]
    );
  }

  function addSubreddit() {
    const sub = subredditInput.replace(/^r\//, '').trim().toLowerCase();
    if (sub && !subreddits.includes(sub)) {
      setSubreddits(prev => [...prev, sub]);
    }
    setSubredditInput('');
  }

  function removeSubreddit(sub: string) {
    setSubreddits(prev => prev.filter(s => s !== sub));
  }

  function toggleGoalPreset(preset: string) {
    setGoal(prev => prev === preset ? '' : preset);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email || !productDescription || subreddits.length === 0) return;
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, productDescription, productUrl, goal, subreddits, timezone, alertFrequency }),
      });
      const data = await res.json();
      if (data.ok) {
        setConfig(data.config);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } finally {
      setSaving(false);
    }
  }

  function scoreColor(score: number) {
    if (score >= 8) return 'text-emerald-400';
    if (score >= 6) return 'text-hot';
    return 'text-t2';
  }

  function scoreBar(score: number) {
    const pct = Math.round((score / 10) * 100);
    const color = score >= 8 ? 'bg-emerald-500' : score >= 6 ? 'bg-hot' : 'bg-overlay';
    return (
      <div className="w-full h-1 bg-overlay rounded-none overflow-hidden">
        <div className={`h-full rounded-none ${color}`} style={{ width: `${pct}%` }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-void text-t1">
      {/* Top bar */}
      <div className="sticky top-0 z-10 bg-void border-b border-panel px-6 py-3 flex items-center gap-4">
        <button onClick={() => router.push('/')} className="text-t2 hover:text-t1 text-sm transition-colors">
          ← Back
        </button>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-none bg-hot" />
          <span className="text-t1 font-bold text-sm">Treddit</span>
        </div>
        {config && (
          <span className="ml-auto text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-none">
            ● Monitoring {config.subreddits.length} subreddits
          </span>
        )}
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-t1 text-3xl font-bold mb-2">Thread Opportunity Alerts</h1>
          <p className="text-t2 text-base leading-relaxed">
            Treddit monitors your subreddits daily and surfaces threads where your product or expertise would fit — not the popular posts, but the off-beat questions and struggles that are a perfect match for what you're building.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center gap-3 text-t2 text-sm py-8">
            <div className="w-4 h-4 border-2 border-cyan-border border-t-transparent rounded-none animate-spin" />
            Loading your config...
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">

            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-t1 text-sm font-semibold">
                Alert Email <span className="text-red-500">*</span>
              </label>
              <p className="text-t2 text-xs">Where to send your daily digest (once email is wired up).</p>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@yourdomain.com"
                required
                className="w-full bg-panel border border-cyan-border rounded-none px-4 py-3 text-t1 text-sm placeholder-t3 focus:outline-none focus:border-hot-border transition-colors"
              />
            </div>

            {/* Product description */}
            <div className="space-y-1.5">
              <label className="text-t1 text-sm font-semibold">
                What's your product? <span className="text-red-500">*</span>
              </label>
              <p className="text-t2 text-xs">
                The more specific you are, the better Treddit can judge relevance. Ideal answer: what it does, who it's for, and the problem it solves.
              </p>
              <textarea
                value={productDescription}
                onChange={e => setProductDescription(e.target.value)}
                placeholder={`e.g. "Treddit is a Reddit intelligence tool for founders. It helps indie hackers find the right subreddits, score their posts before publishing, and get alerted to relevant threads where they can drive organic signups."`}
                rows={4}
                required
                className="w-full bg-panel border border-cyan-border rounded-none px-4 py-3 text-t1 text-sm placeholder-t3 focus:outline-none focus:border-hot-border transition-colors resize-none"
              />
            </div>

            {/* Product URL */}
            <div className="space-y-1.5">
              <label className="text-t1 text-sm font-semibold">
                Product URL <span className="text-t2 font-normal">(optional)</span>
              </label>
              <p className="text-t2 text-xs">Treddit will read your landing page for additional context when suggesting subreddits.</p>
              <input
                type="url"
                value={productUrl}
                onChange={e => setProductUrl(e.target.value)}
                placeholder="https://yourproduct.com"
                className="w-full bg-panel border border-cyan-border rounded-none px-4 py-3 text-t1 text-sm placeholder-t3 focus:outline-none focus:border-hot-border transition-colors"
              />
            </div>

            {/* Goal */}
            <div className="space-y-2">
              <label className="text-t1 text-sm font-semibold">
                What are you trying to achieve? <span className="text-t2 font-normal">(optional)</span>
              </label>
              <p className="text-t2 text-xs">Pick a preset or describe your own — this shapes how Treddit scores thread relevance.</p>

              {/* Preset chips */}
              <div className="flex flex-wrap gap-2">
                {GOAL_PRESETS.map(preset => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => toggleGoalPreset(preset)}
                    className={`text-xs px-3 py-1.5 rounded-none border transition-all ${
                      goal === preset
                        ? 'bg-hot border-hot-border text-hot'
                        : 'bg-panel border-cyan-border text-t2 hover:border-cyan hover:text-t1'
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>

              {/* Freetext */}
              <input
                type="text"
                value={goal}
                onChange={e => setGoal(e.target.value)}
                placeholder="Or describe your own goal..."
                className="w-full bg-panel border border-cyan-border rounded-none px-4 py-3 text-t1 text-sm placeholder-t3 focus:outline-none focus:border-hot-border transition-colors"
              />
            </div>

            {/* Subreddits */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-t1 text-sm font-semibold">
                    Subreddits to Monitor <span className="text-red-500">*</span>
                  </label>
                  <p className="text-t2 text-xs mt-0.5">Treddit scans these daily for relevant threads.</p>
                </div>
                <button
                  type="button"
                  onClick={autoFindSubreddits}
                  disabled={!productDescription.trim() || findingSubreddits}
                  className="text-xs text-hot hover:text-hot border border-hot-border hover:border-hot-border px-3 py-1.5 rounded-none transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
                >
                  {findingSubreddits ? (
                    <><div className="w-3 h-3 border border-hot border-t-transparent rounded-none animate-spin" /> Finding...</>
                  ) : (
                    <>✦ Auto-suggest</>
                  )}
                </button>
              </div>

              {/* Suggestion panel */}
              {showSuggestions && (
                <div className="bg-panel border border-cyan-border rounded-none overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-cyan-border">
                    <span className="text-xs font-semibold text-t1">
                      {findingSubreddits ? 'Finding subreddits…' : `${suggestions.length} subreddits found — click to add`}
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowSuggestions(false)}
                      className="text-t3 hover:text-t2 text-xs transition-colors"
                    >
                      close ×
                    </button>
                  </div>

                  {findingSubreddits ? (
                    <div className="flex items-center gap-3 px-4 py-6 text-t2 text-sm">
                      <div className="w-4 h-4 border-2 border-cyan-border border-t-transparent rounded-none animate-spin" />
                      Asking Claude to find the best subreddits for your product…
                    </div>
                  ) : (
                    <div className="divide-y divide-panel">
                      {suggestions.map(s => {
                        const added = subreddits.includes(s.subreddit);
                        return (
                          <div
                            key={s.subreddit}
                            onClick={() => toggleSuggestion(s.subreddit)}
                            className={`px-4 py-3 cursor-pointer transition-colors ${
                              added
                                ? 'bg-emerald-500/5 hover:bg-emerald-500/10'
                                : 'hover:bg-overlay'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-0.5">
                                  <span className={`text-sm font-semibold ${added ? 'text-emerald-400' : 'text-t1'}`}>
                                    r/{s.subreddit}
                                  </span>
                                  {s.subscribers && (
                                    <span className="text-t3 text-xs">
                                      {s.subscribers >= 1000000
                                        ? `${(s.subscribers / 1000000).toFixed(1)}M`
                                        : s.subscribers >= 1000
                                        ? `${Math.round(s.subscribers / 1000)}k`
                                        : s.subscribers} members
                                    </span>
                                  )}
                                </div>
                                <p className="text-t2 text-xs leading-relaxed mb-1.5">{s.assessment}</p>
                                <div className="flex items-center gap-3">
                                  <div className="flex-1">{scoreBar(s.overallScore)}</div>
                                  <span className={`text-xs font-bold ${scoreColor(s.overallScore)}`}>
                                    {s.overallScore}/10
                                  </span>
                                </div>
                              </div>
                              <div className={`flex-shrink-0 w-6 h-6 rounded-none border flex items-center justify-center text-xs transition-colors ${
                                added
                                  ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                                  : 'border-cyan-border text-t3 hover:border-cyan hover:text-t2'
                              }`}>
                                {added ? '✓' : '+'}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Current subreddits */}
              {subreddits.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {subreddits.map(sub => (
                    <span
                      key={sub}
                      className="flex items-center gap-1.5 bg-overlay text-t1 text-xs px-3 py-1.5 rounded-none border border-cyan-border"
                    >
                      r/{sub}
                      <button
                        type="button"
                        onClick={() => removeSubreddit(sub)}
                        className="text-t2 hover:text-red-400 transition-colors ml-0.5"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Manual add */}
              <div className="flex gap-2">
                <div className="flex-1 flex items-center bg-panel border border-cyan-border rounded-none px-3 gap-2 focus-within:border-hot-border transition-colors">
                  <span className="text-t2 text-xs">r/</span>
                  <input
                    type="text"
                    value={subredditInput}
                    onChange={e => setSubredditInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSubreddit(); } }}
                    placeholder="add manually"
                    className="flex-1 bg-transparent text-t1 py-2.5 outline-none placeholder-t3 text-sm"
                  />
                </div>
                <button
                  type="button"
                  onClick={addSubreddit}
                  disabled={!subredditInput.trim()}
                  className="bg-overlay hover:bg-overlay disabled:opacity-40 text-t1 text-sm px-4 py-2.5 rounded-none transition-colors"
                >
                  Add
                </button>
              </div>
            </div>

            {/* Alert frequency + timezone */}
            <div className="space-y-3">
              <label className="text-t1 text-sm font-semibold">Alert Frequency</label>

              <div className="grid grid-cols-2 gap-3">
                {/* Daily digest */}
                <button
                  type="button"
                  onClick={() => setAlertFrequency('daily')}
                  className={`p-4 rounded-none border text-left transition-all ${
                    alertFrequency === 'daily'
                      ? 'bg-hot border-hot-border text-t1'
                      : 'bg-panel border-cyan-border text-t2 hover:border-cyan-border'
                  }`}
                >
                  <div className="text-sm font-semibold mb-1">📬 Daily Digest</div>
                  <div className="text-xs opacity-70">Batched summary every morning</div>
                </button>

                {/* Real-time */}
                <button
                  type="button"
                  onClick={() => setAlertFrequency('realtime')}
                  className={`p-4 rounded-none border text-left transition-all ${
                    alertFrequency === 'realtime'
                      ? 'bg-hot border-hot-border text-t1'
                      : 'bg-panel border-cyan-border text-t2 hover:border-cyan-border'
                  }`}
                >
                  <div className="text-sm font-semibold mb-1 flex items-center gap-2">
                    ⚡ As Found
                    <span className="text-xs bg-overlay text-t2 px-1.5 py-0.5 rounded-none border border-cyan-border">soon</span>
                  </div>
                  <div className="text-xs opacity-70">Alert as soon as a thread is spotted</div>
                </button>
              </div>

              {/* Timezone (only relevant for daily) */}
              {alertFrequency === 'daily' && (
                <div className="space-y-1.5">
                  <label className="text-t2 text-xs font-medium">Your timezone</label>
                  <select
                    value={timezone}
                    onChange={e => setTimezone(e.target.value)}
                    className="w-full bg-panel border border-cyan-border rounded-none px-4 py-3 text-t1 text-sm focus:outline-none focus:border-hot-border transition-colors appearance-none cursor-pointer"
                  >
                    {TIMEZONES.map(tz => (
                      <option key={tz.value} value={tz.value}>{tz.label}</option>
                    ))}
                    {/* If user's timezone isn't in our list, add it */}
                    {!TIMEZONES.find(t => t.value === timezone) && (
                      <option value={timezone}>{timezone}</option>
                    )}
                  </select>
                  <p className="text-t3 text-xs">
                    You'll receive your digest at {digestTimeLabel(timezone)} (8am UTC)
                  </p>
                </div>
              )}
            </div>

            {/* Save */}
            <button
              type="submit"
              disabled={saving || !email || !productDescription || subreddits.length === 0}
              className="w-full bg-hot hover:bg-hot disabled:bg-overlay disabled:text-t3 text-t1 font-semibold text-sm py-3.5 rounded-none transition-colors flex items-center justify-center gap-2"
            >
              {saving ? (
                <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-none animate-spin" /> Saving...</>
              ) : saved ? (
                <>✓ Saved — monitoring active</>
              ) : (
                <>🔔 Save Alert Config</>
              )}
            </button>

            {/* Status */}
            {config && (
              <div className="bg-panel border border-cyan-border rounded-none p-4 space-y-1.5 text-xs text-t2">
                <div className="flex justify-between">
                  <span>Monitoring since</span>
                  <span className="text-t1">{new Date(config.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Last digest run</span>
                  <span className="text-t1">
                    {config.lastDigestAt ? new Date(config.lastDigestAt).toLocaleString() : 'Not yet run'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Next digest</span>
                  <span className="text-t1">
                    Daily at {digestTimeLabel(config.timezone ?? 'UTC')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Subreddits tracked</span>
                  <span className="text-t1">{config.subreddits.length}</span>
                </div>
              </div>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
