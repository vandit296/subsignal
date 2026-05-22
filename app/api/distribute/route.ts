import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getCompany } from '@/lib/upstash';
import { analyzeDistribution } from '@/lib/claude';

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { title, body, mode, goCrazy } = await req.json() as {
      title: string;
      body?: string;
      mode?: 'standalone' | 'command';
      goCrazy?: boolean;
    };

    if (!title?.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    let companyContext: { description?: string; goal?: string; name?: string } | undefined;

    if (mode === 'command') {
      const company = await getCompany(session.user.email);
      if (company?.description) {
        companyContext = {
          name: company.name,
          description: company.description,
          goal: company.goal,
        };
      }
    }

    const result = await analyzeDistribution(
      title.trim(),
      body?.trim() || '',
      companyContext,
      goCrazy ?? false,
    );

    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[distribute]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
