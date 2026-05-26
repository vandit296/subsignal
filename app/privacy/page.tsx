import Link from 'next/link';

export const metadata = { title: 'Privacy Policy — Treddit' };

export default function PrivacyPage() {
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
            Privacy Policy
          </h1>
          <p style={{ fontSize: 13, color: 'var(--t4)', margin: 0 }}>
            Effective date: 20 May 2025 &nbsp;·&nbsp; Last updated: 20 May 2025
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 40, fontSize: 14, lineHeight: 1.8 }}>

          <section>
            <p>
              This Privacy Policy describes how Treddit ("we", "us", or "our") collects, uses,
              and protects your personal information when you use our service at
              treddit.live. We are committed to protecting your privacy and complying
              with applicable data protection laws, including the EU General Data Protection
              Regulation (GDPR), the California Consumer Privacy Act (CCPA), and India's
              Information Technology Act, 2000.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--t1)', letterSpacing: '-0.01em', margin: '0 0 12px' }}>
              1. Data Controller
            </h2>
            <p>
              Vandit Jain, operating as Treddit, is the data controller responsible for your
              personal information. Contact:{' '}
              <a href="mailto:vandit296@gmail.com" style={{ color: 'var(--blue)', textDecoration: 'none' }}>
                vandit296@gmail.com
              </a>
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--t1)', letterSpacing: '-0.01em', margin: '0 0 12px' }}>
              2. Information We Collect
            </h2>
            <p style={{ marginBottom: 12 }}>We collect the following categories of information:</p>

            <p style={{ fontWeight: 600, color: 'var(--t1)', marginBottom: 6 }}>Account Information</p>
            <p>
              When you sign in with Google, we receive your email address, name, and profile
              picture via Google OAuth. We store your email address and subscription status.
              We do not store your Google password.
            </p>

            <p style={{ fontWeight: 600, color: 'var(--t1)', margin: '16px 0 6px' }}>Usage Data</p>
            <p>
              We collect information about how you use the Service, including which subreddits
              you analyze, your onboarding inputs (product description, goals, ideal customer),
              and feature interactions. This data is used to personalize your experience and
              improve the Service.
            </p>

            <p style={{ fontWeight: 600, color: 'var(--t1)', margin: '16px 0 6px' }}>Payment Information</p>
            <p>
              Payment is processed by Razorpay (India) or Paddle (international). We do not
              store your credit card or bank account details. We receive and store your
              subscription status, subscription ID, and customer ID from the payment processor.
            </p>

            <p style={{ fontWeight: 600, color: 'var(--t1)', margin: '16px 0 6px' }}>Technical Data</p>
            <p>
              We collect your IP address, browser type, device type, and general geographic
              location (country level) for security, fraud prevention, and routing (e.g.,
              determining which payment provider to use). We may use cookies and local storage
              for session management and user preferences.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--t1)', letterSpacing: '-0.01em', margin: '0 0 12px' }}>
              3. How We Use Your Information
            </h2>
            <ul style={{ paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <li>To provide, operate, and improve the Service</li>
              <li>To authenticate you and manage your account</li>
              <li>To process payments and manage your subscription</li>
              <li>To personalize AI-generated intelligence based on your product and goals</li>
              <li>To send transactional emails (account confirmation, subscription receipts, usage digests)</li>
              <li>To detect and prevent fraud, abuse, or security incidents</li>
              <li>To comply with legal obligations</li>
              <li>To analyze aggregate usage patterns and improve the Service</li>
            </ul>
            <p style={{ marginTop: 12 }}>
              We do not sell your personal information to third parties. We do not use your
              data to train AI models beyond what is necessary to provide the Service to you.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--t1)', letterSpacing: '-0.01em', margin: '0 0 12px' }}>
              4. Legal Basis for Processing (GDPR)
            </h2>
            <p>If you are in the European Economic Area, we process your data under the following bases:</p>
            <ul style={{ paddingLeft: 20, marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <li><strong style={{ color: 'var(--t1)' }}>Contract performance</strong> — processing necessary to provide the Service you subscribed to</li>
              <li><strong style={{ color: 'var(--t1)' }}>Legitimate interests</strong> — security, fraud prevention, and Service improvement</li>
              <li><strong style={{ color: 'var(--t1)' }}>Legal obligation</strong> — complying with applicable laws</li>
              <li><strong style={{ color: 'var(--t1)' }}>Consent</strong> — for non-essential communications, where required</li>
            </ul>
          </section>

          <section>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--t1)', letterSpacing: '-0.01em', margin: '0 0 12px' }}>
              5. Data Sharing and Third Parties
            </h2>
            <p>We share data only with the following categories of service providers:</p>
            <ul style={{ paddingLeft: 20, marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <li><strong style={{ color: 'var(--t1)' }}>Vercel</strong> — hosting and infrastructure</li>
              <li><strong style={{ color: 'var(--t1)' }}>Upstash</strong> — Redis database for user data and analysis cache</li>
              <li><strong style={{ color: 'var(--t1)' }}>Anthropic</strong> — AI processing of subreddit analysis (no personally identifying data is sent)</li>
              <li><strong style={{ color: 'var(--t1)' }}>Google</strong> — authentication via OAuth</li>
              <li><strong style={{ color: 'var(--t1)' }}>Razorpay / Paddle</strong> — payment processing</li>
              <li><strong style={{ color: 'var(--t1)' }}>Resend</strong> — transactional email delivery</li>
            </ul>
            <p style={{ marginTop: 12 }}>
              All third-party processors are bound by data processing agreements and are
              prohibited from using your data for their own purposes. We may disclose your
              information if required by law, court order, or to protect our rights or the
              safety of others.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--t1)', letterSpacing: '-0.01em', margin: '0 0 12px' }}>
              6. Data Retention
            </h2>
            <p>
              We retain your account data for as long as your account is active. If you delete
              your account, we will delete or anonymize your personal data within 30 days, except
              where we are required to retain it for legal or financial compliance (e.g., payment
              records, which may be retained for up to 7 years under Indian accounting law).
            </p>
            <p style={{ marginTop: 12 }}>
              Cached subreddit analysis data is retained for up to 90 days and does not contain
              personally identifying information.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--t1)', letterSpacing: '-0.01em', margin: '0 0 12px' }}>
              7. Your Rights
            </h2>
            <p style={{ marginBottom: 12 }}>
              Depending on your location, you may have the following rights regarding your data:
            </p>
            <ul style={{ paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <li><strong style={{ color: 'var(--t1)' }}>Access</strong> — request a copy of the personal data we hold about you</li>
              <li><strong style={{ color: 'var(--t1)' }}>Correction</strong> — request correction of inaccurate data</li>
              <li><strong style={{ color: 'var(--t1)' }}>Deletion</strong> — request deletion of your personal data ("right to be forgotten")</li>
              <li><strong style={{ color: 'var(--t1)' }}>Portability</strong> — receive your data in a structured, machine-readable format</li>
              <li><strong style={{ color: 'var(--t1)' }}>Objection</strong> — object to processing based on legitimate interests</li>
              <li><strong style={{ color: 'var(--t1)' }}>Restriction</strong> — request restriction of processing in certain circumstances</li>
              <li><strong style={{ color: 'var(--t1)' }}>Withdraw consent</strong> — where processing is based on consent</li>
            </ul>
            <p style={{ marginTop: 12 }}>
              To exercise any of these rights, email us at{' '}
              <a href="mailto:vandit296@gmail.com" style={{ color: 'var(--blue)', textDecoration: 'none' }}>
                vandit296@gmail.com
              </a>. We will respond within 30 days. EU users have the right to lodge a complaint
              with their local supervisory authority.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--t1)', letterSpacing: '-0.01em', margin: '0 0 12px' }}>
              8. California Privacy Rights (CCPA)
            </h2>
            <p>
              If you are a California resident, you have the right to know what personal
              information we collect, the right to delete it, the right to opt out of its sale
              (we do not sell personal information), and the right not to be discriminated against
              for exercising these rights. To submit a request, contact us at the email above.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--t1)', letterSpacing: '-0.01em', margin: '0 0 12px' }}>
              9. Cookies and Tracking
            </h2>
            <p>
              We use session cookies for authentication and local storage for user preferences
              (such as the last subreddit you analyzed). We do not use advertising trackers or
              third-party analytics cookies. You can disable cookies in your browser, but this
              may affect your ability to log in and use the Service.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--t1)', letterSpacing: '-0.01em', margin: '0 0 12px' }}>
              10. Data Security
            </h2>
            <p>
              We implement industry-standard security measures including encryption in transit
              (TLS), secure token storage, and access controls. However, no method of transmission
              over the internet is 100% secure. We cannot guarantee absolute security of your data.
              In the event of a data breach affecting your rights, we will notify you as required
              by applicable law.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--t1)', letterSpacing: '-0.01em', margin: '0 0 12px' }}>
              11. International Data Transfers
            </h2>
            <p>
              Your data may be processed in countries outside your country of residence, including
              the United States (Vercel, Upstash, Anthropic). Where required by law, we rely on
              appropriate transfer mechanisms such as Standard Contractual Clauses (SCCs) to ensure
              your data is protected in accordance with applicable standards.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--t1)', letterSpacing: '-0.01em', margin: '0 0 12px' }}>
              12. Children's Privacy
            </h2>
            <p>
              The Service is not directed at individuals under 18 years of age. We do not knowingly
              collect personal information from minors. If we become aware that we have collected
              data from a minor, we will delete it promptly.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--t1)', letterSpacing: '-0.01em', margin: '0 0 12px' }}>
              13. Changes to This Policy
            </h2>
            <p>
              We may update this Privacy Policy to reflect changes in our practices or applicable
              law. We will notify you of material changes via email at least 14 days before they
              take effect. The "last updated" date at the top reflects the most recent revision.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--t1)', letterSpacing: '-0.01em', margin: '0 0 12px' }}>
              14. Contact Us
            </h2>
            <p>
              For any privacy-related questions, requests, or concerns, contact us at:{' '}
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
