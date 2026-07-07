export const SITE_TEMPLATES = {
  default: 'Classic — clean, text-forward layout',
  bold: 'Bold — full-bleed photo hero, icon grid',
} as const;

export type SiteTemplateId = keyof typeof SITE_TEMPLATES;
