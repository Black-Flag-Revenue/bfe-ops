import { db } from '@/lib/db';
import { getCurrentUserContext } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function TeamPage() {
  const ctx = await getCurrentUserContext();
  if (!ctx) redirect('/sign-in');
  if (!ctx.isAgencyLevel) redirect('/agency');

  const agencyId = ctx.user.agencyRoles[0].agencyId;

  const [agencyRoles, subAccountRoles, pendingAgency, pendingSubAccount, allSubAccounts] = await Promise.all([
    db.userAgencyRole.findMany({ where: { agencyId }, include: { user: true } }),
    db.userSubAccountRole.findMany({
      where: { subAccount: { agencyId } },
      include: { user: true, subAccount: true },
    }),
    db.pendingAgencyInvite.findMany({ where: { agencyId } }),
    db.pendingSubAccountInvite.findMany({ where: { subAccount: { agencyId } }, include: { subAccount: true } }),
    db.subAccount.findMany({ where: { agencyId }, orderBy: { name: 'asc' } }),
  ]);

  async function inviteTeamMember(formData: FormData) {
    'use server';
    const email = (formData.get('email') as string).toLowerCase().trim();
    const name = (formData.get('name') as string) || null;
    const avatarUrl = (formData.get('avatarUrl') as string) || null;
    const accessType = formData.get('accessType') as string;

    if (accessType === 'all') {
      await db.pendingAgencyInvite.upsert({
        where: { email_agencyId: { email, agencyId } },
        create: { email, name, avatarUrl, agencyId, role: 'ADMIN' },
        update: { name, avatarUrl },
      });
    } else {
      const subAccountIds = formData.getAll('subAccountIds') as string[];
      for (const subAccountId of subAccountIds) {
        await db.pendingSubAccountInvite.upsert({
          where: { email_subAccountId: { email, subAccountId } },
          create: { email, name, avatarUrl, subAccountId, role: 'MEMBER' },
          update: { name, avatarUrl },
        });
      }
    }

    redirect('/agency/team');
  }

  async function removeAgencyRole(formData: FormData) {
    'use server';
    const roleId = formData.get('roleId') as string;
    const role = await db.userAgencyRole.findUniqueOrThrow({ where: { id: roleId } });
    if (role.role === 'OWNER') throw new Error("Can't remove the agency owner");
    await db.userAgencyRole.delete({ where: { id: roleId } });
    redirect('/agency/team');
  }

  async function removeSubAccountRole(formData: FormData) {
    'use server';
    const roleId = formData.get('roleId') as string;
    await db.userSubAccountRole.delete({ where: { id: roleId } });
    redirect('/agency/team');
  }

  async function cancelPendingAgency(formData: FormData) {
    'use server';
    await db.pendingAgencyInvite.delete({ where: { id: formData.get('inviteId') as string } });
    redirect('/agency/team');
  }

  async function cancelPendingSubAccount(formData: FormData) {
    'use server';
    await db.pendingSubAccountInvite.delete({ where: { id: formData.get('inviteId') as string } });
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
            <span className="font-mono text-[10px] uppercase tracking-wide2 text-muted">Name</span>
            <input
              name="name"
              required
              placeholder="Brooke Anderson"
              className="mt-1 w-full rounded-sm border border-line bg-base px-3 py-2 text-sm"
            />
          </label>

          <label className="block">
            <span className="font-mono text-[10px] uppercase tracking-wide2 text-muted">
              Photo URL (optional)
            </span>
            <input
              name="avatarUrl"
              placeholder="https://..."
              className="mt-1 w-full rounded-sm border border-line bg-base px-3 py-2 text-sm"
            />
          </label>

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
        <h2 className="font-display text-lg tracking-wide">Current access</h2>
        <div className="mt-3 divide-y divide-line">
          {agencyRoles.map((role) => (
            <div key={role.id} className="flex items-center justify-between py-2">
              <MemberRow user={role.user} scope="All accounts" />
              {role.role !== 'OWNER' ? (
                <form action={removeAgencyRole}>
                  <input type="hidden" name="roleId" value={role.id} />
                  <button className="font-mono text-[10px] uppercase tracking-wide2 text-flag hover:underline">
                    Remove
                  </button>
                </form>
              ) : (
                <span className="font-mono text-[10px] uppercase tracking-wide2 text-brass">Owner</span>
              )}
            </div>
          ))}
          {subAccountRoles.map((role) => (
            <div key={role.id} className="flex items-center justify-between py-2">
              <MemberRow user={role.user} scope={role.subAccount.name} />
              <form action={removeSubAccountRole}>
                <input type="hidden" name="roleId" value={role.id} />
                <button className="font-mono text-[10px] uppercase tracking-wide2 text-flag hover:underline">
                  Remove
                </button>
              </form>
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
                <span className="flex items-center gap-2">
                  {inv.avatarUrl ? (
                    <img src={inv.avatarUrl} alt={inv.name || inv.email} className="h-6 w-6 rounded-full object-cover border border-line" />
                  ) : (
                    <span className="flex h-6 w-6 items-center justify-center rounded-full border border-line bg-base font-mono text-[10px] text-muted">
                      {(inv.name || inv.email).charAt(0)}
                    </span>
                  )}
                  {inv.name || inv.email}
                </span>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-[10px] uppercase tracking-wide2 text-muted">All accounts</span>
                  <form action={cancelPendingAgency}>
                    <input type="hidden" name="inviteId" value={inv.id} />
                    <button className="font-mono text-[10px] uppercase tracking-wide2 text-flag hover:underline">
                      Cancel
                    </button>
                  </form>
                </div>
              </div>
            ))}
            {pendingSubAccount.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between py-2 text-sm">
                <span className="flex items-center gap-2">
                  {inv.avatarUrl ? (
                    <img src={inv.avatarUrl} alt={inv.name || inv.email} className="h-6 w-6 rounded-full object-cover border border-line" />
                  ) : (
                    <span className="flex h-6 w-6 items-center justify-center rounded-full border border-line bg-base font-mono text-[10px] text-muted">
                      {(inv.name || inv.email).charAt(0)}
                    </span>
                  )}
                  {inv.name || inv.email}
                </span>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-[10px] uppercase tracking-wide2 text-muted">
                    {inv.subAccount.name}
                  </span>
                  <form action={cancelPendingSubAccount}>
                    <input type="hidden" name="inviteId" value={inv.id} />
                    <button className="font-mono text-[10px] uppercase tracking-wide2 text-flag hover:underline">
                      Cancel
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function MemberRow({ user, scope }: { user: { name: string; email: string; avatarUrl: string | null }; scope: string }) {
  return (
    <div className="flex items-center gap-3">
      {user.avatarUrl ? (
        <img src={user.avatarUrl} alt={user.name} className="h-8 w-8 rounded-full object-cover border border-line" />
      ) : (
        <div className="flex h-8 w-8 items-center justify-center rounded-full border border-line bg-base font-mono text-xs text-muted">
          {user.name.charAt(0)}
        </div>
      )}
      <div>
        <div className="text-sm">{user.name}</div>
        <div className="text-xs text-muted">{user.email} — {scope}</div>
      </div>
    </div>
  );
}
