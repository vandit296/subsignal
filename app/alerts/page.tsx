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

const UI = 'system-ui,-apple-system,sans-serif';

function digestTimeLabel(tz: string) {
  try {
    const fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: tz, hour: 'numeric', minute: '2-digit',
      hour12: true, timeZoneName: 'short',
    });
    return fmt.format(new Date('2024-01-15T08:00:00Z'));
  } catch {
    return '8:00 AM UTC';
  }
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ color: 'var(--t4)', fontSize: 9, fontFamily: 'var(--font-mono)', letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 16 }}>
      {children}
    </div>
  );
}

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label style={{ display: 'block', color: 'var(--t1)', fontSize: 14, fontWeight: 600, fontFamily: UI, marginBottom: 6 }}>
      {children}
      {required && <span style={{ color: 'var(--hot)', marginLeft: 4 }}>*</span>}
    </label>
  );
}

function FieldHint({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ color: 'var(--t2)', fontSize: 13, fontFamily: UI, lineHeight: 1.6, marginBottom: 10 }}>
      {children}
    </p>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'var(--panel)',
  border: '1px solid var(--cyan-border)',
  color: 'var(--t1)',
  fontFamily: 'var(--font-mono)',
  fontSize: 14,
  padding: '12px 16px',
  outline: 'none',
  transition: 'border-color 0.15s ease',
};

