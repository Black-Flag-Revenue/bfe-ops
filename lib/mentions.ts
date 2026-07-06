import { db } from './db';

/**
 * Finds @name mentions in text (e.g. "@brock check this out") and matches
 * them against team members who actually have access to this sub-account -
 * matches on first name or their custom sign-off name, case-insensitive.
 */
export async function resolveMentions(text: string, subAccountId: string): Promise<string[]> {
  const mentionPattern = /@(\w+)/g;
  const mentioned = Array.from(text.matchAll(mentionPattern)).map((m) => m[1].toLowerCase());
  if (mentioned.length === 0) return [];

  const subAccount = await db.subAccount.findUniqueOrThrow({ where: { id: subAccountId } });

  const candidates = await db.user.findMany({
    where: {
      OR: [
        { agencyRoles: { some: { agencyId: subAccount.agencyId } } },
        { subAccountRoles: { some: { subAccountId } } },
      ],
    },
  });

  const matchedUserIds = new Set<string>();
  for (const candidate of candidates) {
    const firstName = candidate.name.split(' ')[0].toLowerCase();
    const signOff = candidate.signOffName?.toLowerCase();
    if (mentioned.includes(firstName) || (signOff && mentioned.includes(signOff))) {
      matchedUserIds.add(candidate.id);
    }
  }

  return Array.from(matchedUserIds);
}
