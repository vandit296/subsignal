'use client';

const UI = 'var(--font-ui)';
const MONO = "'SF Mono','Fira Code',monospace";

const SERVICES = [
  { title: 'Reddit consultancy', desc: 'Strategy, growth, community positioning', price: '$99', unit: '/ hr', highlight: false },
  { title: 'Product consultancy', desc: 'Roadmap, feature prioritisation, GTM', price: '$149', unit: '/ hr', highlight: false },
  { title: 'Full MVP — up to 25 features', desc: 'Design + build + deploy, production-ready', price: '$4,999', unit: '', highlight: true },
  { title: 'Full MVP — up to 50 features', desc: 'Design + build + deploy, production-ready', price: '$8,999', unit: '', highlight: false },
  { title: 'Full MVP — up to 100 features', desc: 'Design + build + deploy, production-ready', price: '$14,999', unit: '', highlight: false },
];

const RedditIcon = ({ size = 18, color = '#FF4500' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/>
  </svg>
);

const CalIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
);

export default function HirePage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--void)', fontFamily: UI, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 24px' }}>
      <div style={{ width: '100%', maxWidth: 560 }}>

        <div style={{ marginBottom: 36 }}>
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', color: 'rgba(255,69,0,0.7)', textTransform: 'uppercase' as const, marginBottom: 10 }}>
            Reddit growth & product
          </div>
          <h1 style={{ fontSize: 30, fontWeight: 700, color: 'var(--t1)', margin: '0 0 10px', letterSpacing: '-0.03em', lineHeight: 1.2 }}>
            Work with me
          </h1>
          <p style={{ fontSize: 14, color: 'var(--t3)', lineHeight: 1.7, margin: '0 0 24px', maxWidth: 460 }}>
            I built Treddit — a Reddit intelligence platform with 105 features — to understand exactly how founders win on Reddit. Now I help others do the same.
          </p>

          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'rgba(255,69,0,0.07)', border: '0.5px solid rgba(255,69,0,0.22)', borderRadius: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,69,0,0.12)', border: '0.5px solid rgba(255,69,0,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <RedditIcon />
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--t1)' }}>u/Common_Knee1430</div>
              <a href="https://www.reddit.com/user/Common_Knee1430/" target="_blank" rel="noopener noreferrer"
                style={{ fontSize: 11, color: 'rgba(255,69,0,0.65)', textDecoration: 'none' }}>
                View Reddit profile →
              </a>
            </div>
          </div>
        </div>

        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', color: 'var(--t4)', textTransform: 'uppercase' as const, marginBottom: 14, fontFamily: MONO }}>
            Services
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {SERVICES.map((s, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '13px 16px',
                background: s.highlight ? 'rgba(74,143,255,0.06)' : 'rgba(255,255,255,0.025)',
                border: `0.5px solid ${s.highlight ? 'rgba(74,143,255,0.2)' : 'rgba(255,255,255,0.07)'}`,
                borderRadius: 8,
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--t1)' }}>{s.title}</div>
                    {s.highlight && (
                      <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', background: 'rgba(74,143,255,0.12)', color: 'var(--blue)', borderRadius: 3, letterSpacing: '0.07em', fontFamily: MONO }}>
                        POPULAR
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--t4)' }}>{s.desc}</div>
                </div>
                <div style={{ textAlign: 'right' as const, flexShrink: 0, marginLeft: 16 }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--blue)' }}>{s.price}</span>
                  {s.unit && <span style={{ fontSize: 11, color: 'var(--t4)', marginLeft: 3 }}>{s.unit}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' as const }}>
          <a href="https://calendly.com/vanditj/new-meeting" target="_blank" rel="noopener noreferrer"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '11px 22px', background: 'var(--blue)', color: '#fff', borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
            <CalIcon />
            Book a free 15-min call
          </a>
          <a href="https://www.reddit.com/message/compose/?to=Common_Knee1430" target="_blank" rel="noopener noreferrer"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '11px 20px', background: 'rgba(255,69,0,0.08)', border: '0.5px solid rgba(255,69,0,0.28)', color: '#FF6B35', borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
            <RedditIcon size={15} color="#FF6B35" />
            DM on Reddit
          </a>
          <span style={{ fontSize: 11, color: 'var(--t4)' }}>Usually replies within 24h</span>
        </div>

      </div>
    </div>
  );
}
