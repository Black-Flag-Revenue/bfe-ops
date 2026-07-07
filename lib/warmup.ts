/**
 * A brand-new cold domain sending a huge blast on day one looks exactly
 * like a spammer to receiving mail servers and can get the whole domain
 * blocked. This ramps daily volume up gradually as the domain builds trust.
 */
export function getDailyWarmupCap(coldDomainVerifiedAt: Date | null): number | null {
  if (!coldDomainVerifiedAt) return null; // not verified yet - sendCampaign already blocks this separately
  const daysSinceVerified = Math.floor((Date.now() - coldDomainVerifiedAt.getTime()) / (1000 * 60 * 60 * 24));

  if (daysSinceVerified < 3) return 50;
  if (daysSinceVerified < 7) return 100;
  if (daysSinceVerified < 14) return 250;
  if (daysSinceVerified < 21) return 500;
  return null; // fully warmed up - no artificial cap, just Resend's own limits apply
}
