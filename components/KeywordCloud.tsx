import { WinningKeyword } from '@/types';

const SIZE_CLASSES = {
  lg: 'bg-hot-dim text-hot text-sm font-semibold',
  md: 'bg-panel text-t1 text-xs font-medium',
  sm: 'bg-surface text-t2 text-xs',
};

export default function KeywordCloud({ keywords }: { keywords: WinningKeyword[] }) {
  return (
    <div className="bg-surface border border-cyan-border rounded-none p-5">
      <div className="flex items-center justify-between mb-4">
        <span className="text-t2 text-xs font-semibold uppercase tracking-widest">Winning Keywords</span>
        <span className="text-t3 text-xs">in top posts</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {keywords.map((k, i) => (
          <span
            key={i}
            className={`px-3 py-1 rounded-none border border-cyan-border ${SIZE_CLASSES[k.weight]}`}
          >
            {k.word}
          </span>
        ))}
      </div>
    </div>
  );
}
