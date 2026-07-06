import { db } from '@/lib/db';
import { assertSubAccountAccess } from '@/lib/auth';
import { sendCampaign } from '@/lib/resend';
import { redirect } from 'next/navigation';

export default async function NewCampaignPage({ params }: { params: { slug: string } }) {
  const subAccount = await db.subAccount.findUniqueOrThrow({ where: { slug: params.slug } });
  await assertSubAccountAccess(subAccount.id);

  const contactCount = await db.contact.count({
    where: { subAccountId: subAccount.id, unsubscribed: false, email: { not: null } },
  });

  async function createAndSend(formData: FormData) {
    'use server';
    await assertSubAccountAccess(subAccount.id);

    const tagsRaw = (formData.get('tags') as string) || '';
    const tags = tagsRaw.split(',').map((t) => t.trim()).filter(Boolean);

    const campaign = await db.emailCampaign.create({
      data: {
        subAccountId: subAccount.id,
        name: formData.get('name') as string,
        subject: formData.get('subject') as string,
        bodyHtml: (formData.get('body') as string).replace(/\n/g, '<br/>'),
        recipientTags: tags,
      },
    });

    // Fire-and-forget on the server - for real volume this should move to a
    // background job/queue rather than blocking the request, but this works
    // fine for the sizes BFE is sending at today.
    await sendCampaign(campaign.id);

    redirect(`/accounts/${params.slug}/campaigns`);
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="font-display text-3xl tracking-wide">New Campaign — {subAccount.name}</h1>
        <p className="mt-1 text-sm text-muted">
          {contactCount} contact{contactCount === 1 ? '' : 's'} eligible to receive mail right now
          (unsubscribed contacts are automatically excluded).
        </p>
      </div>

      {subAccount.domainStatus !== 'VERIFIED' && (
        <div className="rounded-sm border border-flag bg-flag/10 p-4 text-sm text-flag">
          This sub-account's sending domain isn't verified yet. Finish setup in Email Settings
          before sending a campaign.
        </div>
      )}

      <form action={createAndSend} className="space-y-4 rounded-sm border border-line bg-panel p-5">
        <Field label="Campaign name (internal only)" name="name" placeholder="July cold outreach - roofing leads" />
        <Field label="Subject line" name="subject" placeholder="Storm damage in your area?" />
        <label className="block">
          <span className="font-mono text-[10px] uppercase tracking-wide2 text-muted">
            Email body
          </span>
          <textarea
            name="body"
            required
            rows={10}
            className="mt-1 w-full rounded-sm border border-line bg-base px-3 py-2 text-sm"
            placeholder="Write the email..."
          />
        </label>
        <Field
          label="Send only to contacts tagged (comma-separated, optional)"
          name="tags"
          placeholder="cold-lead, storm-zone-2026"
        />
        <p className="text-xs text-muted">
          Leave tags blank to send to every eligible contact in this sub-account.
        </p>
        <button
          disabled={subAccount.domainStatus !== 'VERIFIED'}
          className="rounded-sm bg-brass px-4 py-2 font-display text-sm tracking-wide text-base disabled:opacity-40"
        >
          Send campaign
        </button>
      </form>
    </div>
  );
}

function Field({ label, name, placeholder }: { label: string; name: string; placeholder?: string }) {
  return (
    <label className="block">
      <span className="font-mono text-[10px] uppercase tracking-wide2 text-muted">{label}</span>
      <input
        name={name}
        required={name !== 'tags'}
        placeholder={placeholder}
        className="mt-1 w-full rounded-sm border border-line bg-base px-3 py-2 text-sm"
      />
    </label>
  );
}
