'use client';

import { useEffect, useState } from 'react';
import { TimingSlot } from '@/types';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// UTC hours that each hourBlock index represents
const UTC_HOURS = [6, 9, 12, 15, 18, 21];

const INTENSITY_BG = [
  'rgba(74,143,255,0.0)',
  'rgba(74,143,255,0.08)',
  'rgba(74,143,255,0.20)',
  'rgba(74,143,255,0.40)',
  'rgba(74,143,255,0.75)',
];

// Format a UTC hour into the user's local timezone label
function utcHourToLocal(utcHour: number, tz: string): string {
  try {
    // Build a fixed UTC date for that hour on a neutral day
    const d = new Date(`2024-01-15T${String(utcHour).padStart(2, '0')}:00:00Z`);
    return new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(d).replace(':00', '').toLowerCase();
  } catch {
    return `${utcHour}:00`;
  }
}

// Abbreviation for the timezone, e.g. "IST", "EST", "PST"
function tzAbbr(tz: string): string {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: tz, timeZoneName: 'short',
    }).formatToParts(new Date('2024-01-15T12:00:00Z'));
    return parts.find(p => p.type === 'timeZoneName')?.value ?? tz;
  } catch {
    return tz;
  }
}

export default function TimingHeatmap({ timing }: { timing: TimingSlot[] }) {
  const [tz, setTz] = useState('UTC');

  useEffect(() => {
    try {
      const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (detected) setTz(detected);
    } catch {}
  }, []);

  const hourLabels = UTC_HOURS.map(h => utcHourToLocal(h, tz));
  const tzLabel = tzAbbr(tz);

  function getIntensity(day: number, hour: number) {
    const slot = timing.find(t => t.dayOfWeek === day && t.hourBlock === hour);
    return slot?.intensity ?? 0;
  }

  // Find peak slot
  let peakDay = 0, peakHour = 0, peakVal = 0;
  timing.forEach(t => {
    if (t.intensity > peakVal) { peakVal = t.intensity; peakDay = t.dayOfWeek; peakHour = t.hourBlock; }
  });
  const bestDay = DAYS[peakDay] ?? 'Monday';
  const bestTime = hourLabels[peakHour] ?? hourLabels[0];

  return (
    <div style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 10, padding: '16px 18px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--t2)' }}>Posting time heatmap</span>
        <span style={{ fontSize: 11, color: 'var(--t4)' }}>{tzLabel} · last 30d</span>
      </div>

      {/* Day headers */}
      <div style={{ display: 'grid', gridTemplateColumns: '44px repeat(7, 1fr)', gap: 4, marginBottom: 5 }}>
        <div />
        {DAYS.map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: 10, color: 'var(--t4)' }}>{d}</div>
        ))}
      </div>

      {/* Grid rows */}
      {hourLabels.map((h, hi) => (
        <div key={hi} style={{ display: 'grid', gridTemplateColumns: '44px repeat(7, 1fr)', gap: 4, marginBottom: 4 }}>
          <div style={{ fontSize: 10, color: 'var(--t4)', alignSelf: 'center', textAlign: 'right', paddingRight: 4 }}>{h}</div>
          {DAYS.map((_, di) => {
            const intensity = getIntensity(di, hi);
            return (
              <div
                key={di}
                title={`${DAYS[di]} ${h} — intensity ${intensity}`}
                style={{
                  height: 22, borderRadius: 3,
                  background: INTENSITY_BG[intensity],
                  cursor: 'default',
                  transition: 'transform 0.1s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1.15)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
              />
            );
          })}
        </div>
      ))}

      {/* Legend */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 10, justifyContent: 'flex-end' }}>
        <span style={{ fontSize: 10, color: 'var(--t4)' }}>Low</span>
        <div style={{ display: 'flex', gap: 3 }}>
          {INTENSITY_BG.map((bg, i) => (
            <div key={i} style={{ width: 14, height: 14, borderRadius: 2, background: bg, border: '0.5px solid var(--border)' }} />
          ))}
        </div>
        <span style={{ fontSize: 10, color: 'var(--t4)' }}>High</span>
      </div>

      {/* Best window callout */}
      {peakVal > 0 && (
        <div style={{
          marginTop: 10, display: 'flex', alignItems: 'center', gap: 7,
          padding: '8px 12px', borderRadius: 7,
          background: 'var(--green-dim)', border: '0.5px solid var(--green-border)',
        }}>
          <span style={{ fontSize: 13 }}>✦</span>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--green)' }}>Best window:</span>
          <span style={{ fontSize: 11, color: 'rgba(34,197,94,0.75)' }}>
            {bestDay} around {bestTime} {tzLabel}
          </span>
        </div>
      )}
    </div>
  );
}
