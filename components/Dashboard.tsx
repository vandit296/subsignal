'use client';

import { useState } from 'react';
import { SubredditAnalysis } from '@/types';
import { Period } from '@/app/dashboard/[subreddit]/page';
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
    <div className="min-h-screen bg-[#0f0f11] text-zinc-100">
      {/* Top bar */}
      <div className="sticky top-0 z-10 bg-[#0f0f11] border-b border-zinc-900 px-6 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-shrink-0">
          <button
            onClick={onBack}
            className="text-zinc-500 hover:text-white text-sm transition-colors"
          >
            ← Back
          </button>
          <div className="flex items-center gap-3">
            <span className="bg-[#ff4500] text-white text-xs font-bold px-2 py-0.5 rounded">
              r/{analysis.subreddit}
            </span>
          </div>
        </div>

        {/* Period selector */}
        <div className="flex items-center gap-1 bg-[#18181b] border border-zinc-800 rounded-lg p-1">
          {PERIODS.map(p => (
            <button
              key={p.value}
              onClick={() => onPeriodChange(p.value)}
              className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${
                period === p.value
                  ? 'bg-orange-500 text-white'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {analysis.cached && analysis.cachedAt && (
            <span className="hidden sm:flex items-center gap-1.5 bg-zinc-800/60 border border-zinc-700/50 text-zinc-400 text-xs px-2 py-1 rounded-lg">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0" />
              Cached · {new Date(analysis.cachedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          {analysis.cached && (
            <button
              onClick={onRefresh}
              className="text-zinc-500 hover:text-orange-400 text-xs transition-colors"
              title="Force fresh analysis"
            >
              ↺ Refresh
            </button>
          )}
          {!analysis.cached && (
            <span className="text-zinc-600 text-xs hidden sm:block">
              Generated {new Date(analysis.generatedAt).toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

      {/* Tab Bar */}
      <div className="border-b border-zinc-900 px-6">
        <div className="flex gap-0 max-w-7xl mx-auto">
          <button
            onClick={() => setActiveTab('intelligence')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'intelligence'
                ? 'border-orange-500 text-white'
                : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Intelligence Report
          </button>
          <button
            onClick={() => setActiveTab('predictor')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'predictor'
                ? 'border-orange-500 text-white'
                : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <span>⚡</span>
            Score My Post
          </button>
          <button
            onClick={() => setActiveTab('opportunities')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'opportunities'
                ? 'border-orange-500 text-white'
                : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <span>🔔</span>
            Opportunities
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'intelligence' ? (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-5">
          {/* Subreddit stats */}
          <SubredditStats analysis={analysis} />

          {/* AI Summary */}
          <div className="bg-[#0d0d1f] border border-indigo-950 rounded-xl p-5">
            <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold mb-2">
              <span>✦</span>
              <span>AI SUMMARY — r/{analysis.subreddit.toUpperCase()}</span>
            </div>
            <p className="text-zinc-300 text-sm leading-relaxed">{analysis.aiSummary}</p>
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
