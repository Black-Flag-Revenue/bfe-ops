import { UserButton } from '@clerk/nextjs';
import Image from 'next/image';
import Link from 'next/link';
import { getCurrentUserContext } from '@/lib/auth';
import { db } from '@/lib/db';
import { AccountSwitcher } from '@/components/AccountSwitcher';
import { redirect } from 'next/navigation';
import { Bell, Users2, LayoutGrid } from 'lucide-react';

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
      <header className="flex flex-wrap items-center justify-between gap-y-3 border-b border-line bg-panel/60 px-4 py-3 backdrop-blur sm:px-6">
        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          <Link href="/agency" className="rounded-sm bg-ink px-3 py-1.5">
            <Image src="/logo.png" alt="Black Flag Edge" width={140} height={40} className="h-7 w-auto" priority />
          </Link>
          <div className="hidden h-6 w-px bg-line sm:block" />
          <AccountSwitcher
            current={current}
            accounts={ctx.accessibleSubAccounts}
            isAgencyLevel={ctx.isAgencyLevel}
          />
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/notifications"
            className="relative flex h-9 w-9 items-center justify-center rounded-sm border border-line text-muted transition-colors hover:border-brass/50 hover:text-brass"
            title="Notifications"
          >
            <Bell size={16} strokeWidth={1.75} />
            {unreadCount > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-flag font-mono text-[9px] text-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Link>
          {ctx.isAgencyLevel && (
            <Link
              href="/agency/team"
              className="flex h-9 items-center gap-1.5 rounded-sm border border-line px-3 font-mono text-xs uppercase tracking-wide2 text-muted transition-colors hover:border-brass/50 hover:text-brass"
            >
              <Users2 size={14} strokeWidth={1.75} />
              <span className="hidden sm:inline">Team</span>
            </Link>
          )}
          {ctx.isAgencyLevel && (
            <Link
              href="/agency"
              className="flex h-9 items-center gap-1.5 rounded-sm border border-line px-3 font-mono text-xs uppercase tracking-wide2 text-muted transition-colors hover:border-brass/50 hover:text-brass"
            >
              <LayoutGrid size={14} strokeWidth={1.75} />
              <span className="hidden sm:inline">Accounts</span>
            </Link>
          )}
          <UserButton afterSignOutUrl="/sign-in" />
        </div>
      </header>
      <main className="px-4 py-6 sm:px-6 sm:py-8">{children}</main>
    </div>
  );
}
