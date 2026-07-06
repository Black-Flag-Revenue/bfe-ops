# BFE Ops — Foundation

Agency → Sub-account structure, auth, and dashboard shell. This is the base everything else (CRM, invoicing, site generator, mass email) plugs into.

## What's built
- **Schema** (`prisma/schema.prisma`): Agency, SubAccount, Users with agency-level or sub-account-scoped roles, plus tables for CRM/Invoices/Sites/Email ready for Day 2+.
- **Auth scoping** (`lib/auth.ts`): every data query goes through `getCurrentUserContext()` or `assertSubAccountAccess()` so a sub-account user can never see another client's data.
- **Account switcher**: agency-wide view or scoped to one client, in the top bar.

## Setup (in order)

1. **Supabase**: create a project at supabase.com → Settings → Database → copy the "Transaction pooler" connection string into `DATABASE_URL`.
2. **Clerk**: create an app at clerk.com → copy publishable + secret keys into `.env`.
3. Install and push schema:
   ```
   npm install
   npm run db:push
   ```
4. **Seed your Agency + yourself as OWNER** — run once in `prisma studio` (`npm run db:studio`) or I'll write a seed script next session:
   - Create one `Agency` row ("Black Flag Edge")
   - Create your `User` row with your Clerk ID (visible in Clerk dashboard after you sign up once)
   - Create a `UserAgencyRole` linking you as `OWNER`
5. `npm run dev` — sign up, you should land on the agency dashboard with the switcher showing (empty until sub-accounts exist).

## Branded sending email (per sub-account)
No real inbox needed — just a verified sending domain so mail comes from the client's
own domain instead of a generic address:
1. Go to `/accounts/[slug]/settings/email`
2. Enter a subdomain, e.g. `mg.mobilebuff.com` (keeps it separate from any existing
   email on the root domain — same pattern GHL/Mailgun use)
3. Add the SPF/DKIM records it gives you at the registrar
4. Click "Check verification status" once DNS propagates (~15 min to a few hours)
5. Set the From name, From address, and Reply-to address — reply-to can be any
   existing address, it doesn't need to be hosted in this system

## Shared team inbox (replies + follow-ups)
Instead of individual employee mailboxes, replies thread onto the Contact record
so anyone working that account sees the same conversation:
1. In Resend: Settings → Webhooks → add endpoint → `https://yourapp.com/api/webhooks/resend-inbound`
   → subscribe to the `email.received` event → copy the signing secret into
   `RESEND_WEBHOOK_SECRET` in your env
2. Customer replies to a mass email or invoice → Resend catches it on the
   sub-account's domain → matched to the Contact by email → appears as a
   message in their thread
3. Employee sends a follow-up from inside the contact's page (`sendContactReply`
   in `lib/resend.ts`) → goes out branded as that sub-account, logged to the
   same thread
- Still needs a UI page for the actual thread view (Day 2, alongside CRM)

## Mass cold email (campaigns)
Two separate sending domains per sub-account, deliberately isolated:
- **Transactional domain** (e.g. `mg.mobilebuff.com`) - invoices, reply threads.
  Keep this one's reputation clean; it's tied to real customer relationships.
- **Cold outreach domain** (e.g. `updates.mobilebuff.com`) - all mass campaigns
  send from here instead. If this domain takes a hit from bounces/spam
  complaints (expected at cold-email scale), it never touches the domain
  your invoices and customer replies depend on.

Set up both separately at `/accounts/[slug]/settings/email`. Uses the plain
transactional send API only - never Resend's Audiences/Broadcasts product -
so this is billed purely per-email-sent, no per-contact fees.

**Protecting deliverability (built in, not manual):**
1. Every campaign email gets an automatic unsubscribe footer + your business
   name - CAN-SPAM legal requirement, baked into `sendCampaign()`
2. Subscribe to `email.bounced` and `email.complained` events in Resend's
   webhook settings (same endpoint as inbound replies) - hard bounces and
   spam complaints automatically flag the contact as `suppressed` and they're
   excluded from every future send. This matters more than the unsubscribe
   link for protecting your domain's reputation long-term.
3. **Not built yet, worth doing before real volume**: gradual IP/domain
   warmup (start with lower daily sends on a new cold domain, ramp up over
   1-2 weeks) - sending a huge blast on day one from a brand new domain is
   the single biggest deliverability risk.

Composer: `/accounts/[slug]/campaigns/new`. Sends in batches of 100 via
Resend's batch API, paced to respect their rate limit.
- Still needed: a campaigns list/history page to see past sends and stats
- For real volume (tens of thousands+), move `sendCampaign` off the
  request/response cycle into a background job

## Fixing "prepared statement already exists"
Transaction-mode poolers (like Supabase's) don't support prepared statements
the way Prisma expects by default. Fix: `DATABASE_URL` must end with
`?pgbouncer=true&connection_limit=1`.

## Seeding your sub-accounts
After signing up once (which creates the Agency and makes you OWNER):
```
npm run db:seed
```
Creates: Scottish Tom Heating & Air, The Mobile Buff, Rob's Exterior Services,
Honey Do List, Able Sterling Roofing, Texas Roof Guardians. Safe to re-run -
skips any that already exist.

## Sites (landing page generator) - foundation only
`/accounts/[slug]/sites` - list + create a draft page (city, neighborhood,
headline, selling points). This is step 1 of the hybrid plan discussed:
**Not built yet:**
- Auto-pulled data (storm history, satellite imagery dates)
- Actual HTML generation from the form data
- One-click deploy to Vercel (needs `VERCEL_API_TOKEN`, already in `.env.example`)
Right now creating a site just saves a draft record - no live page yet.

## Next sessions
- **Day 2**: CRM UI (contacts, pipeline board) + seed script for sub-accounts (Scottish Tom, Mobile Buff, etc.) + employee invite flow
- **Day 3**: Invoicing (port your ReportLab logic to `@react-pdf/renderer` or keep PDF gen server-side in Python via a small API route) + owner dashboard
- **Day 4**: Site generator (hybrid form + auto-pull) and mass email via Resend
