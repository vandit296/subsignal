'use client';

import { useEffect, useState } from 'react';
import { track } from '@/lib/posthog';

// A dismissible "new launch" marker for a freshly shipped feature.
//  • arrow=true  → bobbing arrow + label (a coachmark pointing at a nav item)
//  • arrow=false → just a closeable label pill (for embedding inside tabs/links)
// Dismissal is remembered per-device (localStorage) and reported to PostHog as
// `launch_pointer_closed` with the feature id, so you can count how many people
// closed each one. The close control is a role="button" span (not a <button>) so
// it's safe to nest inside an existing <button> or <a>.
export default function LaunchPointer({ id, label = 'New launch', arrow = true }: { id: string; label?: string; arrow?: boolean }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try { setShow(localStorage.getItem(`treddit:launch-seen:${id}`) !== '1'); } catch { setShow(true); }
  }, [id]);

  if (!show) return null;

  const close = (e: React.SyntheticEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try { localStorage.setItem(`treddit:launch-seen:${id}`, '1'); } catch { /* private mode */ }
    track('launch_pointer_closed', { feature: id });
    setShow(false);
  };

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginLeft: 8, flexShrink: 0, verticalAlign: 'middle' }}>
      {arrow && <span className="lp-bob" style={{ color: 'var(--blue)', fontSize: 13, lineHeight: 1 }} aria-hidden="true">⟵</span>}
      <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.02em', color: '#06121f', background: 'var(--blue)', padding: '2px 7px', borderRadius: 5, whiteSpace: 'nowrap' }}>{label}</span>
      <span role="button" tabIndex={0} onClick={close}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') close(e); }}
        aria-label="Dismiss new launch marker"
        style={{ cursor: 'pointer', color: 'var(--t3)', fontSize: 14, lineHeight: 1, padding: '0 2px' }}>×</span>
      {arrow && <style>{`@keyframes lp-bob{0%,100%{transform:translateX(0)}50%{transform:translateX(-4px)}}.lp-bob{animation:lp-bob 0.85s ease-in-out infinite}`}</style>}
    </span>
  );
}
