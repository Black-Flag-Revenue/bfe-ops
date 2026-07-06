import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

const SUB_ACCOUNTS: { name: string; industry: string }[] = [
  { name: 'Scottish Tom Heating & Air', industry: 'HVAC' },
  { name: 'The Mobile Buff', industry: 'Detailing' },
  { name: "Rob's Exterior Services", industry: 'Exterior Cleaning' },
  { name: 'Honey Done List', industry: 'Handyman' },
  { name: 'Able Sterling Roofing', industry: 'Roofing' },
  { name: 'Texas Roof Guardians', industry: 'Roofing' },
  { name: 'Wrench Rescue', industry: 'Handyman' },
];

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

async function main() {
  const agency = await db.agency.findFirst();
  if (!agency) {
    throw new Error(
      'No Agency found yet. Sign up through the app first (that creates the Agency) - then re-run this seed script.'
    );
  }

  for (const acct of SUB_ACCOUNTS) {
    const slug = slugify(acct.name);
    const existing = await db.subAccount.findUnique({ where: { slug } });
    if (existing) {
      console.log(`Skipping "${acct.name}" - already exists`);
      continue;
    }
    await db.subAccount.create({
      data: { agencyId: agency.id, name: acct.name, slug, industry: acct.industry },
    });
    console.log(`Created "${acct.name}" (${slug})`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
