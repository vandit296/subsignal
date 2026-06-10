import { NextRequest, NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';
import {
  activateSubscription, cancelSubscription, getUser,
  hasLifecycleEmailBeenSent, markLifecycleEmailSent, markWebhookEventProcessed,
} from '@/lib/upstash';
import { sendWelcomeEmail } from '@/lib/email';

// Send the welcome email exactly once, on first activation (renewals/recharges re-fire
// activate events — the lifecycle flag stops duplicate sends).
async function welcomeOnce(email: string): Promise<void> {
  try {
    if (await hasLifecycleEmailBeenSent(email, 'welcome')) return;
    const u = await getUser(email);
    await sendWelcomeEmail(email, u?.name ?? '');
    await markLifecycleEmailSent(email, 'welcome');
  } catch (e) {
    console.warn('[webhook] welcome email failed for', email, e);
  }
}

// Constant-time string comparison that never throws (timingSafeEqual throws on
// length mismatch, which a malformed signature header would trigger).
function safeCompare(a: string, b: string): boolean {
  try {
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    if (bufA.length !== bufB.length) return false;
    return timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

// — Razorpay signature verification ————————————————————————
function verifyRazorpay(body: string, sig: string): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return false;
  const expected = createHmac('sha256', secret).update(body).digest('hex');
  return safeCompare(expected, sig);
}

// — Paddle signature verification ————————————————————————
async function verifyPaddle(rawBody: string, header: string): Promise<boolean> {
  const secret = process.env.PADDLE_WEBHOOK_SECRET;
  if (!secret) return false;
  const parts = Object.fromEntries(header.split(';').map(p => p.split('=')));
  const ts = parts['ts'];
  const h1 = parts['h1'];
  if (!ts || !h1) return false;
  const signed = `${ts}:${rawBody}`;
  const key = await globalThis.crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sigBuf = await globalThis.crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signed));
  const computed = Array.from(new Uint8Array(sigBuf))
    .map(b => b.toString(16).padStart(2, '0')).join('');
  return safeCompare(computed, h1);
}

// Only cancel when the incoming subscription ID matches what we have on file.
// Legacy users activated before sub IDs were stored have none — allow those
// (signature is already verified) but log for visibility.
async function cancelIfOwned(email: string, incomingSubId: string | undefined, source: string): Promise<void> {
  const user = await getUser(email);
  if (user?.subscriptionId && incomingSubId && user.subscriptionId !== incomingSubId) {
    console.warn(`[webhook/${source}] cancel ignored — subscription mismatch`, {
      email, incoming: incomingSubId, stored: user.subscriptionId,
    });
    return;
  }
  if (!user?.subscriptionId) {
    console.warn(`[webhook/${source}] cancel for user with no stored subscriptionId`, { email, incomingSubId });
  }
  await cancelSubscription(email);
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const paddleSig   = req.headers.get('paddle-signature');
  const razorpaySig = req.headers.get('x-razorpay-signature');

  if (paddleSig) {
    const valid = await verifyPaddle(rawBody, paddleSig);
    if (!valid) return NextResponse.json({ error: 'Invalid Paddle signature' }, { status: 401 });
    const event = JSON.parse(rawBody) as {
      event_id?: string;
      event_type: string;
      data: {
        id?: string;
        status?: string;
        subscription_id?: string;
        customer_id?: string;
        next_billed_at?: string;
        current_billing_period?: { ends_at?: string };
        custom_data?: { user_email?: string };
        customer?: { email?: string };
      };
    };

    // Idempotency: Paddle retries deliveries; process each event_id once.
    if (event.event_id) {
      const firstTime = await markWebhookEventProcessed('paddle', event.event_id);
      if (!firstTime) return NextResponse.json({ ok: true, duplicate: true });
    }

    const email = (event.data.custom_data?.user_email ?? event.data.customer?.email)?.toLowerCase();
    if (email) {
      const { event_type, data } = event;
      // data.id is the subscription id on subscription.* events; transaction.completed
      // carries the subscription id in data.subscription_id.
      const subId     = data.subscription_id ?? data.id ?? '';
      const custId    = data.customer_id ?? '';
      const periodEnd = data.current_billing_period?.ends_at
        ?? data.next_billed_at
        ?? new Date(Date.now() + 31 * 86400_000).toISOString();
      if (
        event_type === 'subscription.activated' ||
        (event_type === 'subscription.updated' && data.status === 'active') ||
        event_type === 'transaction.completed'
      ) {
        await activateSubscription(email, subId, custId, periodEnd);
        await welcomeOnce(email);
      } else if (event_type === 'subscription.canceled' || event_type === 'subscription.past_due') {
        await cancelIfOwned(email, subId || undefined, 'paddle');
      } else if (event_type === 'transaction.payment_failed') {
        console.warn('[webhook/paddle] payment failed for', email);
      }
    }
    return NextResponse.json({ ok: true });
  }

  if (razorpaySig) {
    const valid = verifyRazorpay(rawBody, razorpaySig);
    if (!valid) return NextResponse.json({ error: 'Invalid Razorpay signature' }, { status: 401 });
    const event = JSON.parse(rawBody) as {
      event: string;
      payload: {
        subscription?: { entity?: {
          id?: string;
          customer_id?: string;
          current_end?: number; // unix seconds
          notes?: { user_email?: string };
        } };
        payment?: { entity?: { email?: string } };
      };
    };

    // Idempotency: Razorpay sends a unique event id header on every delivery.
    const eventId = req.headers.get('x-razorpay-event-id');
    if (eventId) {
      const firstTime = await markWebhookEventProcessed('razorpay', eventId);
      if (!firstTime) return NextResponse.json({ ok: true, duplicate: true });
    }

    const email = (
      event.payload?.subscription?.entity?.notes?.user_email ??
      event.payload?.payment?.entity?.email
    )?.toLowerCase();
    if (email) {
      const sub       = event.payload?.subscription?.entity;
      const subId     = sub?.id ?? '';
      const custId    = sub?.customer_id ?? '';
      const periodEnd = sub?.current_end
        ? new Date(sub.current_end * 1000).toISOString()
        : new Date(Date.now() + 31 * 86400_000).toISOString();
      if (event.event === 'subscription.activated' || event.event === 'subscription.charged') {
        await activateSubscription(email, subId, custId, periodEnd);
        await welcomeOnce(email);
      } else if (event.event === 'subscription.cancelled' || event.event === 'subscription.completed') {
        await cancelIfOwned(email, subId || undefined, 'razorpay');
      } else if (event.event === 'payment.failed') {
        console.warn('[webhook/razorpay] payment failed for', email);
      }
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Unknown webhook source' }, { status: 400 });
}
