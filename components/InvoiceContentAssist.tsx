'use client';

import { useState } from 'react';

export function InvoiceContentAssist({ subAccountId }: { subAccountId: string }) {
  const [jobDescription, setJobDescription] = useState('');
  const [introText, setIntroText] = useState('');
  const [linksText, setLinksText] = useState('');
  const [videosText, setVideosText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasGenerated, setHasGenerated] = useState(false);

  async function handleGenerate() {
    if (!jobDescription.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/invoices/generate-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subAccountId, jobDescription }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Generation failed');

      setIntroText(data.introText || '');
      setLinksText((data.links || []).map((l: any) => `${l.label} | ${l.url}`).join('\n'));
      setVideosText((data.videos || []).map((v: any) => `${v.label} | ${v.url}`).join('\n'));
      setHasGenerated(true);
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4 rounded-sm border border-brass/30 bg-brass/5 p-5">
      <div>
        <span className="font-mono text-[10px] uppercase tracking-wide2 text-brass">AI Content Assist</span>
        <p className="mt-1 text-xs text-muted">
          Describe the job - materials, brands, scope - and this searches for real spec sheets,
          warranty pages, and product videos, plus drafts the intro copy. Review everything below
          before saving; nothing here is final until you submit the form.
        </p>
      </div>

      <textarea
        value={jobDescription}
        onChange={(e) => setJobDescription(e.target.value)}
        rows={3}
        placeholder="Full roof tear-off and replacement, GAF Timberline HDZ architectural shingles, ridge vent upgrade, 10-year workmanship warranty"
        className="w-full rounded-sm border border-line bg-base px-3 py-2 text-sm"
      />

      <button
        type="button"
        onClick={handleGenerate}
        disabled={loading || !jobDescription.trim()}
        className="rounded-sm bg-brass px-4 py-2 font-display text-sm tracking-wide text-base disabled:opacity-40"
      >
        {loading ? 'Searching...' : 'Generate Content'}
      </button>

      {error && <p className="text-xs text-flag">{error}</p>}

      {hasGenerated && (
        <div className="space-y-3 border-t border-brass/20 pt-4">
          <p className="text-xs text-brass">
            Generated below - edit anything before saving. These feed the same fields as manual entry.
          </p>
          <label className="block">
            <span className="font-mono text-[10px] uppercase tracking-wide2 text-muted">Intro / educational copy</span>
            <textarea
              name="introText"
              value={introText}
              onChange={(e) => setIntroText(e.target.value)}
              rows={4}
              className="mt-1 w-full rounded-sm border border-line bg-base px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="font-mono text-[10px] uppercase tracking-wide2 text-muted">Supporting links</span>
            <textarea
              name="links"
              value={linksText}
              onChange={(e) => setLinksText(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-sm border border-line bg-base px-3 py-2 text-sm font-mono"
            />
          </label>
          <label className="block">
            <span className="font-mono text-[10px] uppercase tracking-wide2 text-muted">Videos</span>
            <textarea
              name="videos"
              value={videosText}
              onChange={(e) => setVideosText(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-sm border border-line bg-base px-3 py-2 text-sm font-mono"
            />
          </label>
        </div>
      )}

      {!hasGenerated && (
        <>
          <input type="hidden" name="introText" value={introText} />
          <input type="hidden" name="links" value={linksText} />
          <input type="hidden" name="videos" value={videosText} />
        </>
      )}
    </div>
  );
}
