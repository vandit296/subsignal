import { RiskFlag } from '@/types';

const LEVEL_STYLES = {
  banned: {
    row: 'bg-red-950/30 border-l-2 border-red-500',
    badge: 'bg-red-950 text-red-400',
    label: 'Banned',
  },
  risky: {
    row: 'bg-yellow-950/20 border-l-2 border-yellow-600',
    badge: 'bg-yellow-950 text-yellow-400',
    label: 'Risky',
  },
  safe: {
    row: 'bg-green-950/20 border-l-2 border-green-700',
    badge: 'bg-green-950 text-green-400',
    label: 'Safe',
  },
};

export default function RiskFlags({ flags }: { flags: RiskFlag[] }) {
  return (
    <div className="bg-[#18181b] border border-zinc-800 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <span className="text-zinc-400 text-xs font-semibold uppercase tracking-widest">Risk Intelligence</span>
        <span className="text-indigo-400 text-xs bg-indigo-950 px-2 py-0.5 rounded">AI</span>
      </div>
      <div className="space-y-2">
        {flags.map((f, i) => {
          const s = LEVEL_STYLES[f.level];
          return (
            <div key={i} className={`flex items-center gap-3 px-3 py-2 rounded-r-lg ${s.row}`}>
              <span className="text-zinc-300 text-xs flex-1">{f.label}</span>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded ${s.badge}`}>
                {s.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
