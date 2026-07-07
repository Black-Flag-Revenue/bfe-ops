import { db } from '@/lib/db';
import { assertSubAccountAccess } from '@/lib/auth';
import Link from 'next/link';
import { redirect } from 'next/navigation';

export default async function SitesPage({ params }: { params: { slug: string } }) {
  const subAccount = await db.subAccount.findUniqueOrThrow({ where: { slug: params.slug } });
  await assertSubAccountAccess(subAccount.id);

  const sites = await db.site.findMany({
    where: { subAccountId: subAccount.id },
    orderBy: { createdAt: 'desc' },
  });

  async function togglePublish(formData: FormData) {
    'use server';
    await assertSubAccountAccess(subAccount.id);
    const siteId = formData.get('siteId') as string;
    const nextStatus = formData.get('nextStatus') as 'PUBLISHED' | 'DRAFT';
    await db.site.update({ where: { id: siteId }, data: { status: nextStatus } });
    redirect(`/accounts/${params.slug}/sites`);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl tracking-wide">Sites — {subAccount.name}</h1>
          <p className="mt-1 text-sm text-muted">{sites.length} page{sites.length === 1 ? '' : 's'}</p>
        </div>
        <Link
          href={`/accounts/${params.slug}/sites/new`}
          className="rounded-sm bg-brass px-4 py-2 font-display text-sm tracking-wide text-base"
        >
          New Site
        </Link>
      </div>

      {!subAccount.primaryDomain && (
        <div className="rounded-sm border border-flag bg-flag/10 p-4 text-sm text-flag">
          No domain connected yet - sites will save but won't be reachable until you set one in{' '}
          <Link href={`/accounts/${params.slug}/settings/website`} className="underline">
            Website Settings
          </Link>
          .
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sites.map((site) => {
          const url = subAccount.primaryDomain
            ? `https://${subAccount.primaryDomain}${site.isHomepage ? '' : `/${site.pathSlug}`}`
            : null;
          return (
            <div key={site.id} className="rounded-sm border border-line bg-panel p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-display text-lg">{site.name}</div>
                  <div className="font-mono text-[10px] uppercase tracking-wide2 text-muted mt-0.5">
                    {site.isHomepage ? 'Homepage' : `/${site.pathSlug}`}
                  </div>
                </div>
                <StatusBadge status={site.status} />
              </div>
              {url ? (
                <a href={url} target="_blank" className="mt-3 block truncate font-mono text-xs text-brass hover:underline">
                  {url}
                </a>
              ) : (
                <p className="mt-3 text-xs text-muted">No domain connected yet</p>
              )}
              <div className="mt-2 flex items-center gap-3">
                <a
                  href={`/accounts/${params.slug}/sites/${site.id}/preview`}
                  target="_blank"
                  className="font-mono text-[10px] uppercase tracking-wide2 text-muted hover:text-brass"
                >
                  Preview
                </a>
              </div>
              <form action={togglePublish} className="mt-3">
                <input type="hidden" name="siteId" value={site.id} />
                <input type="hidden" name="nextStatus" value={site.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED'} />
                <button className="rounded-sm border border-line px-3 py-1 font-mono text-[10px] uppercase tracking-wide2 hover:border-brass/60">
                  {site.status === 'PUBLISHED' ? 'Unpublish' : 'Publish'}
                </button>
              </form>
            </div>
          );
        })}

        {sites.length === 0 && (
          <p className="col-span-full text-sm text-muted">
            No sites yet — create your first one.
          </p>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    DRAFT: 'text-muted border-line',
    PUBLISHED: 'text-ink border-ink bg-ink/10',
    ARCHIVED: 'text-flag border-flag',
  };
  return (
    <span className={`shrink-0 rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide2 ${styles[status]}`}>
      {status}
    </span>
  );
}
