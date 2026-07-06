import { auth } from '@clerk/nextjs/server';
import { db } from './db';

/**
 * Resolves the logged-in user plus every SubAccount they can see.
 * Agency-level roles (OWNER/ADMIN) see ALL sub-accounts under the agency.
 * Sub-account-level roles only see the accounts they're explicitly assigned to.
 */
export async function getCurrentUserContext() {
  const { userId: clerkId } = auth();
  if (!clerkId) return null;

  const user = await db.user.findUnique({
    where: { clerkId },
    include: {
      agencyRoles: { include: { agency: true } },
      subAccountRoles: { include: { subAccount: true } },
    },
  });

  if (!user) return null;

  const isAgencyLevel = user.agencyRoles.length > 0;

  const accessibleSubAccounts = isAgencyLevel
    ? await db.subAccount.findMany({
        where: { agencyId: { in: user.agencyRoles.map((r) => r.agencyId) } },
        orderBy: { name: 'asc' },
      })
    : user.subAccountRoles.map((r) => r.subAccount);

  return {
    user,
    isAgencyLevel,
    accessibleSubAccounts,
  };
}

/**
 * Guard for any data-fetching function: throws if the current user
 * doesn't have access to the requested sub-account. Call this at the
 * top of every server action / API route that takes a subAccountId.
 */
export async function assertSubAccountAccess(subAccountId: string) {
  const ctx = await getCurrentUserContext();
  if (!ctx) throw new Error('Not authenticated');

  const hasAccess = ctx.accessibleSubAccounts.some((sa) => sa.id === subAccountId);
  if (!hasAccess) throw new Error('No access to this sub-account');

  return ctx;
}
