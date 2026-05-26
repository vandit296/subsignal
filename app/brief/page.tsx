'use client';
import { useEffect, useState, useCallback } from 'react';
import type { WeeklyBrief, BriefStory } from '@/lib/upstash';

const BEAT_LABELS: Record<string, string> = {
  trending: 'TRENDING',
  debate: 'DEBATE',
  signal: 'SIGNAL',
  deep: 'DEEP DIVE',
  breaking: 'BREAKING',
};

const BEAT_COLORS: Record<string, string> = {
  trending: 'var(--hot)',
  debate: '#f59e0b',
  signal: 'var(--blue)',
  deep: 'var(--t3)',
  breaking: '#ef4444',
};

function BeatTag({ beat }: { beat: string }) {
  return (
    <span style={{
      fontSize: '10px',
      fontWeight: 700,
      letterSpacing: '0.12em',
      color: BEAT_COLORS[beat] || 'var(--t3)',
      border: `1px solid ${BEAT_COLORS[beat] || 'var(--border)'}`,
      padding: '2px 7px',
      borderRadius: '2px',
      textTransform: 'uppercase',
      fontFamily: 'var(--font-ui)',
    }}>
      {BEAT_LABELS[beat] || beat}
    </span>
  );
}

function LeadStory({ story }: { story: BriefStory }) {
  return (
    <a
      href={story.url}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'block',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: '6px',
        padding: '28px 32px',
        marginBottom: '12px',
        textDecoration: 'none',
        transition: 'border-color 0.15s',
        cursor: 'pointer',
      }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--blue)')}
      onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
        <BeatTag beat={story.beat} />
        <span style={{ fontSize: '11px', color: 'var(--t4)', fontFamily: 'var(--font-ui)' }}>
          r/{story.subreddit} · {story.upvotes.toLocaleString()} upvotes · {story.comments} comments
        </span>
      </div>
      <h2 style={{
        fontSize: '22px',
        fontWeight: 700,
        color: 'var(--t1)',
        lineHeight: 1.25,
        marginBottom: '12px',
        fontFamily: 'var(--font-ui)',
      }}>
        {story.headline}
      </h2>
      <p style={{ fontSize: '14px', color: 'var(--t2)', lineHeight: 1.65, marginBottom: '16px' }}>
        {story.lede}
      </p>
      {story.pullQuote && (
        <blockquote style={{
          borderLeft: '3px solid var(--blue)',
          paddingLeft: '16px',
          margin: '0 0 16px',
          color: 'var(--t2)',
          fontStyle: 'italic',
          fontSize: '13px',
          lineHeight: 1.6,
        }}>
          "{story.pullQuote}"
          {story.pullQuoteAuthor && (
            <span style={{ display: 'block', marginTop: '4px', color: 'var(--t4)', fontStyle: 'normal', fontSize: '11px' }}>
              — {story.pullQuoteAuthor}
            </span>
          )}
        </blockquote>
      )}
      <div style={{
        background: 'rgba(74,143,255,0.06)',
        border: '1px solid rgba(74,143,255,0.15)',
        borderRadius: '4px',
        padding: '10px 14px',
      }}>
        <span style={{ fontSize: '10px', color: 'var(--blue)', fontWeight: 700, letterSpacing: '0.1em', fontFamily: 'var(--font-ui)' }}>
          WHY IT MATTERS
        </span>
        <p style={{ fontSize: '13px', color: 'var(--t2)', lineHeight: 1.55, marginTop: '4px', marginBottom: 0 }}>
          {story.whyItMatters}
        </p>
      </div>
    </a>
  );
}

function StoryCard({ story }: { story: BriefStory }) {
  return (
    <a
      href={story.url}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'block',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: '6px',
        padding: '18px 20px',
        textDecoration: 'none',
        transition: 'border-color 0.15s',
      }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--blue)')}
      onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
        <BeatTag beat={story.beat} />
        <span style={{ fontSize: '10px', color: 'var(--t4)', fontFamily: 'var(--font-ui)' }}>
          r/{story.subreddit}
        </span>
        <span style={{ marginLeft: 'auto', fontSize: '10px', color: 'var(--t4)', fontFamily: 'var(--font-ui)' }}>
          {story.upvotes.toLocaleString()} ↑ · {story.comments} 💬
        </span>
      </div>
      <h3 style={{
        fontSize: '15px',
        fontWeight: 600,
        color: 'var(--t1)',
        lineHeight: 1.3,
        marginBottom: '8px',
        fontFamily: 'var(--font-ui)',
      }}>
        {story.headline}
      </h3>
      <p style={{ fontSize: '13px', color: 'var(--t3)', lineHeight: 1.55, marginBottom: '10px' }}>
        {story.lede}
      </p>
      <p style={{ fontSize: '12px', color: 'var(--t4)', lineHeight: 1.5, margin: 0 }}>
        <span style={{ color: 'var(--blue)', fontWeight: 600 }}>Why it matters: </span>
        {story.whyItMatters}
      </p>
    </a>
  );
}

