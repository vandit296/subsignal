import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

// DoDo Payments — create a subscription checkout session
// Docs: https://developer.dodopayments.com
const DODO_API_URL = 'https://api.dodopayments.com/v1';
const DODO_PRODUCT_ID = process.env.DODO_PRODUCT_ID!;    // your $25/mo product ID
const DODO_API_KEY = process.env.DODO_API_KEY!;

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json() as { email?: string };
  const email = body.email ?? session.user.email;
  const baseUrl = process.env.NEXTAUTH_URL ?? 'https://treddit.live';

  try {
    const res = await fetch(`${DODO_API_URL}/payment_links`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${DODO_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        product_id: DODO_PRODUCT_ID,
        quantity: 1,
        customer: {
          email,
          name: session.user.name ?? '',
        },
        metadata: {
          user_email: email,
        },
        payment_link_data: {
          success_url: `${baseUrl}/api/billing/success?email=${encodeURIComponent(email)}`,
          cancel_url: `${baseUrl}/upgrade`,
        },
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      console.error('DoDo Payments error:', errBody);
      return NextResponse.json({ error: 'Checkout creation failed' }, { status: 502 });
    }

    const data = await res.json() as { url?: string; payment_link?: string };
    const checkoutUrl = data.url ?? data.payment_link;

    if (!checkoutUrl) {
      return NextResponse.json({ error: 'No checkout URL returned' }, { status: 502 });
    }

    return NextResponse.json({ checkoutUrl });
  } catch (err) {
    console.error('Billing create-checkout error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
