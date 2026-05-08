import { PostFormat } from '@/types';

export default function PostFormats({ formats }: { formats: PostFormat[] }) {
  const max = formats[0]?.avgScore ?? 1;

  return (
    <div className="bg-[#18181b] border border-zinc-800 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <span className="text-zinc-400 text-xs font-semibold uppercase tracking-widest">Top Post Formats</span>
        <span className="text-zinc-600 text-xs">by avg score</span>
      </div>
      <div className="space-y-2">
        {formats.map(f => (
          <div key={f.rank} className="bg-[#1c1c20] rounded-lg px-3 py-2.5">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-zinc-600 text-xs font-bold w-4">#{f.rank}</span>
              <span className="text-zinc-200 text-xs font-medium flex-1">{f.name}</span>
              <span className="text-orange-400 text-xs font-semibold">
                {f.avgScore >= 1000 ? `${(f.avgScore / 1000).toFixed(1)}k` : f.avgScore}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1 bg-zinc-800 rounded overflow-hidden">
                <div
                  className="h-full rounded bg-orange-500 opacity-60"
                  style={{ width: `${(f.avgScore / max) * 100}%` }}
                />
              </div>
            </div>
            <div className="text-zinc-600 text-xs mt-1.5 italic">&ldquo;{f.example}&rdquo;</div>
          </div>
        ))}
      </div>
    </div>
  );
}
