import { db } from '@/lib/db';
import { assertSubAccountAccess } from '@/lib/auth';
import { redirect } from 'next/navigation';

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

  async function markSent() {
    'use server';
    await assertSubAccountAccess(subAccount.id);
    if (invoice.status === 'DRAFT') {
      await db.invoice.update({ where: { id: invoice.id }, data: { status: 'SENT' } });
    }
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

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="font-display text-3xl tracking-wide">{invoice.number}</h1>
        <p className="mt-1 text-sm text-muted">
          {invoice.contact ? `${invoice.contact.firstName} ${invoice.contact.lastName}` : 'No contact linked'}
        </p>
      </div>

      <div className="rounded-sm border border-line bg-panel p-5">
        <h2 className="font-mono text-[10px] uppercase tracking-wide2 text-muted">Customer link</h2>
        <div className="mt-2 flex items-center gap-2">
          <input readOnly value={publicUrl} className="flex-1 rounded-sm border border-line bg-base px-3 py-2 font-mono text-xs" />
          <a
            href={`/api/invoices/${invoice.id}/pdf`}
            className="shrink-0 rounded-sm border border-line px-3 py-2 font-mono text-[10px] uppercase tracking-wide2 hover:border-brass/60"
          >
            Download PDF
          </a>
        </div>
        {invoice.status === 'DRAFT' && (
          <form action={markSent} className="mt-2">
            <button className="rounded-sm bg-brass px-3 py-1.5 font-mono text-[10px] uppercase tracking-wide2 text-base">
              Mark as Sent
            </button>
          </form>
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
          Accepted {invoice.acceptedAt.toLocaleString()} — chose "{invoice.acceptedOptionGroup}"
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
