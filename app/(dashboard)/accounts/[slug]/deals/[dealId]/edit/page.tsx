import { db } from '@/lib/db';
import { assertSubAccountAccess } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function EditDealPage({
  params,
}: {
  params: { slug: string; dealId: string };
}) {
  const subAccount = await db.subAccount.findUniqueOrThrow({ where: { slug: params.slug } });
  await assertSubAccountAccess(subAccount.id);

  const deal = await db.deal.findUniqueOrThrow({
    where: { id: params.dealId },
    include: { contact: true },
  });

  async function saveDeal(formData: FormData) {
    'use server';
    await assertSubAccountAccess(subAccount.id);
    const title = formData.get('title') as string;
    const valueRaw = formData.get('value') as string;
    await db.deal.update({
      where: { id: deal.id },
      data: { title, value: valueRaw ? parseFloat(valueRaw) : null },
    });
    redirect(`/accounts/${params.slug}/contacts/${deal.contactId}`);
  }

  async function deleteDeal() {
    'use server';
    await assertSubAccountAccess(subAccount.id);
    const contactId = deal.contactId;
    await db.deal.delete({ where: { id: deal.id } });
    redirect(`/accounts/${params.slug}/contacts/${contactId}`);
  }

  return (
    <div className="max-w-md space-y-6">
      <h1 className="font-display text-3xl tracking-wide">Edit Deal</h1>
      <p className="text-sm text-muted">
        For {deal.contact.firstName} {deal.contact.lastName}
      </p>

      <form action={saveDeal} className="space-y-4 rounded-sm border border-line bg-panel p-5">
        <label className="block">
          <span className="font-mono text-[10px] uppercase tracking-wide2 text-muted">Title</span>
          <input
            name="title"
            defaultValue={deal.title}
            required
            className="mt-1 w-full rounded-sm border border-line bg-base px-3 py-2 text-sm"
          />
        </label>
        <label className="block">
          <span className="font-mono text-[10px] uppercase tracking-wide2 text-muted">Value</span>
          <input
            name="value"
            type="number"
            step="0.01"
            defaultValue={deal.value?.toString() || ''}
            className="mt-1 w-full rounded-sm border border-line bg-base px-3 py-2 text-sm"
          />
        </label>
        <button className="rounded-sm bg-brass px-4 py-2 font-display text-sm tracking-wide text-base">
          Save
        </button>
      </form>

      <form action={deleteDeal}>
        <button className="rounded-sm border border-flag px-4 py-2 font-mono text-xs uppercase tracking-wide2 text-flag hover:bg-flag/10">
          Delete Deal
        </button>
      </form>
    </div>
  );
}
