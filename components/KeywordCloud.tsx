import { WinningKeyword } from '@/types';

function weightToScore(weight: 'lg' | 'md' | 'sm'): number {
  if (weight === 'lg') return 1.0;
  if (weight === 'md') return 0.6;
  return 0.32;
}

export default function KeywordCloud({ keywords }: { keywords: WinningKeyword[] }) {
  const maxScore = 1.0;

  return (
    <div style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 10, padding: '16px 18px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--t2)' }}>Winning keywords</span>
        <span style={{ fontSize: 11, color: 'var(--t4)' }}>in top posts</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {keywords.map((k, i) => {
          const score = weightToScore(k.weight);
          const pct = (score / maxScore) * 100;
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ minWidth: 100, fontSize: 12, color: 'var(--t1)', fontWeight: 500 }}>{k.word}</div>
              <div style={{ flex: 1, height: 3, background: 'var(--overlay)', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ height: '100%', borderRadius: 2, background: 'var(--blue)', width: `${pct}%` }} />
              </div>
              <div style={{ minWidth: 28, textAlign: 'right', fontSize: 11, color: 'var(--t4)' }}>
                {k.weight === 'lg' ? 'high' : k.weight === 'md' ? 'mid' : 'low'}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
