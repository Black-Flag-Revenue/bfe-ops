import { Resend } from 'resend';
import { db } from './db';

const resend = new Resend(process.env.RESEND_API_KEY);

type DomainPurpose = 'transactional' | 'cold';

/**
 * Registers a new sending subdomain for a sub-account. Purpose matters:
 * - 'transactional': invoices, reply threads - protect this domain's reputation
 * - 'cold': outreach blasts - isolated on purpose, so if it takes a hit from
 *   spam complaints/bounces, it never touches the transactional domain
 */
export async function createSendingDomain(
  subAccountId: string,
  domain: string,
  purpose: DomainPurpose
) {
  const { data, error } = await resend.domains.create({ name: domain });
  if (error) throw new Error(error.message);

  await db.subAccount.update({
    where: { id: subAccountId },
    data:
      purpose === 'transactional'
        ? {
            sendingDomain: domain,
            resendDomainId: data!.id,
            domainStatus: 'PENDING',
            dnsRecords: data!.records as any,
          }
        : {
            coldSendingDomain: domain,
            coldResendDomainId: data!.id,
            coldDomainStatus: 'PENDING',
            coldDnsRecords: data!.records as any,
          },
  });

  return data;
}

/**
 * Polls Resend for verification status on either domain.
 */
export async function refreshDomainStatus(subAccountId: string, purpose: DomainPurpose) {
  const subAccount = await db.subAccount.findUniqueOrThrow({ where: { id: subAccountId } });
  const resendDomainId =
    purpose === 'transactional' ? subAccount.resendDomainId : subAccount.coldResendDomainId;

  if (!resendDomainId) throw new Error(`No ${purpose} domain configured for this sub-account`);

  const { data, error } = await resend.domains.get(resendDomainId);
  if (error) throw new Error(error.message);

  const status = data!.status === 'verified' ? 'VERIFIED' : data!.status === 'failed' ? 'FAILED' : 'PENDING';

  await db.subAccount.update({
    where: { id: subAccountId },
    data:
      purpose === 'transactional'
        ? { domainStatus: status, dnsRecords: data!.records as any }
        : { coldDomainStatus: status, coldDnsRecords: data!.records as any },
  });

  return status;
}

/**
 * Sends a one-off follow-up to a specific contact (the "I'll email that
 * over" moment) and logs it into the shared thread so anyone else working
 * the account sees it, exactly like the inbound replies. Always uses the
 * TRANSACTIONAL domain - this is real-customer correspondence, never cold.
 */
export async function sendContactReply({
  contactId,
  userId,
  subject,
  html,
}: {
  contactId: string;
  userId: string;
  subject: string;
  html: string;
}) {
  const contact = await db.contact.findUniqueOrThrow({
    where: { id: contactId },
    include: { subAccount: true },
  });

  if (!contact.email) throw new Error('This contact has no email on file');

  const subAccount = contact.subAccount;
  if (subAccount.domainStatus !== 'VERIFIED' || !subAccount.fromEmail) {
    throw new Error(`${subAccount.name} does not have a verified sending domain yet.`);
  }

  const sender = await db.user.findUniqueOrThrow({ where: { id: userId } });
  const signOffName = sender.signOffName || sender.name;
  const signature = `
    <p style="margin-top:24px;">
      ${signOffName}${sender.signOffTitle ? `<br/><span style="color:#8A8F8B;">${sender.signOffTitle}</span>` : ''}
      <br/>${subAccount.fromName || subAccount.name}
    </p>
  `;
  const bodyWithSignature = `${html}${signature}`;

  const fromAddress = subAccount.fromEmail;
  const result = await resend.emails.send({
    from: `${subAccount.fromName || subAccount.name} <${fromAddress}>`,
    replyTo: subAccount.replyToEmail || undefined,
    to: contact.email,
    subject,
    html: bodyWithSignature,
  });

  await db.message.create({
    data: {
      contactId,
      direction: 'OUTBOUND',
      subject,
      bodyHtml: bodyWithSignature,
      fromAddress,
      toAddress: contact.email,
      sentById: userId,
      resendMessageId: result.data?.id,
    },
  });

  return result;
}

