import { CommunityDNA as CDNA } from '@/types';

const DNA_LABELS: Record<string, string> = {
  tone: 'Tone',
  selfPromoRisk: 'Self-promo risk',
  vulnerabilityRewarded: 'Vulnerability',
  modActivity: 'Mod activity',
  technicalDepth: 'Technical depth',
  humor: 'Humor',
};

export default function CommunityDNA({ dna }: { dna: CDNA }) {
  const entries = Object.entries(dna) as [keyof CDNA, { label: string; score: number }][];

  return (
    <div style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 10, padding: '16px 18px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--t2)' }}>Community DNA</span>
        <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 4, background: 'var(--blue-dim)', color: 'var(--blue)', border: '0.5px solid var(--blue-border)' }}>AI</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {entries.map(([key, val]) => (
          <div key={key}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <div>
                <span style={{ fontSize: 11, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{DNA_LABELS[key] ?? key}</span>
                <span style={{ fontSize: 12, color: 'var(--t1)', fontWeight: 500, marginLeft: 8 }}>{val.label}</span>
              </div>
              <span style={{ fontSize: 11, color: 'var(--t3)' }}>{val.score}%</span>
            </div>
            <div style={{ height: 3, background: 'var(--overlay)', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: 2, background: 'var(--blue)', width: `${val.score}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
