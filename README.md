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

## Employee access
`/agency/team` (agency-level users only) - invite by email, choose:
- **All accounts** - agency-wide access, same as you
- **Specific accounts** - checkbox picker, scoped to only those sub-accounts
Invites work before someone signs up: stored as a "pending invite" and
automatically converted to real access the moment that email signs in via
Clerk for the first time - no coordination needed on timing.

## Branding & employee photos
- Logo lives at `public/logo.png`, shown in the header with a light backing
  chip (the logo's black text would disappear on our dark header otherwise)
- `/agency/profile` - set your own photo (paste a URL for now - real
  drag-and-drop upload via Supabase Storage is the next step), sign-off
  name/title used automatically on outbound emails

## CRM - now built
- `/accounts/[slug]/contacts` - searchable list, filter by tag
- `/accounts/[slug]/contacts/new` - create a contact; fields adapt to the
  sub-account's industry (see `lib/industryFields.ts` - roofing gets roof
  type/age, detailing gets vehicle make/model, etc.). Add more industries
  there as needed.
- `/accounts/[slug]/contacts/[contactId]` - full detail: info, industry
  fields, notes, deals, and the shared conversation thread (reply sends
  through `sendContactReply`, same as before)
- `/accounts/[slug]/pipeline` - simple board, auto-creates a default
  5-stage pipeline (New Lead → Contacted → Quoted → Won → Lost) on first
  visit. Move deals between stages via dropdown (no drag-and-drop yet)
- Deals are created from a contact's page, not the pipeline board directly

## Employee invites - now with name/photo
Team invite form asks for name + photo URL before sending - applied
automatically the moment they sign up, so you're not stuck with whatever
name/photo their Google/Clerk account happens to have.

