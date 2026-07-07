import { db } from '@/lib/db';
import { assertSubAccountAccess } from '@/lib/auth';
import Link from 'next/link';
import {
  LayoutDashboard, Users, GitBranch, FileText, Globe, Send,
  ShieldOff, Settings, Palette, Mail, PlusCircle, ArrowRight,
} from 'lucide-react';

export default async function SubAccountHome({ params }: { params: { slug: string } }) {
  const subAccount = await db.subAccount.findUniqueOrThrow({ where: { slug: params.slug } });
  await assertSubAccountAccess(subAccount.id);

  const [contactCount, openDealsCount, sitesLive] = await Promise.all([
    db.contact.count({ where: { subAccountId: subAccount.id } }),
    db.deal.count({ where: { subAccountId: subAccount.id, stage: { name: { notIn: ['Won', 'Lost'] } } } }),
    db.site.count({ where: { subAccountId: subAccount.id, status: 'PUBLISHED' } }),
  ]);

  const slug = params.slug;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            {subAccount.logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={subAccount.logoUrl} alt="" className="h-9 w-9 rounded-sm object-cover border border-line" />
            )}
            <h1 className="font-display text-3xl tracking-wide">{subAccount.name}</h1>
          </div>
          {subAccount.industry && (
            <span className="mt-1 inline-block rounded-full border border-line px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wide2 text-muted">
              {subAccount.industry}
            </span>
          )}
        </div>
        <div className="hidden gap-3 sm:flex">
          <QuickStat label="Contacts" value={contactCount} />
          <QuickStat label="Open Deals" value={openDealsCount} />
          <QuickStat label="Sites Live" value={sitesLive} />
        </div>
      </div>

      <div>
        <SectionLabel>Quick actions</SectionLabel>
        <div className="mt-3 flex flex-wrap gap-2">
          <QuickAction href={`/accounts/${slug}/contacts/new`} icon={PlusCircle} label="New Contact" />
          <QuickAction href={`/accounts/${slug}/invoices/new`} icon={PlusCircle} label="New Estimate" />
          <QuickAction href={`/accounts/${slug}/campaigns/new`} icon={PlusCircle} label="New Campaign" />
          <QuickAction href={`/accounts/${slug}/sites/new`} icon={PlusCircle} label="New Site" />
        </div>
      </div>

      <div>
        <SectionLabel>Sales & CRM</SectionLabel>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <NavCard href={`/accounts/${slug}/dashboard`} icon={LayoutDashboard} title="Dashboard" desc="Performance at a glance" />
          <NavCard href={`/accounts/${slug}/contacts`} icon={Users} title="Contacts" desc={`${contactCount} on file`} />
          <NavCard href={`/accounts/${slug}/pipeline`} icon={GitBranch} title="Pipeline" desc={`${openDealsCount} open deals`} />
          <NavCard href={`/accounts/${slug}/invoices`} icon={FileText} title="Estimates & Invoices" desc="Interactive, tracked" />
        </div>
      </div>

      <div>
        <SectionLabel>Marketing & Web</SectionLabel>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <NavCard href={`/accounts/${slug}/sites`} icon={Globe} title="Sites" desc={`${sitesLive} live`} />
          <NavCard href={`/accounts/${slug}/campaigns`} icon={Send} title="Campaigns" desc="History & stats" />
          <NavCard href={`/accounts/${slug}/suppression`} icon={ShieldOff} title="Suppression List" desc="Bounces & unsubscribes" />
        </div>
      </div>

      <div>
        <SectionLabel>Settings</SectionLabel>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <NavCard href={`/accounts/${slug}/settings/general`} icon={Settings} title="General" desc="Name, industry, logo" />
          <NavCard href={`/accounts/${slug}/settings/website`} icon={Palette} title="Website" desc="Domain & branding" />
          <NavCard href={`/accounts/${slug}/settings/email`} icon={Mail} title="Email" desc="Sending domains" />
        </div>
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-mono text-[10px] uppercase tracking-wide2 text-muted">{children}</h2>
  );
}

function QuickStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-sm border border-line bg-panel px-4 py-2 text-center">
      <div className="font-display text-xl leading-none">{value}</div>
      <div className="mt-1 font-mono text-[9px] uppercase tracking-wide2 text-muted">{label}</div>
    </div>
  );
}

function QuickAction({ href, icon: Icon, label }: { href: string; icon: any; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-1.5 rounded-full border border-brass/40 bg-brass/5 px-3.5 py-1.5 text-xs text-brass transition-colors hover:bg-brass/10"
    >
      <Icon size={14} strokeWidth={2} />
      {label}
    </Link>
  );
}

function NavCard({ href, icon: Icon, title, desc }: { href: string; icon: any; title: string; desc: string }) {
  return (
    <Link
      href={href}
      className="group flex items-start gap-3 rounded-sm border border-line bg-panel p-4 transition-all hover:border-brass/50 hover:bg-panel/80"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm border border-line bg-base text-muted transition-colors group-hover:border-brass/50 group-hover:text-brass">
        <Icon size={18} strokeWidth={1.75} />
      </div>
      <div className="flex-1">
        <div className="font-display text-base leading-tight text-ink">{title}</div>
        <div className="mt-0.5 text-xs text-muted">{desc}</div>
      </div>
      <ArrowRight size={16} className="mt-2 shrink-0 text-muted opacity-0 transition-opacity group-hover:opacity-100" />
    </Link>
  );
}
