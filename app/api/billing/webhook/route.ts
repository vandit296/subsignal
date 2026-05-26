import { NextRequest, NextResponse } from 'next/server';
import { activateSubscription, cancelSubscription } from '@/lib/upstash';
import crypto from 'crypto';

// Razorpay webhook handler
// Dashboard → Webhooks → URL: https://treddit.live/api/billing/webhook
// Events: subscription.activated, subscription.charged,
//         subscription.cancelled, subscription.completed, payment.failed

const RAZORPAY_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET!;

function verifyRazorpay(body: string, sig: string): boolean {
    const expected = crypto
      .createHmac('sha256', RAZORPAY_WEBHOOK_SECRET)
      .update(body)
      .digest('hex');
    return expected === sig;
}

export async function POST(req: NextRequest) {
    const rawBody = await req.text();
    const sig = req.headers.get('x-razorpay-signature') ?? '';

  if (!verifyRazorpay(rawBody, sig)) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let event: { event: string; payload: Record<string, unknown> };
    try {
          event = JSON.parse(rawBody);
    } catch {
          return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

  const sub = (event.payload as Record<string, { entity: Record<string, unknown> }>)
      ?.subscription?.entity ?? {};
    const notes = sub.notes as Record<string, string> | undefined;
    const email = notes?.user_email ?? '';
    const subscriptionId = sub.id as string | undefined;
    const customerId = sub.customer_id as string | undefined;

  try {
        switch (event.event) {
          case 'subscription.activated':
          case 'subscription.charged': {
                    if (email && subscriptionId) {
                                const chargeAt = sub.charge_at as number | undefined;
                                const periodEnd = chargeAt
                                  ? new Date(chargeAt * 1000).toISOString()
                                              : new Date(Date.now() + 30 * 86400_000).toISOString();
                                await activateSubscription(email, subscriptionId, customerId ?? '', periodEnd);
                                console.log(`[webhook] Activated/charged: ${email}`);
                    }
                    break;
          }
          case 'subscription.cancelled':
          case 'subscription.completed': {
                    if (email) {
                                await cancelSubscription(email);
                                console.log(`[webhook] Cancelled/completed: ${email}`);
                    }
                    break;
          }
          case 'payment.failed': {
                    console.warn(`[webhook] Payment failed for: ${email}`);
                    break;
          }
        }
  } catch (err) {
        console.error('[webhook] Error processing event:', err);
  }

  return NextResponse.json({ received: true });
}
