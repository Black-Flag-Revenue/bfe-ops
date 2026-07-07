import { db } from '@/lib/db';
import { getCurrentUserContext } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Users, TrendingUp, Trophy, Globe, Send } from 'lucide-react';

export default async function AgencyWideDashboard() {
  const ctx = await getCurrentUserContext();
  if (!ctx) redirect('/sign-in');
  if (!ctx.isAgencyLevel) redirect('/agency');

  const agencyId = ctx.user.agencyRoles[0].agencyId;
  const subAccountIds = ctx.accessibleSubAccounts.map((a) => a.id);

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [
    totalContacts,
    openDeals,
    wonDealsThisMonth,
    sitesLive,
    campaignsThisMonth,
    recentNotes,
    recentMessages,
    recentDeals,
  ] = await Promise.all([
    db.contact.count({ where: { subAccountId: { in: subAccountIds } } }),
    db.deal.findMany({
      where: { subAccountId: { in: subAccountIds }, stage: { name: { notIn: ['Won', 'Lost'] } } },
      select: { value: true },
    }),
    db.deal.findMany({
      where: {
        subAccountId: { in: subAccountIds },
        stage: { name: 'Won' },
        updatedAt: { gte: thirtyDaysAgo },
      },
      select: { value: true },
    }),
    db.site.count({ where: { subAccountId: { in: subAccountIds }, status: 'PUBLISHED' } }),
    db.emailCampaign.findMany({
      where: { subAccountId: { in: subAccountIds }, sentAt: { gte: thirtyDaysAgo } },
      select: { sentCount: true },
    }),
    db.note.findMany({
      where: { contact: { subAccountId: { in: subAccountIds } } },
      orderBy: { createdAt: 'desc' },
      take: 8,
      include: { contact: { include: { subAccount: true } }, createdBy: true },
    }),
    db.message.findMany({
      where: { direction: 'OUTBOUND', contact: { subAccountId: { in: subAccountIds } } },
      orderBy: { createdAt: 'desc' },
      take: 8,
      include: { contact: { include: { subAccount: true } }, sentBy: true },
    }),
    db.deal.findMany({
      where: { subAccountId: { in: subAccountIds } },
      orderBy: { createdAt: 'desc' },
      take: 8,
      include: { contact: true, subAccount: true, stage: true },
    }),
  ]);

  const openDealsValue = openDeals.reduce((sum, d) => sum + Number(d.value || 0), 0);
  const wonThisMonthValue = wonDealsThisMonth.reduce((sum, d) => sum + Number(d.value || 0), 0);
  const emailsSentThisMonth = campaignsThisMonth.reduce((sum, c) => sum + c.sentCount, 0);

  const activityFeed = [
    ...recentNotes.map((n) => ({
      type: 'note' as const,
      at: n.createdAt,
      text: `${n.createdBy?.name || 'Someone'} added a note on ${n.contact.firstName} ${n.contact.lastName} (${n.contact.subAccount.name})`,
    })),
    ...recentMessages.map((m) => ({
      type: 'message' as const,
      at: m.createdAt,
      text: `${m.sentBy?.name || 'Someone'} emailed ${m.contact.firstName} ${m.contact.lastName} (${m.contact.subAccount.name})`,
    })),
    ...recentDeals.map((d) => ({
      type: 'deal' as const,
      at: d.createdAt,
      text: `New deal "${d.title}" for ${d.contact.firstName} ${d.contact.lastName} — ${d.stage.name} (${d.subAccount.name})`,
    })),
  ]
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .slice(0, 12);

  return (
    <div className="space-y-8">
      <h1 className="font-display text-3xl tracking-wide">Black Flag Edge — Company Dashboard</h1>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <Stat icon={Users} label="Total Contacts" value={totalContacts.toLocaleString()} />
        <Stat icon={TrendingUp} label="Open Pipeline Value" value={`$${openDealsValue.toLocaleString()}`} />
        <Stat icon={Trophy} label="Won This Month" value={`$${wonThisMonthValue.toLocaleString()}`} sub={`${wonDealsThisMonth.length} deals`} />
        <Stat icon={Globe} label="Sites Live" value={sitesLive.toLocaleString()} />
        <Stat icon={Send} label="Emails Sent (30d)" value={emailsSentThisMonth.toLocaleString()} />
      </div>

      <div className="rounded-sm border border-line bg-panel p-5">
        <h2 className="font-display text-lg tracking-wide">Recent Activity</h2>
        <div className="mt-3 divide-y divide-line">
          {activityFeed.map((item, i) => (
            <div key={i} className="flex items-center justify-between py-2 text-sm">
              <span>{item.text}</span>
              <span className="font-mono text-[10px] text-muted whitespace-nowrap ml-4">
                {item.at.toLocaleDateString()}
              </span>
            </div>
          ))}
          {activityFeed.length === 0 && <p className="py-4 text-sm text-muted">No activity yet.</p>}
        </div>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value, sub }: { icon: any; label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-sm border border-line bg-panel p-4">
      <Icon size={16} strokeWidth={1.75} className="text-brass" />
      <div className="mt-2 font-mono text-[10px] uppercase tracking-wide2 text-muted">{label}</div>
      <div className="mt-1 font-serif text-2xl font-bold text-ink">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-muted">{sub}</div>}
    </div>
  );
}
