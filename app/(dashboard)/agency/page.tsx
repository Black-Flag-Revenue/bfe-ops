import { getCurrentUserContext } from '@/lib/auth';
import { db } from '@/lib/db';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard, Eye, ArrowRight, PlusCircle,
  Home, Wind, Car, Wrench, Droplets, Briefcase,
} from 'lucide-react';

const INDUSTRY_ICONS: Record<string, any> = {
  Roofing: Home,
  HVAC: Wind,
  Detailing: Car,
  Handyman: Wrench,
  'Exterior Cleaning': Droplets,
};

export default async function AgencyDashboard() {
  const ctx = await getCurrentUserContext();
  if (!ctx) redirect('/sign-in');

  async function createSubAccount(formData: FormData) {
    'use server';
    const name = formData.get('name') as string;
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    const agencyId = ctx!.user.agencyRoles[0]?.agencyId;
    if (!agencyId) throw new Error('No agency found for this user');

    await db.subAccount.create({ data: { agencyId, name, slug } });
    redirect('/agency');
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl tracking-wide">
            {ctx.isAgencyLevel ? 'Black Flag Edge' : 'Your Accounts'}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {ctx.accessibleSubAccounts.length} sub-account{ctx.accessibleSubAccounts.length === 1 ? '' : 's'}
          </p>
        </div>
        {ctx.isAgencyLevel && (
          <div className="flex gap-2">
            <Link
              href="/agency/dashboard"
              className="flex items-center gap-1.5 rounded-sm border border-line bg-panel px-3 py-2 text-xs text-muted transition-colors hover:border-brass/50 hover:text-brass"
            >
              <LayoutDashboard size={14} strokeWidth={1.75} />
              Company Dashboard
            </Link>
            {ctx.user.agencyRoles.some((r) => r.role === 'OWNER') && (
              <Link
                href="/agency/eyes-only"
                className="flex items-center gap-1.5 rounded-sm border border-line bg-panel px-3 py-2 text-xs text-muted transition-colors hover:border-brass/50 hover:text-brass"
              >
                <Eye size={14} strokeWidth={1.75} />
                Eyes Only
              </Link>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {ctx.accessibleSubAccounts.map((acct) => {
          const Icon = (acct.industry && INDUSTRY_ICONS[acct.industry]) || Briefcase;
          return (
            <Link
              key={acct.id}
              href={`/accounts/${acct.slug}`}
              className="group flex items-start gap-3 rounded-sm border border-line bg-panel p-4 transition-all hover:border-brass/50 hover:bg-panel/80"
            >
              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-sm border border-line text-base"
                style={{ backgroundColor: acct.brandColor ? `${acct.brandColor}20` : undefined, color: acct.brandColor || undefined }}
              >
                <Icon size={20} strokeWidth={1.75} className={!acct.brandColor ? 'text-muted' : ''} />
              </div>
              <div className="flex-1">
                <div className="font-display text-lg leading-tight">{acct.name}</div>
                {acct.industry && (
                  <div className="mt-0.5 font-mono text-[10px] uppercase tracking-wide2 text-muted">
                    {acct.industry}
                  </div>
                )}
              </div>
              <ArrowRight size={16} className="mt-2 shrink-0 text-muted opacity-0 transition-opacity group-hover:opacity-100" />
            </Link>
          );
        })}
      </div>

      {ctx.isAgencyLevel && (
        <div className="max-w-md rounded-sm border border-line bg-panel p-5">
          <h2 className="flex items-center gap-2 font-display text-lg tracking-wide">
            <PlusCircle size={18} strokeWidth={1.75} className="text-brass" />
            Add a sub-account
          </h2>
          <form action={createSubAccount} className="mt-3 flex gap-2">
            <input
              name="name"
              required
              placeholder="Scottish Tom Heating & Air"
              className="flex-1 rounded-sm border border-line bg-base px-3 py-2 text-sm"
            />
            <button className="rounded-sm bg-brass px-4 py-2 font-display text-sm tracking-wide text-base">
              Create
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
