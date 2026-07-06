import { Webhook } from 'svix';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * Resend sends events here as a webhook - inbound replies AND delivery
 * events (bounces, complaints). Inbound replies are matched to a Contact
 * and logged as a Message so they show up in the shared thread. Bounces
 * and spam complaints auto-suppress the contact so they're never emailed
 * again - this is what actually protects sending reputation over time,
 * more than the unsubscribe link alone.
 *
 * Set this URL in Resend: Settings -> Webhooks -> add endpoint ->
 * https://yourapp.com/api/webhooks/resend-inbound -> subscribe to
 * email.received, email.bounced, and email.complained
 */
export async function POST(req: NextRequest) {
  const payload = await req.text();
  const headers = {
    id: req.headers.get('svix-id')!,
    timestamp: req.headers.get('svix-timestamp')!,
    signature: req.headers.get('svix-signature')!,
  };

  let event: any;
  try {
    const wh = new Webhook(process.env.RESEND_WEBHOOK_SECRET!);
    event = wh.verify(payload, headers);
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  if (event.type === 'email.bounced' || event.type === 'email.complained') {
    const toAddress: string = Array.isArray(event.data.to) ? event.data.to[0] : event.data.to;
    const reason = event.type === 'email.bounced' ? 'HARD_BOUNCE' : 'SPAM_COMPLAINT';

    const contact = await db.contact.findFirst({ where: { email: toAddress } });
    if (contact) {
      await db.contact.update({
        where: { id: contact.id },
        data: { suppressed: true, suppressionReason: reason },
      });
      console.log(`Suppressed ${toAddress} (${reason}) - excluded from all future sends`);
    }

    return NextResponse.json({ received: true });
  }

  if (event.type !== 'email.received') {
    return NextResponse.json({ received: true });
  }

  const { from, to, subject, text, html } = event.data;
  const fromAddress: string = from;
  const toAddress: string = Array.isArray(to) ? to[0] : to;

  // Find the sub-account this reply belongs to, based on which branded
  // address it was sent to (e.g. replies@mg.mobilebuff.com -> Mobile Buff)
  const domain = toAddress.split('@')[1];
  const subAccount = await db.subAccount.findFirst({
    where: { sendingDomain: domain },
  });

  if (!subAccount) {
    // Not one of ours - log and bail rather than guessing
    console.warn(`Inbound email to unrecognized domain: ${domain}`);
    return NextResponse.json({ received: true, matched: false });
  }

  // Match the contact by email within that sub-account
  const contact = await db.contact.findFirst({
    where: { subAccountId: subAccount.id, email: fromAddress },
  });

  if (!contact) {
    console.warn(`Inbound email from unknown contact: ${fromAddress} (${subAccount.name})`);
    return NextResponse.json({ received: true, matched: false });
  }

  await db.message.create({
    data: {
      contactId: contact.id,
      direction: 'INBOUND',
      subject,
      bodyText: text,
      bodyHtml: html,
      fromAddress,
      toAddress,
    },
  });

  return NextResponse.json({ received: true, matched: true });
}
