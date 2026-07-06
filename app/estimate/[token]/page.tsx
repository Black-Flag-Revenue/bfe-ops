import { db } from '@/lib/db';
import { notFound } from 'next/navigation';
import { redirect } from 'next/navigation';
import { groupLineItems, groupTotal, embedUrlFor, LineItem, LinkItem } from '@/lib/invoiceParsing';

export const metadata = { robots: { index: false, follow: false } };

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
  const groups = groupLineItems(lineItems);
  const groupNames = Object.keys(groups);
  const accent = invoice.subAccount.brandColor || '#B8933F';

  async function acceptEstimate(formData: FormData) {
    'use server';
    const optionGroup = formData.get('optionGroup') as string;
    const items = groups[optionGroup] || [];
    const total = groupTotal(items);

    await db.invoice.update({
      where: { id: invoice!.id },
      data: {
        acceptedAt: new Date(),
        acceptedOptionGroup: optionGroup,
        status: 'ACCEPTED',
        total,
      },
    });

    redirect(`/estimate/${params.token}`);
  }

  return (
    <div style={{ minHeight: '100vh', background: '#fafafa', fontFamily: 'system-ui, sans-serif', color: '#1a1a1a' }}>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '48px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          {invoice.subAccount.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={invoice.subAccount.logoUrl} alt={invoice.subAccount.name} style={{ height: 32 }} />
          )}
          <span style={{ fontWeight: 700, fontSize: 18 }}>{invoice.subAccount.name}</span>
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 800, marginTop: 24 }}>
          {invoice.type === 'ESTIMATE' ? 'Estimate' : 'Invoice'} {invoice.number}
        </h1>
        {invoice.contact && (
          <p style={{ color: '#666', marginTop: 4 }}>
            Prepared for {invoice.contact.firstName} {invoice.contact.lastName}
          </p>
        )}

        {invoice.acceptedAt ? (
          <div style={{ marginTop: 32, padding: 20, borderRadius: 8, background: `${accent}15`, border: `1px solid ${accent}40` }}>
            <div style={{ fontWeight: 700, color: accent }}>
              ✓ Accepted — {invoice.acceptedOptionGroup}
            </div>
            <p style={{ marginTop: 6, fontSize: 14, color: '#444' }}>
              {invoice.subAccount.name} has been notified and will be in touch to schedule.
            </p>
          </div>
        ) : (
          <form action={acceptEstimate}>
            <div style={{ marginTop: 32, display: 'grid', gap: 20 }}>
              {groupNames.map((groupName) => {
                const items = groups[groupName];
                const total = groupTotal(items);
                return (
                  <label
                    key={groupName}
                    style={{
                      display: 'block',
                      border: '2px solid #e5e5e5',
                      borderRadius: 8,
                      padding: 20,
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <input type="radio" name="optionGroup" value={groupName} required />
                      <span style={{ fontWeight: 700, fontSize: 18 }}>{groupName}</span>
                      <span style={{ marginLeft: 'auto', fontWeight: 800, fontSize: 20, color: accent }}>
                        ${total.toLocaleString()}
                      </span>
                    </div>
                    <ul style={{ marginTop: 12, paddingLeft: 32, fontSize: 14, color: '#444' }}>
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
              <div style={{ marginTop: 40 }}>
                <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Videos</h2>
                <div style={{ display: 'grid', gap: 20 }}>
                  {videos.map((v, i) => {
                    const embed = embedUrlFor(v.url);
                    return (
                      <div key={i}>
                        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>{v.label}</div>
                        {embed ? (
                          <iframe
                            src={embed}
                            style={{ width: '100%', aspectRatio: '16/9', borderRadius: 6, border: 'none' }}
                            allowFullScreen
                          />
                        ) : (
                          <a href={v.url} target="_blank" style={{ color: accent }}>
                            {v.url}
                          </a>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {links.length > 0 && (
              <div style={{ marginTop: 32 }}>
                <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>More info</h2>
                <div style={{ display: 'grid', gap: 8 }}>
                  {links.map((l, i) => (
                    <a key={i} href={l.url} target="_blank" style={{ color: accent, fontSize: 15 }}>
                      → {l.label}
                    </a>
                  ))}
                </div>
              </div>
            )}

            <button
              type="submit"
              style={{
                marginTop: 40,
                width: '100%',
                background: accent,
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                padding: '16px',
                fontWeight: 700,
                fontSize: 16,
                cursor: 'pointer',
              }}
            >
              Approve Selected Option
            </button>
          </form>
        )}

        {invoice.subAccount.businessPhone && (
          <p style={{ marginTop: 40, textAlign: 'center', color: '#888', fontSize: 13 }}>
            Questions? Call {invoice.subAccount.name} at {invoice.subAccount.businessPhone}
          </p>
        )}
      </div>
    </div>
  );
}
