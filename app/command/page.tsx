'use client';

import { useEffect, useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';

interface CompanyData {
  name: string;
  website: string;
  description: string;
  goal: string;
  subreddits: string[];
  alertEmail: string;
}

const GOALS = [
  'Get early users',
  'Build brand awareness',
  'Drive traffic',
  'Validate idea',
  'Recruit talent',
  'Grow a community',
];

export default function CommandPage() {
  const { data: session } = useSession();
  const [company, setCompany] = useState<CompanyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Editable fields
  const [name, setName] = useState('');
  const [website, setWebsite] = useState('');
  const [description, setDescription] = useState('');
  const [goal, setGoal] = useState('');
  const [subreddits, setSubreddits] = useState<string[]>([]);
  const [alertEmail, setAlertEmail] = useState('');
  const [subInput, setSubInput] = useState('');

  useEffect(() => {
    fetch('/api/command')
      .then(r => r.json())
      .then((d: { company?: CompanyData }) => {
        if (d.company) {
          setCompany(d.company);
          setName(d.company.name);
          setWebsite(d.company.website ?? '');
          setDescription(d.company.description);
          setGoal(d.company.goal);
          setSubreddits(d.company.subreddits ?? []);
          setAlertEmail(d.company.alertEmail ?? session?.user?.email ?? '');
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [session]);

  function addSub(s: string) {
    const clean = s.replace(/^r\//, '').trim().toLowerCase();
    if (clean && !subreddits.includes(clean)) setSubreddits(prev => [...prev, clean]);
    setSubInput('');
  }

  async function save() {
    setSaving(true);
    setSaved(false);
    await fetch('/api/onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, website, description, goal, subreddits, alertEmail }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-white text-2xl font-bold">Command</h1>
        <p className="text-zinc-500 text-sm mt-1">Manage your product profile, subreddits, and billing.</p>
      </div>

      {/* Tabs / sections */}
      <div className="space-y-6">

        {/* ── Product profile ── */}
        <section className="bg-[#18181b] border border-zinc-800 rounded-xl p-5">
          <h2 className="text-white text-sm font-semibold mb-4">Product profile</h2>
          <div className="space-y-3">
            <div>
              <label className="text-zinc-500 text-xs block mb-1">Product name</label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-orange-500 transition-colors"
              />
            </div>
            <div>
              <label className="text-zinc-500 text-xs block mb-1">Website</label>
              <input
                value={website}
                onChange={e => setWebsite(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-orange-500 transition-colors"
              />
            </div>
            <div>
              <label className="text-zinc-500 text-xs block mb-1">What does your product do?</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={3}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-orange-500 transition-colors resize-none"
              />
            </div>
            <div>
              <label className="text-zinc-500 text-xs block mb-1.5">Goal on Reddit</label>
              <div className="grid grid-cols-3 gap-1.5">
                {GOALS.map(g => (
                  <button
                    key={g}
                    onClick={() => setGoal(g)}
                    className={`text-xs px-3 py-2 rounded-lg border transition-colors ${
                      goal === g
                        ? 'bg-orange-500/10 border-orange-500/40 text-orange-400'
                        : 'bg-zinc-900 border-zinc-700 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300'
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── Monitored subreddits ── */}
        <section className="bg-[#18181b] border border-zinc-800 rounded-xl p-5">
          <h2 className="text-white text-sm font-semibold mb-4">Monitored subreddits</h2>

          <div className="flex gap-2 mb-3">
            <div className="flex-1 flex items-center bg-zinc-900 border border-zinc-700 rounded-lg px-3 gap-1 focus-within:border-orange-500 transition-colors">
              <span className="text-zinc-500 text-xs">r/</span>
              <input
                value={subInput}
                onChange={e => setSubInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') addSub(subInput); }}
                placeholder="addsubreddit"
                className="flex-1 bg-transparent text-white py-2 text-sm outline-none placeholder-zinc-600"
              />
            </div>
            <button
              onClick={() => addSub(subInput)}
              disabled={!subInput.trim()}
              className="bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-white text-sm px-4 rounded-lg transition-colors"
            >
              Add
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {subreddits.map(s => (
              <span
                key={s}
                className="flex items-center gap-1.5 text-xs bg-zinc-800 border border-zinc-700 text-zinc-300 px-2.5 py-1 rounded-full"
              >
                r/{s}
                <button
                  onClick={() => setSubreddits(prev => prev.filter(x => x !== s))}
                  className="text-zinc-600 hover:text-red-400 transition-colors"
                >
                  ✕
                </button>
              </span>
            ))}
            {subreddits.length === 0 && (
              <p className="text-zinc-600 text-xs">No subreddits added yet.</p>
            )}
          </div>
        </section>

        {/* ── Alert email ── */}
        <section className="bg-[#18181b] border border-zinc-800 rounded-xl p-5">
          <h2 className="text-white text-sm font-semibold mb-4">Email alerts</h2>
          <div>
            <label className="text-zinc-500 text-xs block mb-1">Send daily digest to</label>
            <input
              type="email"
              value={alertEmail}
              onChange={e => setAlertEmail(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-orange-500 transition-colors"
            />
          </div>
        </section>

        {/* ── Billing ── */}
        <section className="bg-[#18181b] border border-zinc-800 rounded-xl p-5">
          <h2 className="text-white text-sm font-semibold mb-3">Billing</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-zinc-300 text-sm">SubSignal Pro</p>
              <p className="text-zinc-600 text-xs mt-0.5">$25 / month · Managed by DoDo Payments</p>
            </div>
            <Link
              href="/upgrade"
              className="text-xs bg-orange-500/10 border border-orange-500/30 text-orange-400 hover:bg-orange-500/20 px-3 py-1.5 rounded-lg transition-colors"
            >
              Manage →
            </Link>
          </div>
        </section>

        {/* ── Account ── */}
        <section className="bg-[#18181b] border border-zinc-800 rounded-xl p-5">
          <h2 className="text-white text-sm font-semibold mb-3">Account</h2>
          <div className="flex items-center gap-3">
            {session?.user?.image && (
              <img src={session.user.image} className="w-8 h-8 rounded-full" alt="" />
            )}
            <div>
              <p className="text-zinc-300 text-sm">{session?.user?.name}</p>
              <p className="text-zinc-600 text-xs">{session?.user?.email}</p>
            </div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: '/' })}
            className="mt-4 text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
          >
            → Sign out
          </button>
        </section>

        {/* Save button */}
        <div className="flex items-center gap-3">
          <button
            onClick={save}
            disabled={saving}
            className="bg-orange-500 hover:bg-orange-400 disabled:opacity-60 text-white text-sm font-semibold px-6 py-3 rounded-xl transition-colors"
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>
          {saved && <span className="text-green-400 text-xs">✓ Saved</span>}
        </div>
      </div>
    </div>
  );
}
