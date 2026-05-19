import { RiskFlag } from '@/types';

type Level = 'banned' | 'risky' | 'safe';

function getLevelStyle(level: Level) {
  if (level === 'banned') return {
    borderLeft: '2px solid var(--hot)',
    background: 'rgba(255,69,0,0.05)',
    badgeColor: 'var(--hot)',
    badgeBg: 'rgba(255,69,0,0.09)',
    badgeBorder: 'rgba(255,69,0,0.30)',
    label: 'Banned',
  };
  if (level === 'risky') return {
    borderLeft: '2px solid var(--border-hover)',
    background: 'transparent',
    badgeColor: 'var(--t3)',
    badgeBg: 'var(--overlay)',
    badgeBorder: 'var(--border)',
    label: 'Risky',
  };
  return {
    borderLeft: '2px solid var(--blue-border)',
    background: 'var(--blue-dim)',
    badgeColor: 'var(--blue)',
    badgeBg: 'var(--blue-dim)',
    badgeBorder: 'var(--blue-border)',
    label: 'Safe',
  };
}

export default function RiskFlags({ flags }: { flags: RiskFlag[] }) {
  return (
    <div className="bg-surface border rounded-none p-5" style={{ borderColor: 'var(--border)' }}>
      <div className="flex items-center justify-between mb-4">
        <span className="text-t2 text-xs font-semibold uppercase tracking-widest">Risk Intelligence</span>
        <span className="text-xs px-2 py-0.5 rounded" style={{ color: 'var(--blue)', background: 'var(--blue-dim)', border: '0.5px solid var(--blue-border)' }}>AI</span>
      </div>
      <div className="space-y-2">
        {flags.map((f, i) => {
          const s = getLevelStyle(f.level as Level);
          return (
            <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-r" style={{ borderLeft: s.borderLeft, background: s.background }}>
              <span className="text-t1 text-xs flex-1">{f.label}</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded" style={{ color: s.badgeColor, background: s.badgeBg, border: `0.5px solid ${s.badgeBorder}` }}>
                {s.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
