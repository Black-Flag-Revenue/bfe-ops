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
    }
    // If an Agency already exists and this is a NEW sign-up (an employee),
    // they get no roles yet - you'd assign them to a specific sub-account
    // manually (a proper "invite employee" flow is Day 2 CRM work).
  }

  redirect('/agency');
}
