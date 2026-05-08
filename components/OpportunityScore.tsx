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
    <div className="bg-[#18181b] border border-zinc-800 rounded-xl p-5">
      <div className="text-zinc-400 text-xs font-semibold uppercase tracking-widest mb-4">Opportunity Score</div>
      <div className="text-center mb-5">
        <div className="text-5xl font-extrabold text-orange-500">{total.toFixed(1)}</div>
        <div className="text-zinc-500 text-xs mt-1">
          {total >= 8 ? 'High opportunity' : total >= 6 ? 'Moderate opportunity' : 'Low opportunity'}
        </div>
      </div>
      <div className="space-y-2.5">
        {(Object.entries(breakdown) as [keyof OpportunityBreakdown, number][]).map(([key, val]) => (
          <div key={key} className="flex items-center gap-3">
            <span className="text-zinc-500 text-xs w-28 flex-shrink-0">{LABELS[key]}</span>
            <div className="flex-1 h-1.5 bg-zinc-800 rounded overflow-hidden">
              <div
                className="h-full rounded bg-orange-500 opacity-60"
                style={{ width: `${(val / 10) * 100}%` }}
              />
            </div>
            <span className="text-zinc-300 text-xs font-semibold w-6 text-right">{val.toFixed(1)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
