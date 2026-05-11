'use client';

import { useState } from 'react';
import { SubredditAnalysis } from '@/types';

function InfoTooltip({ text }: { text: string }) {
  const [visible, setVisible] = useState(false);
  return (
    <span className="relative inline-flex items-center">
      <button
        type="button"
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        onFocus={() => setVisible(true)}
        onBlur={() => setVisible(false)}
        className="w-4 h-4 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-500 hover:text-zinc-300 hover:border-zinc-500 text-[10px] font-bold flex items-center justify-center transition-colors cursor-default"
        aria-label="More info"
      >
        i
      </button>
      {visible && (
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 bg-zinc-900 border border-zinc-700 text-zinc-300 text-xs rounded-lg px-3 py-2 z-50 shadow-xl leading-relaxed pointer-events-none">
          {text}
          <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-zinc-700" />
        </span>
      )}
    </span>
  );
}

interface ScoreCardProps {
  label: string;
  value: number;
  sub: string;
  color: string;
  tooltip: string;
  dimmed?: boolean;
}

function ScoreCard({ label, value, sub, color, tooltip, dimmed }: ScoreCardProps) {
  const pct = (value / 10) * 100;
  const barColor = color.includes('orange') ? '#f97316'
    : color.includes('green') ? '#22c55e'
    : color.includes('blue') ? '#3b82f6'
    : '#ef4444';

  return (
    <div className={`bg-[#18181b] border rounded-xl p-4 transition-opacity ${dimmed ? 'border-zinc-800/50 opacity-60' : 'border-zinc-800'}`}>
      <div className="flex items-center gap-1.5 mb-2">
        <span className="text-zinc-500 text-xs uppercase tracking-widest">{label}</span>
        <InfoTooltip text={tooltip} />
      </div>
      <div className={`text-3xl font-bold ${color}`}>{value.toFixed(1)}</div>
      <div className="text-zinc-600 text-xs mt-1">{sub}</div>
      <div className="h-1 bg-zinc-800 rounded mt-3">
        <div
          className="h-full rounded transition-all"
          style={{ width: `${pct}%`, background: dimmed ? '#52525b' : barColor }}
        />
      </div>
    </div>
  );
}

export default function ScoreCards({
  analysis,
}: {
  analysis: SubredditAnalysis;
}) {
  const hasContext = analysis.hasProductContext ?? false;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <ScoreCard
          label="Opportunity Score"
          value={analysis.opportunityScore}
          sub={hasContext ? 'For your product' : 'Generic founder'}
          color="text-orange-500"
          tooltip="Weighted combination of audience fit, content gap, posting safety, and growth trend. How attractive this subreddit is overall as a marketing channel."
          dimmed={!hasContext}
        />
        <ScoreCard
          label="Posting Safety"
          value={analysis.postingSafety}
          sub="Ban risk inverse"
          color="text-green-500"
          tooltip="How likely your posts are to survive without removal. Based on subreddit rules strictness, mod activity, and tolerance of self-promotion. 10 = very safe, 1 = high removal risk."
        />
        <ScoreCard
          label={hasContext ? 'Audience Match' : 'General Founder Fit'}
          value={analysis.audienceMatch}
          sub={hasContext ? 'Your target customer' : 'Generic profile'}
          color={hasContext ? 'text-blue-500' : 'text-zinc-500'}
          tooltip={
            hasContext
              ? "How closely this subreddit's typical members match your specific target customer — scored against your product description and goal."
              : "How well this subreddit fits a generic early-stage SaaS founder. Add your product in Alerts to get a score tailored to your actual audience."
          }
          dimmed={!hasContext}
        />
        <ScoreCard
          label="Competition"
          value={analysis.competition}
          sub="10 = blue ocean"
          color="text-red-400"
          tooltip="How saturated this subreddit is with similar products. 10 means very little competition — you can stand out easily. 1 means the community is flooded with tools like yours."
        />
      </div>

      {/* No-context warning banner */}
      {!hasContext && (
        <div className="flex items-start gap-3 bg-amber-500/5 border border-amber-500/20 rounded-xl px-4 py-3 text-xs text-amber-400/80">
          <span className="mt-0.5 flex-shrink-0">⚠</span>
          <span>
            <strong className="text-amber-400">Opportunity Score and Audience Match are based on a generic founder profile</strong> — not your specific product.{' '}
            <a href="/alerts" className="underline hover:text-amber-300 transition-colors">
              Set up your product in Alerts →
            </a>{' '}
            to get scores tailored to what you're actually building.
          </span>
        </div>
      )}
    </div>
  );
}
