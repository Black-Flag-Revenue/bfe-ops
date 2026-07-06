import { db } from '@/lib/db';
import { assertSubAccountAccess } from '@/lib/auth';
import { createSendingDomain, refreshDomainStatus } from '@/lib/resend';
import { revalidatePath } from 'next/cache';

export default async function EmailSettingsPage({ params }: { params: { slug: string } }) {
  const subAccount = await db.subAccount.findUniqueOrThrow({ where: { slug: params.slug } });
  await assertSubAccountAccess(subAccount.id);

  async function connectDomain(formData: FormData) {
    'use server';
    const domain = formData.get('domain') as string;
    await assertSubAccountAccess(subAccount.id);
    await createSendingDomain(subAccount.id, domain, 'transactional');
    revalidatePath(`/accounts/${params.slug}/settings/email`);
  }

  async function checkStatus() {
    'use server';
    await assertSubAccountAccess(subAccount.id);
    await refreshDomainStatus(subAccount.id, 'transactional');
    revalidatePath(`/accounts/${params.slug}/settings/email`);
  }

  async function connectColdDomain(formData: FormData) {
    'use server';
    const domain = formData.get('coldDomain') as string;
    await assertSubAccountAccess(subAccount.id);
    await createSendingDomain(subAccount.id, domain, 'cold');
    revalidatePath(`/accounts/${params.slug}/settings/email`);
  }

  async function checkColdStatus() {
    'use server';
    await assertSubAccountAccess(subAccount.id);
    await refreshDomainStatus(subAccount.id, 'cold');
    revalidatePath(`/accounts/${params.slug}/settings/email`);
  }

  async function saveBranding(formData: FormData) {
    'use server';
    await assertSubAccountAccess(subAccount.id);
    await db.subAccount.update({
      where: { id: subAccount.id },
      data: {
        fromName: formData.get('fromName') as string,
        fromEmail: formData.get('fromEmail') as string,
        replyToEmail: formData.get('replyToEmail') as string,
      },
    });
    revalidatePath(`/accounts/${params.slug}/settings/email`);
  }

  const records = (subAccount.dnsRecords as any[]) || [];
  const coldRecords = (subAccount.coldDnsRecords as any[]) || [];

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="font-display text-3xl tracking-wide">Email — {subAccount.name}</h1>
        <p className="mt-1 text-sm text-muted">
          Emails to customers will send from this domain. No inbox required — replies route to
          whatever address you set below.
        </p>
      </div>

      {/* Step 1: domain */}
      <section className="rounded-sm border border-line bg-panel p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg tracking-wide">Sending domain</h2>
          <StatusBadge status={subAccount.domainStatus} />
        </div>

        {!subAccount.sendingDomain ? (
          <form action={connectDomain} className="mt-4 flex gap-2">
            <input
              name="domain"
              placeholder="mg.mobilebuff.com"
              required
              className="flex-1 rounded-sm border border-line bg-base px-3 py-2 font-mono text-sm"
            />
            <button className="rounded-sm bg-brass px-4 py-2 font-display text-sm tracking-wide text-base">
              Connect
            </button>
          </form>
        ) : (
          <div className="mt-4 space-y-4">
            <div className="font-mono text-sm text-ink">{subAccount.sendingDomain}</div>

            {subAccount.domainStatus !== 'VERIFIED' && records.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm text-muted">
                  Add these records at your domain registrar, then check status:
                </p>
                <div className="overflow-x-auto rounded-sm border border-line">
                  <table className="w-full font-mono text-xs">
                    <thead>
                      <tr className="border-b border-line text-left text-muted">
                        <th className="p-2">Type</th>
                        <th className="p-2">Name</th>
                        <th className="p-2">Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {records.map((r, i) => (
                        <tr key={i} className="border-b border-line last:border-0">
                          <td className="p-2">{r.record}</td>
                          <td className="p-2">{r.name}</td>
                          <td className="p-2 break-all">{r.value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <form action={checkStatus}>
                  <button className="rounded-sm border border-brass px-4 py-2 font-display text-sm tracking-wide text-brass">
                    Check verification status
                  </button>
                </form>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Cold outreach domain - deliberately isolated from the transactional domain above */}
      <section className="rounded-sm border border-line bg-panel p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-lg tracking-wide">Cold outreach domain</h2>
            <p className="text-xs text-muted mt-0.5">
              Isolated on purpose — bounces/complaints here never touch your invoice or reply domain above.
            </p>
          </div>
          <StatusBadge status={subAccount.coldDomainStatus} />
        </div>

        {!subAccount.coldSendingDomain ? (
          <form action={connectColdDomain} className="mt-4 flex gap-2">
            <input
              name="coldDomain"
              placeholder="updates.mobilebuff.com"
              required
              className="flex-1 rounded-sm border border-line bg-base px-3 py-2 font-mono text-sm"
            />
            <button className="rounded-sm bg-brass px-4 py-2 font-display text-sm tracking-wide text-base">
              Connect
            </button>
          </form>
        ) : (
          <div className="mt-4 space-y-4">
            <div className="font-mono text-sm text-ink">{subAccount.coldSendingDomain}</div>

            {subAccount.coldDomainStatus !== 'VERIFIED' && coldRecords.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm text-muted">Add these records at your registrar, then check status:</p>
                <div className="overflow-x-auto rounded-sm border border-line">
                  <table className="w-full font-mono text-xs">
                    <thead>
                      <tr className="border-b border-line text-left text-muted">
                        <th className="p-2">Type</th>
                        <th className="p-2">Name</th>
                        <th className="p-2">Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {coldRecords.map((r, i) => (
                        <tr key={i} className="border-b border-line last:border-0">
                          <td className="p-2">{r.record}</td>
                          <td className="p-2">{r.name}</td>
                          <td className="p-2 break-all">{r.value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <form action={checkColdStatus}>
                  <button className="rounded-sm border border-brass px-4 py-2 font-display text-sm tracking-wide text-brass">
                    Check verification status
                  </button>
                </form>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Step 2: branding - only useful once domain is verified */}
      <section className="rounded-sm border border-line bg-panel p-5">
        <h2 className="font-display text-lg tracking-wide">From / reply-to</h2>
        <form action={saveBranding} className="mt-4 space-y-3">
          <Field label="From name" name="fromName" defaultValue={subAccount.fromName || subAccount.name} />
          <Field
            label="From address"
            name="fromEmail"
            placeholder={`hello@${subAccount.sendingDomain || 'yourdomain.com'}`}
            defaultValue={subAccount.fromEmail || ''}
          />
          <Field
            label="Reply-to address"
            name="replyToEmail"
            placeholder="quotes@mobilebuff.com"
            defaultValue={subAccount.replyToEmail || ''}
          />
          <button className="rounded-sm bg-brass px-4 py-2 font-display text-sm tracking-wide text-base">
            Save
          </button>
        </form>
      </section>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    NOT_CONFIGURED: 'text-muted border-line',
    PENDING: 'text-brass border-brass',
    VERIFIED: 'text-ink border-ink bg-ink/10',
    FAILED: 'text-flag border-flag',
  };
  return (
    <span className={`rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide2 ${styles[status]}`}>
      {status.replace('_', ' ')}
    </span>
  );
}

function Field({
  label,
  name,
  defaultValue,
  placeholder,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="font-mono text-[10px] uppercase tracking-wide2 text-muted">{label}</span>
      <input
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="mt-1 w-full rounded-sm border border-line bg-base px-3 py-2 text-sm"
      />
    </label>
  );
}
