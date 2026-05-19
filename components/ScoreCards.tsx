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
        className="w-4 h-4 rounded-none bg-overlay border border-cyan-border text-t2 hover:text-t1 hover:border-cyan text-[10px] font-bold flex items-center justify-center transition-colors cursor-default"
        aria-label="More info"
      >
        i
      </button>
      {visible && (
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 bg-panel border border-cyan-border text-t1 text-xs rounded-none px-3 py-2 z-50 shadow-xl leading-relaxed pointer-events-none">
          {text}
          <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-panel" />
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
  // Blue for all bars; only Opportunity Score uses orange (passed as 'hot')
  const isHot = color === 'text-hot';
  const scoreColor = isHot ? 'var(--hot)' : 'var(--blue)';
  const barColor = isHot ? 'var(--hot)' : '#4A8FFF';

  return (
    <div className={`bg-surface border rounded-none p-4 transition-opacity ${dimmed ? 'opacity-60' : ''}`} style={{ borderColor: 'var(--border)' }}>
      <div className="flex items-center gap-1.5 mb-2">
        <span className="text-t2 text-xs uppercase tracking-widest">{label}</span>
        <InfoTooltip text={tooltip} />
      </div>
      <div className="text-3xl font-bold" style={{ color: dimmed ? 'var(--t3)' : scoreColor }}>{value.toFixed(1)}</div>
      <div className="text-t3 text-xs mt-1">{sub}</div>
      <div className="h-1 bg-overlay rounded mt-3">
        <div
          className="h-full rounded transition-all"
          style={{ width: `${pct}%`, background: dimmed ? '#3a3a42' : barColor }}
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
          color="text-hot"
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
          color={hasContext ? 'text-blue-500' : 'text-t2'}
          tooltip={
            hasContext
              ? "How closely this subreddit's typical members match your specific target customer — scored against your product description and goal."
              : "How well this subreddit fits a generic early-stage SaaS founder. Add your product in Alerts to get a score tailored to your actual audience."
          }
          dimmed={!hasContext}
        />
        <ScoreCard
          label="Market Gap"
          value={analysis.competition}
          sub="10 = wide open"
          color="text-red-400"
          tooltip="How much room there is for your product in this subreddit. 10 = blue ocean — very few similar tools promoted here. 1 = saturated — the community is flooded with competing products."
        />
      </div>

      {/* No-context warning banner */}
      {!hasContext && (
        <div className="flex items-start gap-3 px-4 py-3 text-xs rounded-none" style={{ background: 'var(--blue-dim)', border: '0.5px solid var(--blue-border)', color: 'var(--t2)' }}>
          <span className="mt-0.5 flex-shrink-0" style={{ color: 'var(--blue)' }}>ℹ</span>
          <span>
            <strong style={{ color: 'var(--blue)' }}>Opportunity Score and Audience Match are based on a generic founder profile</strong> — not your specific product.{' '}
            <a href="/alerts" className="underline transition-colors" style={{ color: 'var(--blue)' }}>
              Set up your product in Alerts →
            </a>{' '}
            to get scores tailored to what you're actually building.
          </span>
        </div>
      )}
    </div>
  );
}
