import { db } from '@/lib/db';
import { assertSubAccountAccess } from '@/lib/auth';
import { parseCsv } from '@/lib/csv';
import { redirect } from 'next/navigation';

const RECOGNIZED_HEADERS = [
  'firstName',
  'lastName',
  'email',
  'phone',
  'address',
  'city',
  'state',
  'zip',
  'source',
  'tags',
];

export default function ImportContactsPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: { imported?: string; skipped?: string; error?: string };
}) {
  async function importCsv(formData: FormData) {
    'use server';
    const subAccount = await db.subAccount.findUniqueOrThrow({ where: { slug: params.slug } });
    await assertSubAccountAccess(subAccount.id);

    const file = formData.get('file') as File;
    if (!file || file.size === 0) {
      redirect(`/accounts/${params.slug}/contacts/import?error=No file selected`);
    }

    const text = await file.text();
    const rows = parseCsv(text);
    if (rows.length < 2) {
      redirect(`/accounts/${params.slug}/contacts/import?error=File looks empty or has no data rows`);
    }

    const headers = rows[0].map((h) => h.trim());
    const dataRows = rows.slice(1);

    let imported = 0;
    let skipped = 0;

    for (const row of dataRows) {
      const record: Record<string, string> = {};
      headers.forEach((header, i) => {
        record[header] = row[i]?.trim() || '';
      });

      // Need at minimum a first name to bother creating a contact
      if (!record.firstName) {
        skipped++;
        continue;
      }

      // Skip exact duplicates by email within this sub-account, if email given
      if (record.email) {
        const existing = await db.contact.findFirst({
          where: { subAccountId: subAccount.id, email: record.email },
        });
        if (existing) {
          skipped++;
          continue;
        }
      }

      const tags = record.tags ? record.tags.split(/[,;]/).map((t) => t.trim()).filter(Boolean) : [];

      await db.contact.create({
        data: {
          subAccountId: subAccount.id,
          firstName: record.firstName,
          lastName: record.lastName || null,
          email: record.email || null,
          phone: record.phone || null,
          address: record.address || null,
          city: record.city || null,
          state: record.state || null,
          zip: record.zip || null,
          source: record.source || 'CSV import',
          tags,
        },
      });
      imported++;
    }

    redirect(`/accounts/${params.slug}/contacts/import?imported=${imported}&skipped=${skipped}`);
  }

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="font-display text-3xl tracking-wide">Import Contacts</h1>

      {searchParams.error && (
        <div className="rounded-sm border border-flag bg-flag/10 p-4 text-sm text-flag">
          {searchParams.error}
        </div>
      )}
      {searchParams.imported !== undefined && (
        <div className="rounded-sm border border-brass bg-brass/10 p-4 text-sm text-brass">
          Imported {searchParams.imported} contact{searchParams.imported === '1' ? '' : 's'}
          {Number(searchParams.skipped) > 0 && ` - skipped ${searchParams.skipped} (missing name or duplicate email)`}.
        </div>
      )}

      <div className="rounded-sm border border-line bg-panel p-5">
        <h2 className="font-mono text-[10px] uppercase tracking-wide2 text-muted">Expected columns</h2>
        <p className="mt-2 text-sm">
          First row must be a header row. Recognized column names (case-sensitive, extras are
          ignored):
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {RECOGNIZED_HEADERS.map((h) => (
            <span key={h} className="rounded-full border border-line px-2 py-0.5 font-mono text-[10px] text-muted">
              {h}
            </span>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted">
          Only <span className="text-ink">firstName</span> is required per row. For{' '}
          <span className="text-ink">tags</span>, separate multiple with a comma or semicolon
          inside the cell.
        </p>
      </div>

      <form action={importCsv} className="space-y-4 rounded-sm border border-line bg-panel p-5">
        <input
          type="file"
          name="file"
          accept=".csv"
          required
          className="w-full text-sm file:mr-3 file:rounded-sm file:border file:border-line file:bg-base file:px-3 file:py-1.5 file:text-sm"
        />
        <button className="rounded-sm bg-brass px-4 py-2 font-display text-sm tracking-wide text-base">
          Import
        </button>
      </form>
    </div>
  );
}
