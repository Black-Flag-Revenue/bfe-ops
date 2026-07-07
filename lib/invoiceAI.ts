/**
 * The actual point of this feature: instead of Brock manually hunting down
 * spec sheets, warranty pages, and product videos for every estimate, he
 * describes the job (materials, brands, scope) and this searches for real
 * supporting content automatically - the same research work he'd normally
 * ask for in a chat, wired directly into estimate creation.
 */
export async function generateInvoiceContent({
  jobDescription,
  businessName,
  industry,
}: {
  jobDescription: string;
  businessName: string;
  industry: string | null;
}) {
  const systemPrompt = `You help a ${industry || 'home services'} business (${businessName}) prepare customer-facing estimates.

Given a description of a job (materials, brands, scope of work), use web search to find REAL, currently-accessible supporting content:
- Manufacturer spec sheets, warranty pages, or product pages for any named products/brands
- A relevant product overview or installation video (YouTube preferred) if one genuinely exists for a named product
- Write a short (2-4 sentence) educational paragraph explaining the recommended approach in plain language, as if explaining to a homeowner why this work matters - do not invent statistics or claims you can't verify from search.

Only include links/videos you actually found via search - if you can't find something genuinely relevant, leave that array empty rather than guessing a URL.

Respond with ONLY valid JSON, no other text, in exactly this shape:
{"introText": "...", "links": [{"label": "...", "url": "..."}], "videos": [{"label": "...", "url": "..."}]}`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-5',
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{ role: 'user', content: jobDescription }],
      tools: [{ type: 'web_search_20250305', name: 'web_search' }],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Anthropic API error: ${response.status} ${errText}`);
  }

  const data = await response.json();

  const textBlocks = data.content.filter((block: any) => block.type === 'text');
  const finalText = textBlocks[textBlocks.length - 1]?.text || '{}';
  const cleaned = finalText.replace(/```json|```/g, '').trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    throw new Error("Couldn't parse a valid response - try rephrasing the job description and generating again.");
  }
}
