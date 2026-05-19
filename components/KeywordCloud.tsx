import { WinningKeyword } from '@/types';

function getKeywordStyle(weight: 'lg' | 'md' | 'sm') {
  if (weight === 'lg') return {
    background: 'var(--blue-dim)',
    border: '0.5px solid var(--blue-border)',
    color: 'var(--blue)',
    fontSize: 13,
    fontWeight: 600,
  };
  if (weight === 'md') return {
    background: 'var(--panel)',
    border: '0.5px solid var(--border)',
    color: 'var(--t1)',
    fontSize: 12,
    fontWeight: 500,
  };
  return {
    background: 'transparent',
    border: '0.5px solid var(--border)',
    color: 'var(--t3)',
    fontSize: 12,
    fontWeight: 400,
  };
}

export default function KeywordCloud({ keywords }: { keywords: WinningKeyword[] }) {
  return (
    <div className="bg-surface rounded-xl p-5" style={{ border:'0.5px solid var(--border)' }}>
      <div className="flex items-center justify-between mb-4">
        <span style={{ color:'var(--t2)', fontSize:12, fontWeight:600 }}>Winning keywords</span>
        <span style={{ color:'var(--t4)', fontSize:12 }}>in top posts</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {keywords.map((k, i) => (
          <span
            key={i}
            style={{
              ...getKeywordStyle(k.weight),
              padding:'4px 12px',
              borderRadius:20,
              fontFamily:'var(--font-ui)',
            }}
          >
            {k.word}
          </span>
        ))}
      </div>
    </div>
  );
}
