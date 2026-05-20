import { RiskFlag } from '@/types';

type Level = 'banned' | 'risky' | 'safe';

function getLevelConfig(level: Level) {
  if (level === 'banned') return {
    icon: '⊘',
    iconBg: 'var(--danger-dim)',
    iconColor: 'var(--danger)',
    badgeBg: 'var(--danger-dim)',
    badgeBorder: 'var(--danger-border)',
    badgeColor: 'var(--danger)',
    label: 'Banned',
  };
  if (level === 'risky') return {
    icon: '△',
    iconBg: 'var(--orange-dim)',
    iconColor: 'var(--orange)',
    badgeBg: 'var(--orange-dim)',
    badgeBorder: 'var(--orange-border)',
    badgeColor: 'var(--orange)',
    label: 'Risky',
  };
  return {
    icon: '✓',
    iconBg: 'var(--green-dim)',
    iconColor: 'var(--green)',
    badgeBg: 'var(--green-dim)',
    badgeBorder: 'var(--green-border)',
    badgeColor: 'var(--green)',
    label: 'Safe',
  };
}

export default function RiskFlags({ flags }: { flags: RiskFlag[] }) {
  const bannedCount = flags.filter(f => f.level === 'banned').length;
  const riskyCount = flags.filter(f => f.level === 'risky').length;

  return (
    <div style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 10, padding: '16px 18px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--t2)' }}>Risk Intelligence</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {bannedCount > 0 && (
            <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 4, background: 'var(--danger-dim)', color: 'var(--danger)', border: '0.5px solid var(--danger-border)' }}>
              {bannedCount} banned
            </span>
          )}
          {riskyCount > 0 && (
            <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 4, background: 'var(--orange-dim)', color: 'var(--orange)', border: '0.5px solid var(--orange-border)' }}>
              {riskyCount} risky
            </span>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {flags.map((f, i) => {
          const c = getLevelConfig(f.level as Level);
          return (
            <div
              key={i}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 10px', borderRadius: 7,
                background: i % 2 === 0 ? 'var(--panel)' : 'transparent',
              }}
            >
              <div style={{
                width: 28, height: 28, borderRadius: 7, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 700,
                background: c.iconBg, color: c.iconColor,
              }}>
                {c.icon}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: 'var(--t1)', fontWeight: 500 }}>{f.label}</div>
                {f.description && (
                  <div style={{ fontSize: 11, color: 'var(--t4)', marginTop: 1 }}>{f.description}</div>
                )}
              </div>
              <span style={{
                fontSize: 10, fontWeight: 600, padding: '3px 9px', borderRadius: 4, flexShrink: 0,
                background: c.badgeBg, color: c.badgeColor, border: `0.5px solid ${c.badgeBorder}`,
              }}>
                {c.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
