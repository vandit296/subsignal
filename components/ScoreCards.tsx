import { SubredditAnalysis } from '@/types';

function ScoreCard({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: number;
  sub: string;
  color: string;
}) {
  const pct = (value / 10) * 100;
  return (
    <div className="bg-[#18181b] border border-zinc-800 rounded-xl p-4">
      <div className="text-zinc-500 text-xs uppercase tracking-widest mb-2">{label}</div>
      <div className={`text-3xl font-bold ${color}`}>{value.toFixed(1)}</div>
      <div className="text-zinc-600 text-xs mt-1">{sub}</div>
      <div className="h-1 bg-zinc-800 rounded mt-3">
        <div
          className={`h-full rounded transition-all`}
          style={{ width: `${pct}%`, background: color.includes('orange') ? '#f97316' : color.includes('green') ? '#22c55e' : color.includes('blue') ? '#3b82f6' : '#ef4444' }}
        />
      </div>
    </div>
  );
}

export default function ScoreCards({ analysis }: { analysis: SubredditAnalysis }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      <ScoreCard label="Opportunity Score" value={analysis.opportunityScore} sub="out of 10" color="text-orange-500" />
      <ScoreCard label="Posting Safety" value={analysis.postingSafety} sub="Ban risk inverse" color="text-green-500" />
      <ScoreCard label="Audience Match" value={analysis.audienceMatch} sub="Founder relevance" color="text-blue-500" />
      <ScoreCard label="Competition" value={analysis.competition} sub="Crowding level" color="text-red-400" />
    </div>
  );
}
