import { db } from '@/lib/db';
import { assertSubAccountAccess } from '@/lib/auth';
import { getIndustryFields } from '@/lib/industryFields';
import { redirect } from 'next/navigation';

export default async function NewContactPage({ params }: { params: { slug: string } }) {
  const subAccount = await db.subAccount.findUniqueOrThrow({ where: { slug: params.slug } });
  await assertSubAccountAccess(subAccount.id);

  const industryFields = getIndustryFields(subAccount.industry);

  async function createContact(formData: FormData) {
    'use server';
    const userCtx = await assertSubAccountAccess(subAccount.id);

    const customFields: Record<string, string> = {};
    for (const field of industryFields) {
      const value = formData.get(`custom_${field.key}`) as string;
      if (value) customFields[field.key] = value;
    }

    const tagsRaw = (formData.get('tags') as string) || '';
    const tags = tagsRaw.split(',').map((t) => t.trim()).filter(Boolean);

    const contact = await db.contact.create({
      data: {
        subAccountId: subAccount.id,
        firstName: formData.get('firstName') as string,
        lastName: (formData.get('lastName') as string) || null,
        email: (formData.get('email') as string) || null,
        phone: (formData.get('phone') as string) || null,
        address: (formData.get('address') as string) || null,
        city: (formData.get('city') as string) || null,
        state: (formData.get('state') as string) || null,
        zip: (formData.get('zip') as string) || null,
        source: (formData.get('source') as string) || null,
        tags,
        customFields: Object.keys(customFields).length > 0 ? customFields : undefined,
        createdById: userCtx.user.id,
      },
    });

    redirect(`/accounts/${params.slug}/contacts/${contact.id}`);
  }

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="font-display text-3xl tracking-wide">New Contact — {subAccount.name}</h1>

      <form action={createContact} className="space-y-5 rounded-sm border border-line bg-panel p-5">
        <div className="grid grid-cols-2 gap-3">
          <Field label="First name" name="firstName" required />
          <Field label="Last name" name="lastName" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Email" name="email" type="email" />
          <Field label="Phone" name="phone" placeholder="(555) 555-5555" />
        </div>
        <Field label="Address" name="address" />
        <div className="grid grid-cols-3 gap-3">
          <Field label="City" name="city" />
          <Field label="State" name="state" />
          <Field label="Zip" name="zip" />
        </div>
        <Field label="Source" name="source" placeholder="Cold outreach, door knock, referral..." />
        <Field label="Tags (comma-separated)" name="tags" placeholder="cold-lead, storm-zone-2026" />

        {industryFields.length > 0 && industryFields[0].key !== 'notes' && (
          <div className="border-t border-line pt-4">
            <span className="font-mono text-[10px] uppercase tracking-wide2 text-muted">
              {subAccount.industry} details
            </span>
            <div className="mt-3 grid grid-cols-2 gap-3">
              {industryFields.map((field) => (
                <Field
                  key={field.key}
                  label={field.label}
                  name={`custom_${field.key}`}
                  placeholder={field.placeholder}
                />
              ))}
            </div>
          </div>
        )}

        <button className="rounded-sm bg-brass px-4 py-2 font-display text-sm tracking-wide text-base">
          Create contact
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
  type = 'text',
}: {
  label: string;
  name: string;
  placeholder?: string;
  required?: boolean;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="font-mono text-[10px] uppercase tracking-wide2 text-muted">{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        className="mt-1 w-full rounded-sm border border-line bg-base px-3 py-2 text-sm"
      />
    </label>
  );
}
