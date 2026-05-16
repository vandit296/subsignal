'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

type Step = 1 | 2 | 3;

const GOALS = [
  'Get early users',
  'Build brand awareness',
  'Drive traffic',
  'Validate idea',
  'Recruit talent',
  'Grow a community',
];

const SUGGESTED_SUBS = [
  'SaaS', 'startups', 'entrepreneur', 'indiehackers',
  'webdev', 'marketing', 'smallbusiness', 'forhire',
];

export default function OnboardingPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [step, setStep] = useState<Step>(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Step 1 — Company basics
  const [name, setName] = useState('');
  const [website, setWebsite] = useState('');
  const [description, setDescription] = useState('');

  // Step 2 — Goal
  const [goal, setGoal] = useState('');

  // Step 3 — Subreddits
  const [subreddits, setSubreddits] = useState<string[]>([]);
  const [subInput, setSubInput] = useState('');

  function addSub(s: string) {
    const clean = s.replace(/^r\//, '').trim().toLowerCase();
    if (clean && !subreddits.includes(clean)) {
      setSubreddits(prev => [...prev, clean]);
    }
    setSubInput('');
  }

  function removeSub(s: string) {
    setSubreddits(prev => prev.filter(x => x !== s));
  }

  async function finish() {
    if (!session?.user?.email) return;
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          website,
          description,
          goal,
          subreddits,
          alertEmail: session.user.email,
        }),
      });
      if (!res.ok) throw new Error('Failed to save');
      router.push('/feed');
    } catch {
      setError('Something went wrong. Please try again.');
      setSaving(false);
    }
  }

  const canNext1 = name.trim().length > 0 && description.trim().length > 20;
  const canNext2 = goal.length > 0;
  const canFinish = subreddits.length > 0;

  return (
    <div className="min-h-screen bg-[#0f0f11] flex flex-col items-center justify-center px-4 py-12">
      {/* Logo */}
      <div className="flex items-center gap-2.5 mb-10">
        <div className="w-2.5 h-2.5 rounded-full bg-orange-500" />
        <span className="text-white font-bold text-xl tracking-tight">SubSignal</span>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-2 mb-8">
        {([1, 2, 3] as Step[]).map(n => (
          <div key={n} className="flex items-center gap-2">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                step === n
                  ? 'bg-orange-500 text-white'
                  : n < step
                  ? 'bg-orange-500/20 text-orange-400'
                  : 'bg-zinc-800 text-zinc-600'
              }`}
            >
              {n < step ? '✓' : n}
            </div>
            {n < 3 && <div className={`w-8 h-px ${n < step ? 'bg-orange-500/40' : 'bg-zinc-800'}`} />}
          </div>
        ))}
      </div>

      <div className="w-full max-w-md">
        {/* ── Step 1: Company basics ── */}
        {step === 1 && (
          <div className="bg-[#18181b] border border-zinc-800 rounded-2xl p-7">
            <h1 className="text-white text-xl font-bold mb-1">Tell us about your product</h1>
            <p className="text-zinc-500 text-sm mb-6">This powers all AI features across SubSignal.</p>

            <div className="space-y-4">
              <div>
                <label className="text-zinc-400 text-xs font-medium block mb-1.5">Company / Product name</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Acme AI"
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-orange-500 transition-colors placeholder-zinc-600"
                />
              </div>

              <div>
                <label className="text-zinc-400 text-xs font-medium block mb-1.5">Website <span className="text-zinc-600">(optional)</span></label>
                <input
                  type="url"
                  value={website}
                  onChange={e => setWebsite(e.target.value)}
                  placeholder="https://yourproduct.com"
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-orange-500 transition-colors placeholder-zinc-600"
                />
              </div>

              <div>
                <label className="text-zinc-400 text-xs font-medium block mb-1.5">
                  What does your product do?
                  <span className="text-zinc-600 font-normal ml-1">Be specific — this trains the AI</span>
                </label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="e.g. We help SaaS founders find Reddit threads where potential customers are asking questions their product can answer, and auto-draft relevant replies."
                  rows={4}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-orange-500 transition-colors placeholder-zinc-600 resize-none"
                />
                <p className="text-zinc-700 text-[10px] mt-1">{description.length}/500</p>
              </div>
            </div>

            <button
              onClick={() => setStep(2)}
              disabled={!canNext1}
              className="w-full mt-6 bg-orange-500 hover:bg-orange-400 disabled:opacity-40 text-white font-semibold text-sm py-3 rounded-xl transition-colors"
            >
              Continue →
            </button>
          </div>
        )}

        {/* ── Step 2: Goal ── */}
        {step === 2 && (
          <div className="bg-[#18181b] border border-zinc-800 rounded-2xl p-7">
            <h1 className="text-white text-xl font-bold mb-1">What&apos;s your main goal on Reddit?</h1>
            <p className="text-zinc-500 text-sm mb-6">We&apos;ll tailor the thread feed and engagement suggestions to this.</p>

            <div className="grid grid-cols-2 gap-2">
              {GOALS.map(g => (
                <button
                  key={g}
                  onClick={() => setGoal(g)}
                  className={`text-left px-4 py-3 rounded-xl border text-sm font-medium transition-colors ${
                    goal === g
                      ? 'bg-orange-500/10 border-orange-500/40 text-orange-400'
                      : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setStep(1)}
                className="px-4 py-3 text-zinc-500 hover:text-zinc-300 text-sm transition-colors"
              >
                ← Back
              </button>
              <button
                onClick={() => setStep(3)}
                disabled={!canNext2}
                className="flex-1 bg-orange-500 hover:bg-orange-400 disabled:opacity-40 text-white font-semibold text-sm py-3 rounded-xl transition-colors"
              >
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3: Subreddits ── */}
        {step === 3 && (
          <div className="bg-[#18181b] border border-zinc-800 rounded-2xl p-7">
            <h1 className="text-white text-xl font-bold mb-1">Which subreddits do you want to monitor?</h1>
            <p className="text-zinc-500 text-sm mb-5">We&apos;ll scan these for threads where you can engage.</p>

            {/* Input */}
            <div className="flex gap-2 mb-3">
              <div className="flex-1 flex items-center bg-zinc-900 border border-zinc-700 rounded-xl px-3 gap-1.5 focus-within:border-orange-500 transition-colors">
                <span className="text-zinc-500 text-xs font-medium">r/</span>
                <input
                  type="text"
                  value={subInput}
                  onChange={e => setSubInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') addSub(subInput); }}
                  placeholder="SaaS"
                  className="flex-1 bg-transparent text-white py-2.5 text-sm outline-none placeholder-zinc-600"
                />
              </div>
              <button
                onClick={() => addSub(subInput)}
                disabled={!subInput.trim()}
                className="bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-white text-sm px-4 py-2.5 rounded-xl transition-colors"
              >
                Add
              </button>
            </div>

            {/* Quick-add suggestions */}
            <div className="flex flex-wrap gap-1.5 mb-4">
              {SUGGESTED_SUBS.filter(s => !subreddits.includes(s.toLowerCase())).map(s => (
                <button
                  key={s}
                  onClick={() => addSub(s)}
                  className="text-[11px] bg-zinc-800/60 border border-zinc-700 text-zinc-500 hover:text-zinc-300 hover:border-zinc-600 px-2.5 py-1 rounded-full transition-colors"
                >
                  + r/{s}
                </button>
              ))}
            </div>

            {/* Selected */}
            {subreddits.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-5 p-3 bg-zinc-900/50 rounded-xl border border-zinc-800">
                {subreddits.map(s => (
                  <span
                    key={s}
                    className="flex items-center gap-1.5 text-xs bg-orange-500/10 border border-orange-500/20 text-orange-400 px-2.5 py-1 rounded-full"
                  >
                    r/{s}
                    <button
                      onClick={() => removeSub(s)}
                      className="text-orange-500/50 hover:text-orange-400 text-[10px] transition-colors"
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            )}

            {error && <p className="text-red-400 text-xs mb-3">{error}</p>}

            <div className="flex gap-3">
              <button
                onClick={() => setStep(2)}
                className="px-4 py-3 text-zinc-500 hover:text-zinc-300 text-sm transition-colors"
              >
                ← Back
              </button>
              <button
                onClick={finish}
                disabled={!canFinish || saving}
                className="flex-1 bg-orange-500 hover:bg-orange-400 disabled:opacity-40 text-white font-semibold text-sm py-3 rounded-xl transition-colors"
              >
                {saving ? 'Saving…' : 'Launch SubSignal →'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer hint */}
      <p className="mt-6 text-zinc-700 text-xs text-center">
        You can change all of this later in Command ⚙️
      </p>
    </div>
  );
}
