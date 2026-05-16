import { NextRequest, NextResponse } from 'next/server';
import { activateSubscription, cancelSubscription } from '@/lib/upstash';

// DoDo Payments webhook handler
// Configure this URL in your DoDo dashboard: https://yourapp.com/api/billing/webhook
// Events we handle:
//   subscription.activated  → grant Pro access
//   subscription.cancelled  → revoke Pro, reset to expired
//   payment.failed          → optionally notify user

const DODO_WEBHOOK_SECRET = process.env.DODO_WEBHOOK_SECRET!;

interface DoDoEvent {
  type: string;
  data: {
    subscription_id?: string;
    customer_id?: string;
    customer_email?: string;
    metadata?: { user_email?: string };
    current_period_end?: string;
    status?: string;
  };
}

export async function POST(req: NextRequest) {
  // Verify webhook signature
  const signature = req.headers.get('webhook-signature') ?? req.headers.get('x-dodo-signature');
  const rawBody = await req.text();

  if (DODO_WEBHOOK_SECRET && signature) {
    // DoDo uses HMAC-SHA256
    const crypto = await import('crypto');
    const expected = crypto
      .createHmac('sha256', DODO_WEBHOOK_SECRET)
      .update(rawBody)
      .digest('hex');
    if (signature !== expected && `sha256=${signature}` !== expected) {
      console.warn('Invalid DoDo webhook signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }
  }

  let event: DoDoEvent;
  try {
    event = JSON.parse(rawBody) as DoDoEvent;
  } catch {
    return NextResponse.json({ error: 'Bad JSON' }, { status: 400 });
  }

  const { type, data } = event;
  const email = data.metadata?.user_email ?? data.customer_email;

  console.log(`DoDo webhook: ${type} for ${email}`);

  try {
    switch (type) {
      case 'subscription.activated':
      case 'subscription.renewed':
        if (email && data.subscription_id && data.customer_id) {
          await activateSubscription(
            email,
            data.subscription_id,
            data.customer_id,
            data.current_period_end ?? ''
          );
          console.log(`✅ Activated subscription for ${email}`);
        }
        break;

      case 'subscription.cancelled':
      case 'subscription.expired':
        if (email) {
          await cancelSubscription(email);
          console.log(`🚫 Cancelled subscription for ${email}`);
        }
        break;

      case 'payment.failed':
        // Could send an email here in the future
        console.log(`⚠️ Payment failed for ${email}`);
        break;

      default:
        console.log(`Unhandled DoDo event: ${type}`);
    }
  } catch (err) {
    console.error('Webhook processing error:', err);
    // Return 200 anyway — DoDo will retry on non-2xx
    return NextResponse.json({ ok: false, error: String(err) });
  }

  return NextResponse.json({ ok: true });
}
