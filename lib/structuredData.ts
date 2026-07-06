type SubAccountForSchema = {
  name: string;
  businessPhone: string | null;
  streetAddress: string | null;
  seoCity: string | null;
  seoState: string | null;
  seoZip: string | null;
  serviceAreas: string[];
  primaryDomain: string | null;
  industry: string | null;
};

type FaqItem = { question: string; answer: string };

const INDUSTRY_TO_SCHEMA_TYPE: Record<string, string> = {
  Roofing: 'RoofingContractor',
  HVAC: 'HVACBusiness',
  Detailing: 'AutoDetailing',
  Handyman: 'HomeAndConstructionBusiness',
  'Exterior Cleaning': 'HomeAndConstructionBusiness',
};

export function buildLocalBusinessSchema(subAccount: SubAccountForSchema) {
  const schemaType = (subAccount.industry && INDUSTRY_TO_SCHEMA_TYPE[subAccount.industry]) || 'LocalBusiness';
  const url = subAccount.primaryDomain ? `https://${subAccount.primaryDomain}` : undefined;

  return {
    '@context': 'https://schema.org',
    '@type': schemaType,
    name: subAccount.name,
    ...(url && { url, '@id': url }),
    ...(subAccount.businessPhone && { telephone: subAccount.businessPhone }),
    ...(subAccount.streetAddress && {
      address: {
        '@type': 'PostalAddress',
        streetAddress: subAccount.streetAddress,
        addressLocality: subAccount.seoCity || undefined,
        addressRegion: subAccount.seoState || undefined,
        postalCode: subAccount.seoZip || undefined,
        addressCountry: 'US',
      },
    }),
    ...(subAccount.serviceAreas.length > 0 && {
      areaServed: subAccount.serviceAreas.map((area) => ({ '@type': 'City', name: area })),
    }),
  };
}

export function buildFaqSchema(faqItems: FaqItem[]) {
  if (!faqItems || faqItems.length === 0) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqItems.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };
}
