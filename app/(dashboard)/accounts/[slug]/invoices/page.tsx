import { db } from '@/lib/db';
import { assertSubAccountAccess } from '@/lib/auth';
import Link from 'next/link';

export default async function InvoicesPage({ params }: { params: { slug: string } }) {
  const subAccount = await db.subAccount.findUniqueOrThrow({ where: { slug: params.slug } });
  await assertSubAccountAccess(subAccount.id);

  const invoices = await db.invoice.findMany({
    where: { subAccountId: subAccount.id },
    orderBy: { createdAt: 'desc' },
    include: { contact: true },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl tracking-wide">Estimates & Invoices — {subAccount.name}</h1>
        <Link
          href={`/accounts/${params.slug}/invoices/new`}
          className="rounded-sm bg-brass px-4 py-2 font-display text-sm tracking-wide text-base"
        >
          New
        </Link>
      </div>

      <div className="overflow-x-auto rounded-sm border border-line">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line bg-panel text-left font-mono text-[10px] uppercase tracking-wide2 text-muted">
              <th className="p-3">Number</th>
              <th className="p-3">Contact</th>
              <th className="p-3">Total</th>
              <th className="p-3">Views</th>
              <th className="p-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv) => (
              <tr key={inv.id} className="border-b border-line last:border-0 hover:bg-panel/50">
                <td className="p-3">
                  <Link href={`/accounts/${params.slug}/invoices/${inv.id}`} className="hover:text-brass">
                    {inv.number}
                  </Link>
                  <div className="font-mono text-[10px] uppercase tracking-wide2 text-muted">{inv.type}</div>
                </td>
                <td className="p-3 text-muted">
                  {inv.contact ? `${inv.contact.firstName} ${inv.contact.lastName}` : '—'}
                </td>
                <td className="p-3">${inv.total.toString()}</td>
                <td className="p-3 text-muted">{inv.viewCount}</td>
                <td className="p-3">
                  <StatusBadge status={inv.status} />
                </td>
              </tr>
            ))}
            {invoices.length === 0 && (
              <tr>
                <td colSpan={5} className="p-6 text-center text-sm text-muted">
                  No estimates or invoices yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    DRAFT: 'text-muted border-line',
    SENT: 'text-brass border-brass',
    VIEWED: 'text-brass border-brass bg-brass/10',
    ACCEPTED: 'text-ink border-ink bg-ink/10',
    SCHEDULED: 'text-ink border-ink bg-ink/20',
    VOID: 'text-flag border-flag',
  };
  return (
    <span className={`rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide2 ${styles[status]}`}>
      {status}
    </span>
  );
}
