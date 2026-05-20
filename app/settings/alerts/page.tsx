'use client';

import { useEffect, useRef, useState } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface AlertSettings {
  globalEnabled: boolean;
  timezone: string;
  scoutDigest: {
    enabled: boolean;
    deliveryTime: string;
    days: string[];
  };
  keywordWatch: {
    enabled: boolean;
    mode: 'realtime' | 'hourly' | 'daily';
    minScore: number;
    keywords: string[];
  };
  signalFeed: {
    enabled: boolean;
    frequency: 'daily' | 'weekly';
    categories: string[];
  };
  opportunityAlerts: { enabled: boolean };
  weeklyReport: { enabled: boolean; sendDay: string };
}

const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const DAY_LABELS: Record<string, string> = {
  mon: 'M', tue: 'T', wed: 'W', thu: 'T', fri: 'F', sat: 'S', sun: 'S',
};
const DAY_FULL: Record<string, string> = {
  mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday',
  fri: 'Friday', sat: 'Saturday', sun: 'Sunday',
};
const CATEGORIES = [
  { key: 'ideal_user',  label: 'Ideal User' },
  { key: 'competition', label: 'Competition' },
  { key: 'industry',    label: 'Industry' },
  { key: 'interesting', label: 'Interesting' },
];

const DEFAULT: AlertSettings = {
  globalEnabled: true,
  timezone: 'UTC',
  scoutDigest: { enabled: true, deliveryTime: '07:00', days: ['mon','tue','wed','thu','fri'] },
  keywordWatch: { enabled: true, mode: 'realtime', minScore: 7, keywords: [] },
  signalFeed: { enabled: true, frequency: 'weekly', categories: ['ideal_user','competition','industry','interesting'] },
  opportunityAlerts: { enabled: false },
  weeklyReport: { enabled: true, sendDay: 'sunday' },
};

// ── Small UI atoms ─────────────────────────────────────────────────────────────

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!on)}
      style={{
        width: 40, height: 22, borderRadius: 11, border: 'none', cursor: 'pointer',
        background: on ? 'var(--blue)' : 'var(--border)',
        position: 'relative', transition: 'background 0.2s', flexShrink: 0,
      }}
    >
      <span style={{
        position: 'absolute', top: 3, left: on ? 21 : 3,
        width: 16, height: 16, borderRadius: '50%',
        background: '#fff', transition: 'left 0.2s',
      }} />
    </button>
  );
}

function SectionCard({ children, disabled }: { children: React.ReactNode; disabled?: boolean }) {
  return (
    <div style={{
      background: 'var(--panel)', border: '0.5px solid var(--border)', borderRadius: 12,
      padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16,
      opacity: disabled ? 0.45 : 1, transition: 'opacity 0.2s',
      pointerEvents: disabled ? 'none' : 'auto',
    }}>
      {children}
    </div>
  );
}

function SectionHeader({
  icon, title, badge, toggle, on, onToggle,
}: {
  icon: string; title: string; badge?: string;
  toggle?: boolean; on?: boolean; onToggle?: (v: boolean) => void;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{ fontSize: 16 }}>{icon}</span>
      <span style={{ flex: 1, fontWeight: 600, fontSize: 14, color: 'var(--t1)' }}>{title}</span>
      {badge && (
        <span style={{
          fontSize: 10, fontWeight: 600, letterSpacing: '0.06em',
          background: 'var(--blue-dim)', color: 'var(--blue)',
          border: '0.5px solid var(--blue-border)', borderRadius: 5,
          padding: '2px 7px', textTransform: 'uppercase',
        }}>{badge}</span>
      )}
      {toggle && onToggle && <Toggle on={!!on} onChange={onToggle} />}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ fontSize: 12, color: 'var(--t3)', fontWeight: 500 }}>{children}</span>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
      {children}
    </div>
  );
}

