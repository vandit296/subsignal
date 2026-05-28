import Link from 'next/link';

export const metadata = { title: 'Refund Policy — Treddit' };

export default function RefundPage() {
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
Refund Policy
</h1>
<p style={{ fontSize: 13, color: 'var(--t4)', margin: 0 }}>
Effective date: 20 May 2025 &nbsp;·&nbsp; Last updated: 28 May 2025
</p>
</div>

<div style={{ display: 'flex', flexDirection: 'column', gap: 40, fontSize: 14, lineHeight: 1.8 }}>

<section>
<p>
This Refund Policy applies to all paid subscriptions to Treddit, operated by
Treddit AI. We want you to be confident in subscribing.
</p>
</section>

<section>
<h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--t1)', letterSpacing: '-0.01em', margin: '0 0 12px' }}>
1. Free Plan
</h2>
<p>
Treddit offers a free tier that does not require a credit card or any payment.
No refund is applicable to free plan usage.
</p>
</section>

<section>
<h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--t1)', letterSpacing: '-0.01em', margin: '0 0 12px' }}>
2. 14-Day Money-Back Guarantee
</h2>
<p>
If you are not satisfied with your paid subscription for any reason, you may
request a full refund within{' '}
<strong style={{ color: 'var(--t1)' }}>14 calendar days</strong> of your payment.
No questions asked.
</p>
<p style={{ marginTop: 12 }}>
To request a refund, email us at{' '}
<a href="mailto:vandit296@gmail.com" style={{ color: 'var(--blue)', textDecoration: 'none' }}>
vandit296@gmail.com
</a>{' '}
with the subject line "Refund Request" and include the email address associated
with your account. We will process your refund within 5–10 business days,
depending on your payment provider.
</p>
</section>

<section>
<h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--t1)', letterSpacing: '-0.01em', margin: '0 0 12px' }}>
3. Refunds After 14 Days
</h2>
<p>
After the 14-day window, subscription payments are non-refundable. Cancelling
your subscription stops future charges but does not refund the current billing
period. You retain access to paid features until the end of the period you paid for.
</p>
</section>

<section>
<h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--t1)', letterSpacing: '-0.01em', margin: '0 0 12px' }}>
4. Cancellation
</h2>
<p>
You may cancel your subscription at any time through your account settings or by
contacting us. Cancellation takes effect at the end of the current billing period.
You will retain access to paid features until that date.
</p>
</section>

<section>
<h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--t1)', letterSpacing: '-0.01em', margin: '0 0 12px' }}>
5. Chargebacks
</h2>
<p>
We ask that you contact us before initiating a chargeback with your bank or
payment provider. Most issues can be resolved quickly by emailing us directly.
Initiating an unjustified chargeback may result in suspension of your account.
</p>
</section>

<section>
<h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--t1)', letterSpacing: '-0.01em', margin: '0 0 12px' }}>
6. Service Termination by Us
</h2>
<p>
If we terminate your account without cause, we will refund any unused portion of
your current paid billing period on a pro-rated basis.
</p>
</section>

<section>
<h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--t1)', letterSpacing: '-0.01em', margin: '0 0 12px' }}>
7. Payment Processing
</h2>
<p>
Refunds are processed through the original payment method. For Razorpay payments
(India), refunds typically appear within 5–7 business days. For Paddle payments
(international), refunds typically appear within 5–10 business days, depending on
your card issuer or bank.
</p>
</section>

<section>
<h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--t1)', letterSpacing: '-0.01em', margin: '0 0 12px' }}>
8. Contact
</h2>
<p>
For refund requests or billing questions, contact us at:{' '}
<a href="mailto:vandit296@gmail.com" style={{ color: 'var(--blue)', textDecoration: 'none' }}>
vandit296@gmail.com
</a>
<br />
We aim to respond within 1 business day.
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