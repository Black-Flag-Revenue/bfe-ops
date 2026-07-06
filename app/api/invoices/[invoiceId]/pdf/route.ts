import { db } from '@/lib/db';
import { assertSubAccountAccess } from '@/lib/auth';
import { InvoicePdfDocument } from '@/lib/invoicePdf';
import { LineItem } from '@/lib/invoiceParsing';
import { renderToBuffer } from '@react-pdf/renderer';
import { NextRequest, NextResponse } from 'next/server';
import React from 'react';

export async function GET(req: NextRequest, { params }: { params: { invoiceId: string } }) {
  const invoice = await db.invoice.findUniqueOrThrow({
    where: { id: params.invoiceId },
    include: { subAccount: true, contact: true },
  });

  await assertSubAccountAccess(invoice.subAccountId);

  const element = React.createElement(InvoicePdfDocument, {
    invoice,
    subAccountName: invoice.subAccount.name,
    contactName: invoice.contact ? `${invoice.contact.firstName} ${invoice.contact.lastName}` : null,
    lineItems: invoice.lineItems as unknown as LineItem[],
  });

  const buffer = await renderToBuffer(element as any);

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${invoice.number}.pdf"`,
    },
  });
}
