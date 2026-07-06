import { db } from '@/lib/db';
import { assertSubAccountAccess } from '@/lib/auth';
import Link from 'next/link';

export default async function SubAccountHome({ params }: { params: { slug: string } }) {
  const subAccount = await db.subAccount.findUniqueOrThrow({ where: { slug: params.slug } });
  await assertSubAccountAccess(subAccount.id);

  const contactCount = await db.contact.count({ where: { subAccountId: subAccount.id } });

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl tracking-wide">{subAccount.name}</h1>
      <p className="text-sm text-muted">{contactCount} contacts on file</p>

      <div className="flex gap-3">
        <Link
          href={`/accounts/${params.slug}/contacts`}
          className="rounded-sm border border-line bg-panel px-4 py-2 text-sm hover:border-brass/60"
        >
          Contacts
        </Link>
        <Link
          href={`/accounts/${params.slug}/pipeline`}
          className="rounded-sm border border-line bg-panel px-4 py-2 text-sm hover:border-brass/60"
        >
          Pipeline
        </Link>
        <Link
          href={`/accounts/${params.slug}/sites`}
          className="rounded-sm border border-line bg-panel px-4 py-2 text-sm hover:border-brass/60"
        >
          Sites
        </Link>
        <Link
          href={`/accounts/${params.slug}/settings/website`}
          className="rounded-sm border border-line bg-panel px-4 py-2 text-sm hover:border-brass/60"
        >
          Website Settings
        </Link>
        <Link
          href={`/accounts/${params.slug}/settings/email`}
          className="rounded-sm border border-line bg-panel px-4 py-2 text-sm hover:border-brass/60"
        >
          Email Settings
        </Link>
        <Link
          href={`/accounts/${params.slug}/campaigns/new`}
          className="rounded-sm border border-line bg-panel px-4 py-2 text-sm hover:border-brass/60"
        >
          New Campaign
        </Link>
      </div>

      <p className="text-xs text-muted">
        Invoicing/estimates land here next session.
      </p>
    </div>
  );
}
