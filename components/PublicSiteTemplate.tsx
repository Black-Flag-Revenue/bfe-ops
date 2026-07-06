import { buildLocalBusinessSchema, buildFaqSchema } from '@/lib/structuredData';

type SubAccountForTemplate = {
  name: string;
  logoUrl: string | null;
  brandColor: string | null;
  businessPhone: string | null;
  streetAddress: string | null;
  seoCity: string | null;
  seoState: string | null;
  seoZip: string | null;
  serviceAreas: string[];
  primaryDomain: string | null;
  industry: string | null;
};

type SiteContent = {
  heroHeadline?: string;
  sellingPoints?: string;
};

type FaqItem = { question: string; answer: string };

export function PublicSiteTemplate({
  subAccount,
  contentJson,
  city,
  neighborhood,
  faqItems,
}: {
  subAccount: SubAccountForTemplate;
  contentJson: SiteContent;
  city: string | null;
  neighborhood: string | null;
  faqItems: FaqItem[] | null;
}) {
  const accent = subAccount.brandColor || '#B8933F';
  const points = (contentJson.sellingPoints || '')
    .split('\n')
    .map((p) => p.trim())
    .filter(Boolean);
  const locationLabel = [neighborhood, city].filter(Boolean).join(', ');

  const localBusinessSchema = buildLocalBusinessSchema(subAccount);
  const faqSchema = faqItems ? buildFaqSchema(faqItems) : null;

  return (
    <div
      style={{
        minHeight: '100vh',
        margin: 0,
        fontFamily: 'system-ui, sans-serif',
        color: '#1a1a1a',
        background: '#fff',
      }}
    >
      {/* Structured data - what Google, Bing, and AI answer engines (ChatGPT,
          Perplexity, Google AI Overviews) actually parse for facts, separate
          from whatever a human reads on the page. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessSchema) }}
      />
      {faqSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
      )}

      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '20px 32px',
          borderBottom: '1px solid #eee',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {subAccount.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={subAccount.logoUrl} alt={subAccount.name} style={{ height: 36 }} />
          )}
          <span style={{ fontWeight: 700, fontSize: 18 }}>{subAccount.name}</span>
        </div>
        {subAccount.businessPhone && (
          <a
            href={`tel:${subAccount.businessPhone}`}
            style={{
              background: accent,
              color: '#fff',
              padding: '10px 20px',
              borderRadius: 6,
              fontWeight: 600,
              textDecoration: 'none',
              fontSize: 14,
            }}
          >
            Call {subAccount.businessPhone}
          </a>
        )}
      </header>

      <section style={{ padding: '80px 32px', textAlign: 'center', maxWidth: 800, margin: '0 auto' }}>
        {locationLabel && (
          <div style={{ color: accent, fontWeight: 600, fontSize: 14, textTransform: 'uppercase', letterSpacing: 1 }}>
            {locationLabel}
          </div>
        )}
        <h1 style={{ fontSize: 42, fontWeight: 800, lineHeight: 1.2, marginTop: 12 }}>
          {contentJson.heroHeadline || subAccount.name}
        </h1>
        {subAccount.businessPhone && (
          <a
            href={`tel:${subAccount.businessPhone}`}
            style={{
              display: 'inline-block',
              marginTop: 32,
              background: accent,
              color: '#fff',
              padding: '14px 32px',
              borderRadius: 6,
              fontWeight: 700,
              textDecoration: 'none',
              fontSize: 16,
            }}
          >
            Call Now — {subAccount.businessPhone}
          </a>
        )}
      </section>

      {points.length > 0 && (
        <section style={{ padding: '0 32px 80px', maxWidth: 700, margin: '0 auto' }}>
          <div style={{ display: 'grid', gap: 16 }}>
            {points.map((point, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 17 }}>
                <span style={{ color: accent, fontWeight: 900, fontSize: 20 }}>✓</span>
                {point}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Visible FAQ, not just hidden schema - AI answer engines and voice
          assistants favor pages where the visible text matches the
          structured data, not schema tacked on with nothing to back it. */}
      {faqItems && faqItems.length > 0 && (
        <section style={{ padding: '0 32px 80px', maxWidth: 700, margin: '0 auto' }}>
          <h2 style={{ fontSize: 26, fontWeight: 800, marginBottom: 24 }}>Frequently Asked Questions</h2>
          <div style={{ display: 'grid', gap: 20 }}>
            {faqItems.map((item, i) => (
              <div key={i}>
                <div style={{ fontWeight: 700, fontSize: 16 }}>{item.question}</div>
                <div style={{ marginTop: 6, color: '#444', fontSize: 15, lineHeight: 1.5 }}>{item.answer}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {subAccount.serviceAreas.length > 0 && (
        <section style={{ padding: '0 32px 60px', maxWidth: 700, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ fontSize: 13, color: '#888', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600 }}>
            Proudly serving
          </div>
          <div style={{ marginTop: 8, fontSize: 15, color: '#444' }}>
            {subAccount.serviceAreas.join(' • ')}
          </div>
        </section>
      )}

      <footer style={{ borderTop: '1px solid #eee', padding: '24px 32px', textAlign: 'center', color: '#888', fontSize: 13 }}>
        {subAccount.name}
        {subAccount.streetAddress && ` — ${subAccount.streetAddress}`}
        {subAccount.businessPhone && ` — ${subAccount.businessPhone}`}
        {' — '}
        {new Date().getFullYear()}
      </footer>
    </div>
  );
}
