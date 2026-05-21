'use client';

import { useState } from 'react';
import { getFounderTake } from '@/lib/founder-take';

interface Props {
  score: number;
  subreddit: string;
}

const BUCKET_LABEL: Record<string, string> = {
  terrible:    'Score 0–39',
  weak:        'Score 40–59',
  decent:      'Score 60–69',
  good:        'Score 70–79',
  great:       'Score 80–89',
  exceptional: 'Score 90+',
};

export default function FounderBubble({ score, subreddit }: Props) {
  const [open, setOpen] = useState(true);
  const take = getFounderTake(score, subreddit);

  return (
    <div className="mt-5 flex flex-col gap-2">
      <span className="text-[10px] uppercase tracking-widest text-t3">Founder's take</span>

      <div className="flex items-end gap-3">
        {/* Speech bubble */}
        {open && (
          <div className="relative bg-surface border border-cyan-border rounded-none p-3.5 max-w-xs">
            {/* Arrow pointing down-right toward avatar */}
            <div
              className="absolute -bottom-[7px] right-[18px] w-3 h-[7px]"
              style={{
                background: 'var(--surface)',
                clipPath: 'polygon(0 0, 100% 0, 50% 100%)',
                borderLeft: '1px solid var(--cyan-border)',
                borderRight: '1px solid var(--cyan-border)',
              }}
            />
            <div className="text-hot text-[10px] font-bold uppercase tracking-widest mb-1">
              Vandit · Founder
            </div>
            <div className="text-[10px] text-t2 mb-2 px-2 py-0.5 border border-cyan-border inline-block">
              {BUCKET_LABEL[take.bucket]}
            </div>
            <p className="text-t1 text-xs leading-relaxed">{take.message}</p>
          </div>
        )}

        {/* Avatar — click to toggle */}
        <button
          onClick={() => setOpen(o => !o)}
          title={open ? 'Hide founder take' : "Vandit's take"}
          className="w-10 h-10 rounded-none border-2 border-hot-border bg-surface flex items-center justify-center text-xs font-bold text-hot shrink-0 hover:bg-hot/10 transition-colors"
          style={{ letterSpacing: '0.05em' }}
        >
          VJ
        </button>
      </div>

      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="text-[10px] text-t3 hover:text-t2 transition-colors text-left"
        >
          Show founder's take ↑
        </button>
      )}
    </div>
  );
}
