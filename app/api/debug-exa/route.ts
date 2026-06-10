import { NextResponse } from 'next/server';
// Debug route disabled — it leaked the EXA_API_KEY prefix and let anyone
// fire paid Exa searches without auth. (Same treatment as debug-env.)
export async function GET() {
  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}
