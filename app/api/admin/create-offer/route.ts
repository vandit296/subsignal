import { NextResponse } from 'next/server';

// TEMPORARY ROUTE — delete after getting offer_id
export async function GET() {
  const keyId     = process.env.RAZORPAY_KEY_ID!;
  const keySecret = process.env.RAZORPAY_KEY_SECRET!;

  const res = await fetch('https://api.razorpay.com/v1/offers', {
    method:  'POST',
    headers: {
      Authorization:  'Basic ' + Buffer.from(`${keyId}:${keySecret}`).toString('base64'),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name:            'SUBSIGNAL50',
      payment_capture: 1,
      type:            'percentage',
      value:           50,
      applicable_on:   'subscription',
      plan_id:         process.env.RAZORPAY_PLAN_ID_PRO ?? 'plan_SrGyn4LgvY9P9C',
      max_usage:       1000,
    }),
  });

  const data = await res.json();
  return NextResponse.json(data);
}
