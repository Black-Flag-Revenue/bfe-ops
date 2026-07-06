import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect, notFound } from 'next/navigation';
import { headers } from 'next/headers';
import type { Metadata } from 'next';
import { db } from '@/lib/db';
import { isOpsHost } from '@/lib/opsHost';
import { resolvePublicSite } from '@/lib/publicSite';
import { PublicSiteTemplate } from '@/components/PublicSiteTemplate';

export async function generateMetadata(): Promise<Metadata> {
  const host = headers().get('host') || '';
  if (isOpsHost(host)) return { title: 'BFE Ops' };

  const resolved = await resolvePublicSite(host, []);
  if (!resolved) return {};

  const { subAccount, site } = resolved;
  const content = site.contentJson as { heroHeadline?: string };
  const title = site.seoTitle || `${subAccount.name}${subAccount.seoCity ? ` | ${subAccount.seoCity}` : ''}`;
  const description =
    site.seoDescription ||
    content.heroHeadline ||
    `${subAccount.name} - trusted local ${subAccount.industry || 'service'} provider${subAccount.seoCity ? ` in ${subAccount.seoCity}` : ''}.`;

  return {
    title,
    description,
    openGraph: { title, description, type: 'website' },
    twitter: { card: 'summary', title, description },
    alternates: subAccount.primaryDomain ? { canonical: `https://${subAccount.primaryDomain}` } : undefined,
  };
}

export default async function RootPage() {
  const host = headers().get('host') || '';

  if (!isOpsHost(host)) {
    const resolved = await resolvePublicSite(host, []);
    if (!resolved) notFound();
    return (
      <PublicSiteTemplate
        subAccount={resolved.subAccount}
        contentJson={resolved.site.contentJson as any}
        city={resolved.site.city}
        neighborhood={resolved.site.neighborhood}
        faqItems={resolved.site.faqItems as any}
      />
    );
  }

  const { userId: clerkId } = auth();
  if (!clerkId) redirect('/sign-in');

  let user = await db.user.findUnique({ where: { clerkId } });

  if (!user) {
    // First-time sign-in. If no Agency exists yet at all, this person becomes
    // its OWNER - this is meant to run exactly once, for you, on day one.
    const existingAgency = await db.agency.findFirst();
    const clerkUser = await currentUser();
    const email = clerkUser?.emailAddresses?.[0]?.emailAddress ?? '';

    // If they were invited with a name/photo already set, use that instead
    // of whatever Clerk has - lets you set these up before they even sign in.
    const matchingInvite =
      (await db.pendingAgencyInvite.findFirst({ where: { email } })) ||
      (await db.pendingSubAccountInvite.findFirst({ where: { email } }));

    const name = matchingInvite?.name || clerkUser?.fullName || email || 'Unnamed';
    const avatarUrl = matchingInvite?.avatarUrl || clerkUser?.imageUrl || null;

    user = await db.user.create({
      data: { clerkId, email, name, avatarUrl },
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
