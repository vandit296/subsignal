import { NextRequest, NextResponse } from 'next/server';
import { findSubreddits } from '@/lib/claude';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const description = req.nextUrl.searchParams.get('description');
  if (!description?.trim()) return NextResponse.json({ error: 'description required' }, { status: 400 });

  try {
    const result = await findSubreddits(description.trim(), 'Find the best Reddit communities where this product\'s target users are active');
    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Analysis failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
