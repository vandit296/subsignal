import Link from 'next/link';

export const metadata = { title: 'Terms of Service — Treddit' };

export default function TermsPage() {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--void)',
      fontFamily: 'var(--font-ui)',
      color: 'var(--t2)',
      padding: '80px 24px 120px',
    }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>

        {/* Header */}
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
            Terms of Service
          </h1>
          <p style={{ fontSize: 13, color: 'var(--t4)', margin: 0 }}>
            Effective date: 20 May 2025 &nbsp;·&nbsp; Last updated: 20 May 2025
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 40, fontSize: 14, lineHeight: 1.8 }}>

          <section>
            <p>
              These Terms of Service ("Terms") govern your access to and use of Treddit
              (the "Service"), operated by Vandit Jain ("we", "us", or "our"), accessible at
              treddit.live. By creating an account or using the Service, you agree
              to be bound by these Terms. If you do not agree, do not use the Service.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--t1)', letterSpacing: '-0.01em', margin: '0 0 12px' }}>
              1. Description of Service
            </h2>
            <p>
              Treddit is a Reddit intelligence platform that analyzes subreddit communities to
              surface audience behavior patterns, high-intent threads, and engagement strategies.
              The Service is intended for founders, marketers, and growth professionals.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--t1)', letterSpacing: '-0.01em', margin: '0 0 12px' }}>
              2. Eligibility
            </h2>
            <p>
              You must be at least 18 years old and capable of forming a binding contract to use
              the Service. By using Treddit, you represent that you meet these requirements.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--t1)', letterSpacing: '-0.01em', margin: '0 0 12px' }}>
              3. Account Registration
            </h2>
            <p>
              You may register using Google OAuth. You are responsible for maintaining the
              confidentiality of your account and all activities that occur under it. You agree
              to provide accurate, current, and complete information and to update it as needed.
              We reserve the right to suspend or terminate accounts that violate these Terms.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--t1)', letterSpacing: '-0.01em', margin: '0 0 12px' }}>
              4. Subscriptions and Billing
            </h2>
            <p>
              Treddit offers a free tier and a paid subscription ("Operate" plan). Paid subscriptions
              are billed monthly on the date of purchase. Payments are processed by Razorpay (for
              users in India) or Paddle (for users outside India). By subscribing, you authorize
              us to charge your payment method on a recurring basis until you cancel.
            </p>
            <p style={{ marginTop: 12 }}>
              Prices are displayed in INR for Indian users and USD for international users.
              Applicable taxes may be added at checkout depending on your jurisdiction.
              We reserve the right to change pricing with 30 days' notice to existing subscribers.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--t1)', letterSpacing: '-0.01em', margin: '0 0 12px' }}>
              5. Cancellation
            </h2>
            <p>
              You may cancel your subscription at any time through your account settings or by
              contacting us. Cancellation takes effect at the end of the current billing period.
              You will retain access to paid features until that date. We do not prorate partial
              months unless required by applicable law.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--t1)', letterSpacing: '-0.01em', margin: '0 0 12px' }}>
              6. Acceptable Use
            </h2>
            <p>You agree not to:</p>
            <ul style={{ paddingLeft: 20, marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <li>Use the Service to spam, harass, or harm Reddit communities or their members</li>
              <li>Scrape, resell, or redistribute data obtained through the Service without written permission</li>
              <li>Attempt to reverse-engineer, decompile, or extract the underlying algorithms or models</li>
              <li>Use the Service for any unlawful purpose or in violation of Reddit's Terms of Service</li>
              <li>Circumvent any access controls, rate limits, or authentication mechanisms</li>
              <li>Use automated scripts or bots to access the Service beyond its intended API</li>
            </ul>
            <p style={{ marginTop: 12 }}>
              We reserve the right to suspend or terminate access immediately for violations,
              without refund.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--t1)', letterSpacing: '-0.01em', margin: '0 0 12px' }}>
              7. Intellectual Property
            </h2>
            <p>
              The Service, including its design, algorithms, AI models, and content generated by
              Treddit, is owned by us and protected by intellectual property laws. You are granted
              a limited, non-exclusive, non-transferable license to use the Service for your own
              business purposes during your subscription.
            </p>
            <p style={{ marginTop: 12 }}>
              AI-generated insights and reports produced by the Service may be used by you for
              your own business purposes. You may not republish or resell them as a competing
              intelligence product.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--t1)', letterSpacing: '-0.01em', margin: '0 0 12px' }}>
              8. Third-Party Services
            </h2>
            <p>
              The Service relies on third-party providers including Reddit (data source), Anthropic
              (AI processing), Upstash (data storage), Vercel (infrastructure), Razorpay, and Paddle
              (payment processing). We are not responsible for the availability, accuracy, or policies
              of these third parties. Your use of payment processors is also governed by their
              respective terms.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--t1)', letterSpacing: '-0.01em', margin: '0 0 12px' }}>
              9. Disclaimer of Warranties
            </h2>
            <p>
              The Service is provided "as is" and "as available" without warranties of any kind,
              express or implied. We do not warrant that the Service will be uninterrupted, error-free,
              or that any AI-generated intelligence is accurate, complete, or suitable for your
              specific purposes. Reddit data sourced through the Service reflects publicly available
              content and may be incomplete or out of date.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--t1)', letterSpacing: '-0.01em', margin: '0 0 12px' }}>
              10. Limitation of Liability
            </h2>
            <p>
              To the maximum extent permitted by applicable law, we shall not be liable for any
              indirect, incidental, special, consequential, or punitive damages, including loss of
              profits, data, or business opportunities, arising from your use of or inability to use
              the Service, even if advised of the possibility of such damages.
            </p>
            <p style={{ marginTop: 12 }}>
              Our total liability to you for any claim arising from these Terms or the Service shall
              not exceed the amount you paid us in the three months preceding the claim.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--t1)', letterSpacing: '-0.01em', margin: '0 0 12px' }}>
              11. Indemnification
            </h2>
            <p>
              You agree to indemnify and hold us harmless from any claims, losses, damages, or
              expenses (including reasonable legal fees) arising from your use of the Service,
              your violation of these Terms, or your infringement of any third-party rights.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--t1)', letterSpacing: '-0.01em', margin: '0 0 12px' }}>
              12. Modifications to Terms
            </h2>
            <p>
              We may update these Terms from time to time. We will notify you of material changes
              via email or an in-app notice at least 14 days before they take effect. Continued use
              of the Service after changes take effect constitutes acceptance of the updated Terms.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--t1)', letterSpacing: '-0.01em', margin: '0 0 12px' }}>
              13. Termination
            </h2>
            <p>
              We may suspend or terminate your account at our discretion if you violate these Terms,
              engage in fraudulent activity, or if required by law. Upon termination, your right to
              use the Service ceases immediately. Sections 7, 9, 10, 11, and 14 survive termination.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--t1)', letterSpacing: '-0.01em', margin: '0 0 12px' }}>
              14. Governing Law and Disputes
            </h2>
            <p>
              These Terms are governed by the laws of India. Any dispute arising from these Terms
              or the Service shall first be attempted to be resolved through good-faith negotiation.
              If unresolved within 30 days, disputes shall be subject to the exclusive jurisdiction
              of the courts located in India.
            </p>
            <p style={{ marginTop: 12 }}>
              For users in the European Union, nothing in these Terms limits your rights under
              applicable EU consumer protection laws.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--t1)', letterSpacing: '-0.01em', margin: '0 0 12px' }}>
              15. Contact
            </h2>
            <p>
              For questions about these Terms, contact us at{' '}
              <a href="mailto:vandit296@gmail.com" style={{ color: 'var(--blue)', textDecoration: 'none' }}>
                vandit296@gmail.com
              </a>.
            </p>
          </section>

          {/* Footer links */}
          <div style={{
            paddingTop: 32,
            borderTop: '1px solid rgba(255,255,255,0.06)',
            display: 'flex',
            gap: 24,
            flexWrap: 'wrap',
          }}>
            {[
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
