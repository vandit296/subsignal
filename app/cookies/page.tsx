import Link from 'next/link';

export const metadata = { title: 'Cookie Policy — Treddit' };

export default function CookiesPage() {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--void)',
      fontFamily: 'var(--font-ui)',
      color: 'var(--t2)',
      padding: '80px 24px 120px',
    }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>

        <div style={{ marginBottom: 56 }}>
          <Link href="/" style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            letterSpacing: '0.14em',
            color: 'var(--t4)',
            textDecoration: 'none',
            textTransform: 'uppercase',
            display: 'inline-block',
            marginBottom: 32,
          }}>
            ← Treddit
          </Link>
          <h1 style={{
            fontSize: 28,
            fontWeight: 700,
            color: 'var(--t1)',
            letterSpacing: '-0.03em',
            margin: '0 0 12px',
          }}>
            Cookie Policy
          </h1>
          <p style={{ fontSize: 13, color: 'var(--t4)', margin: 0 }}>
            Effective date: 20 May 2025 &nbsp;·&nbsp; Last updated: 20 May 2025
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 40, fontSize: 14, lineHeight: 1.8 }}>

          <section>
            <p>
              This Cookie Policy explains how Treddit uses cookies and similar technologies
              when you visit treddit.live. It should be read alongside our{' '}
              <Link href="/privacy" style={{ color: 'var(--blue)', textDecoration: 'none' }}>Privacy Policy</Link>.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--t1)', letterSpacing: '-0.01em', margin: '0 0 12px' }}>
              1. What Are Cookies
            </h2>
            <p>
              Cookies are small text files placed on your device by websites you visit. They
              are widely used to make websites work efficiently and to provide information to
              site operators. "Similar technologies" include local storage, session storage,
              and browser fingerprinting — this policy covers all of these.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--t1)', letterSpacing: '-0.01em', margin: '0 0 12px' }}>
              2. Cookies We Use
            </h2>

            <p style={{ fontWeight: 600, color: 'var(--t1)', marginBottom: 6 }}>Strictly Necessary Cookies</p>
            <p>
              These cookies are essential for the Service to function. They cannot be disabled.
            </p>
            <div style={{
              background: 'rgba(255,255,255,0.025)',
              border: '1px solid rgba(255,255,255,0.06)',
              padding: '16px 20px',
              marginTop: 12,
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}>
              {[
                { name: 'next-auth.session-token', purpose: 'Authenticates your session after signing in with Google. Required to stay logged in.', duration: 'Session / 30 days' },
                { name: 'next-auth.csrf-token', purpose: 'Protects against cross-site request forgery attacks during authentication.', duration: 'Session' },
                { name: 'next-auth.callback-url', purpose: 'Remembers where to redirect you after signing in.', duration: 'Session' },
              ].map(c => (
                <div key={c.name}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--t1)', marginBottom: 4 }}>{c.name}</div>
                  <div style={{ fontSize: 13, color: 'var(--t3)' }}>{c.purpose}</div>
                  <div style={{ fontSize: 11, color: 'var(--t4)', marginTop: 2, fontFamily: 'var(--font-mono)' }}>Duration: {c.duration}</div>
                </div>
              ))}
            </div>

            <p style={{ fontWeight: 600, color: 'var(--t1)', margin: '24px 0 6px' }}>Functional Local Storage</p>
            <p>
              We use the browser's local storage (not cookies) for user preferences. These
              are stored locally on your device and are not transmitted to our servers.
            </p>
            <div style={{
              background: 'rgba(255,255,255,0.025)',
              border: '1px solid rgba(255,255,255,0.06)',
              padding: '16px 20px',
              marginTop: 12,
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}>
              {[
                { name: 'subsignal_last_scout_sub', purpose: 'Remembers the last subreddit you analyzed so you can quickly return to it.', duration: 'Until cleared' },
              ].map(c => (
                <div key={c.name}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--t1)', marginBottom: 4 }}>{c.name}</div>
                  <div style={{ fontSize: 13, color: 'var(--t3)' }}>{c.purpose}</div>
                  <div style={{ fontSize: 11, color: 'var(--t4)', marginTop: 2, fontFamily: 'var(--font-mono)' }}>Duration: {c.duration}</div>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--t1)', letterSpacing: '-0.01em', margin: '0 0 12px' }}>
              3. What We Do Not Use
            </h2>
            <p>
              Treddit does <strong style={{ color: 'var(--t1)' }}>not</strong> use:
            </p>
            <ul style={{ paddingLeft: 20, marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <li>Advertising or tracking cookies</li>
              <li>Third-party analytics cookies (e.g. Google Analytics, Mixpanel)</li>
              <li>Social media tracking pixels (e.g. Facebook Pixel)</li>
              <li>Behavioural profiling or retargeting cookies</li>
            </ul>
          </section>

          <section>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--t1)', letterSpacing: '-0.01em', margin: '0 0 12px' }}>
              4. Third-Party Cookies
            </h2>
            <p>
              Our payment processors — Razorpay (for Indian users) and Paddle (for international
              users) — may set their own cookies when you proceed to checkout. These are governed
              by{' '}
              <a href="https://razorpay.com/privacy/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--blue)', textDecoration: 'none' }}>Razorpay's Cookie Policy</a>
              {' '}and{' '}
              <a href="https://www.paddle.com/legal/privacy" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--blue)', textDecoration: 'none' }}>Paddle's Privacy Policy</a>
              {' '}respectively. We have no control over these cookies.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--t1)', letterSpacing: '-0.01em', margin: '0 0 12px' }}>
              5. Managing Cookies
            </h2>
            <p>
              You can control and delete cookies through your browser settings. Note that
              disabling strictly necessary cookies (particularly session cookies) will prevent
              you from logging in and using the Service.
            </p>
            <p style={{ marginTop: 12 }}>
              Browser-specific instructions for managing cookies:
            </p>
            <ul style={{ paddingLeft: 20, marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <li><a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--blue)', textDecoration: 'none' }}>Google Chrome</a></li>
              <li><a href="https://support.mozilla.org/en-US/kb/enhanced-tracking-protection-firefox-desktop" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--blue)', textDecoration: 'none' }}>Mozilla Firefox</a></li>
              <li><a href="https://support.apple.com/guide/safari/manage-cookies-sfri11471/mac" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--blue)', textDecoration: 'none' }}>Apple Safari</a></li>
              <li><a href="https://support.microsoft.com/en-us/microsoft-edge/delete-cookies-in-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--blue)', textDecoration: 'none' }}>Microsoft Edge</a></li>
            </ul>
            <p style={{ marginTop: 12 }}>
              To clear local storage, open your browser's developer tools (F12), navigate to
              Application → Local Storage, and delete the entries for this site.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--t1)', letterSpacing: '-0.01em', margin: '0 0 12px' }}>
              6. Changes to This Policy
            </h2>
            <p>
              We may update this Cookie Policy if we change the technologies we use. We will
              update the "last updated" date above and, for material changes, notify you via
              email or in-app notice.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--t1)', letterSpacing: '-0.01em', margin: '0 0 12px' }}>
              7. Contact
            </h2>
            <p>
              For questions about this Cookie Policy:{' '}
              <a href="mailto:vandit296@gmail.com" style={{ color: 'var(--blue)', textDecoration: 'none' }}>
                vandit296@gmail.com
              </a>
            </p>
          </section>

          <div style={{
            paddingTop: 32,
            borderTop: '1px solid rgba(255,255,255,0.06)',
            display: 'flex',
            gap: 24,
            flexWrap: 'wrap',
          }}>
            {[
              { label: 'Terms of Service', href: '/terms' },
              { label: 'Privacy Policy', href: '/privacy' },
              { label: 'Refund Policy', href: '/refund' },
            ].map(l => (
              <Link key={l.href} href={l.href} style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                letterSpacing: '0.1em',
                color: 'var(--t4)',
                textDecoration: 'none',
                textTransform: 'uppercase',
              }}>
                {l.label}
              </Link>
            ))}
          </div>

        </div>
      </div>
    </div>
  );
}
