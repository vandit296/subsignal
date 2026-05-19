import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Scrape a URL and return cleaned text (first 3000 chars)
async function scrapeUrl(url: string): Promise<string | null> {
  if (!url?.trim()) return null;
  try {
    // Ensure URL has protocol
    const fullUrl = url.startsWith('http') ? url : `https://${url}`;
    const res = await fetch(fullUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; SubSignalBot/1.0)',
        'Accept': 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const html = await res.text();

    // Strip HTML tags and collapse whitespace
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 3000);

    return text || null;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json() as {
    description: string;
    goal: string;
    website?: string;
    linkedinUrl?: string;
    twitterUrl?: string;
    deckUrl?: string;
  };

  const { description, goal, website, linkedinUrl, twitterUrl, deckUrl } = body;

  if (!description?.trim()) {
    return NextResponse.json({ error: 'description required' }, { status: 400 });
  }

  // Crawl all provided URLs in parallel
  const [websiteText, linkedinText, twitterText, deckText] = await Promise.all([
    scrapeUrl(website ?? ''),
    scrapeUrl(linkedinUrl ?? ''),
    scrapeUrl(twitterUrl ?? ''),
    scrapeUrl(deckUrl ?? ''),
  ]);

  // Build context sections
  const contextSections: string[] = [];

  contextSections.push(`PRODUCT DESCRIPTION (user-written):\n"${description}"`);
  contextSections.push(`GOAL ON REDDIT:\n"${goal || 'Get early users and build brand awareness'}"`);

  if (websiteText) {
    contextSections.push(`WEBSITE CONTENT (${website}):\n${websiteText}`);
  }
  if (linkedinText) {
    contextSections.push(`LINKEDIN PAGE CONTENT:\n${linkedinText}`);
  }
  if (twitterText) {
    contextSections.push(`TWITTER/X PROFILE CONTENT:\n${twitterText}`);
  }
  if (deckText) {
    contextSections.push(`PITCH DECK / DOCUMENT CONTENT:\n${deckText}`);
  }

  const scrapedCount = [websiteText, linkedinText, twitterText, deckText].filter(Boolean).length;

  const prompt = `You are a Reddit expert helping a founder find the best subreddits to monitor and engage in.

${contextSections.join('\n\n')}

Based on ALL the context above, suggest exactly 5 subreddits where this founder should monitor conversations. Choose communities where:
- People actively discuss problems this product solves
- The target audience hangs out (based on website, social, deck context)
- The founder could add genuine value in comments without being spammy
- There is real discussion (not just link dumps or memes)

Return ONLY a JSON array of 5 subreddit names (no r/ prefix, no markdown, no explanation):
["name1", "name2", "name3", "name4", "name5"]`;

  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      messages: [{ role: 'user', content: prompt }],
    });

    const raw = (message.content[0] as { type: string; text: string }).text.trim();
    const json = raw.replace(/^```json?\n?/, '').replace(/\n?```$/, '');
    const suggestions: string[] = JSON.parse(json);

    return NextResponse.json({
      suggestions: suggestions.slice(0, 5),
      sourcesAnalyzed: scrapedCount, // tell the frontend how many URLs were crawled
    });
  } catch (err) {
    console.error('[suggest-subreddits]', err);
    return NextResponse.json({ error: 'Failed to generate suggestions' }, { status: 500 });
  }
}
