import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * Public endpoint - the person clicking this link isn't logged into the app,
 * they're a customer clicking a link in an email. No auth check on purpose.
 */
export async function GET(req: NextRequest) {
  const contactId = req.nextUrl.searchParams.get('contact');
  if (!contactId) {
    return new NextResponse('Invalid unsubscribe link', { status: 400 });
  }

  await db.contact.update({
    where: { id: contactId },
    data: { unsubscribed: true },
  });

  return new NextResponse(
    `<html><body style="font-family:sans-serif;text-align:center;padding:60px;">
      <h2>You've been unsubscribed.</h2>
      <p>You won't receive further emails from this list.</p>
    </body></html>`,
    { headers: { 'Content-Type': 'text/html' } }
  );
}
