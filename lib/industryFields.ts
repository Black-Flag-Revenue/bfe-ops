export type IndustryField = {
  key: string;
  label: string;
  placeholder?: string;
};

/**
 * Maps a SubAccount's industry to the extra fields worth capturing on a
 * Contact, beyond the universal name/email/phone/address. Stored in
 * Contact.customFields as free-form JSON since every industry is different.
 * Falls back to a generic service-business set if the industry isn't matched.
 */
export const INDUSTRY_FIELDS: Record<string, IndustryField[]> = {
  Roofing: [
    { key: 'roofType', label: 'Roof type', placeholder: 'Asphalt shingle' },
    { key: 'roofAge', label: 'Roof age (years)', placeholder: '12' },
    { key: 'squareFootage', label: 'Approx. sq ft', placeholder: '2400' },
    { key: 'lastStormDate', label: 'Last known storm damage date', placeholder: '2026-04-12' },
  ],
  HVAC: [
    { key: 'systemType', label: 'System type', placeholder: 'Heat pump' },
    { key: 'systemAge', label: 'System age (years)', placeholder: '8' },
    { key: 'lastServiceDate', label: 'Last serviced', placeholder: '2026-01-15' },
  ],
  Detailing: [
    { key: 'vehicleMake', label: 'Vehicle make', placeholder: 'Toyota' },
    { key: 'vehicleModel', label: 'Vehicle model', placeholder: 'Tacoma' },
    { key: 'vehicleYear', label: 'Vehicle year', placeholder: '2021' },
    { key: 'lastDetailDate', label: 'Last detailed', placeholder: '2026-05-01' },
  ],
  Handyman: [
    { key: 'propertyType', label: 'Property type', placeholder: 'Single-family home' },
    { key: 'commonRequests', label: 'Common requests', placeholder: 'Fence repair, drywall' },
  ],
  'Exterior Cleaning': [
    { key: 'exteriorType', label: 'Exterior surface', placeholder: 'Vinyl siding' },
    { key: 'lastCleanedDate', label: 'Last cleaned', placeholder: '2026-03-20' },
  ],
};

export const DEFAULT_FIELDS: IndustryField[] = [
  { key: 'notes', label: 'Additional details', placeholder: '' },
];

export function getIndustryFields(industry: string | null): IndustryField[] {
  if (!industry) return DEFAULT_FIELDS;
  return INDUSTRY_FIELDS[industry] || DEFAULT_FIELDS;
}
