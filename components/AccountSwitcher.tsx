'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

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

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-3 rounded-sm border border-line bg-panel px-3 py-2 hover:border-brass/60 transition-colors"
      >
        <span
          className="h-2 w-2 rounded-full"
          style={{ backgroundColor: current?.brandColor || '#B8933F' }}
        />
        <span className="font-mono text-xs tracking-wide2 text-muted uppercase">
          {current ? 'Account' : 'Agency'}
        </span>
        <span className="font-display text-lg leading-none tracking-wide">
          {current ? current.name : 'Black Flag Edge — All Accounts'}
        </span>
        <svg
          className={`h-3 w-3 text-muted transition-transform ${open ? 'rotate-180' : ''}`}
          viewBox="0 0 12 12"
          fill="none"
        >
          <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-80 rounded-sm border border-line bg-panel shadow-xl">
          {isAgencyLevel && (
            <button
              onClick={() => select(null)}
              className="flex w-full items-center gap-3 border-b border-line px-3 py-2.5 text-left hover:bg-base"
            >
              <span className="h-2 w-2 rounded-full bg-brass" />
              <div>
                <div className="font-display text-base leading-none">All Accounts</div>
                <div className="font-mono text-[10px] uppercase tracking-wide2 text-muted mt-0.5">
                  Agency dashboard
                </div>
              </div>
            </button>
          )}
          <div className="max-h-80 overflow-y-auto">
            {accounts.map((acct) => (
              <button
                key={acct.id}
                onClick={() => select(acct.slug)}
                className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-base"
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: acct.brandColor || '#4A4F4D' }}
                />
                <div>
                  <div className="font-display text-base leading-none">{acct.name}</div>
                  {acct.industry && (
                    <div className="font-mono text-[10px] uppercase tracking-wide2 text-muted mt-0.5">
                      {acct.industry}
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
