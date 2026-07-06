import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { isOpsHost } from '@/lib/opsHost';
import { resolvePublicSite } from '@/lib/publicSite';
import { PublicSiteTemplate } from '@/components/PublicSiteTemplate';

export default async function CatchAllPage({ params }: { params: { path: string[] } }) {
  const host = headers().get('host') || '';

  // On the ops app itself, an unmatched path is just a real 404 - don't try
  // to interpret it as a client site.
  if (isOpsHost(host)) notFound();

  const resolved = await resolvePublicSite(host, params.path);
  if (!resolved) notFound();

  return (
    <PublicSiteTemplate
      subAccount={resolved.subAccount}
      contentJson={resolved.site.contentJson as any}
      city={resolved.site.city}
      neighborhood={resolved.site.neighborhood}
    />
  );
}
