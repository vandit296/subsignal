import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

const RAZORPAY_KEY_ID     = process.env.RAZORPAY_KEY_ID!;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET!;

const PLANS = {
  starter: { razorpayPlanId: process.env.RAZORPAY_PLAN_ID_STARTER ?? 'plan_Sqko3acwVepHQ0', name: 'Treddit Starter' },
  pro:     { razorpayPlanId: process.env.RAZORPAY_PLAN_ID_PRO     ?? 'plan_SrGyn4LgvY9P9C', name: 'Treddit Pro' },
} as const;

type PlanKey = keyof typeof PLANS;

function razorpayAuth() {
  return 'Basic ' + Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString('base64');
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json() as { plan?: PlanKey; forceGlobal?: boolean; coupon?: string };
  const planKey: PlanKey = body.plan && PLANS[body.plan] ? body.plan : 'pro';
  const email   = session.user.email;
  const coupon  = (body.coupon ?? '').trim().toUpperCase();

  const country = req.headers.get('x-vercel-ip-country') ?? 'US';
  const isIndia = !body.forceGlobal && country === 'IN';

  try {
    if (isIndia) {
      // ── Razorpay (India) ─────────────────────────────────────────────────
      const { razorpayPlanId } = PLANS[planKey];

      // Auto-apply launch offer for Indian users during promo period
      let offerId: string | undefined;
      const launchOfferId = process.env.RAZORPAY_LAUNCH_OFFER_ID;
      const promoActive = launchOfferId && new Date() < new Date('2026-08-01');
      if (promoActive) {
        offerId = launchOfferId;
      } else if (coupon) {
        // Fallback: manual coupon → offer_id mapping
        try {
          const offerMap: Record<string, string> = JSON.parse(process.env.RAZORPAY_COUPON_MAP ?? '{}');
          offerId = offerMap[coupon];
        } catch { /* ignore malformed env */ }
      }

      const subPayload: Record<string, unknown> = {
        plan_id:        razorpayPlanId,
        total_count:    120,
        quantity:       1,
        customer_notify:1,
        notify_info:    { notify_email: email },
        notes:          { user_email: email, plan: planKey },
      };
      if (offerId) subPayload.offer_id = offerId;

      const subRes = await fetch('https://api.razorpay.com/v1/subscriptions', {
        method:  'POST',
        headers: { Authorization: razorpayAuth(), 'Content-Type': 'application/json' },
        body:    JSON.stringify(subPayload),
      });
      const sub = await subRes.json() as { id?: string; error?: { description: string } };
      if (!sub.id) throw new Error(sub.error?.description ?? 'Could not create Razorpay subscription');

      return NextResponse.json({
        provider:       'razorpay',
        subscriptionId: sub.id,
        keyId:          process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? RAZORPAY_KEY_ID,
        plan:           planKey,
        couponApplied:  !!offerId,
      });

    } else {
      // ── Paddle (International) ────────────────────────────────────────────
      const paddlePriceId = process.env.PADDLE_PRICE_ID!;
      const appUrl        = process.env.NEXTAUTH_URL ?? 'https://treddit.live';

      const txRes = await fetch('https://api.paddle.com/transactions', {
        method:  'POST',
        headers: { Authorization: `Bearer ${process.env.PADDLE_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items:         [{ price_id: paddlePriceId, quantity: 1 }],
          currency_code: 'USD',
          customer:      { email },
          checkout:      { url: `${appUrl}/command?upgraded=1` },
          custom_data:   { user_email: email, plan: planKey },
        }),
      });
      const tx = await txRes.json() as { data?: { id?: string; checkout?: { url?: string } }; error?: { detail: string } };

      let checkoutUrl = tx.data?.checkout?.url;
      if (!checkoutUrl) throw new Error(tx.error?.detail ?? 'Could not create Paddle checkout');

      // Append coupon code to Paddle hosted checkout URL
      if (coupon) checkoutUrl += (checkoutUrl.includes('?') ? '&' : '?') + `coupon=${encodeURIComponent(coupon)}`;

      // transactionId powers the Paddle.js overlay; checkoutUrl is the redirect fallback.
      return NextResponse.json({ provider: 'paddle', checkoutUrl, transactionId: tx.data?.id, plan: planKey });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Internal error';
    console.error('[create-checkout]', msg);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}