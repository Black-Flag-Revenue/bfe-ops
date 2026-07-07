import { db } from '@/lib/db';
import { assertSubAccountAccess } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function WebsiteSettingsPage({ params }: { params: { slug: string } }) {
  const subAccount = await db.subAccount.findUniqueOrThrow({ where: { slug: params.slug } });
  await assertSubAccountAccess(subAccount.id);

  async function saveSettings(formData: FormData) {
    'use server';
    await assertSubAccountAccess(subAccount.id);
    const primaryDomain = (formData.get('primaryDomain') as string)
      .trim()
      .replace(/^https?:\/\//, '')
      .replace(/\/$/, '');
    const businessPhone = (formData.get('businessPhone') as string) || null;
    const brandColor = (formData.get('brandColor') as string) || null;
    const streetAddress = (formData.get('streetAddress') as string) || null;
    const seoCity = (formData.get('seoCity') as string) || null;
    const seoState = (formData.get('seoState') as string) || null;
    const seoZip = (formData.get('seoZip') as string) || null;
    const serviceAreasRaw = (formData.get('serviceAreas') as string) || '';
    const serviceAreas = serviceAreasRaw.split(',').map((s) => s.trim()).filter(Boolean);

    await db.subAccount.update({
      where: { id: subAccount.id },
      data: {
        primaryDomain: primaryDomain || null,
        businessPhone,
        brandColor,
        streetAddress,
        seoCity,
        seoState,
        seoZip,
        serviceAreas,
      },
    });
    redirect(`/accounts/${params.slug}/settings/website`);
  }

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="font-display text-3xl tracking-wide">Website — {subAccount.name}</h1>
        <p className="mt-1 text-sm text-muted">
          One Replit deployment serves every client's domain - no separate hosting needed.
        </p>
      </div>

      <div className="rounded-sm border border-line bg-panel p-5">
        <h2 className="font-mono text-[10px] uppercase tracking-wide2 text-muted">Setup steps</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm">
          <li>Set the domain below (e.g. mobilebuff.com)</li>
          <li>In Replit: open your deployment, go to Settings, then Domains, and add that domain</li>
          <li>Replit gives you DNS records (A/CNAME) - add those wherever the domain is registered</li>
          <li>Once DNS propagates, publish a site below and it's live on that domain</li>
        </ol>
      </div>

      <form action={saveSettings} className="space-y-4 rounded-sm border border-line bg-panel p-5">
        <Field label="Domain" name="primaryDomain" defaultValue={subAccount.primaryDomain || ''} placeholder="mobilebuff.com" />
        <Field label="Business phone (shown as call-to-action)" name="businessPhone" defaultValue={subAccount.businessPhone || ''} placeholder="(555) 555-5555" />
        <label className="block">
          <span className="font-mono text-[10px] uppercase tracking-wide2 text-muted">Brand color</span>
          <input
            name="brandColor"
            defaultValue={subAccount.brandColor || ''}
            type="color"
            className="mt-1 h-10 w-20 rounded-sm border border-line bg-base"
          />
        </label>

        <div className="border-t border-line pt-4">
          <span className="font-mono text-[10px] uppercase tracking-wide2 text-muted">
            Local SEO / structured data
          </span>
          <p className="mt-1 text-xs text-muted">
            Powers the LocalBusiness schema that Google, Bing, and AI answer engines read facts
            from - fill in what you have, none of it is required.
          </p>
          <div className="mt-3 space-y-3">
            <Field label="Street address" name="streetAddress" defaultValue={subAccount.streetAddress || ''} placeholder="123 Main St" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Field label="City" name="seoCity" defaultValue={subAccount.seoCity || ''} />
              <Field label="State" name="seoState" defaultValue={subAccount.seoState || ''} />
              <Field label="Zip" name="seoZip" defaultValue={subAccount.seoZip || ''} />
            </div>
            <Field
              label="Service areas (comma-separated)"
              name="serviceAreas"
              defaultValue={subAccount.serviceAreas.join(', ')}
              placeholder="San Antonio, Alamo Heights, Boerne"
            />
          </div>
        </div>

        <button className="rounded-sm bg-brass px-4 py-2 font-display text-sm tracking-wide text-base">
          Save
        </button>
      </form>
    </div>
  );
}

function Field({
  label,
  name,
  defaultValue,
  placeholder,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="font-mono text-[10px] uppercase tracking-wide2 text-muted">{label}</span>
      <input
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="mt-1 w-full rounded-sm border border-line bg-base px-3 py-2 text-sm"
      />
    </label>
  );
}
