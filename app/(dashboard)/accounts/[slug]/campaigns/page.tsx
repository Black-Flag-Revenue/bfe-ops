import { db } from '@/lib/db';
import { assertSubAccountAccess } from '@/lib/auth';
import { getDailyWarmupCap } from '@/lib/warmup';
import Link from 'next/link';

export default async function CampaignsPage({ params }: { params: { slug: string } }) {
  const subAccount = await db.subAccount.findUniqueOrThrow({ where: { slug: params.slug } });
  await assertSubAccountAccess(subAccount.id);

  const campaigns = await db.emailCampaign.findMany({
    where: { subAccountId: subAccount.id },
    orderBy: { createdAt: 'desc' },
  });

  const dailyCap = getDailyWarmupCap(subAccount.coldDomainVerifiedAt);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl tracking-wide">Campaigns — {subAccount.name}</h1>
          {dailyCap !== null && (
            <p className="mt-1 text-xs text-brass">
              Cold domain still warming up — capped at {dailyCap} emails/day right now
            </p>
          )}
        </div>
        <Link
          href={`/accounts/${params.slug}/campaigns/new`}
          className="rounded-sm bg-brass px-4 py-2 font-display text-sm tracking-wide text-base"
        >
          New Campaign
        </Link>
      </div>

      <div className="overflow-x-auto rounded-sm border border-line">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line bg-panel text-left font-mono text-[10px] uppercase tracking-wide2 text-muted">
              <th className="p-3">Name</th>
              <th className="p-3">Subject</th>
              <th className="p-3">Recipients</th>
              <th className="p-3">Sent</th>
              <th className="p-3">Failed</th>
              <th className="p-3">Status</th>
              <th className="p-3">Sent At</th>
            </tr>
          </thead>
          <tbody>
            {campaigns.map((c) => (
              <tr key={c.id} className="border-b border-line last:border-0">
                <td className="p-3">{c.name}</td>
                <td className="p-3 text-muted">{c.subject}</td>
                <td className="p-3">{c.recipientCount}</td>
                <td className="p-3 text-brass">{c.sentCount}</td>
                <td className="p-3 text-flag">{c.failedCount || '—'}</td>
                <td className="p-3">
                  <span className="rounded-full border border-line px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide2 text-muted">
                    {c.status}
                  </span>
                </td>
                <td className="p-3 text-muted font-mono text-xs">
                  {c.sentAt ? c.sentAt.toLocaleString() : '—'}
                </td>
              </tr>
            ))}
            {campaigns.length === 0 && (
              <tr>
                <td colSpan={7} className="p-6 text-center text-sm text-muted">
                  No campaigns sent yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
