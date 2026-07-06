/**
 * The ops app's own domain(s) - e.g. your Replit .replit.app URL, and later
 * a real domain like ops.blackflagedge.com. Set as a comma-separated list in
 * the OPS_APP_HOSTS env var. Anything NOT in this list is treated as a
 * client's public website domain.
 */
export function isOpsHost(host: string): boolean {
  const opsHosts = (process.env.OPS_APP_HOSTS || '')
    .split(',')
    .map((h) => h.trim())
    .filter(Boolean);
  return opsHosts.some((opsHost) => host.includes(opsHost));
}

/** Strips a leading "www." so mobilebuff.com and www.mobilebuff.com match the same SubAccount. */
export function normalizeHost(host: string): string {
  return host.replace(/^www\./, '').split(':')[0];
}