function Select({
  value, onChange, options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{
        background: 'var(--surface)', border: '0.5px solid var(--border)',
        borderRadius: 7, padding: '6px 10px', fontSize: 13, color: 'var(--t1)',
        cursor: 'pointer', outline: 'none', fontFamily: 'var(--font-ui)',
      }}
    >
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AlertSettingsPage() {
  const [settings, setSettings] = useState<AlertSettings>(DEFAULT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [newKeyword, setNewKeyword] = useState('');
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [detectedTz, setDetectedTz] = useState('UTC');
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Detect local timezone immediately
  useEffect(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (tz) setDetectedTz(tz);
    } catch {}
  }, []);

  // Load settings + watchlist on mount
  useEffect(() => {
    const localTz = (() => {
      try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; }
      catch { return 'UTC'; }
    })();
    Promise.all([
      fetch('/api/alert-settings').then(r => r.json()),
      fetch('/api/watchlist').then(r => r.json()),
    ]).then(([alertData, wlData]) => {
      const loaded = alertData.settings
        ? { ...DEFAULT, ...alertData.settings }
        : { ...DEFAULT, timezone: localTz };
      // Always keep timezone fresh from browser on first load if stored was UTC
      if (loaded.timezone === 'UTC' && localTz !== 'UTC') {
        loaded.timezone = localTz;
      }
      setSettings(loaded);
      if (wlData.watchlist) setWatchlist(wlData.watchlist);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  // Auto-save with debounce
  function patch(partial: Partial<AlertSettings>) {
    const next = { ...settings, ...partial } as AlertSettings;
    setSettings(next);
    setSaved(false);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      setSaving(true);
      try {
        await fetch('/api/alert-settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(next),
        });
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } finally {
        setSaving(false);
      }
    }, 800);
  }

  function patchScout(p: Partial<AlertSettings['scoutDigest']>) {
    patch({ scoutDigest: { ...settings.scoutDigest, ...p } });
  }
  function patchKw(p: Partial<AlertSettings['keywordWatch']>) {
    patch({ keywordWatch: { ...settings.keywordWatch, ...p } });
  }
  function patchFeed(p: Partial<AlertSettings['signalFeed']>) {
    patch({ signalFeed: { ...settings.signalFeed, ...p } });
  }

  function toggleDay(day: string) {
    const days = settings.scoutDigest.days.includes(day)
      ? settings.scoutDigest.days.filter(d => d !== day)
      : [...settings.scoutDigest.days, day];
    patchScout({ days });
  }

  function toggleCategory(cat: string) {
    const cats = settings.signalFeed.categories.includes(cat)
      ? settings.signalFeed.categories.filter(c => c !== cat)
      : [...settings.signalFeed.categories, cat];
    patchFeed({ categories: cats });
  }

  function addKeyword() {
    const kw = newKeyword.trim().toLowerCase();
    if (!kw || settings.keywordWatch.keywords.includes(kw)) { setNewKeyword(''); return; }
    patchKw({ keywords: [...settings.keywordWatch.keywords, kw] });
    setNewKeyword('');
  }

  function removeKeyword(kw: string) {
    patchKw({ keywords: settings.keywordWatch.keywords.filter(k => k !== kw) });
  }

  if (loading) {
    return (
      <div style={{ padding: '64px 40px', color: 'var(--t4)', fontSize: 13 }}>
        Loading alert settings…
      </div>
    );
  }

  const globalOff = !settings.globalEnabled;

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '40px 24px 80px' }}>

      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--t1)', margin: 0, letterSpacing: '-0.02em' }}>
          Email Alerts
        </h1>
        <p style={{ marginTop: 6, fontSize: 13, color: 'var(--t3)', lineHeight: 1.6 }}>
          Control what Treddit emails you, when, and how often.
          Changes save automatically.
        </p>
      </div>

      {/* Save indicator */}
      <div style={{ height: 24, marginBottom: 20, textAlign: 'right' }}>
        {saving && <span style={{ fontSize: 12, color: 'var(--t4)' }}>Saving…</span>}
        {saved  && <span style={{ fontSize: 12, color: 'var(--green, #4ade80)' }}>✓ Saved</span>}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* ── Master Toggle ── */}
        <SectionCard>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 16 }}>🔔</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--t1)' }}>All email notifications</div>
              <div style={{ fontSize: 12, color: 'var(--t3)', marginTop: 2 }}>
                {settings.globalEnabled ? 'Emails are active' : 'All emails paused'}
              </div>
            </div>
            <Toggle on={settings.globalEnabled} onChange={v => patch({ globalEnabled: v })} />
          </div>
          {settings.globalEnabled && (
            <button
              onClick={() => patch({ globalEnabled: false })}
              style={{
                alignSelf: 'flex-start', background: 'none',
                border: '0.5px solid var(--border)', borderRadius: 7,
                padding: '6px 14px', fontSize: 12, color: 'var(--t3)',
                cursor: 'pointer', fontFamily: 'var(--font-ui)',
              }}
            >
              Unsubscribe from all
            </button>
          )}
        </SectionCard>

        {/* ── Scout Watchlist Digest ── */}
        <SectionCard disabled={globalOff}>
          <SectionHeader
            icon="📡" title="Scout Watchlist Digest"
            toggle on={settings.scoutDigest.enabled}
            onToggle={v => patchScout({ enabled: v })}
          />
          {settings.scoutDigest.enabled && (
            <>
              <Row>
                <Label>Delivery time</Label>
                <input
                  type="time"
                  value={settings.scoutDigest.deliveryTime}
                  onChange={e => patchScout({ deliveryTime: e.target.value })}
                  style={{
                    background: 'var(--surface)', border: '0.5px solid var(--border)',
                    borderRadius: 7, padding: '6px 10px', fontSize: 13,
                    color: 'var(--t1)', fontFamily: 'var(--font-ui)', outline: 'none',
                  }}
                />
                <span style={{
                  fontSize: 11, color: 'var(--t4)',
                  background: 'var(--overlay)', border: '0.5px solid var(--border)',
                  borderRadius: 5, padding: '3px 8px', fontFamily: 'var(--font-mono)',
                  letterSpacing: '0.02em',
                }}>
                  {settings.timezone !== 'UTC' ? settings.timezone : detectedTz}
                </span>
              </Row>
              <Row>
                <Label>Days</Label>
                <div style={{ display: 'flex', gap: 5 }}>
                  {DAYS.map(d => (
                    <button
                      key={d}
                      onClick={() => toggleDay(d)}
                      title={DAY_FULL[d]}
                      style={{
                        width: 32, height: 32, borderRadius: '50%', border: 'none',
                        background: settings.scoutDigest.days.includes(d)
                          ? 'var(--blue)' : 'var(--surface)',
                        color: settings.scoutDigest.days.includes(d)
                          ? '#fff' : 'var(--t3)',
                        fontSize: 11, fontWeight: 600, cursor: 'pointer',
                        border: '0.5px solid var(--border)',
                        transition: 'background 0.15s, color 0.15s',
                      }}
                    >
                      {DAY_LABELS[d]}
                    </button>
                  ))}
                </div>
              </Row>
              {watchlist.length > 0 ? (
                <div>
                  <Label>Watched subreddits</Label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                    {watchlist.map(sub => (
                      <span key={sub} style={{
                        background: 'var(--blue-dim)', border: '0.5px solid var(--blue-border)',
                        borderRadius: 6, padding: '4px 10px', fontSize: 12,
                        color: 'var(--blue)', fontFamily: 'var(--font-mono)',
                      }}>
                        r/{sub}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <p style={{ fontSize: 12, color: 'var(--t4)', margin: 0 }}>
                  No subreddits in watchlist yet — add them from the Scout view.
                </p>
              )}
            </>
          )}
        </SectionCard>

        {/* ── Keyword Watch Alerts ── */}
        <SectionCard disabled={globalOff}>
          <SectionHeader
            icon="🔍" title="Keyword Watch Alerts" badge="Real-time available"
            toggle on={settings.keywordWatch.enabled}
            onToggle={v => patchKw({ enabled: v })}
          />
          {settings.keywordWatch.enabled && (
            <>
              {/* Mode selector */}
              <div>
                <Label>Alert frequency</Label>
                <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                  {([
                    { key: 'realtime', label: '⚡ Real-time', sub: '~15 min checks' },
                    { key: 'hourly',   label: '🕐 Hourly',    sub: 'batched digest' },
                    { key: 'daily',    label: '📅 Daily',     sub: 'morning digest' },
                  ] as const).map(opt => (
                    <button
                      key={opt.key}
                      onClick={() => patchKw({ mode: opt.key })}
                      style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
                        padding: '10px 14px', borderRadius: 9, cursor: 'pointer',
                        border: settings.keywordWatch.mode === opt.key
                          ? '1px solid var(--blue)' : '0.5px solid var(--border)',
                        background: settings.keywordWatch.mode === opt.key
                          ? 'var(--blue-dim)' : 'var(--surface)',
                        transition: 'all 0.15s', fontFamily: 'var(--font-ui)',
                      }}
                    >
                      <span style={{
                        fontSize: 13, fontWeight: 600,
                        color: settings.keywordWatch.mode === opt.key ? 'var(--blue)' : 'var(--t1)',
                      }}>
                        {opt.label}
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--t4)', marginTop: 2 }}>{opt.sub}</span>
                    </button>
                  ))}
                </div>
                {settings.keywordWatch.mode === 'realtime' && (
                  <div style={{
                    marginTop: 10, padding: '10px 14px',
                    background: 'rgba(74,143,255,0.06)', border: '0.5px solid var(--blue-border)',
                    borderRadius: 8, fontSize: 12, color: 'var(--t3)', lineHeight: 1.6,
                  }}>
                    <strong style={{ color: 'var(--blue)' }}>How real-time works:</strong>{' '}
                    Reddit is polled every 15 minutes. When a new post matches your keywords
                    with a score ≥ {settings.keywordWatch.minScore}/10, an email fires immediately —
                    no batching. You might get multiple emails on busy days.
                  </div>
                )}
              </div>

              {/* Min score */}
              <div>
                <Row>
                  <Label>Min relevance score</Label>
                  <span style={{
                    fontSize: 13, fontWeight: 600, color: 'var(--blue)',
                    background: 'var(--blue-dim)', border: '0.5px solid var(--blue-border)',
                    borderRadius: 6, padding: '2px 8px',
                  }}>
                    {settings.keywordWatch.minScore}/10
                  </span>
                </Row>
                <input
                  type="range" min={1} max={10} step={1}
                  value={settings.keywordWatch.minScore}
                  onChange={e => patchKw({ minScore: Number(e.target.value) })}
                  style={{ width: '100%', marginTop: 8, accentColor: 'var(--blue)' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--t4)', marginTop: 2 }}>
                  <span>1 – all mentions</span>
                  <span>10 – perfect match only</span>
                </div>
              </div>

              {/* Keywords */}
              <div>
                <Label>Tracked keywords</Label>
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <input
                    type="text"
                    placeholder="add keyword…"
                    value={newKeyword}
                    onChange={e => setNewKeyword(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') addKeyword(); }}
                    style={{
                      flex: 1, background: 'var(--surface)', border: '0.5px solid var(--border)',
                      borderRadius: 7, padding: '7px 12px', fontSize: 13, color: 'var(--t1)',
                      fontFamily: 'var(--font-ui)', outline: 'none',
                    }}
                  />
                  <button
                    onClick={addKeyword}
                    style={{
                      background: 'var(--blue)', border: 'none', borderRadius: 7,
                      padding: '7px 16px', fontSize: 13, color: '#fff',
                      cursor: 'pointer', fontFamily: 'var(--font-ui)', fontWeight: 500,
                    }}
                  >
                    Add
                  </button>
                </div>
                {settings.keywordWatch.keywords.length > 0 ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                    {settings.keywordWatch.keywords.map(kw => (
                      <span key={kw} style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        background: 'var(--surface)', border: '0.5px solid var(--border)',
                        borderRadius: 6, padding: '4px 8px 4px 10px', fontSize: 12,
                        color: 'var(--t2)', fontFamily: 'var(--font-mono)',
                      }}>
                        {kw}
                        <button
                          onClick={() => removeKeyword(kw)}
                          style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            color: 'var(--t4)', fontSize: 14, padding: 0, lineHeight: 1,
                          }}
                        >×</button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p style={{ fontSize: 12, color: 'var(--t4)', marginTop: 8, marginBottom: 0 }}>
                    No keywords yet. Add terms you want to track across all subreddits.
                  </p>
                )}
              </div>
            </>
          )}
        </SectionCard>

        {/* ── Signal Feed Digest ── */}
        <SectionCard disabled={globalOff}>
          <SectionHeader
            icon="📊" title="Signal Feed Digest"
            toggle on={settings.signalFeed.enabled}
            onToggle={v => patchFeed({ enabled: v })}
          />
          {settings.signalFeed.enabled && (
            <>
              <Row>
                <Label>Frequency</Label>
                <Select
                  value={settings.signalFeed.frequency}
                  onChange={v => patchFeed({ frequency: v as 'daily' | 'weekly' })}
                  options={[
                    { value: 'daily',  label: 'Daily digest' },
                    { value: 'weekly', label: 'Weekly digest (Mondays)' },
                  ]}
                />
              </Row>
              <div>
                <Label>Signal categories</Label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                  {CATEGORIES.map(cat => {
                    const active = settings.signalFeed.categories.includes(cat.key);
                    return (
                      <button
                        key={cat.key}
                        onClick={() => toggleCategory(cat.key)}
                        style={{
                          padding: '6px 14px', borderRadius: 7, cursor: 'pointer',
                          fontSize: 12, fontWeight: 500, fontFamily: 'var(--font-ui)',
                          border: active ? '1px solid var(--blue)' : '0.5px solid var(--border)',
                          background: active ? 'var(--blue-dim)' : 'var(--surface)',
                          color: active ? 'var(--blue)' : 'var(--t3)',
                          transition: 'all 0.15s',
                        }}
                      >
                        {cat.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </SectionCard>

        {/* ── Opportunity Alerts ── */}
        <SectionCard disabled={globalOff}>
          <SectionHeader
            icon="💡" title="Opportunity Alerts"
            toggle on={settings.opportunityAlerts.enabled}
            onToggle={v => patch({ opportunityAlerts: { enabled: v } })}
          />
          <p style={{ margin: 0, fontSize: 12, color: 'var(--t3)', lineHeight: 1.6 }}>
            Instant alerts when a high-scoring post matches your company profile —
            a potential customer asking a question you can answer.
          </p>
        </SectionCard>

        {/* ── Weekly Intelligence Report ── */}
        <SectionCard disabled={globalOff}>
          <SectionHeader
            icon="📋" title="Weekly Intelligence Report"
            toggle on={settings.weeklyReport.enabled}
            onToggle={v => patch({ weeklyReport: { ...settings.weeklyReport, enabled: v } })}
          />
          {settings.weeklyReport.enabled && (
            <Row>
              <Label>Send on</Label>
              <Select
                value={settings.weeklyReport.sendDay}
                onChange={v => patch({ weeklyReport: { ...settings.weeklyReport, sendDay: v } })}
                options={DAYS.map(d => ({ value: d, label: DAY_FULL[d] + (d === 'sunday' ? ' (default)' : '') }))}
              />
              <span style={{ fontSize: 12, color: 'var(--t4)' }}>evening</span>
            </Row>
          )}
        </SectionCard>

        {/* ── Footer note ── */}
        <p style={{ fontSize: 11, color: 'var(--t4)', textAlign: 'center', margin: '8px 0 0', lineHeight: 1.6 }}>
          Email alerts are sent to your account email.
          To unsubscribe from all, toggle the master switch above.
        </p>

      </div>
    </div>
  );
}
