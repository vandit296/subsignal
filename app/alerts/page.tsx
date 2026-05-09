'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { AlertConfig } from '@/types';

export default function AlertsPage() {
  const router = useRouter();
  const [config, setConfig] = useState<AlertConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Form state
  const [email, setEmail] = useState('');
  const [productDescription, setProductDescription] = useState('');
  const [goal, setGoal] = useState('');
  const [subredditInput, setSubredditInput] = useState('');
  const [subreddits, setSubreddits] = useState<string[]>([]);
  const [findingSubreddits, setFindingSubreddits] = useState(false);

  useEffect(() => {
    fetch('/api/alerts')
      .then(r => r.json())
      .then(data => {
        if (data && data.email) {
          setConfig(data);
          setEmail(data.email);
          setProductDescription(data.productDescription);
          setGoal(data.goal ?? '');
          setSubreddits(data.subreddits ?? []);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  async function autoFindSubreddits() {
    if (!productDescription.trim()) return;
    setFindingSubreddits(true);
    try {
      const res = await fetch('/api/find-subreddits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: productDescription, goal }),
      });
      const data = await res.json();
      if (data.matches) {
        const top = data.matches.slice(0, 8).map((m: { subreddit: string }) => m.subreddit);
        setSubreddits(prev => [...new Set([...prev, ...top])]);
      }
    } finally {
      setFindingSubreddits(false);
    }
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

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email || !productDescription || subreddits.length === 0) return;
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, productDescription, goal, subreddits }),
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

  return (
    <div className="min-h-screen bg-[#0f0f11] text-zinc-100">
      {/* Top bar */}
      <div className="sticky top-0 z-10 bg-[#0f0f11] border-b border-zinc-900 px-6 py-3 flex items-center gap-4">
        <button onClick={() => router.push('/')} className="text-zinc-500 hover:text-white text-sm transition-colors">
          ← Back
        </button>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-orange-500" />
          <span className="text-white font-bold text-sm">SubSignal</span>
        </div>
        {config && (
          <span className="ml-auto text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
            ● Monitoring {config.subreddits.length} subreddits
          </span>
        )}
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-white text-3xl font-bold mb-2">Thread Opportunity Alerts</h1>
          <p className="text-zinc-400 text-base leading-relaxed">
            SubSignal monitors your subreddits daily and surfaces threads where your product or expertise would fit — not the popular posts, but the off-beat questions and struggles that are a perfect match for what you're building.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center gap-3 text-zinc-500 text-sm py-8">
            <div className="w-4 h-4 border-2 border-zinc-600 border-t-transparent rounded-full animate-spin" />
            Loading your config...
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-zinc-300 text-sm font-semibold">
                Alert Email <span className="text-red-500">*</span>
              </label>
              <p className="text-zinc-500 text-xs">Where to send your daily digest (once email is wired up).</p>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@yourdomain.com"
                required
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-orange-500/60 transition-colors"
              />
            </div>

            {/* Product description */}
            <div className="space-y-1.5">
              <label className="text-zinc-300 text-sm font-semibold">
                What's your product? <span className="text-red-500">*</span>
              </label>
              <p className="text-zinc-500 text-xs">
                This is what SubSignal uses to judge thread relevance. Be specific — cover what it does, who it's for, and the problem it solves.
              </p>
              <textarea
                value={productDescription}
                onChange={e => setProductDescription(e.target.value)}
                placeholder={`e.g. "SubSignal is a Reddit intelligence tool for founders. It helps them find the right subreddits, score their posts before publishing, and get alerted to relevant threads. Target user: indie hackers and early-stage founders doing organic Reddit marketing."`}
                rows={4}
                required
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-orange-500/60 transition-colors resize-none"
              />
            </div>

            {/* Goal */}
            <div className="space-y-1.5">
              <label className="text-zinc-300 text-sm font-semibold">
                What are you trying to achieve? <span className="text-zinc-500 font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={goal}
                onChange={e => setGoal(e.target.value)}
                placeholder="e.g. Get early users, drive signups, build brand awareness..."
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-orange-500/60 transition-colors"
              />
            </div>

            {/* Subreddits */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-zinc-300 text-sm font-semibold">
                    Subreddits to Monitor <span className="text-red-500">*</span>
                  </label>
                  <p className="text-zinc-500 text-xs mt-0.5">SubSignal scans these daily for relevant threads.</p>
                </div>
                <button
                  type="button"
                  onClick={autoFindSubreddits}
                  disabled={!productDescription.trim() || findingSubreddits}
                  className="text-xs text-orange-400 hover:text-orange-300 border border-orange-500/30 hover:border-orange-400/50 px-2.5 py-1 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
                >
                  {findingSubreddits ? (
                    <><div className="w-3 h-3 border border-orange-400 border-t-transparent rounded-full animate-spin" /> Finding...</>
                  ) : (
                    <>✦ Auto-suggest</>
                  )}
                </button>
              </div>

              {/* Current subreddits */}
              {subreddits.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {subreddits.map(sub => (
                    <span
                      key={sub}
                      className="flex items-center gap-1.5 bg-zinc-800 text-zinc-300 text-xs px-3 py-1.5 rounded-full border border-zinc-700"
                    >
                      r/{sub}
                      <button
                        type="button"
                        onClick={() => removeSubreddit(sub)}
                        className="text-zinc-500 hover:text-red-400 transition-colors ml-0.5"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Add subreddit */}
              <div className="flex gap-2">
                <div className="flex-1 flex items-center bg-zinc-900 border border-zinc-800 rounded-xl px-3 gap-2 focus-within:border-orange-500/60 transition-colors">
                  <span className="text-zinc-500 text-xs">r/</span>
                  <input
                    type="text"
                    value={subredditInput}
                    onChange={e => setSubredditInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSubreddit(); } }}
                    placeholder="startups"
                    className="flex-1 bg-transparent text-white py-2.5 outline-none placeholder-zinc-600 text-sm"
                  />
                </div>
                <button
                  type="button"
                  onClick={addSubreddit}
                  disabled={!subredditInput.trim()}
                  className="bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-white text-sm px-4 py-2.5 rounded-xl transition-colors"
                >
                  Add
                </button>
              </div>
            </div>

            {/* Save */}
            <button
              type="submit"
              disabled={saving || !email || !productDescription || subreddits.length === 0}
              className="w-full bg-orange-500 hover:bg-orange-400 disabled:bg-zinc-800 disabled:text-zinc-600 text-white font-semibold text-sm py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {saving ? (
                <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving...</>
              ) : saved ? (
                <>✓ Saved — monitoring active</>
              ) : (
                <>🔔 Save Alert Config</>
              )}
            </button>

            {/* Status */}
            {config && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-1.5 text-xs text-zinc-500">
                <div className="flex justify-between">
                  <span>Monitoring since</span>
                  <span className="text-zinc-300">{new Date(config.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Last digest run</span>
                  <span className="text-zinc-300">
                    {config.lastDigestAt ? new Date(config.lastDigestAt).toLocaleString() : 'Not yet run'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Next digest</span>
                  <span className="text-zinc-300">Daily at 8am UTC</span>
                </div>
              </div>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
