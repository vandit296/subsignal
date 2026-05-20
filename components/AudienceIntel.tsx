import { AudienceSignal } from '@/types';

interface Props {
  signals: AudienceSignal[];
  overlap: { subreddit: string; pct: number }[];
}

export default function AudienceIntel({ signals, overlap }: Props) {
  return (
    <div style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 10, padding: '16px 18px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--t2)' }}>Audience intelligence</span>
        <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 4, background: 'var(--blue-dim)', color: 'var(--blue)', border: '0.5px solid var(--blue-border)' }}>AI</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: overlap.length > 0 ? 14 : 0 }}>
        {signals.map((s, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, padding: '9px 11px', borderRadius: 7, background: 'var(--panel)' }}>
            <span style={{ fontSize: 15, flexShrink: 0, marginTop: 1 }}>{s.icon}</span>
            <div>
              <span style={{ fontSize: 12.5, color: 'var(--t1)', fontWeight: 600 }}>{s.label}: </span>
              <span style={{ fontSize: 12.5, color: 'var(--t2)' }}>{s.detail}</span>
            </div>
          </div>
        ))}
      </div>

      {overlap.length > 0 && (
        <>
          <div style={{ fontSize: 11, color: 'var(--t4)', marginBottom: 8 }}>Also active in</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {overlap.map((o, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 6, background: 'var(--panel)', border: '0.5px solid var(--border)' }}>
                <span style={{ fontSize: 12, color: 'var(--t2)' }}>{o.subreddit}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--blue)' }}>{o.pct}%</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
