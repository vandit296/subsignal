import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

// Razorpay (India) + Stripe (Global) checkout
// Env vars needed:
//   RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_PLAN_ID
//   STRIPE_SECRET_KEY, STRIPE_PRICE_ID

const RAZORPAY_KEY_ID     = process.env.RAZORPAY_KEY_ID!;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET!;
const RAZORPAY_PLAN_ID    = process.env.RAZORPAY_PLAN_ID!;

const STRIPE_SECRET_KEY   = process.env.STRIPE_SECRET_KEY!;
const STRIPE_PRICE_ID     = process.env.STRIPE_PRICE_ID!;

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const email   = session.user.email;
  const baseUrl = process.env.NEXTAUTH_URL ?? 'https://treddit.live';

  // Vercel sets x-vercel-ip-country on every request
  const country = req.headers.get('x-vercel-ip-country') ?? '';
  const useRazorpay = country === 'IN';

  try {
    if (useRazorpay) {
      // ── Razorpay ────────────────────────────────────────────────────
      const creds = Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString('base64');
      const res = await fetch('https://api.razorpay.com/v1/subscriptions', {
        method: 'POST',
        headers: {
          Authorization: `Basic ${creds}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          plan_id: RAZORPAY_PLAN_ID,
          total_count: 12,
          quantity: 1,
          customer_notify: 1,
          notes: { user_email: email },
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        console.error('Razorpay subscription error:', err);
        return NextResponse.json({ error: 'Checkout creation failed', detail: err }, { status: 502 });
      }

      const sub = await res.json() as { id: string };
      return NextResponse.json({ provider: 'razorpay', subscriptionId: sub.id, keyId: RAZORPAY_KEY_ID });

    } else {
      // ── Stripe ──────────────────────────────────────────────────────
      const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          mode: 'subscription',
          'line_items[0][price]': STRIPE_PRICE_ID,
          'line_items[0][quantity]': '1',
          'customer_email': email,
          success_url: `${baseUrl}/command?upgraded=1`,
          cancel_url: `${baseUrl}/upgrade`,
          'metadata[user_email]': email,
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        console.error('Stripe session error:', err);
        return NextResponse.json({ error: 'Checkout creation failed', detail: err }, { status: 502 });
      }

      const session = await res.json() as { url: string };
      return NextResponse.json({ provider: 'stripe', stripeUrl: session.url });
    }
  } catch (err) {
    console.error('Billing create-checkout error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
