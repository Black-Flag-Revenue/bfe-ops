import { UserButton } from '@clerk/nextjs';
import Image from 'next/image';
import Link from 'next/link';
import { getCurrentUserContext } from '@/lib/auth';
import { db } from '@/lib/db';
import { AccountSwitcher } from '@/components/AccountSwitcher';
import { redirect } from 'next/navigation';

export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params?: { slug?: string };
}) {
  const ctx = await getCurrentUserContext();
  if (!ctx) redirect('/sign-in');

  const unreadCount = await db.notification.count({ where: { userId: ctx.user.id, read: false } });

  const current = params?.slug
    ? ctx.accessibleSubAccounts.find((a) => a.slug === params.slug) || null
    : null;

  return (
    <div className="min-h-screen">
      <header className="flex flex-wrap items-center justify-between gap-y-2 border-b border-line bg-panel/60 px-4 py-3 backdrop-blur sm:px-6">
        <div className="flex items-center gap-4">
          <div className="rounded-sm bg-ink px-3 py-1.5">
            <Image src="/logo.png" alt="Black Flag Edge" width={140} height={40} className="h-7 w-auto" priority />
          </div>
          <div className="h-6 w-px bg-line" />
          <AccountSwitcher
            current={current}
            accounts={ctx.accessibleSubAccounts}
            isAgencyLevel={ctx.isAgencyLevel}
          />
        </div>
        <div className="flex items-center gap-4">
          <Link href="/notifications" className="relative font-mono text-xs uppercase tracking-wide2 text-muted hover:text-brass">
            🔔
            {unreadCount > 0 && (
              <span className="absolute -right-2 -top-2 flex h-4 w-4 items-center justify-center rounded-full bg-flag text-[9px] text-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Link>
          {ctx.isAgencyLevel && (
            <Link
              href="/agency/team"
              className="font-mono text-xs uppercase tracking-wide2 text-muted hover:text-brass"
            >
              Team
            </Link>
          )}
          <UserButton afterSignOutUrl="/sign-in" />
        </div>
      </header>
      <main className="px-6 py-8">{children}</main>
    </div>
  );
}
