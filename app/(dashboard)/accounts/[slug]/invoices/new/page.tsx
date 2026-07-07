import { db } from '@/lib/db';
import { assertSubAccountAccess } from '@/lib/auth';
import { parseLineItems, parseLinkItems, groupTotal } from '@/lib/invoiceParsing';
import { InvoiceContentAssist } from '@/components/InvoiceContentAssist';
import { redirect } from 'next/navigation';

export default async function NewInvoicePage({ params }: { params: { slug: string } }) {
  const subAccount = await db.subAccount.findUniqueOrThrow({ where: { slug: params.slug } });
  await assertSubAccountAccess(subAccount.id);

  const contacts = await db.contact.findMany({
    where: { subAccountId: subAccount.id },
    orderBy: { firstName: 'asc' },
    take: 500,
  });

  async function createInvoice(formData: FormData) {
    'use server';
    await assertSubAccountAccess(subAccount.id);

    const type = formData.get('type') as 'ESTIMATE' | 'INVOICE';
    const contactId = (formData.get('contactId') as string) || null;
    const number = (formData.get('number') as string) || `${type === 'ESTIMATE' ? 'EST' : 'INV'}-${Date.now().toString().slice(-6)}`;

    const lineItems = parseLineItems(formData.get('lineItems') as string);
    const links = parseLinkItems((formData.get('links') as string) || '');
    const videos = parseLinkItems((formData.get('videos') as string) || '');
    const introText = (formData.get('introText') as string) || null;
    const termsText = (formData.get('termsText') as string) || null;

    const subtotal = groupTotal(lineItems);
    const taxRate = parseFloat((formData.get('taxRate') as string) || '0') / 100;
    const tax = subtotal * taxRate;

    const invoice = await db.invoice.create({
      data: {
        subAccountId: subAccount.id,
        contactId,
        number,
        type,
        status: 'DRAFT',
        lineItems,
        links: links.length > 0 ? links : undefined,
        videos: videos.length > 0 ? videos : undefined,
        introText,
        termsText,
        subtotal,
        tax,
        total: subtotal + tax,
      },
    });

    redirect(`/accounts/${params.slug}/invoices/${invoice.id}`);
  }

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="font-serif text-3xl font-semibold tracking-tight">New Estimate / Invoice</h1>

      <form action={createInvoice} className="space-y-5 rounded-sm border border-line bg-panel p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="block">
            <span className="font-mono text-[10px] uppercase tracking-wide2 text-muted">Type</span>
            <select name="type" className="mt-1 w-full rounded-sm border border-line bg-base px-3 py-2 text-sm">
              <option value="ESTIMATE">Estimate</option>
              <option value="INVOICE">Invoice</option>
            </select>
          </label>
          <label className="block">
            <span className="font-mono text-[10px] uppercase tracking-wide2 text-muted">Number (optional, auto-generated)</span>
            <input name="number" className="mt-1 w-full rounded-sm border border-line bg-base px-3 py-2 text-sm" />
          </label>
        </div>

        <label className="block">
          <span className="font-mono text-[10px] uppercase tracking-wide2 text-muted">Contact</span>
          <select name="contactId" className="mt-1 w-full rounded-sm border border-line bg-base px-3 py-2 text-sm">
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
            Line items - one per line: Description | Qty | Unit Price | Option Group (optional)
          </span>
          <p className="mt-1 text-xs text-muted">
            Leave the group blank for a single flat estimate, or use "Good", "Better", "Best" (or
            your own names) to build selectable tiers the customer picks between.
          </p>
          <textarea
            name="lineItems"
            required
            rows={6}
            placeholder={
              'Asphalt shingle replacement | 1 | 8500 | Good\nRidge vent upgrade | 1 | 650 | Good\nArchitectural shingle replacement | 1 | 11200 | Better\nFull tear-off + architectural shingle + 10yr labor warranty | 1 | 14500 | Best'
            }
            className="mt-1 w-full rounded-sm border border-line bg-base px-3 py-2 text-sm font-mono"
          />
        </label>

        <label className="block">
          <span className="font-mono text-[10px] uppercase tracking-wide2 text-muted">Tax rate % (optional)</span>
          <input name="taxRate" type="number" step="0.01" placeholder="8.25" className="mt-1 w-32 rounded-sm border border-line bg-base px-3 py-2 text-sm" />
        </label>

        <InvoiceContentAssist subAccountId={subAccount.id} />

        <label className="block">
          <span className="font-mono text-[10px] uppercase tracking-wide2 text-muted">
            Authorization terms (optional) - shown above the signature field, has a sensible default if left blank
          </span>
          <textarea
            name="termsText"
            rows={3}
            placeholder="By typing your name and clicking Approve, you authorize..."
            className="mt-1 w-full rounded-sm border border-line bg-base px-3 py-2 text-sm"
          />
        </label>

        <button className="rounded-sm bg-brass px-4 py-2 font-display text-sm tracking-wide text-base">
          Create
        </button>
      </form>
    </div>
  );
}
