'use client';

import { useEffect, useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';

const UI = 'system-ui,-apple-system,sans-serif';

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

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'var(--panel)',
  border: '1px solid var(--cyan-border)',
  color: 'var(--t1)',
  fontFamily: 'var(--font-mono)',
  fontSize: 14,
  padding: '11px 14px',
  outline: 'none',
  transition: 'border-color 0.15s ease',
};

function SectionCard({ children, title, code }: { children: React.ReactNode; title: string; code: string }) {
  return (
    <section style={{ background: 'var(--surface)', border: '1px solid var(--cyan-border)', marginBottom: 24 }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--cyan-border)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ color: 'var(--t4)', fontSize: 9, fontFamily: 'var(--font-mono)', letterSpacing: '0.15em' }}>{code}</span>
        <h2 style={{ color: 'var(--t1)', fontSize: 14, fontWeight: 700, fontFamily: 'var(--font-mono)', letterSpacing: '0.06em' }}>{title}</h2>
      </div>
      <div style={{ padding: '20px' }}>
        {children}
      </div>
    </section>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label style={{ display: 'block', color: 'var(--t1)', fontSize: 13, fontWeight: 600, fontFamily: UI, marginBottom: 6 }}>{children}</label>;
}

function FieldHint({ children }: { children: React.ReactNode }) {
  return <p style={{ color: 'var(--t2)', fontSize: 12, fontFamily: UI, lineHeight: 1.5, marginBottom: 8 }}>{children}</p>;
}

function SaveRow({ saving, saved, error, onSave }: {
  saving: boolean; saved: boolean; error: string | null; onSave: () => void;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingTop: 16, marginTop: 16, borderTop: '1px solid var(--panel)' }}>
      <button onClick={onSave} disabled={saving}
        className="btn-void-hot"
        style={{ padding: '10px 24px', fontSize: 11, opacity: saving ? 0.6 : 1 }}>
        {saving ? 'SAVING…' : 'SAVE'}
      </button>
      {saved && <span style={{ color: '#34d399', fontSize: 13, fontFamily: UI }}>✓ Saved</span>}
      {error && <span style={{ color: '#f87171', fontSize: 13, fontFamily: UI }}>✕ {error}</span>}
    </div>
  );
}

