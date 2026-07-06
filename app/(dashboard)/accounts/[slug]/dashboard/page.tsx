import { db } from '@/lib/db';
import { assertSubAccountAccess } from '@/lib/auth';

export default async function SubAccountDashboard({ params }: { params: { slug: string } }) {
  const subAccount = await db.subAccount.findUniqueOrThrow({ where: { slug: params.slug } });
  await assertSubAccountAccess(subAccount.id);

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [contactCount, openDeals, wonThisMonth, sitesLive, lastCampaign, recentMessages] = await Promise.all([
    db.contact.count({ where: { subAccountId: subAccount.id } }),
    db.deal.findMany({
      where: { subAccountId: subAccount.id, stage: { name: { notIn: ['Won', 'Lost'] } } },
      select: { value: true },
    }),
    db.deal.findMany({
      where: { subAccountId: subAccount.id, stage: { name: 'Won' }, updatedAt: { gte: thirtyDaysAgo } },
      select: { value: true },
    }),
    db.site.count({ where: { subAccountId: subAccount.id, status: 'PUBLISHED' } }),
    db.emailCampaign.findFirst({
      where: { subAccountId: subAccount.id, status: 'SENT' },
      orderBy: { sentAt: 'desc' },
    }),
    db.message.findMany({
      where: { direction: 'INBOUND', contact: { subAccountId: subAccount.id } },
      orderBy: { createdAt: 'desc' },
      take: 6,
      include: { contact: true },
    }),
  ]);

  const openDealsValue = openDeals.reduce((sum, d) => sum + Number(d.value || 0), 0);
  const wonThisMonthValue = wonThisMonth.reduce((sum, d) => sum + Number(d.value || 0), 0);

  return (
    <div className="space-y-8">
      <h1 className="font-display text-3xl tracking-wide">{subAccount.name} — Dashboard</h1>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        <Stat label="Contacts" value={contactCount.toLocaleString()} />
        <Stat label="Open Pipeline" value={`$${openDealsValue.toLocaleString()}`} />
        <Stat label="Won This Month" value={`$${wonThisMonthValue.toLocaleString()}`} sub={`${wonThisMonth.length} deals`} />
        <Stat label="Sites Live" value={sitesLive.toLocaleString()} />
      </div>

      {lastCampaign && (
        <div className="rounded-sm border border-line bg-panel p-5">
          <h2 className="font-mono text-[10px] uppercase tracking-wide2 text-muted">Last Campaign</h2>
          <div className="mt-2 flex items-center justify-between">
            <span className="font-display text-lg">{lastCampaign.name}</span>
            <span className="text-sm text-muted">
              {lastCampaign.sentCount} sent, {lastCampaign.failedCount} failed
            </span>
          </div>
        </div>
      )}

      <div className="rounded-sm border border-line bg-panel p-5">
        <h2 className="font-display text-lg tracking-wide">Recent Replies</h2>
        <div className="mt-3 divide-y divide-line">
          {recentMessages.map((m) => (
            <div key={m.id} className="flex items-center justify-between py-2 text-sm">
              <span>{m.contact.firstName} {m.contact.lastName}{m.subject ? ` — ${m.subject}` : ''}</span>
              <span className="font-mono text-[10px] text-muted">{m.createdAt.toLocaleDateString()}</span>
            </div>
          ))}
          {recentMessages.length === 0 && <p className="py-4 text-sm text-muted">No replies yet.</p>}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-sm border border-line bg-panel p-4">
      <div className="font-mono text-[10px] uppercase tracking-wide2 text-muted">{label}</div>
      <div className="mt-1 font-display text-2xl">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-muted">{sub}</div>}
    </div>
  );
}
