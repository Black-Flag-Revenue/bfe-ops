import { db } from './db';
import { normalizeHost } from './opsHost';

export async function resolvePublicSite(host: string, pathSegments: string[]) {
  const domain = normalizeHost(host);

  const subAccount = await db.subAccount.findUnique({ where: { primaryDomain: domain } });
  if (!subAccount) return null;

  const pathSlug = pathSegments.length > 0 ? pathSegments.join('/') : null;

  const site = pathSlug
    ? await db.site.findFirst({ where: { subAccountId: subAccount.id, pathSlug, status: 'PUBLISHED' } })
    : await db.site.findFirst({ where: { subAccountId: subAccount.id, isHomepage: true, status: 'PUBLISHED' } });

  if (!site) return null;

  return { subAccount, site };
}
