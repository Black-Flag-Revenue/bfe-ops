import { getCurrentUserContext } from '@/lib/auth';
import { db } from '@/lib/db';
import { redirect } from 'next/navigation';
import Link from 'next/link';

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
      <div>
        <h1 className="font-display text-3xl tracking-wide">
          {ctx.isAgencyLevel ? 'Black Flag Edge — All Accounts' : 'Your Accounts'}
        </h1>
        <p className="mt-1 text-sm text-muted">
          {ctx.accessibleSubAccounts.length} sub-account{ctx.accessibleSubAccounts.length === 1 ? '' : 's'}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {ctx.accessibleSubAccounts.map((acct) => (
          <Link
            key={acct.id}
            href={`/accounts/${acct.slug}`}
            className="rounded-sm border border-line bg-panel p-4 hover:border-brass/60 transition-colors"
          >
            <span
              className="mb-2 inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: acct.brandColor || '#4A4F4D' }}
            />
            <div className="font-display text-xl">{acct.name}</div>
            {acct.industry && (
              <div className="font-mono text-[10px] uppercase tracking-wide2 text-muted mt-1">
                {acct.industry}
              </div>
            )}
          </Link>
        ))}
      </div>

      {ctx.isAgencyLevel && (
        <div className="max-w-md rounded-sm border border-line bg-panel p-5">
          <h2 className="font-display text-lg tracking-wide">Add a sub-account</h2>
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
