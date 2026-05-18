'use client';

import { useEffect, useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';

interface CompanyData {
  name: string;
  website: string;
  description: string;
  idealUser: string;
  goal: string;
  subreddits: string[];
  alertEmail: string;
  linkedinUrl?: string;
  twitterUrl?: string;
  deckUrl?: string;
}

const GOALS = [
  'Get early users',
  'Build brand awareness',
  'Drive traffic',
  'Validate idea',
  'Recruit talent',
  'Grow a community',
];

function SaveRow({ saving, saved, error, onSave }: {
  saving: boolean; saved: boolean; error: string | null; onSave: () => void;
}) {
  return (
    <div className="flex items-center gap-3 pt-2">
      <button
        onClick={onSave}
        disabled={saving}
        className="bg-hot hover:bg-hot disabled:opacity-60 text-t1 text-xs font-semibold px-4 py-2 rounded-none transition-colors"
      >
        {saving ? 'Saving…' : 'Save'}
      </button>
      {saved && <span className="text-green-400 text-xs">✓ Saved</span>}
      {error && <span className="text-red-400 text-xs">✕ {error}</span>}
    </div>
  );
}

export default function CommandPage() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);

  // Product profile fields
  const [name, setName] = useState('');
  const [website, setWebsite] = useState('');
  const [description, setDescription] = useState('');
  const [idealUser, setIdealUser] = useState('');
  const [goal, setGoal] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [twitterUrl, setTwitterUrl] = useState('');
  const [deckUrl, setDeckUrl] = useState('');

  // Subreddits
  const [subreddits, setSubreddits] = useState<string[]>([]);
  const [subInput, setSubInput] = useState('');

  // Alert email
  const [alertEmail, setAlertEmail] = useState('');

  // Save state — separate for profile vs subreddits vs email
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [subsSaving, setSubsSaving] = useState(false);
  const [subsSaved, setSubsSaved] = useState(false);
  const [subsError, setSubsError] = useState<string | null>(null);

  // Subreddit suggestions
  const [suggesting, setSuggesting] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [sourcesAnalyzed, setSourcesAnalyzed] = useState(0);
  const [suggestError, setSuggestError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/command')
      .then(r => r.json())
      .then((d: { company?: CompanyData }) => {
        if (d.company) {
          setName(d.company.name ?? '');
          setWebsite(d.company.website ?? '');
          setDescription(d.company.description ?? '');
          setIdealUser(d.company.idealUser ?? '');
          setGoal(d.company.goal ?? '');
          setSubreddits(d.company.subreddits ?? []);
          setAlertEmail(d.company.alertEmail ?? session?.user?.email ?? '');
          setLinkedinUrl(d.company.linkedinUrl ?? '');
          setTwitterUrl(d.company.twitterUrl ?? '');
          setDeckUrl(d.company.deckUrl ?? '');
        } else {
          setAlertEmail(session?.user?.email ?? '');
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

  async function saveAll(section: 'profile' | 'subs') {
    const setSaving = section === 'profile' ? setProfileSaving : setSubsSaving;
    const setSaved  = section === 'profile' ? setProfileSaved  : setSubsSaved;
    const setError  = section === 'profile' ? setProfileError  : setSubsError;

    setSaving(true);
    setSaved(false);
    setError(null);

    try {
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, website, description, idealUser, goal, subreddits, alertEmail, linkedinUrl, twitterUrl, deckUrl }),
      });
      const data = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok || data.error) {
        setError(data.error ?? 'Save failed. Please try again.');
      } else {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function suggestSubreddits() {
    if (!description.trim()) return;
    setSuggesting(true);
    setSuggestions([]);
    setSuggestError(null);
    setSourcesAnalyzed(0);

    try {
      const res = await fetch('/api/suggest-subreddits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description, goal, website, linkedinUrl, twitterUrl, deckUrl }),
      });
      const data = await res.json() as { suggestions?: string[]; sourcesAnalyzed?: number; error?: string };
      if (data.error) {
        setSuggestError('Could not generate suggestions. Try again.');
      } else {
        setSuggestions(data.suggestions ?? []);
        setSourcesAnalyzed(data.sourcesAnalyzed ?? 0);
      }
    } catch {
      setSuggestError('Network error.');
    } finally {
      setSuggesting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-5 h-5 border-2 border-hot-border border-t-transparent rounded-none animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-t1 text-2xl font-bold">Command</h1>
        <p className="text-t2 text-sm mt-1">Your product profile powers Feed, Watch, and subreddit suggestions.</p>
      </div>

      <div className="space-y-6">

        {/* ── Product profile ── */}
        <section className="bg-surface border border-cyan-border rounded-none p-5">
          <h2 className="text-t1 text-sm font-semibold mb-4">Product profile</h2>
          <div className="space-y-3">

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-t2 text-xs block mb-1">Product name *</label>
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Treddit"
                  className="w-full bg-panel border border-cyan-border rounded-none px-3 py-2.5 text-t1 text-sm outline-none focus:border-hot-border transition-colors placeholder-t3"
                />
              </div>
              <div>
                <label className="text-t2 text-xs block mb-1">Website</label>
                <input
                  value={website}
                  onChange={e => setWebsite(e.target.value)}
                  placeholder="https://yourproduct.com"
                  className="w-full bg-panel border border-cyan-border rounded-none px-3 py-2.5 text-t1 text-sm outline-none focus:border-hot-border transition-colors placeholder-t3"
                />
              </div>
            </div>

            <div>
              <label className="text-t2 text-xs block mb-1">What does your product do? *</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={3}
                placeholder="Describe your product, who it's for, and the problem it solves…"
                className="w-full bg-panel border border-cyan-border rounded-none px-3 py-2.5 text-t1 text-sm outline-none focus:border-hot-border transition-colors resize-none placeholder-t3"
              />
            </div>

            <div>
              <label className="text-t2 text-xs block mb-1">
                Who is your ideal user?
                <span className="text-t3 ml-1">(ICP — powers Feed categories)</span>
              </label>
              <textarea
                value={idealUser}
                onChange={e => setIdealUser(e.target.value)}
                rows={2}
                placeholder="e.g. Early-stage founders who are launching their first SaaS and struggling to find their first 100 users organically…"
                className="w-full bg-panel border border-cyan-border rounded-none px-3 py-2.5 text-t1 text-sm outline-none focus:border-hot-border transition-colors resize-none placeholder-t3"
              />
              <p className="text-t3 text-[10px] mt-1">Feed will separate threads by: Ideal User · Competition · Industry · Interesting</p>
            </div>

            <div>
              <label className="text-t2 text-xs block mb-1.5">Goal on Reddit *</label>
              <div className="grid grid-cols-3 gap-1.5">
                {GOALS.map(g => (
                  <button
                    key={g}
                    onClick={() => setGoal(g)}
                    className={`text-xs px-3 py-2 rounded-none border transition-colors ${
                      goal === g
                        ? 'bg-hot border-hot-border text-hot'
                        : 'bg-panel border-cyan-border text-t2 hover:border-cyan-border hover:text-t1'
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            {/* Social + deck links */}
            <div className="pt-1">
              <label className="text-t2 text-xs block mb-2">
                Links <span className="text-t3">(our agent visits these to improve subreddit suggestions)</span>
              </label>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-t3 text-xs w-20 flex-shrink-0">LinkedIn</span>
                  <input
                    value={linkedinUrl}
                    onChange={e => setLinkedinUrl(e.target.value)}
                    placeholder="https://linkedin.com/company/yourproduct"
                    className="flex-1 bg-panel border border-cyan-border rounded-none px-3 py-2 text-t1 text-xs outline-none focus:border-hot-border transition-colors placeholder-t3"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-t3 text-xs w-20 flex-shrink-0">Twitter / X</span>
                  <input
                    value={twitterUrl}
                    onChange={e => setTwitterUrl(e.target.value)}
                    placeholder="https://x.com/yourproduct"
                    className="flex-1 bg-panel border border-cyan-border rounded-none px-3 py-2 text-t1 text-xs outline-none focus:border-hot-border transition-colors placeholder-t3"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-t3 text-xs w-20 flex-shrink-0">Deck / PDF</span>
                  <input
                    value={deckUrl}
                    onChange={e => setDeckUrl(e.target.value)}
                    placeholder="Link to pitch deck, Notion page, or Google Drive PDF"
                    className="flex-1 bg-panel border border-cyan-border rounded-none px-3 py-2 text-t1 text-xs outline-none focus:border-hot-border transition-colors placeholder-t3"
                  />
                </div>
              </div>
            </div>

          </div>

          <SaveRow saving={profileSaving} saved={profileSaved} error={profileError} onSave={() => saveAll('profile')} />
        </section>

        {/* ── Monitored subreddits ── */}
        <section className="bg-surface border border-cyan-border rounded-none p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-t1 text-sm font-semibold">Monitored subreddits</h2>
            <button
              onClick={suggestSubreddits}
              disabled={suggesting || !description.trim()}
              title={!description.trim() ? 'Fill in your product description first' : ''}
              className="text-xs text-hot hover:text-hot disabled:text-t3 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
            >
              {suggesting ? (
                <>
                  <span className="w-3 h-3 border border-hot-border border-t-transparent rounded-none animate-spin inline-block" />
                  Analyzing your links…
                </>
              ) : (
                '✨ Suggest 5 for me'
              )}
            </button>
          </div>

          {/* AI suggestions */}
          {suggestions.length > 0 && (
            <div className="mb-4 p-3 bg-hot border border-hot-border rounded-none">
              <p className="text-t2 text-xs mb-2">
                AI suggestions based on {sourcesAnalyzed > 0 ? `your description + ${sourcesAnalyzed} link${sourcesAnalyzed > 1 ? 's' : ''} analyzed` : 'your description'} — click to add:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {suggestions.map(s => {
                  const already = subreddits.includes(s);
                  return (
                    <button
                      key={s}
                      onClick={() => { if (!already) addSub(s); }}
                      disabled={already}
                      className={`text-xs px-3 py-1.5 rounded-none border transition-colors ${
                        already
                          ? 'bg-overlay border-cyan-border text-t3 cursor-default'
                          : 'bg-hot border-hot-border text-hot hover:bg-hot'
                      }`}
                    >
                      {already ? '✓ ' : '+ '}r/{s}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {suggestError && (
            <p className="text-red-400 text-xs mb-3">{suggestError}</p>
          )}

          <div className="flex gap-2 mb-3">
            <div className="flex-1 flex items-center bg-panel border border-cyan-border rounded-none px-3 gap-1 focus-within:border-hot-border transition-colors">
              <span className="text-t2 text-xs">r/</span>
              <input
                value={subInput}
                onChange={e => setSubInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') addSub(subInput); }}
                placeholder="addsubreddit"
                className="flex-1 bg-transparent text-t1 py-2 text-sm outline-none placeholder-t3"
              />
            </div>
            <button
              onClick={() => addSub(subInput)}
              disabled={!subInput.trim()}
              className="bg-overlay hover:bg-overlay disabled:opacity-40 text-t1 text-sm px-4 rounded-none transition-colors"
            >
              Add
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5 mb-4">
            {subreddits.map(s => (
              <span
                key={s}
                className="flex items-center gap-1.5 text-xs bg-overlay border border-cyan-border text-t1 px-2.5 py-1 rounded-none"
              >
                r/{s}
                <button
                  onClick={() => setSubreddits(prev => prev.filter(x => x !== s))}
                  className="text-t3 hover:text-red-400 transition-colors"
                >
                  ✕
                </button>
              </span>
            ))}
            {subreddits.length === 0 && (
              <p className="text-t3 text-xs">No subreddits added yet. Use &quot;Suggest 5 for me&quot; above or add manually.</p>
            )}
          </div>

          <SaveRow saving={subsSaving} saved={subsSaved} error={subsError} onSave={() => saveAll('subs')} />
        </section>

        {/* ── Alert email ── */}
        <section className="bg-surface border border-cyan-border rounded-none p-5">
          <h2 className="text-t1 text-sm font-semibold mb-4">Email alerts</h2>
          <div>
            <label className="text-t2 text-xs block mb-1">Send daily digest to</label>
            <input
              type="email"
              value={alertEmail}
              onChange={e => setAlertEmail(e.target.value)}
              className="w-full bg-panel border border-cyan-border rounded-none px-3 py-2.5 text-t1 text-sm outline-none focus:border-hot-border transition-colors"
            />
          </div>
        </section>

        {/* ── Billing ── */}
        <section className="bg-surface border border-cyan-border rounded-none p-5">
          <h2 className="text-t1 text-sm font-semibold mb-3">Billing</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-t1 text-sm">Treddit Pro</p>
              <p className="text-t3 text-xs mt-0.5">$25 / month · Managed by DoDo Payments</p>
            </div>
            <Link
              href="/upgrade"
              className="text-xs bg-hot border border-hot-border text-hot hover:bg-hot px-3 py-1.5 rounded-none transition-colors"
            >
              Manage →
            </Link>
          </div>
        </section>

        {/* ── Account ── */}
        <section className="bg-surface border border-cyan-border rounded-none p-5">
          <h2 className="text-t1 text-sm font-semibold mb-3">Account</h2>
          <div className="flex items-center gap-3">
            {session?.user?.image && (
              <img src={session.user.image} className="w-8 h-8 rounded-none" alt="" />
            )}
            <div>
              <p className="text-t1 text-sm">{session?.user?.name}</p>
              <p className="text-t3 text-xs">{session?.user?.email}</p>
            </div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: '/' })}
            className="mt-4 text-xs text-t3 hover:text-t2 transition-colors"
          >
            → Sign out
          </button>
        </section>

      </div>
    </div>
  );
}
