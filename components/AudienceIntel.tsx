import { AudienceSignal } from '@/types';

interface Props {
  signals: AudienceSignal[];
  overlap: { subreddit: string; pct: number }[];
}

export default function AudienceIntel({ signals, overlap }: Props) {
  return (
    <div className="bg-surface rounded-xl p-5" style={{ border:'0.5px solid var(--border)' }}>
      <div className="flex items-center justify-between mb-4">
        <span style={{ color:'var(--t2)', fontSize:12, fontWeight:600 }}>Audience intelligence</span>
        <span className="text-xs px-2 py-0.5 rounded" style={{ color: 'var(--blue)', background: 'var(--blue-dim)', border: '0.5px solid var(--blue-border)' }}>AI</span>
      </div>
      <div className="space-y-2 mb-4">
        {signals.map((s, i) => (
          <div key={i} className="flex gap-3 rounded-lg p-3" style={{ background:'var(--panel)' }}>
            <span className="text-base mt-0.5">{s.icon}</span>
            <div>
              <span style={{ color:'var(--t1)', fontSize:13, fontWeight:600 }}>{s.label}: </span>
              <span style={{ color:'var(--t2)', fontSize:13 }}>{s.detail}</span>
            </div>
          </div>
        ))}
      </div>

      {overlap.length > 0 && (
        <>
          <div style={{ color:'var(--t4)', fontSize:11, marginBottom:8 }}>Also active in</div>
          <div className="flex flex-wrap gap-2">
            {overlap.map((o, i) => (
              <div key={i} className="flex items-center gap-1.5 rounded-lg px-3 py-1" style={{ background:'var(--panel)' }}>
                <span style={{ color:'var(--t1)', fontSize:12 }}>{o.subreddit}</span>
                <span style={{ color:'var(--blue)', fontSize:12, fontWeight:600 }}>{o.pct}%</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
