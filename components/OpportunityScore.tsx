import { OpportunityBreakdown } from '@/types';

const LABELS: Record<keyof OpportunityBreakdown, string> = {
  audienceSize: 'Audience size',
  audienceFit: 'Audience fit',
  contentGap: 'Content gap',
  postingSafety: 'Posting safety',
  growthTrend: 'Growth trend',
};

export default function OpportunityScore({
  breakdown,
  total,
}: {
  breakdown: OpportunityBreakdown;
  total: number;
}) {
  return (
    <div className="bg-surface rounded-xl p-5" style={{ border:'0.5px solid var(--border)' }}>
      <div style={{ color:'var(--t2)', fontSize:12, fontWeight:600, marginBottom:16 }}>Opportunity score</div>
      <div className="text-center mb-5">
        <div style={{ fontSize:48, fontWeight:800, color:'var(--blue)', letterSpacing:'-0.03em' }}>{total.toFixed(1)}</div>
        <div style={{ color:'var(--t3)', fontSize:12, marginTop:4 }}>
          {total >= 8 ? 'High opportunity' : total >= 6 ? 'Moderate opportunity' : 'Low opportunity'}
        </div>
      </div>
      <div className="space-y-2.5">
        {(Object.entries(breakdown) as [keyof OpportunityBreakdown, number][]).map(([key, val]) => (
          <div key={key} className="flex items-center gap-3">
            <span style={{ color:'var(--t3)', fontSize:12, width:108, flexShrink:0 }}>{LABELS[key]}</span>
            <div className="flex-1 h-1.5 rounded overflow-hidden" style={{ background:'var(--overlay)' }}>
              <div
                className="h-full rounded"
                style={{ width:`${(val / 10) * 100}%`, background:'#4A8FFF', opacity:0.7 }}
              />
            </div>
            <span style={{ color:'var(--t1)', fontSize:12, fontWeight:600, width:24, textAlign:'right' }}>{val.toFixed(1)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
