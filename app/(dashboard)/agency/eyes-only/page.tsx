import { db } from '@/lib/db';
import { getCurrentUserContext } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function EyesOnlyDashboard() {
  const ctx = await getCurrentUserContext();
  if (!ctx) redirect('/sign-in');

  const isOwner = ctx.user.agencyRoles.some((r) => r.role === 'OWNER');
  if (!isOwner) redirect('/agency'); // ADMIN-level agency users do NOT get this - OWNER only, on purpose

  const agencyId = ctx.user.agencyRoles[0].agencyId;
  const subAccountIds = ctx.accessibleSubAccounts.map((a) => a.id);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const teamMembers = await db.user.findMany({
    where: {
      OR: [
        { agencyRoles: { some: { agencyId } } },
        { subAccountRoles: { some: { subAccount: { agencyId } } } },
      ],
    },
  });

  const employeeStats = await Promise.all(
    teamMembers.map(async (member) => {
      const [contactsCreated, notesAdded, messagesSent, dealsOwned, dealsWon] = await Promise.all([
        db.contact.count({
          where: { createdById: member.id, subAccountId: { in: subAccountIds }, createdAt: { gte: thirtyDaysAgo } },
        }),
        db.note.count({
          where: { createdById: member.id, contact: { subAccountId: { in: subAccountIds } }, createdAt: { gte: thirtyDaysAgo } },
        }),
        db.message.count({
          where: { sentById: member.id, direction: 'OUTBOUND', createdAt: { gte: thirtyDaysAgo } },
        }),
        db.deal.count({ where: { ownerId: member.id, subAccountId: { in: subAccountIds } } }),
        db.deal.count({
          where: { ownerId: member.id, subAccountId: { in: subAccountIds }, stage: { name: 'Won' }, updatedAt: { gte: thirtyDaysAgo } },
        }),
      ]);
      return { member, contactsCreated, notesAdded, messagesSent, dealsOwned, dealsWon };
    })
  );

  // Sort by total activity, most active first
  employeeStats.sort(
    (a, b) =>
      b.contactsCreated + b.notesAdded + b.messagesSent + b.dealsWon -
      (a.contactsCreated + a.notesAdded + a.messagesSent + a.dealsWon)
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl tracking-wide">Eyes Only</h1>
        <p className="mt-1 text-sm text-muted">
          Visible to you alone - not shown to other agency-level admins. Last 30 days.
        </p>
      </div>

      <div className="overflow-x-auto rounded-sm border border-line">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line bg-panel text-left font-mono text-[10px] uppercase tracking-wide2 text-muted">
              <th className="p-3">Employee</th>
              <th className="p-3">Contacts Added</th>
              <th className="p-3">Notes</th>
              <th className="p-3">Emails Sent</th>
              <th className="p-3">Deals Owned</th>
              <th className="p-3">Deals Won</th>
            </tr>
          </thead>
          <tbody>
            {employeeStats.map(({ member, contactsCreated, notesAdded, messagesSent, dealsOwned, dealsWon }) => (
              <tr key={member.id} className="border-b border-line last:border-0">
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    {member.avatarUrl ? (
                      <img src={member.avatarUrl} alt={member.name} className="h-7 w-7 rounded-full object-cover border border-line" />
                    ) : (
                      <span className="flex h-7 w-7 items-center justify-center rounded-full border border-line bg-base font-mono text-xs text-muted">
                        {member.name.charAt(0)}
                      </span>
                    )}
                    {member.name}
                  </div>
                </td>
                <td className="p-3">{contactsCreated}</td>
                <td className="p-3">{notesAdded}</td>
                <td className="p-3">{messagesSent}</td>
                <td className="p-3">{dealsOwned}</td>
                <td className="p-3 text-brass">{dealsWon}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted">
        "Deals Owned" requires assigning an owner on each deal - not wired into the deal creation
        form yet, so this may read 0 until that's added.
      </p>
    </div>
  );
}
