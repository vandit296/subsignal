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

  const [name, setName] = useState('');
  const [website, setWebsite] = useState('');
  const [description, setDescription] = useState('');
  const [goal, setGoal] = useState('');
  const [subreddits, setSubreddits] = useState<string[]>([]);
  const [subInput, setSubInput] = useState('');

  function addSub(s: string) {
    const clean = s.replace(/^r\//, '').trim().toLowerCase();
    if (clean && !subreddits.includes(clean)) setSubreddits(prev => [...prev, clean]);
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
        body: JSON.stringify({ name, website, description, goal, subreddits, alertEmail: session.user.email }),
      });
      if (!res.ok) throw new Error('Failed to save');
      router.push('/feed');
    } catch {
      setError('UPLINK FAILED — RETRY');
      setSaving(false);
    }
  }

  const canNext1 = name.trim().length > 0 && description.trim().length > 20;
  const canNext2 = goal.length > 0;
  const canFinish = subreddits.length > 0;

  const STEP_LABELS = ['SYS-CONFIG', 'OBJ-SELECT', 'NODE-MAP'];

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--void)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 16px',
      position: 'relative',
    }}>
      {/* Scanlines */}
      <div className="scanlines" style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }} />
      <div className="scanline-sweep" style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 1 }} />

      <div style={{ position: 'relative', zIndex: 2, width: '100%', maxWidth: 480 }}>
        {/* Logo row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 36 }}>
          <svg width="18" height="18" viewBox="0 0 28 28">
            <circle cx="14" cy="14" r="12" fill="none" stroke="var(--cyan)" strokeWidth="1" opacity="0.3" />
            <circle cx="14" cy="14" r="2.5" fill="var(--cyan)" />
            <circle cx="14" cy="7" r="1.5" fill="var(--hot)" />
          </svg>
          <span style={{ fontFamily: 'var(--font-ui)', fontSize: 16, fontWeight: 800, color: 'var(--t1)', letterSpacing: '-0.01em' }}>TREDDIT</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--t3)', letterSpacing: '0.2em' }}>· INIT SEQUENCE</span>
        </div>

        {/* Step tracker */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 28 }}>
          {([1, 2, 3] as Step[]).map((n, i) => (
            <div key={n} style={{ display: 'flex', alignItems: 'center', flex: n < 3 ? 1 : 'none' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                padding: '6px 10px',
                background: step === n ? 'var(--cyan-dim)' : n < step ? 'rgba(0,212,255,0.04)' : 'transparent',
                border: `1px solid ${step === n ? 'var(--cyan-border)' : n < step ? 'rgba(0,212,255,0.12)' : 'var(--t4)'}`,
                clipPath: 'polygon(5px 0%, 100% 0%, calc(100% - 5px) 100%, 0% 100%)',
              }}>
                <span style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  color: step === n ? 'var(--cyan)' : n < step ? 'rgba(0,212,255,0.5)' : 'var(--t4)',
                  letterSpacing: '0.1em',
                }}>
                  {n < step ? '✓' : `0${n}`}
                </span>
                <span style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 8,
                  color: step === n ? 'var(--cyan)' : n < step ? 'rgba(0,212,255,0.5)' : 'var(--t4)',
                  letterSpacing: '0.15em',
                }}>
                  {STEP_LABELS[i]}
                </span>
              </div>
              {n < 3 && (
                <div style={{ flex: 1, height: 1, background: n < step ? 'var(--cyan-border)' : 'var(--t4)', margin: '0 4px' }} />
              )}
            </div>
          ))}
        </div>

        {/* ── Step 1 ── */}
        {step === 1 && (
          <div className="cb" style={{ background: 'var(--surface)', padding: '28px 24px' }}>
            <div style={{ marginBottom: 22 }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--cyan)', letterSpacing: '0.2em', marginBottom: 8 }}>SYS-CONFIG · PRODUCT PROFILE</div>
              <div style={{ fontFamily: 'var(--font-ui)', fontSize: 19, fontWeight: 800, color: 'var(--t1)', marginBottom: 4 }}>Define your signal target</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--t3)', lineHeight: 1.5 }}>This profile powers all AI modules across Treddit.</div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label className="void-label">PRODUCT DESIGNATION</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Acme AI"
                  className="void-input"
                  style={{ width: '100%', boxSizing: 'border-box' as const }}
                />
              </div>
              <div>
                <label className="void-label">UPLINK URL <span style={{ color: 'var(--t4)', fontWeight: 400 }}>(OPTIONAL)</span></label>
                <input
                  type="url"
                  value={website}
                  onChange={e => setWebsite(e.target.value)}
                  placeholder="https://yourproduct.com"
                  className="void-input"
                  style={{ width: '100%', boxSizing: 'border-box' as const }}
                />
              </div>
              <div>
                <label className="void-label">
                  SYSTEM DESCRIPTION
                  <span style={{ color: 'var(--t4)', fontWeight: 400, marginLeft: 6 }}>— SPECIFICITY IMPROVES AI ACCURACY</span>
                </label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="e.g. We help SaaS founders find Reddit threads where potential customers are asking questions their product can answer, and auto-draft relevant replies."
                  rows={4}
                  className="void-input"
                  style={{ width: '100%', resize: 'none', boxSizing: 'border-box' as const }}
                />
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--t4)', marginTop: 4, textAlign: 'right' }}>
                  {description.length}/500 CHARS
                </div>
              </div>
            </div>

            <button
              onClick={() => setStep(2)}
              disabled={!canNext1}
              className="btn-void-primary"
              style={{ width: '100%', marginTop: 22, padding: '13px 0', opacity: canNext1 ? 1 : 0.35 }}
            >
              PROCEED TO OBJ-SELECT →
            </button>
          </div>
        )}

        {/* ── Step 2 ── */}
        {step === 2 && (
          <div className="cb" style={{ background: 'var(--surface)', padding: '28px 24px' }}>
            <div style={{ marginBottom: 22 }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--cyan)', letterSpacing: '0.2em', marginBottom: 8 }}>OBJ-SELECT · PRIMARY DIRECTIVE</div>
              <div style={{ fontFamily: 'var(--font-ui)', fontSize: 19, fontWeight: 800, color: 'var(--t1)', marginBottom: 4 }}>Set mission objective</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--t3)', lineHeight: 1.5 }}>Tunes the feed and engagement AI to your primary goal.</div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {GOALS.map(g => (
                <button
                  key={g}
                  onClick={() => setGoal(g)}
                  style={{
                    textAlign: 'left',
                    padding: '12px 14px',
                    background: goal === g ? 'var(--cyan-dim)' : 'var(--panel)',
                    border: `1px solid ${goal === g ? 'var(--cyan-border)' : 'var(--t4)'}`,
                    color: goal === g ? 'var(--cyan)' : 'var(--t2)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 10,
                    letterSpacing: '0.08em',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    outline: 'none',
                    clipPath: 'polygon(5px 0%, 100% 0%, calc(100% - 5px) 100%, 0% 100%)',
                  }}
                >
                  {goal === g && <span style={{ color: 'var(--cyan)', marginRight: 6 }}>◆</span>}
                  {g.toUpperCase()}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
              <button
                onClick={() => setStep(1)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--t3)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  cursor: 'pointer',
                  letterSpacing: '0.1em',
                  padding: '13px 14px',
                }}
              >
                ← BACK
              </button>
              <button
                onClick={() => setStep(3)}
                disabled={!canNext2}
                className="btn-void-primary"
                style={{ flex: 1, padding: '13px 0', opacity: canNext2 ? 1 : 0.35 }}
              >
                PROCEED TO NODE-MAP →
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3 ── */}
        {step === 3 && (
          <div className="cb" style={{ background: 'var(--surface)', padding: '28px 24px' }}>
            <div style={{ marginBottom: 22 }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--cyan)', letterSpacing: '0.2em', marginBottom: 8 }}>NODE-MAP · SUBREDDIT TARGETING</div>
              <div style={{ fontFamily: 'var(--font-ui)', fontSize: 19, fontWeight: 800, color: 'var(--t1)', marginBottom: 4 }}>Map your signal nodes</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--t3)', lineHeight: 1.5 }}>These subreddits will be scanned for high-opportunity threads.</div>
            </div>

            {/* Input */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              <div style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                background: 'var(--panel)',
                border: '1px solid var(--cyan-border)',
                padding: '0 12px',
                gap: 6,
              }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--t3)' }}>r/</span>
                <input
                  type="text"
                  value={subInput}
                  onChange={e => setSubInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') addSub(subInput); }}
                  placeholder="SaaS"
                  style={{
                    flex: 1,
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    color: 'var(--t1)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 11,
                    padding: '11px 0',
                  }}
                />
              </div>
              <button
                onClick={() => addSub(subInput)}
                disabled={!subInput.trim()}
                className="btn-void"
                style={{ padding: '0 16px', opacity: subInput.trim() ? 1 : 0.35 }}
              >
                ADD
              </button>
            </div>

            {/* Quick-add */}
            <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 6, marginBottom: 14 }}>
              {SUGGESTED_SUBS.filter(s => !subreddits.includes(s.toLowerCase())).map(s => (
                <button
                  key={s}
                  onClick={() => addSub(s)}
                  style={{
                    background: 'var(--panel)',
                    border: '1px solid var(--t4)',
                    color: 'var(--t3)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 9,
                    letterSpacing: '0.1em',
                    padding: '4px 10px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    outline: 'none',
                    clipPath: 'polygon(4px 0%, 100% 0%, calc(100% - 4px) 100%, 0% 100%)',
                  }}
                >
                  + r/{s}
                </button>
              ))}
            </div>

            {/* Selected nodes */}
            {subreddits.length > 0 && (
              <div style={{
                display: 'flex',
                flexWrap: 'wrap' as const,
                gap: 6,
                marginBottom: 18,
                padding: '12px',
                background: 'var(--panel)',
                border: '1px solid var(--cyan-border)',
              }}>
                {subreddits.map(s => (
                  <span
                    key={s}
                    className="tag tag-cyan"
                    style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                  >
                    r/{s}
                    <button
                      onClick={() => removeSub(s)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--cyan)',
                        cursor: 'pointer',
                        fontSize: 10,
                        padding: 0,
                        lineHeight: 1,
                        opacity: 0.5,
                      }}
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            )}

            {error && (
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                color: 'var(--hot)',
                letterSpacing: '0.1em',
                marginBottom: 12,
                padding: '8px 12px',
                background: 'var(--hot-dim)',
                border: '1px solid var(--hot-border)',
              }}>
                ⚠ {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setStep(2)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--t3)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  cursor: 'pointer',
                  letterSpacing: '0.1em',
                  padding: '13px 14px',
                }}
              >
                ← BACK
              </button>
              <button
                onClick={finish}
                disabled={!canFinish || saving}
                className="btn-void-hot"
                style={{ flex: 1, padding: '13px 0', opacity: canFinish && !saving ? 1 : 0.35 }}
              >
                {saving ? 'UPLINK ESTABLISHING…' : 'LAUNCH TREDDIT →'}
              </button>
            </div>
          </div>
        )}

        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--t4)', textAlign: 'center', marginTop: 20, letterSpacing: '0.08em' }}>
          ALL CONFIG CAN BE MODIFIED IN COMMAND ⚙
        </div>
      </div>
    </div>
  );
}
