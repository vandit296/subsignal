import { TimingSlot } from '@/types';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const HOURS = ['6am', '9am', '12pm', '3pm', '6pm', '9pm'];

// Blue intensity scale: 0=empty, 1=faint, 2=light, 3=mid, 4=full
const INTENSITY_BG = [
  'rgba(74,143,255,0.0)',
  'rgba(74,143,255,0.08)',
  'rgba(74,143,255,0.18)',
  'rgba(74,143,255,0.38)',
  'rgba(74,143,255,0.72)',
];

export default function TimingHeatmap({ timing }: { timing: TimingSlot[] }) {
  function getIntensity(day: number, hour: number) {
    const slot = timing.find(t => t.dayOfWeek === day && t.hourBlock === hour);
    return slot?.intensity ?? 0;
  }

  return (
    <div className="bg-surface rounded-xl p-5" style={{ border:'0.5px solid var(--border)' }}>
      <div className="flex items-center justify-between mb-4">
        <span style={{ color:'var(--t2)', fontSize:12, fontWeight:600 }}>Best posting times</span>
        <span style={{ color:'var(--t4)', fontSize:12 }}>UTC</span>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-[32px_repeat(7,1fr)] gap-1 mb-1">
        <div />
        {DAYS.map(d => (
          <div key={d} style={{ textAlign:'center', color:'var(--t4)', fontSize:11 }}>{d}</div>
        ))}
      </div>

      {/* Rows */}
      {HOURS.map((h, hi) => (
        <div key={h} className="grid grid-cols-[32px_repeat(7,1fr)] gap-1 mb-1">
          <div style={{ color:'var(--t4)', fontSize:11, alignSelf:'center' }}>{h}</div>
          {DAYS.map((_, di) => {
            const intensity = getIntensity(di, hi);
            return (
              <div
                key={di}
                className="h-5 rounded transition-colors"
                style={{ background: INTENSITY_BG[intensity] }}
                title={`${DAYS[di]} ${h} — intensity ${intensity}`}
              />
            );
          })}
        </div>
      ))}

      {/* Legend */}
      <div className="flex items-center gap-2 mt-3">
        <span style={{ color:'var(--t4)', fontSize:11 }}>Low</span>
        <div className="flex gap-1">
          {INTENSITY_BG.map((bg, i) => (
            <div key={i} className="w-3 h-2 rounded-sm" style={{ background: bg, border:'0.5px solid var(--border)' }} />
          ))}
        </div>
        <span style={{ color:'var(--t4)', fontSize:11 }}>High</span>
      </div>
    </div>
  );
}
