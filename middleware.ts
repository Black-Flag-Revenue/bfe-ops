import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { isOpsHost } from './lib/opsHost';

const isPublicRoute = createRouteMatcher(['/sign-in(.*)', '/sign-up(.*)', '/estimate(.*)']);

export default clerkMiddleware((auth, req) => {
  const host = req.headers.get('host') || '';

  if (!isOpsHost(host)) {
    // Client public site traffic - skip Clerk entirely, let it fall through
    // to the page components which do their own domain lookup.
    return NextResponse.next();
  }

  if (!isPublicRoute(req)) {
    auth().protect();
  }
});

export const config = {
  matcher: ['/((?!_next|.*\\..*).*)', '/', '/(api|trpc)(.*)'],
};
