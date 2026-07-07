import { db } from '@/lib/db';
import { assertSubAccountAccess } from '@/lib/auth';
import { sendInvoiceLink } from '@/lib/resend';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function InvoiceDetailPage({
  params,
}: {
  params: { slug: string; invoiceId: string };
}) {
  const subAccount = await db.subAccount.findUniqueOrThrow({ where: { slug: params.slug } });
  await assertSubAccountAccess(subAccount.id);

  const invoice = await db.invoice.findUniqueOrThrow({
    where: { id: params.invoiceId },
    include: { contact: true },
  });

  const publicUrl = `${process.env.NEXT_PUBLIC_APP_URL}/estimate/${invoice.publicToken}`;
  const isLocked = invoice.status === 'ACCEPTED' || invoice.status === 'SCHEDULED';

  async function sendToCustomer() {
    'use server';
    const userCtx = await assertSubAccountAccess(subAccount.id);
    await sendInvoiceLink(invoice.id, userCtx.user.id);
    redirect(`/accounts/${params.slug}/invoices/${invoice.id}`);
  }

  async function saveSchedule(formData: FormData) {
    'use server';
    await assertSubAccountAccess(subAccount.id);
    const scheduledDate = formData.get('scheduledDate') as string;
    await db.invoice.update({
      where: { id: invoice.id },
      data: { scheduledDate: scheduledDate ? new Date(scheduledDate) : null, status: 'SCHEDULED' },
    });
    redirect(`/accounts/${params.slug}/invoices/${invoice.id}`);
  }

  async function reopenEstimate() {
    'use server';
    await assertSubAccountAccess(subAccount.id);
    await db.invoice.update({
      where: { id: invoice.id },
      data: { acceptedAt: null, acceptedOptionGroup: null, status: 'VIEWED', scheduledDate: null },
    });
    redirect(`/accounts/${params.slug}/invoices/${invoice.id}`);
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-3xl tracking-wide">{invoice.number}</h1>
          <p className="mt-1 text-sm text-muted">
            {invoice.contact ? `${invoice.contact.firstName} ${invoice.contact.lastName}` : 'No contact linked'}
          </p>
        </div>
        {!isLocked && (
          <Link
            href={`/accounts/${params.slug}/invoices/${invoice.id}/edit`}
            className="rounded-sm border border-line px-3 py-1.5 font-mono text-[10px] uppercase tracking-wide2 hover:border-brass/60"
          >
            Edit
          </Link>
        )}
      </div>

      <div className="rounded-sm border border-line bg-panel p-5">
        <h2 className="font-mono text-[10px] uppercase tracking-wide2 text-muted">Customer link</h2>
        <div className="mt-2 flex items-center gap-2">
          <input readOnly value={publicUrl} className="flex-1 rounded-sm border border-line bg-base px-3 py-2 font-mono text-xs" />
          <a
            href={`/api/invoices/${invoice.id}/pdf`}
            className="shrink-0 rounded-sm border border-line px-3 py-2 font-mono text-[10px] uppercase tracking-wide2 hover:border-brass/60"
          >
            Download PDF Summary
          </a>
        </div>
        <p className="mt-2 text-xs text-muted">
          The link is what the customer sees and interacts with. The PDF is for you - download it
          after they accept and email it to the contractor so they know exactly what was approved.
        </p>
        {invoice.contact?.email ? (
          <form action={sendToCustomer} className="mt-2">
            <button className="rounded-sm bg-brass px-3 py-1.5 font-mono text-[10px] uppercase tracking-wide2 text-base">
              Email This to {invoice.contact.firstName}
            </button>
          </form>
        ) : (
          <p className="mt-2 text-xs text-flag">
            No contact email on file - link a contact with an email, or copy the URL above and send it yourself.
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Status" value={invoice.status} />
        <Stat label="Views" value={invoice.viewCount.toString()} />
        <Stat label="Total" value={`$${invoice.total.toString()}`} />
        <Stat label="Accepted Option" value={invoice.acceptedOptionGroup || '—'} />
      </div>

      {invoice.acceptedAt && (
        <div className="rounded-sm border border-brass/40 bg-brass/5 p-4 text-sm text-brass">
          <div>
            Accepted {invoice.acceptedAt.toLocaleString()} — chose "{invoice.acceptedOptionGroup}"
            {invoice.acceptedByName && ` — authorized by ${invoice.acceptedByName}`}
          </div>
          <form action={reopenEstimate} className="mt-2">
            <button className="rounded-sm border border-brass px-3 py-1 font-mono text-[10px] uppercase tracking-wide2 hover:bg-brass/10">
              Reopen for Revision
            </button>
          </form>
          <p className="mt-1 text-xs text-muted">
            Customer's link goes back to letting them pick again - use this if they change their mind.
          </p>
        </div>
      )}

      <div className="rounded-sm border border-line bg-panel p-5">
        <h2 className="font-mono text-[10px] uppercase tracking-wide2 text-muted">Schedule with contractor</h2>
        <form action={saveSchedule} className="mt-3 flex gap-2">
          <input
            type="datetime-local"
            name="scheduledDate"
            defaultValue={invoice.scheduledDate?.toISOString().slice(0, 16)}
            className="rounded-sm border border-line bg-base px-3 py-2 text-sm"
          />
          <button className="rounded-sm border border-line px-4 py-2 text-sm hover:border-brass/60">
            Save
          </button>
        </form>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-sm border border-line bg-panel p-4">
      <div className="font-mono text-[10px] uppercase tracking-wide2 text-muted">{label}</div>
      <div className="mt-1 font-display text-lg">{value}</div>
    </div>
  );
}
