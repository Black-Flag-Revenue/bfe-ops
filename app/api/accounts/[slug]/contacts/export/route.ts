import { db } from '@/lib/db';
import { assertSubAccountAccess } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

function csvEscape(value: string | null | undefined): string {
  if (!value) return '';
  const needsQuotes = value.includes(',') || value.includes('"') || value.includes('\n');
  const escaped = value.replace(/"/g, '""');
  return needsQuotes ? `"${escaped}"` : escaped;
}

export async function GET(req: NextRequest, { params }: { params: { slug: string } }) {
  const subAccount = await db.subAccount.findUniqueOrThrow({ where: { slug: params.slug } });
  await assertSubAccountAccess(subAccount.id);

  const contacts = await db.contact.findMany({
    where: { subAccountId: subAccount.id },
    include: { owner: true },
    orderBy: { createdAt: 'desc' },
  });

  const headers = [
    'firstName', 'lastName', 'email', 'phone', 'address', 'city', 'state', 'zip',
    'source', 'tags', 'owner', 'unsubscribed', 'suppressed', 'createdAt',
  ];

  const rows = contacts.map((c) =>
    [
      c.firstName, c.lastName, c.email, c.phone, c.address, c.city, c.state, c.zip,
      c.source, c.tags.join(';'), c.owner?.name || '', c.unsubscribed.toString(),
      c.suppressed.toString(), c.createdAt.toISOString(),
    ]
      .map(csvEscape)
      .join(',')
  );

  const csv = [headers.join(','), ...rows].join('\n');

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="${subAccount.slug}-contacts.csv"`,
    },
  });
}
