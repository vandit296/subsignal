'use client';

import { useState } from 'react';
import { SubredditAnalysis } from '@/types';
import { Period } from '@/app/scout/[subreddit]/page';
import ScoreCards from './ScoreCards';
import CommunityDNA from './CommunityDNA';
import PostFormats from './PostFormats';
import TimingHeatmap from './TimingHeatmap';
import AudienceIntel from './AudienceIntel';
import RiskFlags from './RiskFlags';
import OpportunityScore from './OpportunityScore';
import KeywordCloud from './KeywordCloud';
import PostPredictor from './PostPredictor';
import Opportunities from './Opportunities';
import SubredditStats from './SubredditStats';

interface Props {
  analysis: SubredditAnalysis;
  period: Period;
  onPeriodChange: (p: Period) => void;
  onRefresh: () => void;
  onBack: () => void;
}

type Tab = 'intelligence' | 'predictor' | 'opportunities';

const PERIODS: { value: Period; label: string }[] = [
  { value: '1week',   label: 'Week' },
  { value: '1month',  label: 'Month' },
  { value: '3months', label: '3 Months' },
  { value: '1year',   label: 'Year' },
  { value: 'alltime', label: 'All Time' },
];

export default function Dashboard({ analysis, period, onPeriodChange, onRefresh, onBack }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('intelligence');

  return (
    <div className="min-h-screen bg-void text-t1">
      {/* Top bar */}
      <div className="sticky top-0 z-10 bg-void border-b border-panel px-6 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-shrink-0">
          <button
            onClick={onBack}
            className="text-t2 hover:text-t1 text-sm transition-colors"
          >
            ← Back
          </button>
          <div className="flex items-center gap-3">
            <span className="bg-[#ff4500] text-t1 text-xs font-bold px-2 py-0.5 rounded">
              r/{analysis.subreddit}
            </span>
          </div>
        </div>

        {/* Period selector */}
        <div className="flex items-center gap-1 bg-surface border border-cyan-border rounded-none p-1">
          {PERIODS.map(p => (
            <button
              key={p.value}
              onClick={() => onPeriodChange(p.value)}
              className={`px-2.5 py-1 text-xs rounded-none font-medium transition-colors ${
                period === p.value
                  ? 'bg-hot text-t1'
                  : 'text-t2 hover:text-t1'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {analysis.cached && analysis.cachedAt && (
            <span className="hidden sm:flex items-center gap-1.5 text-t2 text-xs px-2 py-1 rounded-none" style={{ background: 'var(--overlay)', border: '0.5px solid var(--border)' }}>
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: 'var(--blue)' }} />
              Cached · {new Date(analysis.cachedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          {analysis.cached && (
            <button
              onClick={onRefresh}
              className="text-t2 hover:text-hot text-xs transition-colors"
              title="Force fresh analysis"
            >
              ↺ Refresh
            </button>
          )}
          {!analysis.cached && (
            <span className="text-t3 text-xs hidden sm:block">
              Generated {new Date(analysis.generatedAt).toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

      {/* Tab Bar */}
      <div className="px-6" style={{ borderBottom: '0.5px solid var(--border)' }}>
        <div className="flex gap-0 max-w-7xl mx-auto">
          {(['intelligence', 'predictor', 'opportunities'] as Tab[]).map(tab => {
            const labels: Record<Tab, string> = { intelligence: 'Intelligence Report', predictor: 'Score My Post', opportunities: 'Opportunities' };
            const active = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="px-4 py-3 text-sm font-medium transition-colors"
                style={{
                  borderBottom: active ? '2px solid var(--blue)' : '2px solid transparent',
                  color: active ? 'var(--t1)' : 'var(--t3)',
                  background: 'none',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-ui)',
                }}
              >
                {labels[tab]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'intelligence' ? (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-5">
          {/* Subreddit stats */}
          <SubredditStats analysis={analysis} />

          {/* AI Summary */}
          <div className="rounded-none p-5" style={{ background: 'var(--surface)', border: '0.5px solid var(--blue-border)' }}>
            <div className="flex items-center gap-2 text-xs font-semibold mb-2" style={{ color: 'var(--blue)' }}>
              <span>✦</span>
              <span>AI SUMMARY — r/{analysis.subreddit.toUpperCase()}</span>
            </div>
            <p className="text-t1 text-sm leading-relaxed">{analysis.aiSummary}</p>
          </div>

          {/* Score cards */}
          <ScoreCards analysis={analysis} />

          {/* Row: DNA + Formats + Timing */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <CommunityDNA dna={analysis.communityDNA} />
            <PostFormats formats={analysis.postFormats} />
            <TimingHeatmap timing={analysis.timing} />
          </div>

          {/* Row: Audience + Keywords | Risk + Opportunity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="space-y-5">
              <AudienceIntel
                signals={analysis.audienceSignals}
                overlap={analysis.crossCommunityOverlap}
              />
              <KeywordCloud keywords={analysis.winningKeywords} />
            </div>
            <div className="space-y-5">
              <RiskFlags flags={analysis.riskFlags} />
              <OpportunityScore breakdown={analysis.opportunityBreakdown} total={analysis.opportunityScore} />
            </div>
          </div>
        </div>
      ) : activeTab === 'predictor' ? (
        <PostPredictor subreddit={analysis.subreddit} />
      ) : (
        <Opportunities subreddit={analysis.subreddit} />
      )}
    </div>
  );
}
