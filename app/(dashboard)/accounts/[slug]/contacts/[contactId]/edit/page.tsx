import { db } from '@/lib/db';
import { assertSubAccountAccess } from '@/lib/auth';
import { getIndustryFields } from '@/lib/industryFields';
import { redirect } from 'next/navigation';

export default async function EditContactPage({
  params,
}: {
  params: { slug: string; contactId: string };
}) {
  const subAccount = await db.subAccount.findUniqueOrThrow({ where: { slug: params.slug } });
  await assertSubAccountAccess(subAccount.id);

  const contact = await db.contact.findUniqueOrThrow({ where: { id: params.contactId } });
  const industryFields = getIndustryFields(subAccount.industry);
  const customFields = (contact.customFields as Record<string, string>) || {};

  async function saveContact(formData: FormData) {
    'use server';
    await assertSubAccountAccess(subAccount.id);

    const newCustomFields: Record<string, string> = {};
    for (const field of industryFields) {
      const value = formData.get(`custom_${field.key}`) as string;
      if (value) newCustomFields[field.key] = value;
    }

    const tagsRaw = (formData.get('tags') as string) || '';
    const tags = tagsRaw.split(',').map((t) => t.trim()).filter(Boolean);

    // Owner is intentionally NOT editable here - it has its own claim/reassign
    // flow on the contact detail page, gated separately.
    await db.contact.update({
      where: { id: contact.id },
      data: {
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
        customFields: Object.keys(newCustomFields).length > 0 ? newCustomFields : undefined,
      },
    });

    redirect(`/accounts/${params.slug}/contacts/${contact.id}`);
  }

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="font-display text-3xl tracking-wide">Edit Contact</h1>

      <form action={saveContact} className="space-y-5 rounded-sm border border-line bg-panel p-5">
        <div className="grid grid-cols-2 gap-3">
          <Field label="First name" name="firstName" defaultValue={contact.firstName} required />
          <Field label="Last name" name="lastName" defaultValue={contact.lastName || ''} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Email" name="email" type="email" defaultValue={contact.email || ''} />
          <Field label="Phone" name="phone" defaultValue={contact.phone || ''} />
        </div>
        <Field label="Address" name="address" defaultValue={contact.address || ''} />
        <div className="grid grid-cols-3 gap-3">
          <Field label="City" name="city" defaultValue={contact.city || ''} />
          <Field label="State" name="state" defaultValue={contact.state || ''} />
          <Field label="Zip" name="zip" defaultValue={contact.zip || ''} />
        </div>
        <Field label="Source" name="source" defaultValue={contact.source || ''} />
        <Field label="Tags (comma-separated)" name="tags" defaultValue={contact.tags.join(', ')} />

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
                  defaultValue={customFields[field.key] || ''}
                />
              ))}
            </div>
          </div>
        )}

        <button className="rounded-sm bg-brass px-4 py-2 font-display text-sm tracking-wide text-base">
          Save changes
        </button>
      </form>
    </div>
  );
}

function Field({
  label,
  name,
  defaultValue,
  required,
  type = 'text',
}: {
  label: string;
  name: string;
  defaultValue?: string;
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
        defaultValue={defaultValue}
        className="mt-1 w-full rounded-sm border border-line bg-base px-3 py-2 text-sm"
      />
    </label>
  );
}
