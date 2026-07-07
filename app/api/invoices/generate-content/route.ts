import { db } from '@/lib/db';
import { assertSubAccountAccess } from '@/lib/auth';
import { generateInvoiceContent } from '@/lib/invoiceAI';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { subAccountId, jobDescription } = await req.json();

  if (!subAccountId || !jobDescription?.trim()) {
    return NextResponse.json({ error: 'Missing subAccountId or jobDescription' }, { status: 400 });
  }

  await assertSubAccountAccess(subAccountId);
  const subAccount = await db.subAccount.findUniqueOrThrow({ where: { id: subAccountId } });

  try {
    const result = await generateInvoiceContent({
      jobDescription,
      businessName: subAccount.name,
      industry: subAccount.industry,
    });
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Generation failed' }, { status: 500 });
  }
}
