import { db } from '@/lib/db';
import { assertSubAccountAccess } from '@/lib/auth';
import Link from 'next/link';

export default async function ContactsPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: { q?: string; tag?: string };
}) {
  const subAccount = await db.subAccount.findUniqueOrThrow({ where: { slug: params.slug } });
  await assertSubAccountAccess(subAccount.id);

  const q = searchParams.q?.trim();
  const tag = searchParams.tag?.trim();

  const contacts = await db.contact.findMany({
    where: {
      subAccountId: subAccount.id,
      ...(tag ? { tags: { has: tag } } : {}),
      ...(q
        ? {
            OR: [
              { firstName: { contains: q, mode: 'insensitive' } },
              { lastName: { contains: q, mode: 'insensitive' } },
              { email: { contains: q, mode: 'insensitive' } },
              { phone: { contains: q } },
              { address: { contains: q, mode: 'insensitive' } },
              { city: { contains: q, mode: 'insensitive' } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: 200,
    include: { owner: true },
  });

  // Pull distinct tags across the sub-account for the filter row
  const allContacts = await db.contact.findMany({
    where: { subAccountId: subAccount.id },
    select: { tags: true },
  });
  const distinctTags = Array.from(new Set(allContacts.flatMap((c) => c.tags))).sort();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl tracking-wide">Contacts — {subAccount.name}</h1>
          <p className="mt-1 text-sm text-muted">{contacts.length} shown</p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/accounts/${params.slug}/contacts/import`}
            className="rounded-sm border border-line px-4 py-2 font-display text-sm tracking-wide hover:border-brass/60"
          >
            Import CSV
          </Link>
          <Link
            href={`/accounts/${params.slug}/contacts/new`}
            className="rounded-sm bg-brass px-4 py-2 font-display text-sm tracking-wide text-base"
          >
            New Contact
          </Link>
        </div>
      </div>

      <form className="flex flex-wrap items-center gap-2">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search name, address, email, or phone..."
          className="w-72 rounded-sm border border-line bg-panel px-3 py-2 text-sm"
        />
        <button className="rounded-sm border border-line px-3 py-2 text-sm hover:border-brass/60">
          Search
        </button>
        {distinctTags.length > 0 && (
          <div className="ml-2 flex flex-wrap gap-1.5">
            {distinctTags.map((t) => (
              <Link
                key={t}
                href={`/accounts/${params.slug}/contacts?tag=${encodeURIComponent(t)}`}
                className={`rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-wide2 ${
                  tag === t ? 'border-brass text-brass' : 'border-line text-muted hover:border-brass/60'
                }`}
              >
                {t}
              </Link>
            ))}
            {tag && (
              <Link
                href={`/accounts/${params.slug}/contacts`}
                className="rounded-full border border-line px-2.5 py-1 font-mono text-[10px] uppercase tracking-wide2 text-muted hover:border-flag hover:text-flag"
              >
                Clear
              </Link>
            )}
          </div>
        )}
      </form>

      <div className="overflow-x-auto rounded-sm border border-line">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line bg-panel text-left font-mono text-[10px] uppercase tracking-wide2 text-muted">
              <th className="p-3">Name</th>
              <th className="p-3">Contact</th>
              <th className="p-3">Location</th>
              <th className="p-3">Tags</th>
              <th className="p-3">Owner</th>
              <th className="p-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {contacts.map((c) => (
              <tr key={c.id} className="border-b border-line last:border-0 hover:bg-panel/50">
                <td className="p-3">
                  <Link href={`/accounts/${params.slug}/contacts/${c.id}`} className="hover:text-brass">
                    {c.firstName} {c.lastName}
                  </Link>
                </td>
                <td className="p-3 text-muted">
                  <div>{c.email}</div>
                  <div className="font-mono text-xs">{c.phone}</div>
                </td>
                <td className="p-3 text-muted">{c.city}{c.state ? `, ${c.state}` : ''}</td>
                <td className="p-3">
                  <div className="flex flex-wrap gap-1">
                    {c.tags.map((t) => (
                      <span key={t} className="rounded-full border border-line px-2 py-0.5 font-mono text-[10px] text-muted">
                        {t}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="p-3 text-muted">
                  {c.owner ? c.owner.name : <span className="text-flag">Unassigned</span>}
                </td>
                <td className="p-3">
                  {c.suppressed ? (
                    <span className="font-mono text-[10px] uppercase tracking-wide2 text-flag">Suppressed</span>
                  ) : c.unsubscribed ? (
                    <span className="font-mono text-[10px] uppercase tracking-wide2 text-muted">Unsubscribed</span>
                  ) : (
                    <span className="font-mono text-[10px] uppercase tracking-wide2 text-ink">Active</span>
                  )}
                </td>
              </tr>
            ))}
            {contacts.length === 0 && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-sm text-muted">
                  No contacts yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
