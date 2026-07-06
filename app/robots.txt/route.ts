import { headers } from 'next/headers';
import { isOpsHost, normalizeHost } from '@/lib/opsHost';
import { db } from '@/lib/db';

export async function GET() {
  const host = headers().get('host') || '';

  if (isOpsHost(host)) {
    // The CRM itself - keep it out of every search engine entirely.
    return new Response('User-agent: *\nDisallow: /\n', { headers: { 'Content-Type': 'text/plain' } });
  }

  const domain = normalizeHost(host);
  const subAccount = await db.subAccount.findUnique({ where: { primaryDomain: domain } });

  if (!subAccount) {
    return new Response('User-agent: *\nDisallow: /\n', { headers: { 'Content-Type': 'text/plain' } });
  }

  // Wide open for every crawler - traditional search engines, and the
  // crawlers behind AI answer engines (GPTBot, PerplexityBot, ClaudeBot,
  // Google-Extended for AI Overviews, etc.) all respect standard robots.txt.
  const body = `User-agent: *\nAllow: /\n\nSitemap: https://${domain}/sitemap.xml\n`;
  return new Response(body, { headers: { 'Content-Type': 'text/plain' } });
}
