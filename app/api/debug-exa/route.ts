import { NextResponse } from 'next/server';

export async function GET() {
  const apiKey = process.env.EXA_API_KEY;

  const result: Record<string, unknown> = {
    keyPresent: !!apiKey,
    keyPreview: apiKey ? `${apiKey.slice(0, 8)}...` : null,
    keyLength: apiKey?.length ?? 0,
  };

  if (!apiKey) {
    return NextResponse.json({ ...result, error: 'EXA_API_KEY not set in this deployment' });
  }

  // Fire a real test search against Exa
  try {
    const body = {
      query: '"saas"',
      includeDomains: ['reddit.com'],
      numResults: 3,
      startPublishedDate: new Date(Date.now() - 7 * 86_400_000).toISOString(),
      type: 'keyword',
    };

    const res = await fetch('https://api.exa.ai/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify(body),
    });

    const raw = await res.text();
    let parsed: unknown;
    try { parsed = JSON.parse(raw); } catch { parsed = raw; }

    result.exaStatus = res.status;
    result.exaOk = res.ok;
    result.exaResponse = parsed;
    result.requestBody = body;
  } catch (e) {
    result.exaError = String(e);
  }

  return NextResponse.json(result);
}
