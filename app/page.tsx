import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';

export default async function RootPage() {
  const { userId: clerkId } = auth();
  if (!clerkId) redirect('/sign-in');

  let user = await db.user.findUnique({ where: { clerkId } });

  if (!user) {
    // First-time sign-in. If no Agency exists yet at all, this person becomes
    // its OWNER - this is meant to run exactly once, for you, on day one.
    const existingAgency = await db.agency.findFirst();
    const clerkUser = await currentUser();
    const email = clerkUser?.emailAddresses?.[0]?.emailAddress ?? '';
    const name = clerkUser?.fullName || email || 'Unnamed';

    user = await db.user.create({
      data: { clerkId, email, name },
    });

    if (!existingAgency) {
      const agency = await db.agency.create({ data: { name: 'Black Flag Edge' } });
      await db.userAgencyRole.create({
        data: { userId: user.id, agencyId: agency.id, role: 'OWNER' },
      });
    } else {
      // Not the first user - check if they were invited by email and turn
      // those pending invites into real access.
      const pendingAgency = await db.pendingAgencyInvite.findMany({ where: { email } });
      for (const invite of pendingAgency) {
        await db.userAgencyRole.create({
          data: { userId: user.id, agencyId: invite.agencyId, role: invite.role },
        });
      }
      await db.pendingAgencyInvite.deleteMany({ where: { email } });

      const pendingSubAccounts = await db.pendingSubAccountInvite.findMany({ where: { email } });
      for (const invite of pendingSubAccounts) {
        await db.userSubAccountRole.create({
          data: { userId: user.id, subAccountId: invite.subAccountId, role: invite.role },
        });
      }
      await db.pendingSubAccountInvite.deleteMany({ where: { email } });
    }
  }

  redirect('/agency');
}
