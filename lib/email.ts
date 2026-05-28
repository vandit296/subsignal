import type { DailyBrief, BriefNarrative, MarketPulseItem } from '@/lib/upstash';

const BEAT_COLORS: Record<string, { label: string; color: string }> = {
  hero:    { label: 'LEAD STORY', color: '#FF6B35' },
  signal:  { label: 'SIGNAL',     color: '#60A5FA' },
  tension: { label: 'DEBATE',     color: '#FBBF24' },
  mood:    { label: 'TRENDING',   color: '#4ADE80' },
};

function getBeatLabel(type: string): { label: string; color: string } {
  return BEAT_COLORS[type] ?? { label: 'SIGNAL', color: '#60A5FA' };
}

function pulseChips(items: MarketPulseItem[]): string {
  if (!items || items.length === 0) return '';
  const chips = items.map(item => {
    const up = item.change >= 0;
    const color = up ? '#4ADE80' : '#F87171';
    const bg = up ? '#0D2B1A' : '#2B0D0D';
    const border = up ? '#1A4A2E' : '#4A1A1A';
    return `<span style="display:inline-block;font-size:11px;font-weight:700;padding:3px 10px;border-radius:3px;background:${bg};color:${color};border:1px solid ${border};margin:0 4px 4px 0;">${item.label} ${up ? '▲' : '▼'} ${Math.abs(item.change).toFixed(1)}%</span>`;
  }).join('');
  return `
    <div style="padding:16px 32px 12px;border-bottom:1px solid #1E1E1E;">
      ${chips}
    </div>`;
}

function narrativeBlock(narrative: BriefNarrative, isLead: boolean): string {
  const beat = getBeatLabel(narrative.type);
  const lede = narrative.synthesis?.split('\n\n')[0] ?? '';
  // For email: one clean sentence
  const shortLede = lede.split('. ').slice(0, 2).join('. ').trim() + '.';
  const threads = (narrative.threads ?? []).slice(0, 3);
  const srcLine = [...new Set(threads.map(t => `r/${t.subreddit}`))].join(' · ');

  const chips = threads.map(t =>
    `<a href="${t.url}" style="display:inline-block;font-size:10px;padding:3px 9px;border-radius:3px;background:#191919;color:#666;border:1px solid #2A2A2A;text-decoration:none;margin:0 4px 4px 0;white-space:nowrap;"><span style="color:#FF4500;font-weight:600;">r/${t.subreddit}</span> <span style="color:#333;">·</span> ${t.score.toLocaleString()}↑ <span style="color:#333;">·</span> ${t.numComments}c</a>`
  ).join('');

  const headlineSize = isLead ? '20px' : '15px';
  const padding = isLead ? '28px 32px 24px' : '22px 32px 18px';
  const borderBottom = isLead ? 'border-bottom:1px solid #1E1E1E;' : '';

  return `
    <div style="padding:${padding};${borderBottom}">
      <div style="margin-bottom:10px;">
        <span style="display:inline-block;font-size:9px;font-weight:800;letter-spacing:0.12em;padding:2px 8px;border-radius:2px;background:#1A1A1A;color:${beat.color};border:1px solid #2A2A2A;">${beat.label}</span>
        ${srcLine ? `<span style="font-size:10px;color:#444;margin-left:8px;">${srcLine}</span>` : ''}
      </div>

      <div style="font-size:${headlineSize};font-weight:700;color:#F0EBE0;line-height:1.3;font-family:Georgia,'Times New Roman',serif;margin-bottom:${isLead ? '14px' : '10px'};">
        ${narrative.headline}
      </div>

      ${isLead && shortLede ? `<div style="font-size:13px;color:#888;line-height:1.75;margin-bottom:14px;">${shortLede}</div>` : ''}

      ${narrative.implication ? `
      <div style="padding:10px 14px;border-left:2px solid ${beat.color}33;background:#0A0A0A;border-radius:0 4px 4px 0;margin-bottom:12px;">
        <div style="font-size:8px;font-weight:700;letter-spacing:0.12em;color:#3A3A3A;margin-bottom:5px;">WHY IT MATTERS</div>
        <div style="font-size:12px;color:#777;line-height:1.6;">${narrative.implication}</div>
      </div>` : ''}

      ${chips ? `<div style="margin-top:4px;">${chips}</div>` : ''}
    </div>`;
}

function buildEmailHtml(brief: DailyBrief, edition: number, userEmail: string): string {
  const date = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  const signals = brief.signals ?? [];

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Treddit Morning Brief</title>
</head>
<body style="margin:0;padding:0;background:#0C0C0C;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:600px;margin:0 auto;background:#0C0C0C;">

    <!-- Header -->
    <div style="padding:24px 32px 16px;border-bottom:2px solid #FF6B35;">
      <div style="font-size:9px;font-weight:700;letter-spacing:0.15em;color:#FF6B35;margin-bottom:6px;">TREDDIT INTELLIGENCE</div>
      <div style="display:flex;justify-content:space-between;align-items:baseline;">
        <div style="font-size:24px;font-weight:900;color:#F5F0E8;letter-spacing:-0.04em;font-family:Georgia,'Times New Roman',serif;">Morning Brief</div>
        <div style="font-size:10px;color:#444;">Edition #${edition}</div>
      </div>
      <div style="font-size:11px;color:#555;margin-top:4px;">
        ${date}
        ${brief.narrativeCount > 0 ? ` &middot; ${brief.narrativeCount} narratives` : ''}
        ${brief.threadCount > 0 ? ` &middot; ${brief.threadCount} threads` : ''}
      </div>
    </div>

    <!-- Market Pulse -->
    ${pulseChips(brief.pulse ?? [])}

    <!-- Lead story -->
    ${brief.hero ? narrativeBlock(brief.hero, true) : ''}

    <!-- Signals divider -->
    ${signals.length > 0 ? `
    <div style="padding:12px 32px 8px;border-top:1px solid #1A1A1A;">
      <span style="font-size:9px;font-weight:700;letter-spacing:0.12em;color:#3A3A3A;">MORE SIGNALS</span>
    </div>` : ''}

    <!-- Signal stories -->
    ${signals.map((s, i) => `
    <div style="${i < signals.length - 1 ? 'border-bottom:1px solid #161616;' : ''}">
      ${narrativeBlock(s, false)}
    </div>`).join('')}

    <!-- Footer -->
    <div style="padding:20px 32px 28px;border-top:1px solid #1A1A1A;text-align:center;">
      <div style="font-size:10px;color:#2E2E2E;line-height:1.7;">
        Generated ${brief.generatedAt ? new Date(brief.generatedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : 'today'} &middot; Powered by Reddit + Claude<br />
        <a href="https://treddit.app/brief" style="color:#444;text-decoration:none;">View in browser</a>
        &nbsp;&middot;&nbsp;
        <a href="https://treddit.app/settings" style="color:#444;text-decoration:none;">Manage preferences</a>
      </div>
    </div>

  </div>
</body>
</html>`;
}

export async function sendMorningBrief(
  userEmail: string,
  brief: DailyBrief,
  edition = 1
): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { ok: false, error: 'RESEND_API_KEY not set' };

  const html = buildEmailHtml(brief, edition, userEmail);
  const date = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Treddit Brief <brief@treddit.app>',
        to: [userEmail],
        subject: `Morning Brief #${edition} — ${date}`,
        html,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return { ok: false, error: err };
    }

    return { ok: true };
  } catch (e: unknown) {
    return { ok: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}
