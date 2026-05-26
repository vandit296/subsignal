import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

const RAZORPAY_KEY_ID     = process.env.RAZORPAY_KEY_ID!;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET!;

const PLANS = {
    starter: {
          razorpayPlanId: process.env.RAZORPAY_PLAN_ID_STARTER ?? 'plan_Sqko3acwVepHQ0',
          name: 'Treddit Starter',
    },
    pro: {
          razorpayPlanId: process.env.RAZORPAY_PLAN_ID_PRO ?? 'plan_SrGyn4LgvY9P9C',
          name: 'Treddit Pro',
    },
} as const;

type PlanKey = keyof typeof PLANS;

function razorpayAuth() {
    return 'Basic ' + Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString('base64');
}

export async function POST(req: NextRequest) {
    const session = await getSession();
    if (!session?.user?.email) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

  const body = await req.json() as { plan?: PlanKey };
    const planKey: PlanKey = body.plan && PLANS[body.plan] ? body.plan : 'pro';
    const email = session.user.email;

  try {
        const { razorpayPlanId } = PLANS[planKey];

      const subRes = await fetch('https://api.razorpay.com/v1/subscriptions', {
              method: 'POST',
              headers: { Authorization: razorpayAuth(), 'Content-Type': 'application/json' },
              body: JSON.stringify({
                        plan_id: razorpayPlanId,
                        total_count: 120,
                        quantity: 1,
                        customer_notify: 1,
                        notify_info: { notify_email: email },
                        notes: { user_email: email, plan: planKey },
              }),
      });

      const sub = await subRes.json() as { id?: string; error?: { description: string } };
        if (!sub.id) throw new Error(sub.error?.description ?? 'Could not create Razorpay subscription');

      return NextResponse.json({
              provider: 'razorpay',
              subscriptionId: sub.id,
              keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? RAZORPAY_KEY_ID,
              plan: planKey,
      });
  } catch (err) {
        const msg = err instanceof Error ? err.message : 'Internal error';
        console.error('[create-checkout]', msg);
        return NextResponse.json({ error: msg }, { status: 502 });
  }
}
