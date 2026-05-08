import { TimingSlot } from '@/types';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const HOURS = ['6am', '9am', '12pm', '3pm', '6pm', '9pm'];

const INTENSITIES = [
  'bg-[#1c1c20]',
  'bg-orange-950',
  'bg-orange-900',
  'bg-orange-700',
  'bg-orange-500',
];

export default function TimingHeatmap({ timing }: { timing: TimingSlot[] }) {
  function getIntensity(day: number, hour: number) {
    const slot = timing.find(t => t.dayOfWeek === day && t.hourBlock === hour);
    return slot?.intensity ?? 0;
  }

  return (
    <div className="bg-[#18181b] border border-zinc-800 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <span className="text-zinc-400 text-xs font-semibold uppercase tracking-widest">Best Posting Times</span>
        <span className="text-zinc-600 text-xs">UTC</span>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-[32px_repeat(7,1fr)] gap-1 mb-1">
        <div />
        {DAYS.map(d => (
          <div key={d} className="text-center text-zinc-600 text-xs">{d}</div>
        ))}
      </div>

      {/* Rows */}
      {HOURS.map((h, hi) => (
        <div key={h} className="grid grid-cols-[32px_repeat(7,1fr)] gap-1 mb-1">
          <div className="text-zinc-600 text-xs self-center">{h}</div>
          {DAYS.map((_, di) => {
            const intensity = getIntensity(di, hi);
            return (
              <div
                key={di}
                className={`h-6 rounded ${INTENSITIES[intensity]} transition-colors`}
                title={`${DAYS[di]} ${h} — intensity ${intensity}`}
              />
            );
          })}
        </div>
      ))}

      {/* Legend */}
      <div className="flex items-center gap-2 mt-3">
        <span className="text-zinc-600 text-xs">Low</span>
        <div className="flex gap-1">
          {INTENSITIES.map((cls, i) => (
            <div key={i} className={`w-3 h-2 rounded-sm ${cls}`} />
          ))}
        </div>
        <span className="text-zinc-600 text-xs">High</span>
      </div>
    </div>
  );
}
