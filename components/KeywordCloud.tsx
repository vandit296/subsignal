import { WinningKeyword } from '@/types';

const SIZE_CLASSES = {
  lg: 'bg-zinc-800 text-orange-200 text-sm font-semibold',
  md: 'bg-zinc-900 text-zinc-300 text-xs font-medium',
  sm: 'bg-[#18181b] text-zinc-500 text-xs',
};

export default function KeywordCloud({ keywords }: { keywords: WinningKeyword[] }) {
  return (
    <div className="bg-[#18181b] border border-zinc-800 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <span className="text-zinc-400 text-xs font-semibold uppercase tracking-widest">Winning Keywords</span>
        <span className="text-zinc-600 text-xs">in top posts</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {keywords.map((k, i) => (
          <span
            key={i}
            className={`px-3 py-1 rounded-full border border-zinc-800 ${SIZE_CLASSES[k.weight]}`}
          >
            {k.word}
          </span>
        ))}
      </div>
    </div>
  );
}
