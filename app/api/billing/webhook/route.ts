import { NextRequest, NextResponse } from 'next/server';
import { activateSubscription, cancelSubscription } from '@/lib/upstash';

// Unified webhook handler for Razorpay (India) + Stripe (Global)
//
// Razorpay dashboard → Webhooks → URL: https://treddit.live/api/billing/webhook
//   Events: subscription.activated, subscription.charged,
//           subscription.cancelled, subscription.completed, payment.failed
//
// Stripe dashboard → Webhooks → URL: https://treddit.live/api/billing/webhook
//   Events: customer.subscription.created, customer.subscription.updated,
//           customer.subscription.deleted, invoice.payment_failed

const RAZORPAY_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET!;
const STRIPE_WEBHOOK_SECRET   = process.env.STRIPE_WEBHOOK_SECRET!;
const STRIPE_SECRET_KEY       = process.env.STRIPE_SECRET_KEY!;

async function verifyRazorpay(body: string, sig: string): Promise<boolean> {
  const crypto = await import('crypto');
  const expected = crypto.createHmac('sha256', RAZORPAY_WEBHOOK_SECRET).update(body).digest('hex');
  return expected === sig;
}

async function verifyStripe(body: string, sig: string): Promise<unknown> {
  // Stripe signature: t=timestamp,v1=hash
  const parts = Object.fromEntries(sig.split(',').map(p => p.split('=')));
  const payload = `${parts.t}.${body}`;
  const crypto = await import('crypto');
  const expected = crypto.createHmac('sha256', STRIPE_WEBHOOK_SECRET).update(payload).digest('hex');
  if (expected !== parts.v1) throw new Error('Invalid Stripe signature');
  return JSON.parse(body);
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const razorSig  = req.headers.get('x-razorpay-signature');
  const stripeSig = req.headers.get('stripe-signature');

  try {
    // ── Razorpay ────────────────────────────────────────────────────────
    if (razorSig) {
      if (RAZORPAY_WEBHOOK_SECRET) {
        const valid = await verifyRazorpay(rawBody, razorSig);
        if (!valid) {
          console.warn('Invalid Razorpay webhook signature');
          return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
        }
      }

      const event = JSON.parse(rawBody) as {
        event: string;
        payload: {
          subscription?: { entity?: { id?: string; notes?: { user_email?: string } } };
          payment?:      { entity?: { email?: string; notes?: { user_email?: string } } };
        };
      };

      const sub   = event.payload.subscription?.entity;
      const pay   = event.payload.payment?.entity;
      const email = sub?.notes?.user_email ?? pay?.notes?.user_email ?? pay?.email;
      const subId = sub?.id;

      console.log(`Razorpay webhook: ${event.event} for ${email}`);

      switch (event.event) {
        case 'subscription.activated':
        case 'subscription.charged':
          if (email && subId) {
            await activateSubscription(email, subId, subId, '');
            console.log(`✅ Razorpay: activated ${email}`);
          }
          break;
        case 'subscription.cancelled':
        case 'subscription.completed':
          if (email) {
            await cancelSubscription(email);
            console.log(`🚫 Razorpay: cancelled ${email}`);
          }
          break;
        case 'payment.failed':
          console.warn(`⚠️ Razorpay: payment failed for ${email}`);
          break;
      }

      return NextResponse.json({ ok: true });
    }

    // ── Stripe ──────────────────────────────────────────────────────────
    if (stripeSig) {
      let stripeEvent: { type: string; data: { object: Record<string, unknown> } };
      try {
        stripeEvent = await verifyStripe(rawBody, stripeSig) as typeof stripeEvent;
      } catch {
        console.warn('Invalid Stripe webhook signature');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }

      const obj   = stripeEvent.data.object;
      const email = (obj.customer_email ?? obj.metadata?.user_email ?? '') as string;
      const subId = (obj.id ?? '') as string;

      console.log(`Stripe webhook: ${stripeEvent.type} for ${email}`);

      // Fetch customer email if not in the event object
      const resolvedEmail = email || await (async () => {
        if (!obj.customer) return '';
        const res = await fetch(`https://api.stripe.com/v1/customers/${obj.customer}`, {
          headers: { Authorization: `Bearer ${STRIPE_SECRET_KEY}` },
        });
        const c = await res.json() as { email?: string };
        return c.email ?? '';
      })();

      switch (stripeEvent.type) {
        case 'customer.subscription.created':
        case 'customer.subscription.updated':
          if (resolvedEmail && (obj.status === 'active' || obj.status === 'trialing')) {
            await activateSubscription(resolvedEmail, subId, String(obj.customer ?? ''), '');
            console.log(`✅ Stripe: activated ${resolvedEmail}`);
          }
          break;
        case 'customer.subscription.deleted':
          if (resolvedEmail) {
            await cancelSubscription(resolvedEmail);
            console.log(`🚫 Stripe: cancelled ${resolvedEmail}`);
          }
          break;
        case 'invoice.payment_failed':
          console.warn(`⚠️ Stripe: payment failed for ${resolvedEmail}`);
          break;
      }

      return NextResponse.json({ ok: true });
    }

    // Unknown source
    console.warn('Webhook received with no recognized signature header');
    return NextResponse.json({ error: 'Unknown webhook source' }, { status: 400 });

  } catch (err) {
    console.error('Webhook processing error:', err);
    return NextResponse.json({ ok: false, error: String(err) });
  }
}
