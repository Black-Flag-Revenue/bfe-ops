import { db } from '@/lib/db';
import { getCurrentUserContext } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function TeamPage() {
  const ctx = await getCurrentUserContext();
  if (!ctx) redirect('/sign-in');
  if (!ctx.isAgencyLevel) redirect('/agency'); // only agency-level users manage the team

  const agencyId = ctx.user.agencyRoles[0].agencyId;

  const [teamMembers, pendingAgency, pendingSubAccount, allSubAccounts] = await Promise.all([
    db.user.findMany({
      where: {
        OR: [
          { agencyRoles: { some: { agencyId } } },
          { subAccountRoles: { some: { subAccount: { agencyId } } } },
        ],
      },
      include: { agencyRoles: true, subAccountRoles: { include: { subAccount: true } } },
    }),
    db.pendingAgencyInvite.findMany({ where: { agencyId } }),
    db.pendingSubAccountInvite.findMany({ where: { subAccount: { agencyId } }, include: { subAccount: true } }),
    db.subAccount.findMany({ where: { agencyId }, orderBy: { name: 'asc' } }),
  ]);

  async function inviteTeamMember(formData: FormData) {
    'use server';
    const email = (formData.get('email') as string).toLowerCase().trim();
    const accessType = formData.get('accessType') as string;

    if (accessType === 'all') {
      await db.pendingAgencyInvite.upsert({
        where: { email_agencyId: { email, agencyId } },
        create: { email, agencyId, role: 'ADMIN' },
        update: {},
      });
    } else {
      const subAccountIds = formData.getAll('subAccountIds') as string[];
      for (const subAccountId of subAccountIds) {
        await db.pendingSubAccountInvite.upsert({
          where: { email_subAccountId: { email, subAccountId } },
          create: { email, subAccountId, role: 'MEMBER' },
          update: {},
        });
      }
    }

    redirect('/agency/team');
  }

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="font-display text-3xl tracking-wide">Team</h1>
        <p className="mt-1 text-sm text-muted">
          Invited people show up here once they sign in with the email you invite - access is
          applied automatically the moment they sign up.
        </p>
      </div>

      <section className="rounded-sm border border-line bg-panel p-5">
        <h2 className="font-display text-lg tracking-wide">Invite someone</h2>
        <form action={inviteTeamMember} className="mt-4 space-y-4">
          <label className="block">
            <span className="font-mono text-[10px] uppercase tracking-wide2 text-muted">Email</span>
            <input
              name="email"
              type="email"
              required
              placeholder="brooke@blackflagedge.com"
              className="mt-1 w-full rounded-sm border border-line bg-base px-3 py-2 text-sm"
            />
          </label>

          <div>
            <span className="font-mono text-[10px] uppercase tracking-wide2 text-muted">Access</span>
            <div className="mt-2 space-y-3">
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" name="accessType" value="all" defaultChecked />
                All accounts (agency-wide access)
              </label>
              <label className="flex items-start gap-2 text-sm">
                <input type="radio" name="accessType" value="specific" className="mt-1" />
                <span>
                  Specific accounts only
                  <span className="mt-2 grid grid-cols-2 gap-2">
                    {allSubAccounts.map((acct) => (
                      <label key={acct.id} className="flex items-center gap-2 text-xs text-muted">
                        <input type="checkbox" name="subAccountIds" value={acct.id} />
                        {acct.name}
                      </label>
                    ))}
                  </span>
                </span>
              </label>
            </div>
          </div>

          <button className="rounded-sm bg-brass px-4 py-2 font-display text-sm tracking-wide text-base">
            Send invite
          </button>
        </form>
      </section>

      <section className="rounded-sm border border-line bg-panel p-5">
        <h2 className="font-display text-lg tracking-wide">Current team</h2>
        <div className="mt-3 divide-y divide-line">
          {teamMembers.map((member) => (
            <div key={member.id} className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                {member.avatarUrl ? (
                  <img
                    src={member.avatarUrl}
                    alt={member.name}
                    className="h-8 w-8 rounded-full object-cover border border-line"
                  />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full border border-line bg-base font-mono text-xs text-muted">
                    {member.name.charAt(0)}
                  </div>
                )}
                <div>
                  <div className="text-sm">{member.name}</div>
                  <div className="text-xs text-muted">{member.email}</div>
                </div>
              </div>
              <div className="text-right font-mono text-[10px] uppercase tracking-wide2 text-muted">
                {member.agencyRoles.length > 0
                  ? 'All accounts'
                  : member.subAccountRoles.map((r) => r.subAccount.name).join(', ')}
              </div>
            </div>
          ))}
        </div>
      </section>

      {(pendingAgency.length > 0 || pendingSubAccount.length > 0) && (
        <section className="rounded-sm border border-line bg-panel p-5">
          <h2 className="font-display text-lg tracking-wide">Pending invites</h2>
          <p className="text-xs text-muted mt-1">Not signed up yet - access applies the moment they do.</p>
          <div className="mt-3 divide-y divide-line">
            {pendingAgency.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between py-2 text-sm">
                <span>{inv.email}</span>
                <span className="font-mono text-[10px] uppercase tracking-wide2 text-muted">All accounts</span>
              </div>
            ))}
            {pendingSubAccount.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between py-2 text-sm">
                <span>{inv.email}</span>
                <span className="font-mono text-[10px] uppercase tracking-wide2 text-muted">
                  {inv.subAccount.name}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
