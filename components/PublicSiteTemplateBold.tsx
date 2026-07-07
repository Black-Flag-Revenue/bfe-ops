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
  heroImage?: string;
  galleryImages?: string;
};

type FaqItem = { question: string; answer: string };

/**
 * "Bold" template - full-bleed hero image with dark overlay and centered
 * text, more visual/photo-forward than the Classic template. Good fit for
 * businesses with strong before/after photos (roofing, detailing).
 */
export function PublicSiteTemplateBold({
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
  const gallery = (contentJson.galleryImages || '').split('\n').map((u) => u.trim()).filter(Boolean);

  const localBusinessSchema = buildLocalBusinessSchema(subAccount);
  const faqSchema = faqItems ? buildFaqSchema(faqItems) : null;

  return (
    <div style={{ minHeight: '100vh', margin: 0, fontFamily: 'system-ui, sans-serif', color: '#1a1a1a', background: '#fff' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessSchema) }} />
      {faqSchema && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      )}

      <section
        style={{
          position: 'relative',
          minHeight: 480,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          color: '#fff',
          backgroundImage: contentJson.heroImage
            ? `linear-gradient(rgba(0,0,0,0.55), rgba(0,0,0,0.55)), url(${contentJson.heroImage})`
            : `linear-gradient(135deg, ${accent}, #1a1a1a)`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          padding: '60px 24px',
        }}
      >
        <div style={{ maxWidth: 720 }}>
          {subAccount.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={subAccount.logoUrl} alt={subAccount.name} style={{ height: 40, marginBottom: 24 }} />
          )}
          {locationLabel && (
            <div style={{ fontWeight: 700, fontSize: 13, textTransform: 'uppercase', letterSpacing: 2, opacity: 0.9 }}>
              {locationLabel}
            </div>
          )}
          <h1 style={{ fontSize: 46, fontWeight: 800, lineHeight: 1.15, marginTop: 12 }}>
            {contentJson.heroHeadline || subAccount.name}
          </h1>
          {subAccount.businessPhone && (
            <a
              href={`tel:${subAccount.businessPhone}`}
              style={{
                display: 'inline-block',
                marginTop: 28,
                background: accent,
                color: '#fff',
                padding: '16px 36px',
                borderRadius: 999,
                fontWeight: 700,
                textDecoration: 'none',
                fontSize: 16,
              }}
            >
              Call Now — {subAccount.businessPhone}
            </a>
          )}
        </div>
      </section>

      {points.length > 0 && (
        <section style={{ padding: '64px 32px', maxWidth: 900, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 24 }}>
            {points.map((point, i) => (
              <div key={i} style={{ textAlign: 'center' }}>
                <div
                  style={{
                    width: 48, height: 48, borderRadius: '50%', background: `${accent}20`,
                    color: accent, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 900, fontSize: 20, margin: '0 auto 12px',
                  }}
                >
                  ✓
                </div>
                <div style={{ fontSize: 15, fontWeight: 600 }}>{point}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {gallery.length > 0 && (
        <section style={{ padding: '0 32px 64px', maxWidth: 1000, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
            {gallery.map((url, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={url} alt="" style={{ width: '100%', height: 220, objectFit: 'cover', borderRadius: 12 }} />
            ))}
          </div>
        </section>
      )}

      {faqItems && faqItems.length > 0 && (
        <section style={{ padding: '0 32px 64px', maxWidth: 700, margin: '0 auto' }}>
          <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 24, textAlign: 'center' }}>FAQ</h2>
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

      <footer style={{ borderTop: '1px solid #eee', padding: '24px 32px', textAlign: 'center', color: '#888', fontSize: 13 }}>
        {subAccount.name}
        {subAccount.streetAddress && ` — ${subAccount.streetAddress}`}
        {subAccount.businessPhone && ` — ${subAccount.businessPhone}`}
        {' — '}{new Date().getFullYear()}
      </footer>
    </div>
  );
}