/**
 * Sends a mass campaign to every eligible contact in the sub-account matching
 * the given tags. Uses the plain transactional send() API (not Audiences) so
 * there's no per-contact billing - just per-email volume.
 *
 * Always sends from the COLD domain, isolated from invoices/replies. Excludes
 * both manual unsubscribes AND auto-suppressed contacts (hard bounces, spam
 * complaints) - suppression is the thing that actually protects deliverability,
 * the unsubscribe link alone doesn't stop a bounce from hurting your reputation.
 *
 * Batches in groups of 100 (Resend's batch limit) with a delay between
 * batches to respect the 10 req/sec rate limit.
 */
export async function sendCampaign(campaignId: string) {
  const campaign = await db.emailCampaign.findUniqueOrThrow({
    where: { id: campaignId },
    include: { subAccount: true },
  });

  const subAccount = campaign.subAccount;
  if (subAccount.coldDomainStatus !== 'VERIFIED' || !subAccount.coldFromEmail) {
    throw new Error(
      `${subAccount.name} does not have a verified COLD sending domain yet. ` +
        `Set one up separately from the transactional domain in Email Settings.`
    );
  }

  const contacts = await db.contact.findMany({
    where: {
      subAccountId: subAccount.id,
      unsubscribed: false,
      suppressed: false,
      email: { not: null },
      ...(campaign.recipientTags.length > 0
        ? { tags: { hasSome: campaign.recipientTags } }
        : {}),
    },
  });

  await db.emailCampaign.update({
    where: { id: campaignId },
    data: { status: 'SENDING', recipientCount: contacts.length },
  });

  let sent = 0;
  let failed = 0;
  const from = `${subAccount.coldFromName || subAccount.name} <${subAccount.coldFromEmail}>`;
  const BATCH_SIZE = 100;

  for (let i = 0; i < contacts.length; i += BATCH_SIZE) {
    const batch = contacts.slice(i, i + BATCH_SIZE);

    const emails = batch.map((contact) => ({
      from,
      to: contact.email!,
      subject: campaign.subject,
      html: appendComplianceFooter(campaign.bodyHtml, contact.id, subAccount.name),
    }));

    try {
      await resend.batch.send(emails);
      sent += batch.length;
      await db.campaignRecipient.createMany({
        data: batch.map((c) => ({ campaignId, contactId: c.id })),
        skipDuplicates: true,
      });
    } catch (err) {
      failed += batch.length;
      console.error(`Campaign ${campaignId} batch failed at offset ${i}:`, err);
    }

    if (i + BATCH_SIZE < contacts.length) {
      await new Promise((r) => setTimeout(r, 1200));
    }
  }

  await db.emailCampaign.update({
    where: { id: campaignId },
    data: { status: 'SENT', sentAt: new Date(), sentCount: sent, failedCount: failed },
  });

  return { sent, failed, total: contacts.length };
}

/**
 * CAN-SPAM requires a working unsubscribe mechanism and physical business
 * address on every commercial bulk email - not optional for cold outreach.
 */
function appendComplianceFooter(html: string, contactId: string, businessName: string) {
  const unsubscribeUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/unsubscribe?contact=${contactId}`;
  return `
    ${html}
    <hr style="margin-top:32px;border:none;border-top:1px solid #ddd;" />
    <p style="font-size:11px;color:#888;margin-top:12px;">
      ${businessName}<br/>
      Don't want these emails? <a href="${unsubscribeUrl}">Unsubscribe here</a>.
    </p>
  `;
}

/**
 * Sends an email using the sub-account's branded from/reply-to addresses
 * (transactional domain). Falls back to erroring clearly if the domain
 * isn't verified yet, rather than silently sending from an unverified domain.
 */
export async function sendBrandedEmail({
  subAccountId,
  to,
  subject,
  html,
}: {
  subAccountId: string;
  to: string | string[];
  subject: string;
  html: string;
}) {
  const subAccount = await db.subAccount.findUniqueOrThrow({ where: { id: subAccountId } });

  if (subAccount.domainStatus !== 'VERIFIED' || !subAccount.fromEmail) {
    throw new Error(
      `${subAccount.name} does not have a verified sending domain yet. Finish domain setup in Settings first.`
    );
  }

  return resend.emails.send({
    from: `${subAccount.fromName || subAccount.name} <${subAccount.fromEmail}>`,
    replyTo: subAccount.replyToEmail || undefined,
    to,
    subject,
    html,
  });
}
