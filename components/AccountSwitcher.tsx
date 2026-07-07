'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LayoutGrid, Home, Wind, Car, Wrench, Droplets, Briefcase, ChevronDown } from 'lucide-react';

const INDUSTRY_ICONS: Record<string, any> = {
  Roofing: Home,
  HVAC: Wind,
  Detailing: Car,
  Handyman: Wrench,
  'Exterior Cleaning': Droplets,
};

type SubAccount = {
  id: string;
  name: string;
  slug: string;
  industry: string | null;
  brandColor: string | null;
};

export function AccountSwitcher({
  current,
  accounts,
  isAgencyLevel,
}: {
  current: SubAccount | null; // null = viewing agency-wide dashboard
  accounts: SubAccount[];
  isAgencyLevel: boolean;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  function select(slug: string | null) {
    setOpen(false);
    router.push(slug ? `/accounts/${slug}` : '/agency');
  }

  const CurrentIcon = current?.industry ? INDUSTRY_ICONS[current.industry] || Briefcase : LayoutGrid;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-3 rounded-sm border border-line bg-panel px-3 py-2 transition-colors hover:border-brass/40"
      >
        <div
          className="flex h-7 w-7 items-center justify-center rounded-full border"
          style={{
            borderColor: current?.brandColor ? `${current.brandColor}50` : 'rgba(184,147,63,0.35)',
            color: current?.brandColor || '#B8933F',
          }}
        >
          <CurrentIcon size={13} strokeWidth={1.75} />
        </div>
        <span className="font-mono text-[10px] uppercase tracking-wide2 text-muted">
          {current ? 'Account' : 'Agency'}
        </span>
        <span className="font-serif text-lg font-semibold leading-none text-ink">
          {current ? current.name : 'Black Flag Edge — All Accounts'}
        </span>
        <ChevronDown size={14} className={`text-muted transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-80 rounded-sm border border-line bg-panel shadow-xl">
          {isAgencyLevel && (
            <button
              onClick={() => select(null)}
              className="flex w-full items-center gap-3 border-b border-line px-3 py-2.5 text-left hover:bg-base/60"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full border border-brass/40 text-brass">
                <LayoutGrid size={14} strokeWidth={1.75} />
              </div>
              <div>
                <div className="font-serif text-base font-semibold leading-none text-ink">All Accounts</div>
                <div className="mt-1 font-mono text-[10px] uppercase tracking-wide2 text-muted">
                  Agency dashboard
                </div>
              </div>
            </button>
          )}
          <div className="max-h-80 overflow-y-auto">
            {accounts.map((acct) => {
              const Icon = (acct.industry && INDUSTRY_ICONS[acct.industry]) || Briefcase;
              return (
                <button
                  key={acct.id}
                  onClick={() => select(acct.slug)}
                  className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-base/60"
                >
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-full border"
                    style={{
                      borderColor: acct.brandColor ? `${acct.brandColor}50` : 'rgba(74,79,77,0.5)',
                      color: acct.brandColor || '#8A8F8B',
                    }}
                  >
                    <Icon size={14} strokeWidth={1.75} />
                  </div>
                  <div>
                    <div className="font-serif text-base font-semibold leading-none text-ink">{acct.name}</div>
                    {acct.industry && (
                      <div className="mt-1 font-mono text-[10px] uppercase tracking-wide2 text-muted">
                        {acct.industry}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
