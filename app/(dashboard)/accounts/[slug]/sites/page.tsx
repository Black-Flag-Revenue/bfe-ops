import { db } from '@/lib/db';
import { assertSubAccountAccess } from '@/lib/auth';
import Link from 'next/link';

export default async function SitesPage({ params }: { params: { slug: string } }) {
  const subAccount = await db.subAccount.findUniqueOrThrow({ where: { slug: params.slug } });
  await assertSubAccountAccess(subAccount.id);

  const sites = await db.site.findMany({
    where: { subAccountId: subAccount.id },
    orderBy: { createdAt: 'desc' },
  });

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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sites.map((site) => (
          <div key={site.id} className="rounded-sm border border-line bg-panel p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="font-display text-lg">{site.name}</div>
                {site.city && (
                  <div className="font-mono text-[10px] uppercase tracking-wide2 text-muted mt-0.5">
                    {site.city}{site.neighborhood ? ` — ${site.neighborhood}` : ''}
                  </div>
                )}
              </div>
              <StatusBadge status={site.status} />
            </div>
            {site.deployUrl ? (
              <a
                href={site.deployUrl}
                target="_blank"
                className="mt-3 block truncate font-mono text-xs text-brass hover:underline"
              >
                {site.deployUrl}
              </a>
            ) : (
              <p className="mt-3 text-xs text-muted">Not deployed yet</p>
            )}
          </div>
        ))}

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
    DEPLOYED: 'text-ink border-ink bg-ink/10',
    ARCHIVED: 'text-flag border-flag',
  };
  return (
    <span className={`shrink-0 rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide2 ${styles[status]}`}>
      {status}
    </span>
  );
}