export default function AlertsPage() {
  const router = useRouter();
  const [config, setConfig] = useState<AlertConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [email, setEmail] = useState('');
  const [productDescription, setProductDescription] = useState('');
  const [productUrl, setProductUrl] = useState('');
  const [goal, setGoal] = useState('');
  const [subredditInput, setSubredditInput] = useState('');
  const [subreddits, setSubreddits] = useState<string[]>([]);
  const [timezone, setTimezone] = useState('UTC');
  const [alertFrequency, setAlertFrequency] = useState<'daily' | 'realtime'>('daily');

  const [findingSubreddits, setFindingSubreddits] = useState(false);
  const [suggestions, setSuggestions] = useState<SubredditMatch[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
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
      if (data.matches) setSuggestions(data.matches.slice(0, 10));
    } finally {
      setFindingSubreddits(false);
    }
  }

  function toggleSuggestion(sub: string) {
    setSubreddits(prev => prev.includes(sub) ? prev.filter(s => s !== sub) : [...prev, sub]);
  }

  function addSubreddit() {
    const sub = subredditInput.replace(/^r\//, '').trim().toLowerCase();
    if (sub && !subreddits.includes(sub)) setSubreddits(prev => [...prev, sub]);
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
    if (score >= 8) return '#34d399';
    if (score >= 6) return 'var(--hot)';
    return 'var(--t2)';
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--void)', color: 'var(--t1)' }}>

      {/* Page header */}
      <div style={{ borderBottom: '1px solid var(--cyan-border)', padding: '20px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ color: 'var(--t4)', fontSize: 9, fontFamily: 'var(--font-mono)', letterSpacing: '0.18em', marginBottom: 6 }}>MOD-06</div>
          <h1 style={{ color: 'var(--t1)', fontSize: 22, fontWeight: 800, fontFamily: 'var(--font-mono)', letterSpacing: '-0.01em' }}>THREAD OPPORTUNITY ALERTS</h1>
          <p style={{ color: 'var(--t2)', fontSize: 14, fontFamily: UI, lineHeight: 1.6, marginTop: 6, maxWidth: 560 }}>
            Treddit monitors your subreddits daily and surfaces threads where your product would fit — not the popular posts, but the off-beat questions that are a perfect match for what you're building.
          </p>
        </div>
        {config && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.25)', padding: '8px 14px', flexShrink: 0 }}>
            <span className="live-dot" style={{ background: '#34d399', boxShadow: '0 0 6px rgba(52,211,153,0.4)' }} />
            <span style={{ color: '#34d399', fontSize: 11, fontFamily: 'var(--font-mono)', letterSpacing: '0.1em' }}>
              MONITORING {config.subreddits.length} SUBREDDITS
            </span>
          </div>
        )}
      </div>

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '40px 32px', display: 'flex', flexDirection: 'column', gap: 0 }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'var(--t2)', padding: '48px 0' }}>
            <div className="scan-loader" style={{ width: 120 }} />
            <span style={{ fontFamily: UI, fontSize: 14 }}>Loading your config...</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>

            {/* ── Alert Email ── */}
            <div style={{ marginBottom: 36 }}>
              <SectionLabel>01 — Contact</SectionLabel>
              <FieldLabel required>Alert Email</FieldLabel>
              <FieldHint>Where to send your daily digest.</FieldHint>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@yourdomain.com" required
                style={inputStyle}
              />
            </div>

            {/* ── Product ── */}
            <div style={{ marginBottom: 36, paddingTop: 32, borderTop: '1px solid var(--cyan-border)' }}>
              <SectionLabel>02 — Your Product</SectionLabel>
              <FieldLabel required>What's your product?</FieldLabel>
              <FieldHint>
                The more specific you are, the better Treddit can judge relevance. Describe what it does, who it's for, and the problem it solves.
              </FieldHint>
              <textarea
                value={productDescription}
                onChange={e => setProductDescription(e.target.value)}
                placeholder={`e.g. "Treddit is a Reddit intelligence tool for founders. It helps indie hackers find the right subreddits, score their posts before publishing, and get alerted to relevant threads where they can drive organic signups."`}
                rows={4} required
                style={{ ...inputStyle, resize: 'none', lineHeight: 1.6 }}
              />
            </div>

            {/* ── Product URL ── */}
            <div style={{ marginBottom: 36 }}>
              <FieldLabel>Product URL <span style={{ color: 'var(--t3)', fontWeight: 400, fontSize: 13, fontFamily: UI }}>(optional)</span></FieldLabel>
              <FieldHint>Treddit will read your landing page for additional context when suggesting subreddits.</FieldHint>
              <input
                type="url" value={productUrl} onChange={e => setProductUrl(e.target.value)}
                placeholder="https://yourproduct.com"
                style={inputStyle}
              />
            </div>

            {/* ── Goal ── */}
            <div style={{ marginBottom: 36, paddingTop: 32, borderTop: '1px solid var(--cyan-border)' }}>
              <SectionLabel>03 — Goal</SectionLabel>
              <FieldLabel>What are you trying to achieve? <span style={{ color: 'var(--t3)', fontWeight: 400, fontSize: 13, fontFamily: UI }}>(optional)</span></FieldLabel>
              <FieldHint>Shapes how Treddit scores thread relevance. Pick a preset or write your own.</FieldHint>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                {GOAL_PRESETS.map(preset => (
                  <button
                    key={preset} type="button" onClick={() => toggleGoalPreset(preset)}
                    style={{
                      padding: '8px 14px', fontFamily: UI, fontSize: 13, cursor: 'pointer',
                      border: goal === preset ? '1px solid var(--hot)' : '1px solid var(--cyan-border)',
                      background: goal === preset ? 'var(--hot-dim)' : 'var(--panel)',
                      color: goal === preset ? 'var(--hot)' : 'var(--t2)',
                      transition: 'all 0.15s',
                    }}
                  >
                    {preset}
                  </button>
                ))}
              </div>

              <input
                type="text" value={goal} onChange={e => setGoal(e.target.value)}
                placeholder="Or describe your own goal..."
                style={inputStyle}
              />
            </div>

            {/* ── Subreddits ── */}
            <div style={{ marginBottom: 36, paddingTop: 32, borderTop: '1px solid var(--cyan-border)' }}>
              <SectionLabel>04 — Subreddits to Monitor</SectionLabel>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                <div>
                  <FieldLabel required>Subreddits to Monitor</FieldLabel>
                  <FieldHint>Treddit scans these daily for threads relevant to your product.</FieldHint>
                </div>
                <button
                  type="button" onClick={autoFindSubreddits}
                  disabled={!productDescription.trim() || findingSubreddits}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '9px 16px', fontSize: 12, fontFamily: 'var(--font-mono)',
                    letterSpacing: '0.1em', cursor: 'pointer', flexShrink: 0,
                    border: '1px solid var(--hot-border)', background: 'var(--hot-dim)',
                    color: 'var(--hot)', opacity: !productDescription.trim() || findingSubreddits ? 0.4 : 1,
                    transition: 'all 0.15s',
                  }}
                >
                  {findingSubreddits ? '⟳ FINDING...' : '✦ AUTO-SUGGEST'}
                </button>
              </div>

              {/* Suggestion panel */}
              {showSuggestions && (
                <div style={{ border: '1px solid var(--cyan-border)', background: 'var(--panel)', marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid var(--cyan-border)' }}>
                    <span style={{ color: 'var(--t1)', fontSize: 13, fontFamily: UI, fontWeight: 600 }}>
                      {findingSubreddits ? 'Finding subreddits…' : `${suggestions.length} subreddits found — click to add`}
                    </span>
                    <button type="button" onClick={() => setShowSuggestions(false)}
                      style={{ color: 'var(--t3)', fontSize: 13, background: 'none', border: 'none', cursor: 'pointer', fontFamily: UI }}>
                      close ×
                    </button>
                  </div>
                  {findingSubreddits ? (
                    <div style={{ padding: '24px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div className="scan-loader" style={{ width: 80 }} />
                      <span style={{ color: 'var(--t2)', fontSize: 13, fontFamily: UI }}>Asking Claude to find the best subreddits for your product…</span>
                    </div>
                  ) : (
                    <div>
                      {suggestions.map(s => {
                        const added = subreddits.includes(s.subreddit);
                        return (
                          <div key={s.subreddit} onClick={() => toggleSuggestion(s.subreddit)}
                            style={{
                              padding: '12px 16px', cursor: 'pointer', borderBottom: '1px solid var(--panel)',
                              background: added ? 'rgba(52,211,153,0.05)' : 'transparent',
                              transition: 'background 0.15s',
                            }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                                  <span style={{ color: added ? '#34d399' : 'var(--t1)', fontSize: 14, fontWeight: 600, fontFamily: UI }}>
                                    r/{s.subreddit}
                                  </span>
                                  {s.subscribers && (
                                    <span style={{ color: 'var(--t3)', fontSize: 12, fontFamily: UI }}>
                                      {s.subscribers >= 1000000 ? `${(s.subscribers / 1000000).toFixed(1)}M` : `${Math.round(s.subscribers / 1000)}k`} members
                                    </span>
                                  )}
                                </div>
                                <p style={{ color: 'var(--t2)', fontSize: 13, fontFamily: UI, lineHeight: 1.5, marginBottom: 8 }}>{s.assessment}</p>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                  <div style={{ flex: 1, height: 2, background: 'var(--overlay)', overflow: 'hidden' }}>
                                    <div style={{ height: '100%', width: `${(s.overallScore / 10) * 100}%`, background: scoreColor(s.overallScore) }} />
                                  </div>
                                  <span style={{ color: scoreColor(s.overallScore), fontSize: 12, fontWeight: 700, fontFamily: UI }}>{s.overallScore}/10</span>
                                </div>
                              </div>
                              <div style={{
                                width: 28, height: 28, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                border: added ? '1px solid rgba(52,211,153,0.5)' : '1px solid var(--cyan-border)',
                                background: added ? 'rgba(52,211,153,0.15)' : 'transparent',
                                color: added ? '#34d399' : 'var(--t3)', fontSize: 14,
                              }}>
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
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                  {subreddits.map(sub => (
                    <span key={sub} style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      background: 'var(--overlay)', color: 'var(--t1)',
                      fontSize: 13, fontFamily: 'var(--font-mono)',
                      padding: '6px 12px', border: '1px solid var(--cyan-border)',
                    }}>
                      r/{sub}
                      <button type="button" onClick={() => removeSubreddit(sub)}
                        style={{ color: 'var(--t3)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: 0 }}>
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Manual add */}
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', background: 'var(--panel)', border: '1px solid var(--cyan-border)', padding: '0 14px', gap: 8 }}>
                  <span style={{ color: 'var(--cyan)', fontSize: 13, fontWeight: 700 }}>r/</span>
                  <input
                    type="text" value={subredditInput}
                    onChange={e => setSubredditInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSubreddit(); } }}
                    placeholder="add manually"
                    style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'var(--t1)', fontSize: 14, fontFamily: 'var(--font-mono)', padding: '12px 0' }}
                  />
                </div>
                <button type="button" onClick={addSubreddit} disabled={!subredditInput.trim()}
                  style={{ background: 'var(--overlay)', border: '1px solid var(--cyan-border)', color: 'var(--t1)', fontSize: 13, fontFamily: UI, padding: '12px 20px', cursor: 'pointer', opacity: subredditInput.trim() ? 1 : 0.4 }}>
                  Add
                </button>
              </div>
            </div>

            {/* ── Frequency ── */}
            <div style={{ marginBottom: 36, paddingTop: 32, borderTop: '1px solid var(--cyan-border)' }}>
              <SectionLabel>05 — Alert Frequency</SectionLabel>
              <FieldLabel>When should we alert you?</FieldLabel>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                {([
                  { val: 'daily', icon: '📬', title: 'Daily Digest', desc: 'Batched summary every morning' },
                  { val: 'realtime', icon: '⚡', title: 'As Found', desc: 'Alert as soon as a thread is spotted', badge: 'SOON' },
                ] as const).map(opt => (
                  <button key={opt.val} type="button" onClick={() => setAlertFrequency(opt.val)}
                    style={{
                      padding: '16px 18px', textAlign: 'left', cursor: 'pointer', transition: 'all 0.15s',
                      border: alertFrequency === opt.val ? '1px solid var(--hot)' : '1px solid var(--cyan-border)',
                      background: alertFrequency === opt.val ? 'var(--hot-dim)' : 'var(--panel)',
                    }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <span style={{ fontSize: 16 }}>{opt.icon}</span>
                      <span style={{ color: alertFrequency === opt.val ? 'var(--hot)' : 'var(--t1)', fontSize: 14, fontWeight: 600, fontFamily: UI }}>{opt.title}</span>
                      {opt.badge && (
                        <span style={{ color: 'var(--t3)', fontSize: 10, fontFamily: 'var(--font-mono)', border: '1px solid var(--cyan-border)', padding: '1px 6px', letterSpacing: '0.1em' }}>
                          {opt.badge}
                        </span>
                      )}
                    </div>
                    <div style={{ color: 'var(--t2)', fontSize: 13, fontFamily: UI }}>{opt.desc}</div>
                  </button>
                ))}
              </div>

              {alertFrequency === 'daily' && (
                <div>
                  <FieldLabel>Your timezone</FieldLabel>
                  <select value={timezone} onChange={e => setTimezone(e.target.value)}
                    style={{ ...inputStyle, appearance: 'none', cursor: 'pointer' }}>
                    {TIMEZONES.map(tz => (
                      <option key={tz.value} value={tz.value}>{tz.label}</option>
                    ))}
                    {!TIMEZONES.find(t => t.value === timezone) && (
                      <option value={timezone}>{timezone}</option>
                    )}
                  </select>
                  <p style={{ color: 'var(--t3)', fontSize: 13, fontFamily: UI, marginTop: 8 }}>
                    You'll receive your digest at {digestTimeLabel(timezone)} (8am UTC)
                  </p>
                </div>
              )}
            </div>

            {/* ── Save button ── */}
            <button type="submit"
              disabled={saving || !email || !productDescription || subreddits.length === 0}
              className="btn-void-hot"
              style={{
                width: '100%', padding: '16px', fontSize: 13, justifyContent: 'center',
                opacity: saving || !email || !productDescription || subreddits.length === 0 ? 0.5 : 1,
              }}>
              {saving ? '⟳ SAVING...' : saved ? '✓ SAVED — MONITORING ACTIVE' : '🔔 SAVE ALERT CONFIG'}
            </button>

            {/* ── Status card ── */}
            {config && (
              <div style={{ marginTop: 24, padding: '20px 24px', background: 'var(--surface)', border: '1px solid var(--cyan-border)' }}>
                <div style={{ color: 'var(--t4)', fontSize: 9, fontFamily: 'var(--font-mono)', letterSpacing: '0.18em', marginBottom: 14 }}>MONITORING STATUS</div>
                {[
                  { label: 'Monitoring since', val: new Date(config.createdAt).toLocaleDateString() },
                  { label: 'Last digest run', val: config.lastDigestAt ? new Date(config.lastDigestAt).toLocaleString() : 'Not yet run' },
                  { label: 'Next digest', val: `Daily at ${digestTimeLabel(config.timezone ?? 'UTC')}` },
                  { label: 'Subreddits tracked', val: String(config.subreddits.length) },
                ].map(row => (
                  <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--panel)' }}>
                    <span style={{ color: 'var(--t3)', fontSize: 13, fontFamily: UI }}>{row.label}</span>
                    <span style={{ color: 'var(--t1)', fontSize: 13, fontFamily: 'var(--font-mono)' }}>{row.val}</span>
                  </div>
                ))}
              </div>
            )}

          </form>
        )}
      </div>
    </div>
  );
}