export default function BriefPage() {
  const [brief, setBrief] = useState<WeeklyBrief | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBrief = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/brief');
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json();
      setBrief(data.brief);
    } catch {
      setError('Could not load brief.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchBrief(); }, [fetchBrief]);

  const generate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch('/api/brief/generate', { method: 'POST' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Generation failed');
      }
      await fetchBrief();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const [lead, ...rest] = brief?.stories || [];

  return (
    <div style={{ maxWidth: '760px', margin: '0 auto', padding: '32px 24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '28px', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--t1)', fontFamily: 'var(--font-ui)', marginBottom: '4px' }}>
            Monday Brief
          </h1>
          {brief && (
            <p style={{ fontSize: '12px', color: 'var(--t4)', fontFamily: 'var(--font-ui)' }}>
              {brief.weekLabel} · {brief.stories.length} stories · {brief.postsScanned} posts scanned across {brief.subredditsScanned} subreddits
            </p>
          )}
          {!brief && !loading && (
            <p style={{ fontSize: '12px', color: 'var(--t4)', fontFamily: 'var(--font-ui)' }}>
              No brief yet — generate your first one below
            </p>
          )}
        </div>
        <button
          onClick={generate}
          disabled={generating || loading}
          style={{
            padding: '8px 16px',
            background: generating ? 'var(--surface)' : 'var(--blue)',
            color: generating ? 'var(--t3)' : '#fff',
            border: '1px solid var(--border)',
            borderRadius: '4px',
            fontSize: '12px',
            fontWeight: 600,
            fontFamily: 'var(--font-ui)',
            cursor: generating ? 'not-allowed' : 'pointer',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          {generating ? 'Generating…' : brief ? '↺ Refresh Brief' : 'Generate Brief'}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div style={{
          background: 'rgba(239,68,68,0.08)',
          border: '1px solid rgba(239,68,68,0.25)',
          borderRadius: '4px',
          padding: '10px 14px',
          marginBottom: '20px',
          fontSize: '13px',
          color: '#ef4444',
          fontFamily: 'var(--font-ui)',
        }}>
          {error}
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--t4)', fontSize: '13px', fontFamily: 'var(--font-ui)' }}>
          Loading brief…
        </div>
      )}

      {/* Generating overlay hint */}
      {generating && (
        <div style={{
          background: 'rgba(74,143,255,0.06)',
          border: '1px solid rgba(74,143,255,0.15)',
          borderRadius: '6px',
          padding: '20px',
          marginBottom: '20px',
          textAlign: 'center',
          fontSize: '13px',
          color: 'var(--t3)',
          fontFamily: 'var(--font-ui)',
        }}>
          Scanning Reddit threads and generating stories — this takes ~20 seconds…
        </div>
      )}

      {/* Empty state */}
      {!loading && !generating && !brief && !error && (
        <div style={{
          border: '1px dashed var(--border)',
          borderRadius: '6px',
          padding: '60px 32px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>📰</div>
          <p style={{ fontSize: '14px', color: 'var(--t2)', marginBottom: '6px', fontFamily: 'var(--font-ui)' }}>
            No brief this week yet
          </p>
          <p style={{ fontSize: '12px', color: 'var(--t4)', fontFamily: 'var(--font-ui)' }}>
            Auto-generates every Sunday night. Hit Generate Brief to get one now.
          </p>
        </div>
      )}

      {/* Brief content */}
      {!loading && brief && brief.stories.length > 0 && (
        <>
          {lead && <LeadStory story={lead} />}
          {rest.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {rest.map((story, i) => (
                <StoryCard key={i} story={story} />
              ))}
            </div>
          )}
          <div style={{
            marginTop: '24px',
            paddingTop: '16px',
            borderTop: '1px solid var(--border)',
            fontSize: '11px',
            color: 'var(--t4)',
            fontFamily: 'var(--font-ui)',
            display: 'flex',
            justifyContent: 'space-between',
          }}>
            <span>Generated {new Date(brief.generatedAt).toLocaleString()}</span>
            <span>Auto-refreshes every Sunday night</span>
          </div>
        </>
      )}
    </div>
  );
}
