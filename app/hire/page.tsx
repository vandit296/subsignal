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
              <span style={{ fontSize: 18 }}>r/</span>
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
            Book a free 15-min call
          </a>
          <a href="https://www.reddit.com/message/compose/?to=Common_Knee1430" target="_blank" rel="noopener noreferrer"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '11px 20px', background: 'rgba(255,69,0,0.08)', border: '0.5px solid rgba(255,69,0,0.28)', color: '#FF6B35', borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
            DM on Reddit
          </a>
          <span style={{ fontSize: 11, color: 'var(--t4)' }}>Usually replies within 24h</span>
        </div>

      </div>
    </div>
  );
}
