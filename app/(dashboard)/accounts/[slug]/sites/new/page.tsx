import { db } from '@/lib/db';
import { assertSubAccountAccess } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function NewSitePage({ params }: { params: { slug: string } }) {
  const subAccount = await db.subAccount.findUniqueOrThrow({ where: { slug: params.slug } });
  await assertSubAccountAccess(subAccount.id);

  async function createSite(formData: FormData) {
    'use server';
    await assertSubAccountAccess(subAccount.id);

    const city = formData.get('city') as string;
    const neighborhood = formData.get('neighborhood') as string;
    const heroHeadline = formData.get('heroHeadline') as string;
    const sellingPoints = formData.get('sellingPoints') as string;

    const pathSlugRaw = formData.get('pathSlug') as string;
    const isHomepage = formData.get('isHomepage') === 'on';
    const pathSlug = isHomepage
      ? null
      : pathSlugRaw.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    await db.site.create({
      data: {
        subAccountId: subAccount.id,
        name: `${subAccount.name} — ${city}${neighborhood ? ` (${neighborhood})` : ''}`,
        city,
        neighborhood,
        pathSlug,
        isHomepage,
        templateId: 'default',
        contentJson: { heroHeadline, sellingPoints },
        status: 'DRAFT',
      },
    });

    redirect(`/accounts/${params.slug}/sites`);
  }

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="font-display text-3xl tracking-wide">New Site — {subAccount.name}</h1>
        <p className="mt-1 text-sm text-muted">
          Fill in what makes this page local. Auto-pulled data (storm history, satellite imagery
          dates) and one-click deploy are the next build - this saves the page as a draft for now.
        </p>
      </div>

      <form action={createSite} className="space-y-4 rounded-sm border border-line bg-panel p-5">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="isHomepage" />
          This is the homepage (renders at the bare domain, not a subpath)
        </label>
        <Field
          label="Path (if not homepage)"
          name="pathSlug"
          placeholder="inland-estates → yourdomain.com/inland-estates"
        />
        <Field label="City" name="city" placeholder="San Antonio" required />
        <Field label="Neighborhood (optional)" name="neighborhood" placeholder="Alamo Heights" />
        <Field
          label="Hero headline"
          name="heroHeadline"
          placeholder="Storm Damage in Alamo Heights? We've Got You Covered."
          required
        />
        <label className="block">
          <span className="font-mono text-[10px] uppercase tracking-wide2 text-muted">
            Key selling points (one per line)
          </span>
          <textarea
            name="sellingPoints"
            required
            rows={5}
            placeholder={'Free storm damage inspection\nLicensed & insured in Bexar County\n24-hour emergency response'}
            className="mt-1 w-full rounded-sm border border-line bg-base px-3 py-2 text-sm"
          />
        </label>
        <button className="rounded-sm bg-brass px-4 py-2 font-display text-sm tracking-wide text-base">
          Save draft
        </button>
      </form>
    </div>
  );
}

function Field({
  label,
  name,
  placeholder,
  required,
}: {
  label: string;
  name: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="font-mono text-[10px] uppercase tracking-wide2 text-muted">{label}</span>
      <input
        name={name}
        required={required}
        placeholder={placeholder}
        className="mt-1 w-full rounded-sm border border-line bg-base px-3 py-2 text-sm"
      />
    </label>
  );
}
