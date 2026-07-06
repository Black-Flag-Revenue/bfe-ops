import { headers } from 'next/headers';
import { isOpsHost, normalizeHost } from '@/lib/opsHost';
import { db } from '@/lib/db';

export async function GET() {
  const host = headers().get('host') || '';

  if (isOpsHost(host)) {
    return new Response('Not found', { status: 404 });
  }

  const domain = normalizeHost(host);
  const subAccount = await db.subAccount.findUnique({ where: { primaryDomain: domain } });
  if (!subAccount) return new Response('Not found', { status: 404 });

  const sites = await db.site.findMany({
    where: { subAccountId: subAccount.id, status: 'PUBLISHED' },
  });

  const urls = sites.map((site) => {
    const path = site.isHomepage ? '' : `/${site.pathSlug}`;
    return `<url><loc>https://${domain}${path}</loc><changefreq>weekly</changefreq></url>`;
  });

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`;

  return new Response(xml, { headers: { 'Content-Type': 'application/xml' } });
}
