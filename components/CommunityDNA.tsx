import { CommunityDNA as CDNA } from '@/types';

const DNA_COLORS: Record<string, string> = {
  tone: '#3b82f6',
  selfPromoRisk: '#ef4444',
  vulnerabilityRewarded: '#22c55e',
  modActivity: '#f97316',
  technicalDepth: '#a78bfa',
  humor: '#facc15',
};

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
    <div className="bg-surface border border-cyan-border rounded-none p-5">
      <div className="flex items-center justify-between mb-4">
        <span className="text-t2 text-xs font-semibold uppercase tracking-widest">Community DNA</span>
        <span className="text-indigo-400 text-xs bg-indigo-950 px-2 py-0.5 rounded">AI</span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {entries.map(([key, val]) => (
          <div key={key} className="bg-[#1c1c20] rounded-none p-3">
            <div className="text-t2 text-xs mb-1">{DNA_LABELS[key]}</div>
            <div className="text-t1 text-xs mb-2 font-medium">{val.label}</div>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-overlay rounded overflow-hidden">
                <div
                  className="h-full rounded"
                  style={{ width: `${val.score}%`, backgroundColor: DNA_COLORS[key] }}
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
