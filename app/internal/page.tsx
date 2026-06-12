'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';

const UI = 'var(--font-ui)';
const OWNER = 'vandit296@gmail.com';

export default function InternalHub() {
  const { data: session, status } = useSession();
  const [busy, setBusy] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  if (status === 'loading') return null;
  if (session?.user?.email?.toLowerCase() !== OWNER) {
    return <div style={{ padding: '14vh 20px', textAlign: 'center', color: 'var(--t3)', fontFamily: UI }}>Not authorized.</div>;
  }

  async function call(url: string, confirmMsg?: string) {
    if (confirmMsg && !window.confirm(confirmMsg)) return;
    setBusy(url); setResult(null);
    try {
      const r = await fetch(url);
      setResult(JSON.stringify(await r.json(), null, 2));
    } catch { setResult('Request failed.'); }
    finally { setBusy(null); }
  }

  const card: React.CSSProperties = { background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 12, padding: '18px 20px', marginBottom: 14 };
  const btn: React.CSSProperties = { fontFamily: UI, fontSize: 13, fontWeight: 500, padding: '8px 14px', borderRadius: 8, cursor: 'pointer', background: 'var(--panel)', border: '0.5px solid var(--border)', color: 'var(--t2)' };

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '26px 0 80px', fontFamily: UI }}>
      <h1 style={{ fontSize: 21, fontWeight: 600, letterSpacing: '-0.015em' }}>Internal tools</h1>
      <p style={{ fontSize: 13, color: 'var(--t3)', margin: '6px 0 22px' }}>Owner-only. Not visible to other users.</p>

      {/* SEO Helper */}
      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--t1)' }}>SEO Helper</div>
            <div style={{ fontSize: 13, color: 'var(--t3)', marginTop: 3 }}>Type a topic → real Google autocomplete scored for ICP-fit, intent &amp; competition, with a write/skip verdict and an outline.</div>
          </div>
          <Link href="/internal/seo" className="btn-void-primary" style={{ whiteSpace: 'nowrap' }}>Open →</Link>
        </div>
      </div>

      {/* ICP announcement broadcaster */}
      <div style={card}>
        <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--t1)' }}>ICP Radar announcement</div>
        <div style={{ fontSize: 13, color: 'var(--t3)', margin: '3px 0 12px' }}>Broadcast the launch email to registered users. Idempotent — nobody is emailed twice.</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button style={btn} disabled={!!busy} onClick={() => call('/api/admin/announce-icp?dryRun=1')}>Dry run (count)</button>
          <button style={btn} disabled={!!busy} onClick={() => call('/api/admin/announce-icp?test=1')}>Send test to me</button>
          <button style={{ ...btn, color: 'var(--hot)', borderColor: 'var(--hot-border)' }} disabled={!!busy}
            onClick={() => call('/api/admin/announce-icp?send=everyone', 'Send to ALL registered users? This cannot be undone.')}>Send to everyone</button>
        </div>
        {busy && <div style={{ fontSize: 12, color: 'var(--t3)', marginTop: 10 }}>Working…</div>}
        {result && <pre style={{ marginTop: 12, fontSize: 11.5, fontFamily: 'var(--font-mono)', color: 'var(--t2)', background: 'var(--panel)', border: '0.5px solid var(--border)', borderRadius: 8, padding: 12, overflowX: 'auto', whiteSpace: 'pre-wrap' }}>{result}</pre>}
      </div>
    </div>
  );
}
