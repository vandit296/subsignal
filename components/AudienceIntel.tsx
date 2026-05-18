import { AudienceSignal } from '@/types';

interface Props {
  signals: AudienceSignal[];
  overlap: { subreddit: string; pct: number }[];
}

export default function AudienceIntel({ signals, overlap }: Props) {
  return (
    <div className="bg-surface border border-cyan-border rounded-none p-5">
      <div className="flex items-center justify-between mb-4">
        <span className="text-t2 text-xs font-semibold uppercase tracking-widest">Audience Intelligence</span>
        <span className="text-indigo-400 text-xs bg-indigo-950 px-2 py-0.5 rounded">AI</span>
      </div>
      <div className="space-y-2 mb-4">
        {signals.map((s, i) => (
          <div key={i} className="flex gap-3 bg-[#1c1c20] rounded-none p-3">
            <span className="text-base mt-0.5">{s.icon}</span>
            <div>
              <span className="text-t1 text-xs font-semibold">{s.label}: </span>
              <span className="text-t2 text-xs">{s.detail}</span>
            </div>
          </div>
        ))}
      </div>

      {overlap.length > 0 && (
        <>
          <div className="text-t3 text-xs uppercase tracking-widest mb-2">Also active in</div>
          <div className="flex flex-wrap gap-2">
            {overlap.map((o, i) => (
              <div key={i} className="flex items-center gap-1.5 bg-[#1c1c20] rounded-none px-3 py-1">
                <span className="text-t1 text-xs">{o.subreddit}</span>
                <span className="text-hot text-xs font-semibold">{o.pct}%</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
