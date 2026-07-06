import { db } from '@/lib/db';
import { assertSubAccountAccess } from '@/lib/auth';
import { ContactsBulkTable } from '@/components/ContactsBulkTable';
import Link from 'next/link';
import { revalidatePath } from 'next/cache';

export default async function ContactsPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: {
    q?: string;
    tag?: string;
    createdFrom?: string;
    createdTo?: string;
    neverCampaigned?: string;
    stageId?: string;
  };
}) {
  const subAccount = await db.subAccount.findUniqueOrThrow({ where: { slug: params.slug } });
  await assertSubAccountAccess(subAccount.id);

  const q = searchParams.q?.trim();
  const tag = searchParams.tag?.trim();
  const neverCampaigned = searchParams.neverCampaigned === '1';
  const stageId = searchParams.stageId?.trim();

  const contacts = await db.contact.findMany({
    where: {
      subAccountId: subAccount.id,
      ...(tag ? { tags: { has: tag } } : {}),
      ...(searchParams.createdFrom || searchParams.createdTo
        ? {
            createdAt: {
              ...(searchParams.createdFrom ? { gte: new Date(searchParams.createdFrom) } : {}),
              ...(searchParams.createdTo ? { lte: new Date(searchParams.createdTo + 'T23:59:59') } : {}),
            },
          }
        : {}),
      ...(neverCampaigned ? { campaignRecipients: { none: {} } } : {}),
      ...(stageId ? { deals: { some: { stageId } } } : {}),
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

  const [allContactsForTags, stages] = await Promise.all([
    db.contact.findMany({ where: { subAccountId: subAccount.id }, select: { tags: true } }),
    db.stage.findMany({ where: { pipeline: { subAccountId: subAccount.id } }, orderBy: { order: 'asc' } }),
  ]);
  const distinctTags = Array.from(new Set(allContactsForTags.flatMap((c) => c.tags))).sort();

  async function bulkAddTag(contactIds: string[], newTag: string) {
    'use server';
    await assertSubAccountAccess(subAccount.id);
    const targets = await db.contact.findMany({ where: { id: { in: contactIds } }, select: { id: true, tags: true } });
    for (const t of targets) {
      if (!t.tags.includes(newTag)) {
        await db.contact.update({ where: { id: t.id }, data: { tags: [...t.tags, newTag] } });
      }
    }
    revalidatePath(`/accounts/${params.slug}/contacts`);
  }

  async function bulkDeleteContacts(contactIds: string[]) {
    'use server';
    await assertSubAccountAccess(subAccount.id);
    await db.contact.deleteMany({ where: { id: { in: contactIds }, subAccountId: subAccount.id } });
    revalidatePath(`/accounts/${params.slug}/contacts`);
  }

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

      <form className="space-y-3 rounded-sm border border-line bg-panel p-4">
        <div className="flex flex-wrap items-center gap-2">
          <input
            name="q"
            defaultValue={q}
            placeholder="Search name, address, email, or phone..."
            className="w-72 rounded-sm border border-line bg-base px-3 py-2 text-sm"
          />
          <div className="flex items-center gap-1.5 text-xs text-muted">
            <span className="font-mono uppercase tracking-wide2">Added</span>
            <input type="date" name="createdFrom" defaultValue={searchParams.createdFrom} className="rounded-sm border border-line bg-base px-2 py-1.5 text-sm" />
            <span>to</span>
            <input type="date" name="createdTo" defaultValue={searchParams.createdTo} className="rounded-sm border border-line bg-base px-2 py-1.5 text-sm" />
          </div>
          <select name="stageId" defaultValue={stageId || ''} className="rounded-sm border border-line bg-base px-2 py-1.5 text-sm">
            <option value="">Any pipeline stage</option>
            {stages.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <label className="flex items-center gap-1.5 text-xs">
            <input type="checkbox" name="neverCampaigned" value="1" defaultChecked={neverCampaigned} />
            Never sent a campaign
          </label>
          <button className="rounded-sm border border-line px-3 py-2 text-sm hover:border-brass/60">
            Apply Filters
          </button>
          <Link href={`/accounts/${params.slug}/contacts`} className="text-xs text-muted hover:text-flag">
            Clear all
          </Link>
        </div>

        {distinctTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
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
          </div>
        )}
      </form>

      <ContactsBulkTable
        contacts={contacts}
        slug={params.slug}
        bulkAddTag={bulkAddTag}
        bulkDeleteContacts={bulkDeleteContacts}
      />
    </div>
  );
}
