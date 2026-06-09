'use client';

import { useEffect, useState, useRef } from 'react';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { AlertConfig } from '@/types';
import type { EmailPrefs } from '@/lib/upstash';

const UI = 'var(--font-ui)';
const HOURS = Array.from({ length: 24 }, (_, h) => ({ v: h, l: `${((h % 12) || 12)}:00 ${h < 12 ? 'AM' : 'PM'}` }));
const PAID_CHANNELS = [
  { key: 'dailyNews' as const, ico: '📰', title: 'Daily News — AI Brief', desc: 'AI newspaper of the narratives & debates across your communities.', counts: null as number[] | null, countLabel: '', soon: false },
  { key: 'feed' as const, ico: '🎯', title: 'Market Feed digest', desc: 'Your ranked Reply-now / Add-value opportunities, delivered.', counts: [5, 10, 20], countLabel: 'How many', soon: true },
  { key: 'topic' as const, ico: '🔭', title: 'Topic Watch alerts', desc: 'New threads matching the topics you watch.', counts: null, countLabel: '', soon: true },
];
const DEFAULT_PREFS: EmailPrefs = {
  globalEnabled: true, timezone: 'UTC',
  postsOfDay: { enabled: true, hour: 8, count: 10 },
  dailyNews: { enabled: false, hour: 8 },
  feed: { enabled: false, hour: 8, count: 10 },
  topic: { enabled: false, hour: 8 },
  updatedAt: '',
};

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
      timeZone: tz, hour: 'numeric', minute: '2-digit',
      hour12: true, timeZoneName: 'shortOffset',
    });
    return fmt.format(new Date('2024-01-15T08:00:00Z'));
  } catch {
    return '8:00 AM';
  }
}

function localTimezone(): string {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; }
  catch { return 'UTC'; }
}

// ── Shared input style ──────────────────────────────────────────────────────

const inputBase: React.CSSProperties = {
  width: '100%',
  background: 'var(--panel)',
  border: '0.5px solid var(--border)',
  borderRadius: 9,
  padding: '11px 14px',
  color: 'var(--t1)',
  fontSize: 13.5,
  fontFamily: UI,
  outline: 'none',
  transition: 'border-color 0.15s, box-shadow 0.15s',
};

// ── Section card ────────────────────────────────────────────────────────────

function SectionCard({
  children, title, code, action,
}: {
  children: React.ReactNode;
  title: string;
  code: string;
  action?: React.ReactNode;
}) {
  return (
    <section style={{
      background: 'var(--surface)',
      border: '0.5px solid var(--border)',
      borderRadius: 12,
      overflow: 'hidden',
      marginBottom: 20,
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '15px 20px',
        borderBottom: '0.5px solid var(--border)',
      }}>
        <span style={{ fontSize: 11.5, fontWeight: 600, letterSpacing: '0.05em', color: 'var(--t2)', textTransform: 'uppercase' as const }}>
          {title}
        </span>
        {action ?? (
          <span style={{
            fontSize: 10, color: 'var(--t4)', padding: '2px 7px',
            borderRadius: 4, background: 'var(--overlay)',
            border: '0.5px solid var(--border)',
          }}>
            {code}
          </span>
        )}
      </div>
      <div style={{ padding: '22px 20px' }}>{children}</div>
    </section>
  );
}

// ── Field pieces ────────────────────────────────────────────────────────────

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label style={{
      display: 'block', fontSize: 12, fontWeight: 600,
      color: 'var(--t2)', letterSpacing: '0.03em',
      marginBottom: 7,
    }}>
      {children}
    </label>
  );
}

function FieldHint({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: 12, color: 'var(--t3)', lineHeight: 1.55, marginBottom: 8, marginTop: -4 }}>
      {children}
    </p>
  );
}

function FocusInput({
  value, onChange, placeholder, type = 'text', disabled,
}: {
  value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; disabled?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        ...inputBase,
        borderColor: focused ? 'var(--blue-border)' : 'var(--border)',
        boxShadow: focused ? '0 0 0 3px rgba(74,143,255,0.06)' : 'none',
      }}
    />
  );
}

function FocusTextarea({
  value, onChange, placeholder, rows = 3, disabled,
}: {
  value: string; onChange: (v: string) => void;
  placeholder?: string; rows?: number; disabled?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      disabled={disabled}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        ...inputBase,
        resize: 'none',
        lineHeight: 1.65,
        borderColor: focused ? 'var(--blue-border)' : 'var(--border)',
        boxShadow: focused ? '0 0 0 3px rgba(74,143,255,0.06)' : 'none',
      }}
    />
  );
}

