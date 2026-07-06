import { db } from '@/lib/db';
import { assertSubAccountAccess, getCurrentUserContext } from '@/lib/auth';
import { getIndustryFields } from '@/lib/industryFields';
import { sendContactReply } from '@/lib/resend';
import { redirect } from 'next/navigation';

export default async function ContactDetailPage({
  params,
}: {
  params: { slug: string; contactId: string };
}) {
  const subAccount = await db.subAccount.findUniqueOrThrow({ where: { slug: params.slug } });
  const ctx = await assertSubAccountAccess(subAccount.id);

  const contact = await db.contact.findUniqueOrThrow({
    where: { id: params.contactId },
    include: {
      notes: { orderBy: { createdAt: 'desc' } },
      deals: { include: { stage: true, pipeline: true }, orderBy: { createdAt: 'desc' } },
      messages: { orderBy: { createdAt: 'asc' }, include: { sentBy: true } },
    },
  });

  const industryFields = getIndustryFields(subAccount.industry);
  const customFields = (contact.customFields as Record<string, string>) || {};

  async function addNote(formData: FormData) {
    'use server';
    const userCtx = await assertSubAccountAccess(subAccount.id);
    const body = formData.get('body') as string;
    if (body?.trim()) {
      await db.note.create({ data: { contactId: contact.id, body, createdById: userCtx.user.id } });
    }
    redirect(`/accounts/${params.slug}/contacts/${contact.id}`);
  }

  async function sendReply(formData: FormData) {
    'use server';
    const userCtx = await assertSubAccountAccess(subAccount.id);
    const subject = formData.get('subject') as string;
    const body = (formData.get('body') as string).replace(/\n/g, '<br/>');

    await sendContactReply({
      contactId: contact.id,
      userId: userCtx.user.id,
      subject,
      html: body,
    });

    redirect(`/accounts/${params.slug}/contacts/${contact.id}`);
  }

  async function createDeal(formData: FormData) {
    'use server';
    await assertSubAccountAccess(subAccount.id);

    let pipeline = await db.pipeline.findFirst({
      where: { subAccountId: subAccount.id },
      include: { stages: { orderBy: { order: 'asc' } } },
    });
    if (!pipeline) {
      pipeline = await db.pipeline.create({
        data: {
          subAccountId: subAccount.id,
          name: 'Sales Pipeline',
          stages: {
            create: ['New Lead', 'Contacted', 'Quoted', 'Won', 'Lost'].map((name, i) => ({ name, order: i })),
          },
        },
        include: { stages: { orderBy: { order: 'asc' } } },
      });
    }

    const title = formData.get('title') as string;
    const valueRaw = formData.get('value') as string;

    await db.deal.create({
      data: {
        subAccountId: subAccount.id,
        contactId: contact.id,
        pipelineId: pipeline.id,
        stageId: pipeline.stages[0].id,
        title,
        value: valueRaw ? parseFloat(valueRaw) : null,
      },
    });

    redirect(`/accounts/${params.slug}/contacts/${contact.id}`);
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      {/* Left column: info */}
      <div className="space-y-4 lg:col-span-1">
        <div className="rounded-sm border border-line bg-panel p-5">
          <h1 className="font-display text-2xl tracking-wide">
            {contact.firstName} {contact.lastName}
          </h1>
          <div className="mt-3 space-y-1 text-sm text-muted">
            {contact.email && <div>{contact.email}</div>}
            {contact.phone && <div className="font-mono">{contact.phone}</div>}
            {contact.address && (
              <div>
                {contact.address}
                <br />
                {contact.city}, {contact.state} {contact.zip}
              </div>
            )}
          </div>
          {contact.tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {contact.tags.map((t) => (
                <span key={t} className="rounded-full border border-line px-2 py-0.5 font-mono text-[10px] text-muted">
                  {t}
                </span>
              ))}
            </div>
          )}
          <div className="mt-3 font-mono text-[10px] uppercase tracking-wide2">
            {contact.suppressed ? (
              <span className="text-flag">Suppressed - {contact.suppressionReason}</span>
            ) : contact.unsubscribed ? (
              <span className="text-muted">Unsubscribed</span>
            ) : (
              <span className="text-ink">Active</span>
            )}
          </div>
        </div>

        {Object.keys(customFields).length > 0 && (
          <div className="rounded-sm border border-line bg-panel p-5">
            <h2 className="font-mono text-[10px] uppercase tracking-wide2 text-muted">
              {subAccount.industry} details
            </h2>
            <div className="mt-3 space-y-2 text-sm">
              {industryFields.map(
                (f) =>
                  customFields[f.key] && (
                    <div key={f.key} className="flex justify-between">
                      <span className="text-muted">{f.label}</span>
                      <span>{customFields[f.key]}</span>
                    </div>
                  )
              )}
            </div>
          </div>
        )}

        <div className="rounded-sm border border-line bg-panel p-5">
          <h2 className="font-mono text-[10px] uppercase tracking-wide2 text-muted">Deals</h2>
          <div className="mt-3 space-y-2">
            {contact.deals.map((deal) => (
              <div key={deal.id} className="rounded-sm border border-line p-2 text-sm">
                <div>{deal.title}</div>
                <div className="mt-1 flex justify-between font-mono text-[10px] uppercase tracking-wide2 text-muted">
                  <span>{deal.stage.name}</span>
                  {deal.value && <span>${deal.value.toString()}</span>}
                </div>
              </div>
            ))}
            {contact.deals.length === 0 && <p className="text-xs text-muted">No deals yet</p>}
          </div>
          <form action={createDeal} className="mt-3 space-y-2 border-t border-line pt-3">
            <input
              name="title"
              required
              placeholder="Deal title"
              className="w-full rounded-sm border border-line bg-base px-3 py-2 text-sm"
            />
            <input
              name="value"
              type="number"
              step="0.01"
              placeholder="Value (optional)"
              className="w-full rounded-sm border border-line bg-base px-3 py-2 text-sm"
            />
            <button className="rounded-sm border border-line px-3 py-1.5 text-xs hover:border-brass/60">
              Add deal
            </button>
          </form>
        </div>

        <div className="rounded-sm border border-line bg-panel p-5">
          <h2 className="font-mono text-[10px] uppercase tracking-wide2 text-muted">Notes</h2>
          <form action={addNote} className="mt-3 space-y-2">
            <textarea
              name="body"
              rows={2}
              placeholder="Add a note..."
              className="w-full rounded-sm border border-line bg-base px-3 py-2 text-sm"
            />
            <button className="rounded-sm border border-line px-3 py-1.5 text-xs hover:border-brass/60">
              Add note
            </button>
          </form>
          <div className="mt-3 space-y-2">
            {contact.notes.map((note) => (
              <div key={note.id} className="rounded-sm bg-base p-2 text-sm">
                {note.body}
                <div className="mt-1 font-mono text-[10px] text-muted">
                  {note.createdAt.toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right column: shared message thread */}
      <div className="lg:col-span-2">
        <div className="rounded-sm border border-line bg-panel p-5">
          <h2 className="font-display text-lg tracking-wide">Conversation</h2>
          <p className="text-xs text-muted mt-0.5">
            Shared with anyone else working this account - not a personal inbox.
          </p>

          <div className="mt-4 max-h-[420px] space-y-3 overflow-y-auto">
            {contact.messages.map((msg) => (
              <div
                key={msg.id}
                className={`rounded-sm border p-3 text-sm ${
                  msg.direction === 'INBOUND' ? 'border-line bg-base' : 'border-brass/30 bg-brass/5'
                }`}
              >
                <div className="flex justify-between font-mono text-[10px] uppercase tracking-wide2 text-muted">
                  <span>
                    {msg.direction === 'INBOUND' ? contact.firstName : msg.sentBy?.name || 'Sent'}
                  </span>
                  <span>{msg.createdAt.toLocaleString()}</span>
                </div>
                {msg.subject && <div className="mt-1 font-medium">{msg.subject}</div>}
                <div
                  className="mt-1 text-ink/90"
                  dangerouslySetInnerHTML={{ __html: msg.bodyHtml || msg.bodyText || '' }}
                />
              </div>
            ))}
            {contact.messages.length === 0 && (
              <p className="text-sm text-muted">No messages yet.</p>
            )}
          </div>

          {contact.email ? (
            <form action={sendReply} className="mt-5 space-y-2 border-t border-line pt-4">
              <input
                name="subject"
                required
                placeholder="Subject"
                className="w-full rounded-sm border border-line bg-base px-3 py-2 text-sm"
              />
              <textarea
                name="body"
                required
                rows={4}
                placeholder="Write your reply - your sign-off is added automatically"
                className="w-full rounded-sm border border-line bg-base px-3 py-2 text-sm"
              />
              <button className="rounded-sm bg-brass px-4 py-2 font-display text-sm tracking-wide text-base">
                Send
              </button>
            </form>
          ) : (
            <p className="mt-4 text-xs text-muted">This contact has no email on file - can't send a reply.</p>
          )}
        </div>
      </div>
    </div>
  );
}
