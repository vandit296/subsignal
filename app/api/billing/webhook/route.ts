import { NextRequest, NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';
import { activateSubscription, cancelSubscription } from '@/lib/upstash';

// — Razorpay signature verification ————————————————————————
function verifyRazorpay(body: string, sig: string): boolean {
        const secret = process.env.RAZORPAY_WEBHOOK_SECRET!;
        const expected = createHmac('sha256', secret).update(body).digest('hex');
        return timingSafeEqual(Buffer.from(expected), Buffer.from(sig));
}

// — Paddle signature verification ————————————————————————
async function verifyPaddle(rawBody: string, header: string): Promise<boolean> {
        const secret = process.env.PADDLE_WEBHOOK_SECRET!;
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
        return computed === h1;
}

export async function POST(req: NextRequest) {
        const rawBody = await req.text();
        const paddleSig   = req.headers.get('paddle-signature');
        const razorpaySig = req.headers.get('x-razorpay-signature');

  if (paddleSig) {
            const valid = await verifyPaddle(rawBody, paddleSig);
            if (!valid) return NextResponse.json({ error: 'Invalid Paddle signature' }, { status: 401 });
            const event = JSON.parse(rawBody) as {
                        event_type: string;
                        data: { status?: string; custom_data?: { user_email?: string }; customer?: { email?: string } };
            };
            const email = event.data.custom_data?.user_email ?? event.data.customer?.email;
            if (email) {
                        const { event_type, data } = event;
                        if (
                                      event_type === 'subscription.activated' ||
                                      (event_type === 'subscription.updated' && data.status === 'active') ||
                                      event_type === 'transaction.completed'
                                    ) {
                                      await activateSubscription(email);
                        } else if (event_type === 'subscription.canceled' || event_type === 'subscription.past_due') {
                                      await cancelSubscription(email);
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
                          subscription?: { entity?: { notes?: { user_email?: string } } };
                          payment?: { entity?: { email?: string } };
                        };
            };
            const email =
                        event.payload?.subscription?.entity?.notes?.user_email ??
                        event.payload?.payment?.entity?.email;
            if (email) {
                        if (event.event === 'subscription.activated' || event.event === 'subscription.charged') {
                                      await activateSubscription(email);
                        } else if (event.event === 'subscription.cancelled' || event.event === 'subscription.completed') {
                                      await cancelSubscription(email);
                        } else if (event.event === 'payment.failed') {
                                      console.warn('[webhook/razorpay] payment failed for', email);
                        }
            }
            return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Unknown webhook source' }, { status: 400 });
}
