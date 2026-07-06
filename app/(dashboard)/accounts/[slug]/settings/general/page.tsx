import { db } from '@/lib/db';
import { assertSubAccountAccess } from '@/lib/auth';
import { INDUSTRY_FIELDS } from '@/lib/industryFields';
import { redirect } from 'next/navigation';

const KNOWN_INDUSTRIES = Object.keys(INDUSTRY_FIELDS);

export default async function GeneralSettingsPage({ params }: { params: { slug: string } }) {
  const subAccount = await db.subAccount.findUniqueOrThrow({ where: { slug: params.slug } });
  await assertSubAccountAccess(subAccount.id);

  async function saveGeneral(formData: FormData) {
    'use server';
    await assertSubAccountAccess(subAccount.id);
    await db.subAccount.update({
      where: { id: subAccount.id },
      data: {
        name: formData.get('name') as string,
        industry: (formData.get('industry') as string) || null,
        logoUrl: (formData.get('logoUrl') as string) || null,
      },
    });
    redirect(`/accounts/${params.slug}/settings/general`);
  }

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="font-display text-3xl tracking-wide">General — {subAccount.name}</h1>

      <form action={saveGeneral} className="space-y-4 rounded-sm border border-line bg-panel p-5">
        <label className="block">
          <span className="font-mono text-[10px] uppercase tracking-wide2 text-muted">Business name</span>
          <input
            name="name"
            defaultValue={subAccount.name}
            required
            className="mt-1 w-full rounded-sm border border-line bg-base px-3 py-2 text-sm"
          />
        </label>

        <label className="block">
          <span className="font-mono text-[10px] uppercase tracking-wide2 text-muted">Industry</span>
          <p className="mt-0.5 text-xs text-muted">
            Drives which custom fields show up on contacts for this account (roof type vs.
            vehicle make, etc.)
          </p>
          <select
            name="industry"
            defaultValue={subAccount.industry || ''}
            className="mt-1 w-full rounded-sm border border-line bg-base px-3 py-2 text-sm"
          >
            <option value="">Other / none</option>
            {KNOWN_INDUSTRIES.map((ind) => (
              <option key={ind} value={ind}>{ind}</option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="font-mono text-[10px] uppercase tracking-wide2 text-muted">Logo URL</span>
          <input
            name="logoUrl"
            defaultValue={subAccount.logoUrl || ''}
            placeholder="https://..."
            className="mt-1 w-full rounded-sm border border-line bg-base px-3 py-2 text-sm"
          />
        </label>

        <button className="rounded-sm bg-brass px-4 py-2 font-display text-sm tracking-wide text-base">
          Save
        </button>
      </form>
    </div>
  );
}
