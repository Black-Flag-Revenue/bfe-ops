import { db } from '@/lib/db';
import { assertSubAccountAccess } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function SuppressionPage({ params }: { params: { slug: string } }) {
  const subAccount = await db.subAccount.findUniqueOrThrow({ where: { slug: params.slug } });
  await assertSubAccountAccess(subAccount.id);

  const contacts = await db.contact.findMany({
    where: { subAccountId: subAccount.id, OR: [{ suppressed: true }, { unsubscribed: true }] },
    orderBy: { updatedAt: 'desc' },
  });

  async function unsuppress(formData: FormData) {
    'use server';
    await assertSubAccountAccess(subAccount.id);
    const contactId = formData.get('contactId') as string;
    await db.contact.update({
      where: { id: contactId },
      data: { suppressed: false, suppressionReason: null, unsubscribed: false },
    });
    redirect(`/accounts/${params.slug}/suppression`);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl tracking-wide">Suppression List — {subAccount.name}</h1>
        <p className="mt-1 text-sm text-muted">
          These contacts are automatically excluded from every future campaign. Only remove someone
          here if you're confident the bounce/complaint was a mistake - re-adding a genuinely bad
          address hurts your domain's reputation again.
        </p>
      </div>

      <div className="overflow-x-auto rounded-sm border border-line">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line bg-panel text-left font-mono text-[10px] uppercase tracking-wide2 text-muted">
              <th className="p-3">Name</th>
              <th className="p-3">Email</th>
              <th className="p-3">Reason</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {contacts.map((c) => (
              <tr key={c.id} className="border-b border-line last:border-0">
                <td className="p-3">{c.firstName} {c.lastName}</td>
                <td className="p-3 text-muted">{c.email}</td>
                <td className="p-3">
                  {c.suppressed ? (
                    <span className="font-mono text-[10px] uppercase tracking-wide2 text-flag">
                      {c.suppressionReason?.replace('_', ' ') || 'Suppressed'}
                    </span>
                  ) : (
                    <span className="font-mono text-[10px] uppercase tracking-wide2 text-muted">
                      Unsubscribed
                    </span>
                  )}
                </td>
                <td className="p-3">
                  <form action={unsuppress}>
                    <input type="hidden" name="contactId" value={c.id} />
                    <button className="font-mono text-[10px] uppercase tracking-wide2 text-brass hover:underline">
                      Remove from list
                    </button>
                  </form>
                </td>
              </tr>
            ))}
            {contacts.length === 0 && (
              <tr>
                <td colSpan={4} className="p-6 text-center text-sm text-muted">
                  Nothing suppressed - clean list.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
