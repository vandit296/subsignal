import { CommunityDNA as CDNA } from '@/types';

const DNA_LABELS: Record<string, string> = {
  tone: 'Tone',
  selfPromoRisk: 'Self-promo risk',
  vulnerabilityRewarded: 'Vulnerability',
  modActivity: 'Mod activity',
  technicalDepth: 'Technical depth',
  humor: 'Humor',
};

export default function CommunityDNA({ dna }: { dna: CDNA }) {
  const entries = Object.entries(dna) as [keyof CDNA, { label: string; score: number }][];

  return (
    <div className="bg-surface border rounded-none p-5" style={{ borderColor: 'var(--border)' }}>
      <div className="flex items-center justify-between mb-4">
        <span className="text-t2 text-xs font-semibold uppercase tracking-widest">Community DNA</span>
        <span className="text-xs px-2 py-0.5 rounded" style={{ color: 'var(--blue)', background: 'var(--blue-dim)', border: '0.5px solid var(--blue-border)' }}>AI</span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {entries.map(([key, val]) => (
          <div key={key} className="rounded-none p-3" style={{ background: 'var(--panel)' }}>
            <div className="text-t2 text-xs mb-1">{DNA_LABELS[key]}</div>
            <div className="text-t1 text-xs mb-2 font-medium">{val.label}</div>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 rounded overflow-hidden" style={{ background: 'var(--overlay)' }}>
                <div
                  className="h-full rounded"
                  style={{ width: `${val.score}%`, backgroundColor: '#4A8FFF' }}
                />
              </div>
              <span className="text-t2 text-xs w-7 text-right">{val.score}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
