import { db } from '@/lib/db';
import { assertSubAccountAccess } from '@/lib/auth';
import { PublicSiteTemplate } from '@/components/PublicSiteTemplate';
import { PublicSiteTemplateBold } from '@/components/PublicSiteTemplateBold';

export default async function SitePreviewPage({
  params,
}: {
  params: { slug: string; siteId: string };
}) {
  const subAccount = await db.subAccount.findUniqueOrThrow({ where: { slug: params.slug } });
  await assertSubAccountAccess(subAccount.id);

  const site = await db.site.findUniqueOrThrow({ where: { id: params.siteId } });
  const Template = site.templateId === 'bold' ? PublicSiteTemplateBold : PublicSiteTemplate;

  return (
    <div>
      <div className="border-b border-flag/40 bg-flag/10 px-6 py-2 text-center font-mono text-xs uppercase tracking-wide2 text-flag">
        Internal preview only — {site.status === 'PUBLISHED' ? 'this site is live' : 'not published yet'}
      </div>
      <Template
        subAccount={subAccount}
        contentJson={site.contentJson as any}
        city={site.city}
        neighborhood={site.neighborhood}
        faqItems={site.faqItems as any}
      />
    </div>
  );
}
