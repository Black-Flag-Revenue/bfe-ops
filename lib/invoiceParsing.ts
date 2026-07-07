export type LineItem = { description: string; qty: number; unitPrice: number; optionGroup: string };
export type LinkItem = { label: string; url: string };

export function parseLineItems(raw: string): LineItem[] {
  return raw
    .split('\n')
    .map((line) => line.split('|').map((s) => s.trim()))
    .filter((parts) => parts.length >= 3 && parts[0])
    .map((parts) => ({
      description: parts[0],
      qty: parseFloat(parts[1]) || 1,
      unitPrice: parseFloat(parts[2]) || 0,
      optionGroup: parts[3] || 'Standard',
    }));
}

export function parseLinkItems(raw: string): LinkItem[] {
  return raw
    .split('\n')
    .map((line) => line.split('|').map((s) => s.trim()))
    .filter((parts) => parts.length === 2 && parts[0] && parts[1])
    .map(([label, url]) => ({ label, url }));
}

export function serializeLineItems(items: LineItem[]): string {
  return items.map((i) => `${i.description} | ${i.qty} | ${i.unitPrice} | ${i.optionGroup}`).join('\n');
}

export function serializeLinkItems(items: LinkItem[]): string {
  return items.map((i) => `${i.label} | ${i.url}`).join('\n');
}

export function groupLineItems(items: LineItem[]): Record<string, LineItem[]> {
  const groups: Record<string, LineItem[]> = {};
  for (const item of items) {
    if (!groups[item.optionGroup]) groups[item.optionGroup] = [];
    groups[item.optionGroup].push(item);
  }
  return groups;
}

export function groupTotal(items: LineItem[]): number {
  return items.reduce((sum, item) => sum + item.qty * item.unitPrice, 0);
}

export function embedUrlFor(url: string): string | null {
  const youtubeMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
  if (youtubeMatch) return `https://www.youtube.com/embed/${youtubeMatch[1]}`;
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  return null;
}
