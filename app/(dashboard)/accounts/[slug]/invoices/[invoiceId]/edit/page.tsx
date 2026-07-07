import { db } from '@/lib/db';
import { assertSubAccountAccess } from '@/lib/auth';
import { parseLineItems, parseLinkItems, serializeLineItems, serializeLinkItems, groupTotal, LineItem, LinkItem } from '@/lib/invoiceParsing';
import { redirect } from 'next/navigation';

export default async function EditInvoicePage({
  params,
}: {
  params: { slug: string; invoiceId: string };
}) {
  const subAccount = await db.subAccount.findUniqueOrThrow({ where: { slug: params.slug } });
  await assertSubAccountAccess(subAccount.id);

  const invoice = await db.invoice.findUniqueOrThrow({ where: { id: params.invoiceId } });

  if (invoice.status === 'ACCEPTED' || invoice.status === 'SCHEDULED') {
    redirect(`/accounts/${params.slug}/invoices/${invoice.id}`);
  }

  const contacts = await db.contact.findMany({
    where: { subAccountId: subAccount.id },
    orderBy: { firstName: 'asc' },
    take: 500,
  });

  const lineItems = invoice.lineItems as unknown as LineItem[];
  const links = (invoice.links as unknown as LinkItem[]) || [];
  const videos = (invoice.videos as unknown as LinkItem[]) || [];
  const taxRate = Number(invoice.subtotal) > 0 ? (Number(invoice.tax) / Number(invoice.subtotal)) * 100 : 0;

  async function saveInvoice(formData: FormData) {
    'use server';
    await assertSubAccountAccess(subAccount.id);

    const newLineItems = parseLineItems(formData.get('lineItems') as string);
    const newLinks = parseLinkItems((formData.get('links') as string) || '');
    const newVideos = parseLinkItems((formData.get('videos') as string) || '');
    const contactId = (formData.get('contactId') as string) || null;
    const subtotal = groupTotal(newLineItems);
    const newTaxRate = parseFloat((formData.get('taxRate') as string) || '0') / 100;
    const tax = subtotal * newTaxRate;

    await db.invoice.update({
      where: { id: invoice.id },
      data: {
        contactId,
        lineItems: newLineItems,
        links: newLinks.length > 0 ? newLinks : undefined,
        videos: newVideos.length > 0 ? newVideos : undefined,
        subtotal,
        tax,
        total: subtotal + tax,
      },
    });

    redirect(`/accounts/${params.slug}/invoices/${invoice.id}`);
  }

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="font-display text-3xl tracking-wide">Edit {invoice.number}</h1>

      <form action={saveInvoice} className="space-y-5 rounded-sm border border-line bg-panel p-5">
        <label className="block">
          <span className="font-mono text-[10px] uppercase tracking-wide2 text-muted">Contact</span>
          <select
            name="contactId"
            defaultValue={invoice.contactId || ''}
            className="mt-1 w-full rounded-sm border border-line bg-base px-3 py-2 text-sm"
          >
            <option value="">No contact linked</option>
            {contacts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.firstName} {c.lastName} {c.email ? `(${c.email})` : ''}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="font-mono text-[10px] uppercase tracking-wide2 text-muted">
            Line items - Description | Qty | Unit Price | Option Group
          </span>
          <textarea
            name="lineItems"
            required
            rows={6}
            defaultValue={serializeLineItems(lineItems)}
            className="mt-1 w-full rounded-sm border border-line bg-base px-3 py-2 text-sm font-mono"
          />
        </label>

        <label className="block">
          <span className="font-mono text-[10px] uppercase tracking-wide2 text-muted">Tax rate %</span>
          <input
            name="taxRate"
            type="number"
            step="0.01"
            defaultValue={taxRate.toFixed(2)}
            className="mt-1 w-32 rounded-sm border border-line bg-base px-3 py-2 text-sm"
          />
        </label>

        <label className="block">
          <span className="font-mono text-[10px] uppercase tracking-wide2 text-muted">
            Supporting links - Label | URL
          </span>
          <textarea
            name="links"
            rows={3}
            defaultValue={serializeLinkItems(links)}
            className="mt-1 w-full rounded-sm border border-line bg-base px-3 py-2 text-sm font-mono"
          />
        </label>

        <label className="block">
          <span className="font-mono text-[10px] uppercase tracking-wide2 text-muted">
            Videos - Label | URL
          </span>
          <textarea
            name="videos"
            rows={3}
            defaultValue={serializeLinkItems(videos)}
            className="mt-1 w-full rounded-sm border border-line bg-base px-3 py-2 text-sm font-mono"
          />
        </label>

        <button className="rounded-sm bg-brass px-4 py-2 font-display text-sm tracking-wide text-base">
          Save changes
        </button>
      </form>
    </div>
  );
}