## Bulk contact import
`/accounts/[slug]/contacts/import` - upload a CSV. Header row required,
recognized columns: firstName (only one that's required), lastName, email,
phone, address, city, state, zip, source, tags (comma or semicolon
separated within the cell). Skips rows with no firstName, and skips
duplicate emails within that sub-account.

## Public client websites - one deployment, many domains
No Vercel, no second host. One running Replit deployment serves the CRM
(behind login) AND every client's public website (no login), decided by
which domain the visitor typed in.

**How it works:**
- `OPS_APP_HOSTS` env var lists YOUR app's own domain(s) - anything else is
  treated as a client's public site and skips Clerk auth entirely
- Each SubAccount has a `primaryDomain` (e.g. `mobilebuff.com`), set at
  `/accounts/[slug]/settings/website`
- To actually go live: add that domain in Replit's own deployment settings
  (Settings → Domains), pointing DNS at the same deployment you already have
- A site marked `isHomepage` renders at the bare domain; any other site
  renders at `yourdomain.com/[pathSlug]` (e.g. `/inland-estates`)
- Sites are DRAFT until you hit Publish on the Sites list page

**REQUIRED before this works: set `OPS_APP_HOSTS`** to your actual Replit
dev/deployment URL(s), or the app will think ITS OWN domain is a client site
and break the CRM.

**Template:** `components/PublicSiteTemplate.tsx` - one clean single-page
layout (hero, selling points, call button) used for every site, styled with
that sub-account's brand color/logo/phone. Not fancy yet, but real and live.

## SEO / AEO (answer engine optimization)
Built into every public site automatically:
- **Structured data (schema.org JSON-LD)**: LocalBusiness (typed per industry -
  RoofingContractor, HVACBusiness, AutoDetailing, etc.) with address, phone,
  service areas. This is what Google, Bing, and AI answer engines (ChatGPT,
  Perplexity, Google AI Overviews) actually parse for facts.
- **FAQPage schema** - add FAQs per site (`Question | Answer` per line in the
  site form). Visible on the page AND in structured data - this is
  specifically what voice assistants (Siri, Alexa via Bing/Google's index)
  and AI chat answer engines pull direct answers from.
- **Dynamic meta tags** per page - title, description, Open Graph, Twitter
  Card, canonical URL. Auto-generated if you leave the SEO fields blank.
- **Per-domain `robots.txt` and `sitemap.xml`** - correct for whichever
  client domain is being visited, allows all crawlers (including AI bot
  crawlers like GPTBot, ClaudeBot, PerplexityBot - they respect standard
  robots.txt same as Googlebot).

**What this does NOT do, and no software can:**
- Guarantee a ranking position - that's earned through backlinks, reviews,
  content depth, and time, same as any competitor
- Submit sites to Google/Bing automatically - you still manually add each
  domain to Google Search Console and Bing Webmaster Tools (both free, one-
  time per domain, ~5 min) and submit the sitemap URL there
- Guarantee inclusion in any specific AI answer engine - those crawl and
  select sources on their own criteria; good structured data improves the
  odds, it doesn't force it

## Dashboards - three tiers
- `/agency/dashboard` - company-wide, any agency-level user (OWNER or ADMIN):
  total contacts, open pipeline value, deals won (30d), sites live, emails
  sent (30d), combined activity feed across every sub-account
- `/agency/eyes-only` - **OWNER role only, not ADMIN** - per-employee stats
  (contacts added, notes, emails sent, deals owned/won, last 30 days). Not
  visible to other agency-level admins even if they have full account access.
- `/accounts/[slug]/dashboard` - per-sub-account, visible to anyone with
  access to that account: contacts, pipeline, deals won, sites live, last
  campaign stats, recent replies

Note: "Deals Owned" on the Eyes Only dashboard will read 0 until deal
creation actually sets an owner - that assignment isn't wired into the deal
form yet (deals are created from a contact's page with no owner picker).

## CRM gaps still open (noted, not blocking)
- No deal editing (title/value) after creation, no delete
- Pipeline stages are fixed at creation (New Lead → Contacted → Quoted →
  Won → Lost) - no UI to rename/add/reorder stages per sub-account yet
- No deal detail view - just what shows on the contact page and board

## Bulk contact actions / cold email segmentation
Contacts list now has real filters, feeding into the existing tag-based
campaign system rather than duplicating it:
- **Added date range**: filter by when the contact was created/imported
- **Pipeline stage**: contacts with a deal currently sitting in a given stage
- **Never sent a campaign**: contacts with zero entries in the new
  `CampaignRecipient` table (added specifically for this - previously we
  only stored aggregate send counts, not which contacts got what)
- **Checkbox selection** + **bulk tag** + **bulk delete** on filtered
  results. Workflow: filter to a segment → select → apply a new tag like
  `cold-batch-july` → New Campaign → target that tag.

## Contact ownership rules
- Manually adding a contact through the form auto-assigns you as owner
- CSV imports leave contacts unowned (no owner)
- Any employee with access can **claim** an unowned contact (button on the
  contact page) - first to claim it owns it
- Once a contact has an owner, **only the Agency OWNER role** can reassign
  it to someone else - regular employees and even ADMIN-level agency users
  cannot reassign an already-owned contact
- Deals inherit the same pattern: whoever creates a deal becomes its owner

## Contact editing
`/accounts/[slug]/contacts/[contactId]/edit` - anyone with access can edit
any field (name, contact info, address, tags, industry-specific fields).
Owner is deliberately NOT part of this form - it's managed separately via
the claim/reassign flow described above, so it can't be casually changed
while editing other details.

## Contacts search
Now searches name, address, email, and phone (not just city).

## Estimates / Invoices - interactive pages, not PDFs
The core deliverable: instead of a static PDF, the customer gets a link to a
real page they interact with, and you get real signal back.

**Creating one** (`/accounts/[slug]/invoices/new`):
- Line items support an optional "option group" - label multiple items
  "Good"/"Better"/"Best" (or whatever names you want) and the customer sees
  them as selectable tiers, not a flat list
- Add supporting links (photos, warranty docs) and videos (YouTube/Vimeo
  auto-embed) - all shown right on the page

**The customer's page** (`/estimate/[publicToken]` - public, no login):
- Sees the option tiers, videos, links
- Picks ONE option group and hits Approve
- Once accepted, the page shows a simple confirmation instead of the form
- Every view is tracked: `viewCount`, `firstViewedAt`, `lastViewedAt`,
  status auto-advances DRAFT/SENT → VIEWED the first time it's opened

**What happens after acceptance** (matches how you actually work - no
payment processing, no customer self-scheduling):
- You see the acceptance + chosen option on the invoice's internal detail
  page (`/accounts/[slug]/invoices/[invoiceId]`)
- Download a clean PDF summary of exactly what was accepted (built with
  `@react-pdf/renderer`) to hand off to the contractor
- Set a `scheduledDate` yourself once you've coordinated with them

**Not built / explicitly out of scope per your call:**
- No payment collection - that's directly between contractor and customer
- No customer-facing self-scheduling - you schedule after acceptance

## Next sessions
- **Day 2**: CRM UI (contacts, pipeline board) + seed script for sub-accounts (Scottish Tom, Mobile Buff, etc.) + employee invite flow
- **Day 3**: Invoicing (port your ReportLab logic to `@react-pdf/renderer` or keep PDF gen server-side in Python via a small API route) + owner dashboard
- **Day 4**: Site generator (hybrid form + auto-pull) and mass email via Resend
