type SubAccountForTemplate = {
  name: string;
  logoUrl: string | null;
  brandColor: string | null;
  businessPhone: string | null;
};

type SiteContent = {
  heroHeadline?: string;
  sellingPoints?: string;
};

export function PublicSiteTemplate({
  subAccount,
  contentJson,
  city,
  neighborhood,
}: {
  subAccount: SubAccountForTemplate;
  contentJson: SiteContent;
  city: string | null;
  neighborhood: string | null;
}) {
  const accent = subAccount.brandColor || '#B8933F';
  const points = (contentJson.sellingPoints || '')
    .split('\n')
    .map((p) => p.trim())
    .filter(Boolean);
  const locationLabel = [neighborhood, city].filter(Boolean).join(', ');

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

        <footer style={{ borderTop: '1px solid #eee', padding: '24px 32px', textAlign: 'center', color: '#888', fontSize: 13 }}>
          {subAccount.name} — {new Date().getFullYear()}
        </footer>
    </div>
  );
}
