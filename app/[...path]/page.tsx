import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { isOpsHost } from '@/lib/opsHost';
import { resolvePublicSite } from '@/lib/publicSite';
import { PublicSiteTemplate } from '@/components/PublicSiteTemplate';
import { PublicSiteTemplateBold } from '@/components/PublicSiteTemplateBold';

export async function generateMetadata({ params }: { params: { path: string[] } }): Promise<Metadata> {
  const host = headers().get('host') || '';
  if (isOpsHost(host)) return {};

  const resolved = await resolvePublicSite(host, params.path);
  if (!resolved) return {};

  const { subAccount, site } = resolved;
  const content = site.contentJson as { heroHeadline?: string };
  const locationBit = [site.neighborhood, site.city].filter(Boolean).join(', ');
  const title = site.seoTitle || `${subAccount.name}${locationBit ? ` | ${locationBit}` : ''}`;
  const description =
    site.seoDescription ||
    content.heroHeadline ||
    `${subAccount.name} - trusted local ${subAccount.industry || 'service'} provider${locationBit ? ` serving ${locationBit}` : ''}.`;
  const canonicalPath = site.isHomepage ? '' : `/${site.pathSlug}`;

  return {
    title,
    description,
    openGraph: { title, description, type: 'website' },
    twitter: { card: 'summary', title, description },
    alternates: subAccount.primaryDomain
      ? { canonical: `https://${subAccount.primaryDomain}${canonicalPath}` }
      : undefined,
  };
}

export default async function CatchAllPage({ params }: { params: { path: string[] } }) {
  const host = headers().get('host') || '';

  // On the ops app itself, an unmatched path is just a real 404 - don't try
  // to interpret it as a client site.
  if (isOpsHost(host)) notFound();

  const resolved = await resolvePublicSite(host, params.path);
  if (!resolved) notFound();

  const Template = resolved.site.templateId === 'bold' ? PublicSiteTemplateBold : PublicSiteTemplate;

  return (
    <Template
      subAccount={resolved.subAccount}
      contentJson={resolved.site.contentJson as any}
      city={resolved.site.city}
      neighborhood={resolved.site.neighborhood}
      faqItems={resolved.site.faqItems as any}
    />
  );
}