export default function CommandPage() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState('');
  const [website, setWebsite] = useState('');
  const [description, setDescription] = useState('');
  const [idealUser, setIdealUser] = useState('');
  const [goal, setGoal] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [twitterUrl, setTwitterUrl] = useState('');
  const [deckUrl, setDeckUrl] = useState('');
  const [subreddits, setSubreddits] = useState<string[]>([]);
  const [subInput, setSubInput] = useState('');
  const [alertEmail, setAlertEmail] = useState('');

  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [subsSaving, setSubsSaving] = useState(false);
  const [subsSaved, setSubsSaved] = useState(false);
  const [subsError, setSubsError] = useState<string | null>(null);

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
    setSaving(true); setSaved(false); setError(null);
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
      setError('Network error.');
    } finally {
      setSaving(false);
    }
  }

  async function suggestSubreddits() {
    if (!description.trim()) return;
    setSuggesting(true); setSuggestions([]); setSuggestError(null); setSourcesAnalyzed(0);
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: 16 }}>
        <div className="scan-loader" style={{ width: 100 }} />
        <span style={{ color: 'var(--t2)', fontFamily: UI, fontSize: 14 }}>Loading...</span>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '40px 32px' }}>

      {/* Header */}
      <div style={{ marginBottom: 36 }}>
        <div style={{ color: 'var(--t4)', fontSize: 9, fontFamily: 'var(--font-mono)', letterSpacing: '0.18em', marginBottom: 8 }}>SYS — COMMAND</div>
        <h1 style={{ color: 'var(--t1)', fontSize: 22, fontWeight: 800, fontFamily: 'var(--font-mono)', letterSpacing: '-0.01em', marginBottom: 8 }}>SETTINGS</h1>
        <p style={{ color: 'var(--t2)', fontSize: 14, fontFamily: UI, lineHeight: 1.6 }}>
          Your product profile powers Feed, Watch, and subreddit suggestions.
        </p>
      </div>

      {/* ── Product Profile ── */}
      <SectionCard title="PRODUCT PROFILE" code="CFG-01">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          <div>
            <FieldLabel>Product name *</FieldLabel>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Treddit" style={inputStyle} />
          </div>
          <div>
            <FieldLabel>Website</FieldLabel>
            <input value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://yourproduct.com" style={inputStyle} />
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <FieldLabel>What does your product do? *</FieldLabel>
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
            placeholder="Describe your product, who it's for, and the problem it solves…"
            style={{ ...inputStyle, resize: 'none', lineHeight: 1.6 }} />
        </div>

        <div style={{ marginBottom: 16 }}>
          <FieldLabel>Who is your ideal user?</FieldLabel>
          <FieldHint>Powers Feed categories (Ideal User · Competition · Industry · Interesting)</FieldHint>
          <textarea value={idealUser} onChange={e => setIdealUser(e.target.value)} rows={2}
            placeholder="e.g. Early-stage founders launching their first SaaS and struggling to find organic growth…"
            style={{ ...inputStyle, resize: 'none', lineHeight: 1.6 }} />
        </div>

        <div style={{ marginBottom: 16 }}>
          <FieldLabel>Goal on Reddit *</FieldLabel>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {GOALS.map(g => (
              <button key={g} onClick={() => setGoal(g)}
                style={{
                  padding: '10px 12px', fontSize: 13, fontFamily: UI, cursor: 'pointer', transition: 'all 0.15s',
                  border: goal === g ? '1px solid var(--hot)' : '1px solid var(--cyan-border)',
                  background: goal === g ? 'var(--hot-dim)' : 'var(--panel)',
                  color: goal === g ? 'var(--hot)' : 'var(--t2)',
                }}>
                {g}
              </button>
            ))}
          </div>
        </div>

        <div>
          <FieldLabel>Links</FieldLabel>
          <FieldHint>Our agent reads these to improve subreddit suggestions.</FieldHint>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { label: 'LinkedIn', val: linkedinUrl, set: setLinkedinUrl, ph: 'https://linkedin.com/company/yourproduct' },
              { label: 'Twitter / X', val: twitterUrl, set: setTwitterUrl, ph: 'https://x.com/yourproduct' },
              { label: 'Deck / PDF', val: deckUrl, set: setDeckUrl, ph: 'Link to pitch deck, Notion, or Google Drive PDF' },
            ].map(f => (
              <div key={f.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ color: 'var(--t3)', fontSize: 12, fontFamily: UI, width: 80, flexShrink: 0 }}>{f.label}</span>
                <input value={f.val} onChange={e => f.set(e.target.value)} placeholder={f.ph}
                  style={{ ...inputStyle, fontSize: 13, padding: '9px 12px' }} />
              </div>
            ))}
          </div>
        </div>

        <SaveRow saving={profileSaving} saved={profileSaved} error={profileError} onSave={() => saveAll('profile')} />
      </SectionCard>

      {/* ── Monitored subreddits ── */}
      <SectionCard title="MONITORED SUBREDDITS" code="CFG-02">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <FieldHint>Subreddits Feed and Alerts scan for relevant content.</FieldHint>
          <button onClick={suggestSubreddits} disabled={suggesting || !description.trim()}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 14px', fontSize: 12, fontFamily: 'var(--font-mono)', letterSpacing: '0.1em',
              border: '1px solid var(--hot-border)', background: 'var(--hot-dim)', color: 'var(--hot)',
              cursor: 'pointer', flexShrink: 0, opacity: suggesting || !description.trim() ? 0.4 : 1,
            }}>
            {suggesting ? '⟳ FINDING...' : '✦ SUGGEST 5'}
          </button>
        </div>

        {suggestions.length > 0 && (
          <div style={{ marginBottom: 16, padding: '14px 16px', background: 'var(--hot-dim)', border: '1px solid var(--hot-border)' }}>
            <p style={{ color: 'var(--t2)', fontSize: 13, fontFamily: UI, marginBottom: 10 }}>
              AI suggestions based on {sourcesAnalyzed > 0 ? `your description + ${sourcesAnalyzed} link${sourcesAnalyzed > 1 ? 's' : ''} analyzed` : 'your description'} — click to add:
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {suggestions.map(s => {
                const already = subreddits.includes(s);
                return (
                  <button key={s} onClick={() => { if (!already) addSub(s); }} disabled={already}
                    style={{
                      padding: '7px 14px', fontSize: 13, fontFamily: UI, cursor: already ? 'default' : 'pointer',
                      border: already ? '1px solid var(--cyan-border)' : '1px solid var(--hot-border)',
                      background: already ? 'var(--overlay)' : 'var(--hot-dim)',
                      color: already ? 'var(--t3)' : 'var(--hot)',
                    }}>
                    {already ? '✓ ' : '+ '}r/{s}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {suggestError && <p style={{ color: '#f87171', fontSize: 13, fontFamily: UI, marginBottom: 12 }}>{suggestError}</p>}

        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', background: 'var(--panel)', border: '1px solid var(--cyan-border)', padding: '0 14px', gap: 8 }}>
            <span style={{ color: 'var(--cyan)', fontSize: 13, fontWeight: 700 }}>r/</span>
            <input value={subInput} onChange={e => setSubInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addSub(subInput); }}
              placeholder="add subreddit"
              style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'var(--t1)', fontSize: 14, fontFamily: 'var(--font-mono)', padding: '11px 0' }} />
          </div>
          <button onClick={() => addSub(subInput)} disabled={!subInput.trim()}
            style={{ padding: '11px 20px', fontSize: 13, fontFamily: UI, background: 'var(--overlay)', border: '1px solid var(--cyan-border)', color: 'var(--t1)', cursor: 'pointer', opacity: subInput.trim() ? 1 : 0.4 }}>
            Add
          </button>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 4 }}>
          {subreddits.map(s => (
            <span key={s} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--overlay)', border: '1px solid var(--cyan-border)', color: 'var(--t1)', fontSize: 13, fontFamily: 'var(--font-mono)', padding: '6px 12px' }}>
              r/{s}
              <button onClick={() => setSubreddits(prev => prev.filter(x => x !== s))}
                style={{ color: 'var(--t3)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, padding: 0, lineHeight: 1 }}>×</button>
            </span>
          ))}
          {subreddits.length === 0 && (
            <p style={{ color: 'var(--t3)', fontSize: 13, fontFamily: UI }}>No subreddits yet. Use "Suggest 5" or add manually.</p>
          )}
        </div>

        <SaveRow saving={subsSaving} saved={subsSaved} error={subsError} onSave={() => saveAll('subs')} />
      </SectionCard>

      {/* ── Email alerts ── */}
      <SectionCard title="EMAIL ALERTS" code="CFG-03">
        <FieldLabel>Send daily digest to</FieldLabel>
        <input type="email" value={alertEmail} onChange={e => setAlertEmail(e.target.value)}
          style={inputStyle} />
      </SectionCard>

      {/* ── Billing ── */}
      <SectionCard title="BILLING" code="CFG-04">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{ color: 'var(--t1)', fontSize: 14, fontFamily: UI, fontWeight: 600, marginBottom: 4 }}>Treddit Pro</p>
            <p style={{ color: 'var(--t3)', fontSize: 13, fontFamily: UI }}>₹2,000 / month · Managed by DoDo Payments</p>
          </div>
          <Link href="/upgrade" className="btn-void-hot" style={{ padding: '10px 20px', fontSize: 11 }}>
            MANAGE →
          </Link>
        </div>
      </SectionCard>

      {/* ── Account ── */}
      <SectionCard title="ACCOUNT" code="CFG-05">
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
          {session?.user?.image && (
            <img src={session.user.image} style={{ width: 40, height: 40, clipPath: 'polygon(20% 0%,80% 0%,100% 20%,100% 80%,80% 100%,20% 100%,0% 80%,0% 20%)' }} alt="" />
          )}
          <div>
            <p style={{ color: 'var(--t1)', fontSize: 14, fontFamily: UI, fontWeight: 600 }}>{session?.user?.name}</p>
            <p style={{ color: 'var(--t3)', fontSize: 13, fontFamily: UI }}>{session?.user?.email}</p>
          </div>
        </div>
        <button onClick={() => signOut({ callbackUrl: '/' })}
          style={{ color: 'var(--t3)', fontSize: 13, fontFamily: UI, background: 'none', border: 'none', cursor: 'pointer' }}>
          → Sign out
        </button>
      </SectionCard>

    </div>
  );
}
