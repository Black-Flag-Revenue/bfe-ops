'use client';

import { useState } from 'react';
import Link from 'next/link';
import { UsersRound } from 'lucide-react';

type Contact = {
  id: string;
  firstName: string;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  state: string | null;
  tags: string[];
  suppressed: boolean;
  unsubscribed: boolean;
  owner: { name: string } | null;
};

export function ContactsBulkTable({
  contacts,
  slug,
  bulkAddTag,
  bulkDeleteContacts,
  canDelete,
}: {
  contacts: Contact[];
  slug: string;
  bulkAddTag: (contactIds: string[], tag: string) => Promise<void>;
  bulkDeleteContacts: (contactIds: string[]) => Promise<void>;
  canDelete: boolean;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [tagInput, setTagInput] = useState('');
  const [busy, setBusy] = useState(false);

  const allSelected = contacts.length > 0 && selected.size === contacts.length;

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(contacts.map((c) => c.id)));
  }
  function toggleOne(id: string) {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  }

  async function handleAddTag() {
    if (!tagInput.trim() || selected.size === 0) return;
    setBusy(true);
    await bulkAddTag(Array.from(selected), tagInput.trim());
    setBusy(false);
    setTagInput('');
    setSelected(new Set());
  }

  async function handleDelete() {
    if (selected.size === 0) return;
    if (!confirm(`Delete ${selected.size} contact${selected.size === 1 ? '' : 's'}? This can't be undone.`)) return;
    setBusy(true);
    await bulkDeleteContacts(Array.from(selected));
    setBusy(false);
    setSelected(new Set());
  }

  return (
    <div className="space-y-3">
      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-sm border border-brass/40 bg-brass/5 p-3">
          <span className="font-mono text-xs text-brass">{selected.size} selected</span>
          <input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            placeholder="Tag to apply..."
            className="rounded-sm border border-line bg-base px-2 py-1 text-sm"
          />
          <button
            onClick={handleAddTag}
            disabled={busy || !tagInput.trim()}
            className="rounded-sm bg-brass px-3 py-1 font-mono text-[10px] uppercase tracking-wide2 text-base disabled:opacity-40"
          >
            Apply Tag
          </button>
          <Link
            href={`/accounts/${slug}/campaigns/new`}
            className="rounded-sm border border-line px-3 py-1 font-mono text-[10px] uppercase tracking-wide2 hover:border-brass/60"
          >
            Tag it, then build a campaign →
          </Link>
          <button
            onClick={handleDelete}
            disabled={busy}
            className="ml-auto rounded-sm border border-flag px-3 py-1 font-mono text-[10px] uppercase tracking-wide2 text-flag disabled:opacity-40"
            style={{ display: canDelete ? undefined : 'none' }}
          >
            Delete Selected
          </button>
        </div>
      )}

      <div className="overflow-x-auto rounded-sm border border-line">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line bg-panel text-left font-mono text-[10px] uppercase tracking-wide2 text-muted">
              <th className="p-3 w-10">
                <input type="checkbox" checked={allSelected} onChange={toggleAll} />
              </th>
              <th className="p-3">Name</th>
              <th className="p-3">Contact</th>
              <th className="p-3">Location</th>
              <th className="p-3">Tags</th>
              <th className="p-3">Owner</th>
              <th className="p-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {contacts.map((c) => (
              <tr key={c.id} className="border-b border-line last:border-0 hover:bg-panel/50">
                <td className="p-3">
                  <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggleOne(c.id)} />
                </td>
                <td className="p-3">
                  <Link href={`/accounts/${slug}/contacts/${c.id}`} className="hover:text-brass">
                    {c.firstName} {c.lastName}
                  </Link>
                </td>
                <td className="p-3 text-muted">
                  <div>{c.email}</div>
                  <div className="font-mono text-xs">{c.phone}</div>
                </td>
                <td className="p-3 text-muted">{c.city}{c.state ? `, ${c.state}` : ''}</td>
                <td className="p-3">
                  <div className="flex flex-wrap gap-1">
                    {c.tags.map((t) => (
                      <span key={t} className="rounded-full border border-line px-2 py-0.5 font-mono text-[10px] text-muted">
                        {t}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="p-3 text-muted">
                  {c.owner ? c.owner.name : <span className="text-flag">Unassigned</span>}
                </td>
                <td className="p-3">
                  {c.suppressed ? (
                    <span className="font-mono text-[10px] uppercase tracking-wide2 text-flag">Suppressed</span>
                  ) : c.unsubscribed ? (
                    <span className="font-mono text-[10px] uppercase tracking-wide2 text-muted">Unsubscribed</span>
                  ) : (
                    <span className="font-mono text-[10px] uppercase tracking-wide2 text-ink">Active</span>
                  )}
                </td>
              </tr>
            ))}
            {contacts.length === 0 && (
              <tr>
                <td colSpan={7} className="p-10 text-center">
                  <UsersRound size={28} strokeWidth={1.5} className="mx-auto text-line" />
                  <p className="mt-2 text-sm text-muted">No contacts match these filters.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
