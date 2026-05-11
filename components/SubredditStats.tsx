import { SubredditAnalysis } from '@/types';

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

function communityAge(createdUtc: number): string {
  const now = Date.now() / 1000;
  const diffSeconds = now - createdUtc;
  const years = diffSeconds / (365.25 * 24 * 3600);
  if (years >= 2) return `${Math.floor(years)} years old`;
  const months = diffSeconds / (30.44 * 24 * 3600);
  if (months >= 2) return `${Math.floor(months)} months old`;
  return 'Brand new';
}

interface StatPillProps {
  icon: string;
  label: string;
  value: string;
}

function StatPill({ icon, label, value }: StatPillProps) {
  return (
    <div className="flex items-center gap-2 bg-[#1c1c20] rounded-lg px-3 py-2">
      <span className="text-base">{icon}</span>
      <div>
        <div className="text-zinc-200 text-sm font-semibold leading-none">{value}</div>
        <div className="text-zinc-600 text-xs mt-0.5">{label}</div>
      </div>
    </div>
  );
}

export default function SubredditStats({ analysis }: { analysis: SubredditAnalysis }) {
  const { subscribers, createdUtc, over18, publicDescription } = analysis;

  if (!subscribers && !createdUtc && !publicDescription) return null;

  return (
    <div className="bg-[#18181b] border border-zinc-800 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <span className="bg-[#ff4500] text-white text-xs font-bold px-2 py-0.5 rounded">
          r/{analysis.subreddit}
        </span>
        {over18 && (
          <span className="bg-red-900/40 text-red-400 text-xs font-semibold px-2 py-0.5 rounded border border-red-800/40">
            NSFW
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
        {subscribers != null && (
          <StatPill icon="👥" label="Members" value={formatNumber(subscribers)} />
        )}
        {createdUtc != null && (
          <StatPill icon="📅" label="Community age" value={communityAge(createdUtc)} />
        )}
        <StatPill
          icon="🔗"
          label="View on Reddit"
          value={`reddit.com/r/${analysis.subreddit}`}
        />
      </div>

      {publicDescription && (
        <p className="text-zinc-500 text-xs leading-relaxed line-clamp-3">
          {publicDescription}
        </p>
      )}
    </div>
  );
}
