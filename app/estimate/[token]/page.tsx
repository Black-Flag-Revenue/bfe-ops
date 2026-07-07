import { db } from '@/lib/db';
import { notFound } from 'next/navigation';
import { redirect } from 'next/navigation';
import { groupLineItems, groupTotal, embedUrlFor, LineItem, LinkItem } from '@/lib/invoiceParsing';

export const metadata = { robots: { index: false, follow: false } };

const DEFAULT_TERMS =
  'By typing your name and clicking Approve below, you authorize this business to proceed with ' +
  'the option selected above. This confirms your selection and pricing as shown - final scheduling ' +
  'and any additional terms will be confirmed directly with you.';

export default async function EstimatePage({ params }: { params: { token: string } }) {
  const invoice = await db.invoice.findUnique({
    where: { publicToken: params.token },
    include: { subAccount: true, contact: true },
  });
  if (!invoice) notFound();

  const isFirstView = !invoice.firstViewedAt;
  await db.invoice.update({
    where: { id: invoice.id },
    data: {
      viewCount: { increment: 1 },
      firstViewedAt: isFirstView ? new Date() : undefined,
      lastViewedAt: new Date(),
      status: invoice.status === 'DRAFT' || invoice.status === 'SENT' ? 'VIEWED' : undefined,
    },
  });

  const lineItems = invoice.lineItems as unknown as LineItem[];
  const links = (invoice.links as unknown as LinkItem[]) || [];
  const videos = (invoice.videos as unknown as LinkItem[]) || [];
  const isInvoice = invoice.type === 'INVOICE';
  const groups = isInvoice ? { 'Amount Due': lineItems } : groupLineItems(lineItems);
  const groupNames = Object.keys(groups);
  const accent = invoice.subAccount.brandColor || '#B8933F';
  const publicUrl = `${process.env.NEXT_PUBLIC_APP_URL}/estimate/${params.token}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=140x140&margin=8&data=${encodeURIComponent(publicUrl)}`;

  async function acceptEstimate(formData: FormData) {
    'use server';
    const optionGroup = formData.get('optionGroup') as string;
    const signedName = formData.get('signedName') as string;
    const items = groups[optionGroup] || [];
    const total = groupTotal(items);

    await db.invoice.update({
      where: { id: invoice!.id },
      data: {
        acceptedAt: new Date(),
        acceptedOptionGroup: optionGroup,
        acceptedByName: signedName,
        status: 'ACCEPTED',
        total,
      },
    });

    redirect(`/estimate/${params.token}`);
  }

  const dateLabel = invoice.createdAt.toLocaleDateString(undefined, {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  return (
    <div style={{ minHeight: '100vh', background: '#f4f4f2', fontFamily: 'system-ui, sans-serif', color: '#1a1a1a' }}>
      <div style={{ maxWidth: 820, margin: '0 auto', padding: '40px 20px 80px' }}>

        {/* Letterhead */}
        <div style={{ background: '#fff', borderRadius: 10, padding: '32px 36px', border: '1px solid #e5e5e0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              {invoice.subAccount.logoUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={invoice.subAccount.logoUrl} alt={invoice.subAccount.name} style={{ height: 44 }} />
              )}
              <div>
                <div style={{ fontWeight: 800, fontSize: 20 }}>{invoice.subAccount.name}</div>
                <div style={{ fontSize: 13, color: '#777', marginTop: 2 }}>
                  {[invoice.subAccount.streetAddress, invoice.subAccount.seoCity].filter(Boolean).join(', ')}
                  {invoice.subAccount.businessPhone && ` · ${invoice.subAccount.businessPhone}`}
                </div>
              </div>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrUrl} alt="Scan to revisit this page" style={{ width: 84, height: 84 }} />
          </div>

          <div style={{ marginTop: 28, borderTop: '1px solid #eee', paddingTop: 20, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, color: '#999', fontWeight: 700 }}>
                {isInvoice ? 'Invoice' : 'Estimate'} #{invoice.number}
              </div>
              <div style={{ fontSize: 13, color: '#777', marginTop: 2 }}>{dateLabel}</div>
            </div>
            {invoice.contact && (
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, color: '#999', fontWeight: 700 }}>
                  Prepared for
                </div>
                <div style={{ fontSize: 14, marginTop: 2 }}>
                  {invoice.contact.firstName} {invoice.contact.lastName}
                  {invoice.contact.address && (
                    <div style={{ color: '#777', fontSize: 13 }}>
                      {invoice.contact.address}, {invoice.contact.city}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Educational / context intro */}
        {invoice.introText && (
          <div style={{ background: '#fff', borderRadius: 10, padding: '28px 36px', border: '1px solid #e5e5e0', marginTop: 16 }}>
            <div style={{ fontSize: 15, lineHeight: 1.7, color: '#333', whiteSpace: 'pre-wrap' }}>
              {invoice.introText}
            </div>
          </div>
        )}

        {invoice.acceptedAt ? (
          <div style={{ marginTop: 16, background: '#fff', borderRadius: 10, padding: '28px 36px', border: `1px solid ${accent}40` }}>
            <div style={{ fontWeight: 800, fontSize: 18, color: accent }}>
              ✓ {isInvoice ? 'Acknowledged & Confirmed' : `Approved — ${invoice.acceptedOptionGroup}`}
            </div>
            <p style={{ marginTop: 8, fontSize: 14, color: '#555', lineHeight: 1.6 }}>
              Authorized by <strong>{invoice.acceptedByName}</strong> on {invoice.acceptedAt.toLocaleDateString()}.{' '}
              {invoice.subAccount.name} has been notified{isInvoice ? '.' : ' and will be in touch to schedule.'}
            </p>
          </div>
        ) : (
          <form action={acceptEstimate}>
            {/* Option comparison - side by side, not stacked, for real comparison */}
            <div
              style={{
                marginTop: 16,
                display: 'grid',
                gridTemplateColumns: groupNames.length > 1 ? `repeat(${Math.min(groupNames.length, 3)}, 1fr)` : '1fr',
                gap: 14,
              }}
            >
              {groupNames.map((groupName) => {
                const items = groups[groupName];
                const total = groupTotal(items);
                return (
                  <label
                    key={groupName}
                    style={{
                      display: 'block',
                      background: '#fff',
                      border: '2px solid #e5e5e0',
                      borderRadius: 10,
                      padding: 24,
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {!isInvoice && <input type="radio" name="optionGroup" value={groupName} required style={{ width: 18, height: 18 }} />}
                      {isInvoice && <input type="hidden" name="optionGroup" value={groupName} />}
                      <span style={{ fontWeight: 800, fontSize: 17, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        {groupName}
                      </span>
                    </div>
                    <div style={{ marginTop: 10, fontWeight: 800, fontSize: 28, color: accent }}>
                      ${total.toLocaleString()}
                    </div>
                    <ul style={{ marginTop: 16, paddingLeft: 20, fontSize: 14, color: '#444', lineHeight: 1.8 }}>
                      {items.map((item, i) => (
                        <li key={i}>
                          {item.description} {item.qty > 1 ? `× ${item.qty}` : ''}
                        </li>
                      ))}
                    </ul>
                  </label>
                );
              })}
            </div>

            {videos.length > 0 && (
              <div style={{ marginTop: 16, background: '#fff', borderRadius: 10, padding: '28px 36px', border: '1px solid #e5e5e0' }}>
                <h2 style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, color: '#999', marginBottom: 16 }}>
                  Product Information
                </h2>
                <div style={{ display: 'grid', gap: 20 }}>
                  {videos.map((v, i) => {
                    const embed = embedUrlFor(v.url);
                    return (
                      <div key={i}>
                        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>{v.label}</div>
                        {embed ? (
                          <iframe src={embed} style={{ width: '100%', aspectRatio: '16/9', borderRadius: 6, border: 'none' }} allowFullScreen />
                        ) : (
                          <a href={v.url} target="_blank" style={{ color: accent }}>{v.url}</a>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {links.length > 0 && (
              <div style={{ marginTop: 16, background: '#fff', borderRadius: 10, padding: '28px 36px', border: '1px solid #e5e5e0' }}>
                <h2 style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, color: '#999', marginBottom: 12 }}>
                  Additional Resources
                </h2>
                <div style={{ display: 'grid', gap: 8 }}>
                  {links.map((l, i) => (
                    <a key={i} href={l.url} target="_blank" style={{ color: accent, fontSize: 15 }}>→ {l.label}</a>
                  ))}
                </div>
              </div>
            )}

            {/* Authorization block */}
            <div style={{ marginTop: 16, background: '#fff', borderRadius: 10, padding: '28px 36px', border: '1px solid #e5e5e0' }}>
              <h2 style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, color: '#999', marginBottom: 12 }}>
                Authorization
              </h2>
              <p style={{ fontSize: 13, color: '#666', lineHeight: 1.6 }}>
                {invoice.termsText || DEFAULT_TERMS}
              </p>
              <label style={{ display: 'block', marginTop: 16 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#555' }}>Type your full name to authorize</span>
                <input
                  name="signedName"
                  required
                  defaultValue={invoice.contact ? `${invoice.contact.firstName} ${invoice.contact.lastName}` : ''}
                  style={{
                    display: 'block', marginTop: 6, width: '100%', padding: '12px 14px',
                    border: '1px solid #ddd', borderRadius: 6, fontSize: 15, fontFamily: 'inherit',
                  }}
                />
              </label>
              <button
                type="submit"
                style={{
                  marginTop: 20, width: '100%', background: accent, color: '#fff', border: 'none',
                  borderRadius: 8, padding: '16px', fontWeight: 700, fontSize: 16, cursor: 'pointer',
                }}
              >
                {isInvoice ? 'Acknowledge & Confirm' : 'Approve Selected Option'}
              </button>
            </div>
          </form>
        )}

        {invoice.subAccount.businessPhone && (
          <p style={{ marginTop: 24, textAlign: 'center', color: '#999', fontSize: 13 }}>
            Questions? Call {invoice.subAccount.name} at {invoice.subAccount.businessPhone}
          </p>
        )}
      </div>
    </div>
  );
}
