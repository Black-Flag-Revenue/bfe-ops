import { UserButton } from '@clerk/nextjs';
import Image from 'next/image';
import Link from 'next/link';
import { getCurrentUserContext } from '@/lib/auth';
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

  const current = params?.slug
    ? ctx.accessibleSubAccounts.find((a) => a.slug === params.slug) || null
    : null;

  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between border-b border-line bg-panel/60 px-6 py-3 backdrop-blur">
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
