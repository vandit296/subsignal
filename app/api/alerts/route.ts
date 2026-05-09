import { NextRequest, NextResponse } from 'next/server';
import { getAlertConfig, saveAlertConfig } from '@/lib/upstash';
import { AlertConfig } from '@/types';

export async function GET() {
  try {
    const config = await getAlertConfig();
    return NextResponse.json(config ?? null);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, productDescription, goal, subreddits } = body;

    if (!email || !productDescription || !subreddits?.length) {
      return NextResponse.json(
        { error: 'email, productDescription, and subreddits are required' },
        { status: 400 }
      );
    }

    const existing = await getAlertConfig();
    const config: AlertConfig = {
      email: email.trim(),
      productDescription: productDescription.trim(),
      goal: (goal ?? '').trim(),
      subreddits: (subreddits as string[]).map((s: string) => s.replace(/^r\//, '').trim().toLowerCase()),
      createdAt: existing?.createdAt ?? new Date().toISOString(),
      lastDigestAt: existing?.lastDigestAt ?? null,
    };

    await saveAlertConfig(config);
    return NextResponse.json({ ok: true, config });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
