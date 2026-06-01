import { NextRequest, NextResponse } from 'next/server';
import { consumeExtendToken, extendTrial, hasLifecycleEmailBeenSent, markLifecycleEmailSent } from '@/lib/upstash';

const APP_URL = process.env.NEXTAUTH_URL ?? 'https://treddit.live';

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  if (!token) return NextResponse.redirect(`${APP_URL}/upgrade?error=invalid`);

  const email = await consumeExtendToken(token);
  if (!email) return NextResponse.redirect(`${APP_URL}/upgrade?error=expired`);

  // Only allow one extension ever
  const alreadyExtended = await hasLifecycleEmailBeenSent(email, 'trial-extended');
  if (alreadyExtended) return NextResponse.redirect(`${APP_URL}/upgrade?error=already-extended`);

  await extendTrial(email, 3);
  await markLifecycleEmailSent(email, 'trial-extended');

  return NextResponse.redirect(`${APP_URL}/feed?trial_extended=1`);
}
