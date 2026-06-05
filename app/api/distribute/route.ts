import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export const maxDuration = 60;
import { getSession } from '@/lib/auth';
import { getCompany, getCachedDistribution, cacheDistribution } from '@/lib/upstash';
import { analyzeDistribution } from '@/lib/claude';

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

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

    if (mode === 'command' && session?.user?.email) {
      const company = await getCompany(session.user.email);
      if (company?.description) {
        companyContext = {
          name: company.name,
          description: company.description,
          goal: company.goal,
        };
      }
    }

    // Cache key: hash of title + body + mode + goCrazy
    const cacheInput = `${title.trim()}|${body?.trim() || ''}|${mode || 'standalone'}|${goCrazy ?? false}`;
    const cacheHash = crypto.createHash('sha256').update(cacheInput).digest('hex').slice(0, 16);

    const cached = await getCachedDistribution(cacheHash);
    if (cached) {
      return NextResponse.json({ ...cached, _cached: true });
    }

    const result = await analyzeDistribution(
      title.trim(),
      body?.trim() || '',
      companyContext,
      goCrazy ?? false,
    );

    // Strip any leading r/ that the model might include in subreddit names
    const sanitize = (matches: Array<{ subreddit: string }>) =>
      matches?.map(m => ({ ...m, subreddit: m.subreddit.replace(/^r\//, '') })) ?? [];
    result.standard = sanitize(result.standard);
    if (result.goCrazy) result.goCrazy = sanitize(result.goCrazy);

    cacheDistribution(cacheHash, result).catch(() => {}); // non-blocking
    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[distribute]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