// ── Save row ─────────────────────────────────────────────────────────────────

function SaveRow({ saving, saved, error, onSave }: {
  saving: boolean; saved: boolean; error: string | null; onSave: () => void;
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      paddingTop: 18, marginTop: 18,
      borderTop: '0.5px solid var(--border)',
    }}>
      <button
        onClick={onSave}
        disabled={saving}
        style={{
          padding: '10px 22px', fontSize: 12.5, fontWeight: 600, fontFamily: UI,
          background: 'linear-gradient(135deg, #4a8fff, #3b7de0)',
          border: 'none', borderRadius: 9, color: '#fff',
          cursor: saving ? 'not-allowed' : 'pointer',
          opacity: saving ? 0.65 : 1,
          boxShadow: '0 3px 16px rgba(74,143,255,0.2)',
          transition: 'opacity 0.13s',
        }}
      >
        {saving ? 'Saving…' : 'Save changes'}
      </button>
      {saved && (
        <span style={{ fontSize: 13, color: 'var(--green)', display: 'flex', alignItems: 'center', gap: 5 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          Saved
        </span>
      )}
      {error && <span style={{ fontSize: 13, color: 'var(--danger)' }}>{error}</span>}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function CommandPage() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [subscriptionStatus, setSubscriptionStatus] = useState<string>('trial');
  const [subscriptionId, setSubscriptionId] = useState<string>('');

  // ── Product profile state ──
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

  // ── Alert config state ──
  const [alertFrequency, setAlertFrequency] = useState<'daily' | 'realtime'>('daily');
  const [timezone, setTimezone] = useState(() => {
    if (typeof window === 'undefined') return 'UTC';
    try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; } catch { return 'UTC'; }
  });
  const [alertConfig, setAlertConfig] = useState<AlertConfig | null>(null);

  // Email preferences (new tiered model)
  const [emailPrefs, setEmailPrefs] = useState<EmailPrefs | null>(DEFAULT_PREFS);
  const [paid, setPaid] = useState(false);
  const [prefsSaving, setPrefsSaving] = useState(false);
  const [prefsSaved, setPrefsSaved] = useState(false);

  // ── Save states ──
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [subsSaving, setSubsSaving] = useState(false);
  const [subsSaved, setSubsSaved] = useState(false);
  const [subsError, setSubsError] = useState<string | null>(null);
  const [alertSaving, setAlertSaving] = useState(false);
  const [alertSaved, setAlertSaved] = useState(false);
  const [alertError, setAlertError] = useState<string | null>(null);

  // ── Subreddit suggestions ──
  const [suggesting, setSuggesting] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [sourcesAnalyzed, setSourcesAnalyzed] = useState(0);
  const [suggestError, setSuggestError] = useState<string | null>(null);
  const [subInputFocused, setSubInputFocused] = useState(false);

  const loadedRef = useRef(false);
  useEffect(() => {
    // Load the form ONCE. NextAuth refetches the session on every window refocus,
    // which changes `session` and re-ran this effect — wiping unsaved edits. Guard it.
    if (loadedRef.current) return;
    loadedRef.current = true;

    // detect local timezone
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (tz) setTimezone(tz);
    } catch {}

    fetch('/api/email-prefs').then(r => r.json()).then((d: { prefs?: EmailPrefs; paid?: boolean }) => {
      if (d.prefs) setEmailPrefs(d.prefs);
      setPaid(!!d.paid);
    }).catch(() => {});

    Promise.all([
      fetch('/api/command').then(r => r.json()),
      fetch('/api/alerts').then(r => r.json()),
    ]).then(([companyData, alertData]: [{ user?: { subscriptionStatus: string; subscriptionId?: string }; company?: CompanyData }, AlertConfig & { error?: string }]) => {
      if (companyData.user) {
        setSubscriptionStatus(companyData.user.subscriptionStatus ?? 'trial');
        setSubscriptionId(companyData.user.subscriptionId ?? '');
      }
      if (companyData.company) {
        const c = companyData.company;
        setName(c.name ?? '');
        setWebsite(c.website ?? '');
        setDescription(c.description ?? '');
        setIdealUser(c.idealUser ?? '');
        setGoal(c.goal ?? '');
        setSubreddits(c.subreddits ?? []);
        setAlertEmail(c.alertEmail ?? session?.user?.email ?? '');
        setLinkedinUrl(c.linkedinUrl ?? '');
        setTwitterUrl(c.twitterUrl ?? '');
        setDeckUrl(c.deckUrl ?? '');
      } else {
        setAlertEmail(session?.user?.email ?? '');
      }
      if (alertData && alertData.email && !alertData.error) {
        setAlertConfig(alertData);
        setAlertFrequency(alertData.alertFrequency ?? 'daily');
        setTimezone(alertData.timezone ?? timezone);
        // sync email from alert config if not already set
        if (!alertData.email) setAlertEmail(alertData.email);
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  // Fill the alert email from the session when it resolves — but only if empty,
  // so a window refocus never clobbers what the user has typed.
  useEffect(() => {
    if (session?.user?.email) setAlertEmail(prev => prev || session.user!.email!);
  }, [session]);

  const setChan = (key: 'postsOfDay' | 'dailyNews' | 'feed' | 'topic', patch: Partial<{ enabled: boolean; hour: number; count: number }>) =>
    setEmailPrefs(p => p ? { ...p, [key]: { ...p[key], ...patch } } : p);

  async function saveEmailPrefsHandler() {
    if (!emailPrefs) return;
    setPrefsSaving(true); setPrefsSaved(false);
    try {
      const res = await fetch('/api/email-prefs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prefs: emailPrefs }) });
      const j = await res.json() as { prefs?: EmailPrefs };
      if (j.prefs) setEmailPrefs(j.prefs);
      setPrefsSaved(true); setTimeout(() => setPrefsSaved(false), 2000);
    } catch { /* ignore */ }
    finally { setPrefsSaving(false); }
  }

  function addSub(s: string) {
    const clean = s.replace(/^r\//, '').trim().toLowerCase();
    if (clean && !subreddits.includes(clean)) setSubreddits(prev => [...prev, clean]);
    setSubInput('');
  }

  async function saveProfile() {
    setProfileSaving(true); setProfileSaved(false); setProfileError(null);
    try {
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, website, description, idealUser, goal, subreddits, alertEmail, linkedinUrl, twitterUrl, deckUrl }),
      });
      const data = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok || data.error) {
        setProfileError(data.error ?? 'Save failed. Please try again.');
      } else {
        setProfileSaved(true);
        setTimeout(() => setProfileSaved(false), 3000);
      }
    } catch {
      setProfileError('Network error.');
    } finally {
      setProfileSaving(false);
    }
  }

  async function saveSubs() {
    setSubsSaving(true); setSubsSaved(false); setSubsError(null);
    try {
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, website, description, idealUser, goal, subreddits, alertEmail, linkedinUrl, twitterUrl, deckUrl }),
      });
      const data = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok || data.error) {
        setSubsError(data.error ?? 'Save failed. Please try again.');
      } else {
        setSubsSaved(true);
        setTimeout(() => setSubsSaved(false), 3000);
      }
    } catch {
      setSubsError('Network error.');
    } finally {
      setSubsSaving(false);
    }
  }

  async function saveAlerts() {
    if (!alertEmail || !description || subreddits.length === 0) {
      setAlertError('Fill in your product description and add at least one subreddit first.');
      return;
    }
    setAlertSaving(true); setAlertSaved(false); setAlertError(null);
    try {
      const res = await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: alertEmail,
          productDescription: description,
          productUrl: website,
          goal,
          subreddits,
          timezone,
          alertFrequency,
        }),
      });
      const data = await res.json() as { ok?: boolean; config?: AlertConfig; error?: string };
      if (!res.ok || data.error) {
        setAlertError(data.error ?? 'Save failed.');
      } else {
        if (data.config) setAlertConfig(data.config);
        setAlertSaved(true);
        setTimeout(() => setAlertSaved(false), 3000);
      }
    } catch {
      setAlertError('Network error.');
    } finally {
      setAlertSaving(false);
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: 12 }}>
        <div style={{
          width: 16, height: 16, borderRadius: '50%',
          border: '2px solid rgba(74,143,255,0.3)',
          borderTopColor: 'var(--blue)',
          animation: 'spin 0.7s linear infinite',
        }} />
        <span style={{ color: 'var(--t2)', fontSize: 13 }}>Loading…</span>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '40px 32px 80px', fontFamily: UI }}>

      {/* ── Page header ── */}
      <div style={{ marginBottom: 36 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10,
          fontSize: 10, fontWeight: 600, letterSpacing: '0.07em',
          color: 'var(--t4)', textTransform: 'uppercase',
        }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
          Settings
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.03em', color: 'var(--t1)', lineHeight: 1.1, marginBottom: 8 }}>
          Workspace
        </h1>
        <p style={{ fontSize: 13.5, color: 'var(--t2)', lineHeight: 1.65 }}>
          Your product profile powers Scout, Feed, Watch, and thread opportunity alerts.
        </p>
      </div>

      {/* ── Product Profile ── */}
      <SectionCard title="Product Profile" code="CFG-01">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 18 }}>
          <div>
            <FieldLabel>Product name <span style={{ color: 'var(--danger)' }}>*</span></FieldLabel>
            <FocusInput value={name} onChange={setName} placeholder="e.g. Treddit" />
          </div>
          <div>
            <FieldLabel>Website</FieldLabel>
            <FocusInput value={website} onChange={setWebsite} placeholder="https://yourproduct.com" />
          </div>
        </div>

        <div style={{ marginBottom: 18 }}>
          <FieldLabel>What does your product do? <span style={{ color: 'var(--danger)' }}>*</span></FieldLabel>
          <FocusTextarea
            value={description} onChange={setDescription} rows={3}
            placeholder="Describe your product, who it's for, and the problem it solves…"
          />
        </div>

        <div style={{ marginBottom: 18 }}>
          <FieldLabel>Ideal user</FieldLabel>
          <FieldHint>Powers Feed categories — Ideal User · Competition · Industry · Interesting</FieldHint>
          <FocusTextarea
            value={idealUser} onChange={setIdealUser} rows={2}
            placeholder="e.g. Early-stage founders launching their first SaaS and struggling to find organic growth…"
          />
        </div>

        <div style={{ marginBottom: 18 }}>
          <FieldLabel>Goal on Reddit <span style={{ color: 'var(--danger)' }}>*</span></FieldLabel>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 4 }}>
            {GOALS.map(g => (
              <button
                key={g}
                onClick={() => setGoal(g)}
                style={{
                  padding: '9px 12px', fontSize: 12.5,
                  fontFamily: UI, cursor: 'pointer',
                  borderRadius: 8, textAlign: 'center',
                  border: goal === g ? '0.5px solid var(--hot-border)' : '0.5px solid var(--border)',
                  background: goal === g ? 'var(--hot-dim)' : 'var(--panel)',
                  color: goal === g ? 'var(--hot)' : 'var(--t2)',
                  fontWeight: goal === g ? 500 : 400,
                  transition: 'all 0.13s',
                }}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        <div>
          <FieldLabel>Links</FieldLabel>
          <FieldHint>Our agent reads these to improve subreddit suggestions.</FieldHint>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {[
              { label: 'LinkedIn',    val: linkedinUrl, set: setLinkedinUrl, ph: 'https://linkedin.com/company/yourproduct' },
              { label: 'Twitter / X', val: twitterUrl,  set: setTwitterUrl,  ph: 'https://x.com/yourproduct' },
              { label: 'Deck / PDF',  val: deckUrl,     set: setDeckUrl,     ph: 'Link to pitch deck, Notion, or Google Drive PDF' },
            ].map(f => (
              <div key={f.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 12, color: 'var(--t3)', width: 76, flexShrink: 0 }}>{f.label}</span>
                <FocusInput value={f.val} onChange={f.set} placeholder={f.ph} />
              </div>
            ))}
          </div>
        </div>

        <SaveRow saving={profileSaving} saved={profileSaved} error={profileError} onSave={saveProfile} />
      </SectionCard>

      {/* ── Monitored Subreddits ── */}
      <SectionCard
        title="Monitored Subreddits"
        code="CFG-02"
        action={
          <button
            onClick={suggestSubreddits}
            disabled={suggesting || !description.trim()}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '7px 13px', fontSize: 12, fontFamily: UI,
              border: '0.5px solid var(--blue-border)',
              background: 'var(--blue-dim)', color: 'var(--blue)',
              borderRadius: 8, cursor: 'pointer', fontWeight: 500,
              opacity: suggesting || !description.trim() ? 0.35 : 1,
              transition: 'opacity 0.13s',
            }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
            </svg>
            {suggesting ? 'Finding…' : 'Suggest 5'}
          </button>
        }
      >
        <FieldHint>Scout, Feed, and Alerts scan these subreddits for relevant content.</FieldHint>

        {suggestions.length > 0 && (
          <div style={{
            marginBottom: 14, padding: '13px 16px',
            background: 'var(--blue-dim)', border: '0.5px solid var(--blue-border)',
            borderRadius: 10,
          }}>
            <p style={{ fontSize: 12, color: 'var(--t3)', marginBottom: 10 }}>
              AI suggestions based on {sourcesAnalyzed > 0 ? `your description + ${sourcesAnalyzed} link${sourcesAnalyzed > 1 ? 's' : ''} analyzed` : 'your description'} — click to add:
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
              {suggestions.map(s => {
                const already = subreddits.includes(s);
                return (
                  <button
                    key={s}
                    onClick={() => { if (!already) addSub(s); }}
                    disabled={already}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      padding: '5px 12px', fontSize: 12.5, fontFamily: UI,
                      border: `0.5px solid ${already ? 'var(--border)' : 'var(--blue-border)'}`,
                      background: already ? 'var(--overlay)' : 'var(--surface)',
                      color: already ? 'var(--t3)' : 'var(--blue)',
                      borderRadius: 20, cursor: already ? 'default' : 'pointer',
                      transition: 'background 0.12s',
                    }}
                  >
                    {already ? '✓' : '+'} r/{s}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {suggestError && (
          <p style={{ fontSize: 13, color: 'var(--danger)', marginBottom: 12 }}>{suggestError}</p>
        )}

        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <div style={{
            flex: 1, display: 'flex', alignItems: 'center', gap: 8,
            background: 'var(--panel)',
            border: `0.5px solid ${subInputFocused ? 'var(--blue-border)' : 'var(--border)'}`,
            borderRadius: 9, padding: '0 14px',
            boxShadow: subInputFocused ? '0 0 0 3px rgba(74,143,255,0.06)' : 'none',
            transition: 'border-color 0.15s, box-shadow 0.15s',
          }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--blue)', flexShrink: 0 }}>r/</span>
            <input
              value={subInput}
              onChange={e => setSubInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addSub(subInput); }}
              onFocus={() => setSubInputFocused(true)}
              onBlur={() => setSubInputFocused(false)}
              placeholder="add subreddit"
              style={{
                flex: 1, background: 'transparent', border: 'none', outline: 'none',
                color: 'var(--t1)', fontSize: 13.5, fontFamily: UI, padding: '11px 0',
              }}
            />
          </div>
          <button
            onClick={() => addSub(subInput)}
            disabled={!subInput.trim()}
            style={{
              padding: '11px 18px', fontSize: 13, fontFamily: UI,
              background: 'var(--overlay)', border: '0.5px solid var(--border)',
              color: 'var(--t2)', borderRadius: 9, cursor: 'pointer',
              opacity: subInput.trim() ? 1 : 0.4,
              transition: 'color 0.12s',
            }}
          >
            Add
          </button>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 4 }}>
          {subreddits.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--t4)' }}>No subreddits yet. Use &ldquo;Suggest 5&rdquo; or add manually.</p>
          ) : subreddits.map(s => (
            <span key={s} style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: 'var(--overlay)', border: '0.5px solid var(--border)',
              color: 'var(--t2)', fontSize: 12.5,
              padding: '5px 11px', borderRadius: 20,
            }}>
              r/{s}
              <button
                onClick={() => setSubreddits(prev => prev.filter(x => x !== s))}
                style={{
                  color: 'var(--t4)', background: 'none', border: 'none',
                  cursor: 'pointer', fontSize: 14, padding: 0, lineHeight: 1,
                  display: 'flex', alignItems: 'center',
                  transition: 'color 0.12s',
                }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--t2)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--t4)')}
              >
                ×
              </button>
            </span>
          ))}
        </div>

        <SaveRow saving={subsSaving} saved={subsSaved} error={subsError} onSave={saveSubs} />
      </SectionCard>

      {/* ── Email Alerts ── */}
      <SectionCard title="Email Alerts" code="CFG-03">
        {emailPrefs && (() => {
          const sel = { ...inputBase, appearance: 'none' as const, cursor: 'pointer', paddingRight: 36, padding: '8px 10px', fontSize: 13 };
          const Toggle = ({ on, onClick }: { on: boolean; onClick: () => void }) => (
            <button type="button" onClick={onClick} style={{ position: 'relative', width: 38, height: 22, borderRadius: 11, background: on ? 'var(--blue)' : 'var(--border)', border: 'none', cursor: 'pointer', flexShrink: 0, transition: '0.15s' }}>
              <span style={{ position: 'absolute', top: 2, left: on ? 18 : 2, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: '0.15s' }} />
            </button>
          );
          const paidOn = paid ? PAID_CHANNELS.filter(c => emailPrefs[c.key].enabled).length : 0;
          return (
            <>
              {/* Free — Posts of the Day */}
              <div style={{ background: 'linear-gradient(180deg,rgba(0,200,160,0.06),rgba(0,200,160,0.015))', border: '0.5px solid rgba(0,200,160,0.25)', borderRadius: 11, padding: '14px 16px', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--green)', marginBottom: 4 }}>📬 Posts of the Day · free</div>
                    <div style={{ fontSize: 12.5, color: 'var(--t3)', lineHeight: 1.55 }}>The top posts from the subreddits you track, ranked purely by upvotes + comments over the last 24h. Delivered daily to your account email.</div>
                  </div>
                  <Toggle on={emailPrefs.postsOfDay.enabled} onClick={() => setChan('postsOfDay', { enabled: !emailPrefs.postsOfDay.enabled })} />
                </div>
                {emailPrefs.postsOfDay.enabled && (
                  <div style={{ marginTop: 12 }}>
                    <FieldLabel>How many posts</FieldLabel>
                    <select value={emailPrefs.postsOfDay.count ?? 10} onChange={e => setChan('postsOfDay', { count: +e.target.value })} style={sel}>
                      {[5, 10, 15, 20].map(n => <option key={n} value={n}>Top {n}</option>)}
                    </select>
                  </div>
                )}
              </div>

              {/* Paid section */}
              <div style={{ fontFamily: "'SF Mono',monospace", fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--t4)', margin: '4px 0 10px' }}>
                Paid alerts {paid && paidOn > 0 && <span style={{ color: 'var(--green)' }}>· delivery engine active · {paidOn} scheduled</span>}
              </div>

              {paid ? PAID_CHANNELS.map(c => {
                const ch = emailPrefs[c.key];
                return (
                  <div key={c.key} style={{ background: 'var(--panel)', border: '0.5px solid var(--border)', borderRadius: 11, padding: '13px 15px', marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                      <span style={{ fontSize: 16 }}>{c.ico}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--t1)' }}>{c.title}{c.soon && <span style={{ fontFamily: "'SF Mono',monospace", fontSize: 9, fontWeight: 700, color: 'var(--t3)', background: 'var(--overlay)', border: '0.5px solid var(--border)', padding: '2px 6px', borderRadius: 4, marginLeft: 7 }}>soon</span>}</div>
                        <div style={{ fontSize: 12, color: 'var(--t3)', marginTop: 2 }}>{c.desc}</div>
                      </div>
                      <Toggle on={ch.enabled} onClick={() => setChan(c.key, { enabled: !ch.enabled })} />
                    </div>
                    {ch.enabled && (
                      <div style={{ display: 'grid', gridTemplateColumns: c.counts ? '1fr 1fr' : '1fr', gap: 10, marginTop: 12 }}>
                        <div><FieldLabel>Send at</FieldLabel>
                          <select value={ch.hour} onChange={e => setChan(c.key, { hour: +e.target.value })} style={sel}>{HOURS.map(h => <option key={h.v} value={h.v}>{h.l}</option>)}</select>
                        </div>
                        {c.counts && <div><FieldLabel>{c.countLabel}</FieldLabel>
                          <select value={ch.count ?? 10} onChange={e => setChan(c.key, { count: +e.target.value })} style={sel}>{c.counts.map(n => <option key={n} value={n}>Top {n}</option>)}</select>
                        </div>}
                      </div>
                    )}
                  </div>
                );
              }) : (
                <>
                  {PAID_CHANNELS.map(c => (
                    <div key={c.key} style={{ background: 'var(--panel)', border: '0.5px solid var(--border)', borderRadius: 11, padding: '13px 15px', marginBottom: 10, opacity: 0.62 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 16 }}>{c.ico}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--t1)' }}>{c.title} <span style={{ fontFamily: "'SF Mono',monospace", fontSize: 9, fontWeight: 700, color: 'var(--amber)', background: 'rgba(255,180,0,0.12)', padding: '2px 6px', borderRadius: 4 }}>🔒 paid</span></div>
                          <div style={{ fontSize: 12, color: 'var(--t3)', marginTop: 2 }}>{c.desc}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                  <Link href="/upgrade" style={{ display: 'block', textAlign: 'center', marginTop: 6, marginBottom: 4, padding: '11px 20px', background: 'var(--blue)', color: '#fff', borderRadius: 9, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>Upgrade to unlock all email alerts →</Link>
                </>
              )}

              <SaveRow saving={prefsSaving} saved={prefsSaved} error={null} onSave={saveEmailPrefsHandler} />
            </>
          );
        })()}
      </SectionCard>

      {/* ── Billing ── */}
      <SectionCard title="Billing" code="CFG-04">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div>
            {subscriptionStatus === 'active' ? (
              <>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  padding: '3px 9px', borderRadius: 20, marginBottom: 5,
                  fontSize: 11, fontWeight: 600,
                  background: 'var(--blue-dim)', color: 'var(--blue)',
                  border: '0.5px solid var(--blue-border)',
                }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                  </svg>
                  Pro
                </div>
                <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--t1)', marginBottom: 4 }}>Treddit Pro</p>
                <p style={{ fontSize: 12.5, color: 'var(--t3)' }}>
                  Active subscription ·{' '}
                  {subscriptionId.startsWith('sub_') && !subscriptionId.match(/^sub_[A-Z0-9]{14,}$/)
                    ? 'Razorpay'
                    : subscriptionId.startsWith('sub_')
                    ? 'Stripe'
                    : 'Razorpay'}
                </p>
              </>
            ) : subscriptionStatus === 'trial' ? (
              <>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  padding: '3px 9px', borderRadius: 20, marginBottom: 5,
                  fontSize: 11, fontWeight: 600,
                  background: 'var(--hot-dim)', color: 'var(--hot)',
                  border: '0.5px solid var(--hot-border)',
                }}>
                  Trial
                </div>
                <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--t1)', marginBottom: 4 }}>Free Trial</p>
                <p style={{ fontSize: 12.5, color: 'var(--t3)' }}>Upgrade to keep access after trial ends</p>
              </>
            ) : (
              <>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  padding: '3px 9px', borderRadius: 20, marginBottom: 5,
                  fontSize: 11, fontWeight: 600,
                  background: 'var(--overlay)', color: 'var(--t3)',
                  border: '0.5px solid var(--border)',
                }}>
                  Inactive
                </div>
                <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--t1)', marginBottom: 4 }}>No active plan</p>
                <p style={{ fontSize: 12.5, color: 'var(--t3)' }}>Reactivate to continue using Treddit Pro</p>
              </>
            )}
          </div>
          <Link
            href="/upgrade"
            style={{
              padding: '9px 18px', fontSize: 12.5, fontWeight: 500, fontFamily: UI,
              background: 'var(--overlay)', border: '0.5px solid var(--border)',
              color: 'var(--t2)', borderRadius: 9,
              textDecoration: 'none', display: 'inline-block',
              transition: 'color 0.12s, border-color 0.12s',
              whiteSpace: 'nowrap',
            }}
          >
            {subscriptionStatus === 'active' ? 'Manage plan →' : 'Upgrade →'}
          </Link>
        </div>
      </SectionCard>

      {/* ── Account ── */}
      <SectionCard title="Account" code="CFG-05">
        <div style={{
          display: 'flex', alignItems: 'center', gap: 14,
          paddingBottom: 16, marginBottom: 14,
          borderBottom: '0.5px solid var(--border)',
        }}>
          {session?.user?.image ? (
            <img
              src={session.user.image}
              alt=""
              style={{ width: 40, height: 40, borderRadius: '50%', flexShrink: 0 }}
            />
          ) : (
            <div style={{
              width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
              background: 'linear-gradient(135deg,#ff4500,#ff6534)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16, fontWeight: 700, color: '#fff',
            }}>
              {(session?.user?.name ?? '?')[0].toUpperCase()}
            </div>
          )}
          <div>
            <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--t1)', marginBottom: 3 }}>
              {session?.user?.name}
            </p>
            <p style={{ fontSize: 12.5, color: 'var(--t3)' }}>{session?.user?.email}</p>
          </div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: '/' })}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 13, color: 'var(--t3)', fontFamily: UI,
            padding: 0, transition: 'color 0.12s',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--danger)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--t3)')}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          Sign out
        </button>
      </SectionCard>

    </div>
  );
}
