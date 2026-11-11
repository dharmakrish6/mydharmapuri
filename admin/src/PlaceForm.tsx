import { useState } from 'react';
import { CATEGORIES, EMPTY_DRAFT, TALUKS, type Place, type PlaceDraft } from './types';

/** Modal form for adding a new place or editing an existing one. */
export function PlaceForm({ initial, onSave, onCancel }: {
  initial: Place | null;
  onSave: (draft: PlaceDraft) => Promise<void>;
  onCancel: () => void;
}) {
  const [d, setD] = useState<PlaceDraft>(() => {
    if (!initial) return EMPTY_DRAFT;
    const draft = { ...EMPTY_DRAFT };
    for (const k of Object.keys(EMPTY_DRAFT) as (keyof PlaceDraft)[]) {
      (draft as Record<string, unknown>)[k] = initial[k] ?? EMPTY_DRAFT[k];
    }
    return draft;
  });
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof PlaceDraft>(k: K, v: PlaceDraft[K]) => setD((prev) => ({ ...prev, [k]: v }));
  const text = (k: keyof PlaceDraft) => ({
    value: (d[k] as string | null) ?? '',
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => set(k, e.target.value as never),
  });
  const sub = CATEGORIES.find((c) => c.key === d.category)?.subLabel;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await onSave(d);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <h2>{initial ? 'Edit place' : 'Add place'}</h2>
        {initial?.submittedBy && (
          <p className="muted small">Submitted by {initial.submittedBy.name} {initial.submittedBy.email}</p>
        )}

        <div className="grid2">
          <label>Category
            <select className="input" value={d.category} onChange={(e) => set('category', e.target.value as PlaceDraft['category'])}>
              {CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
            </select>
          </label>
          <label>Area (taluk)
            <select className="input" value={d.taluk} onChange={(e) => set('taluk', e.target.value)}>
              {TALUKS.map((t) => <option key={t}>{t}</option>)}
            </select>
          </label>
        </div>

        <label>Name *<input className="input" required minLength={2} {...text('name')} /></label>

        <div className="grid2">
          {sub && <label>{sub}<input className="input" placeholder="Used for the filter chips" {...text('subcategory')} /></label>}
          <label>Phone<input className="input" {...text('phone')} /></label>
        </div>

        <label>Address<textarea className="input" rows={2} {...text('address')} /></label>

        <div className="grid2">
          {d.category === 'hospitals' && (
            <label>Ownership
              <select className="input" value={d.ownership ?? ''} onChange={(e) => set('ownership', e.target.value || null)}>
                <option value="">—</option><option>Government</option><option>Private</option>
              </select>
            </label>
          )}
          {d.category === 'colleges' && (
            <label>Type
              <select className="input" value={d.type ?? ''} onChange={(e) => set('type', e.target.value || null)}>
                <option value="">—</option><option>Government</option><option>Government-Aided</option><option>Private</option>
              </select>
            </label>
          )}
          {d.category === 'showrooms' && <label>Brand<input className="input" {...text('brand')} /></label>}
        </div>

        <label>About / description<textarea className="input" rows={3} {...text('description')} /></label>
        {d.category === 'sightseeing' && <label>How to reach<textarea className="input" rows={2} {...text('howToReach')} /></label>}

        <fieldset>
          <legend>Visibility</legend>
          <div className="grid3">
            <label>Status
              <select className="input" value={d.status} onChange={(e) => set('status', e.target.value as PlaceDraft['status'])}>
                <option value="approved">Approved (live)</option>
                <option value="pending">Pending</option>
                <option value="rejected">Rejected</option>
              </select>
            </label>
            <label>Featured position
              <input
                className="input"
                type="number"
                min={1}
                placeholder="Not featured"
                value={d.featuredRank ?? ''}
                onChange={(e) => set('featuredRank', e.target.value ? Number(e.target.value) : null)}
              />
            </label>
            <label>Featured tag
              <input className="input" placeholder="e.g. Sponsored" disabled={d.featuredRank == null} {...text('featuredLabel')} />
            </label>
          </div>
          <p className="muted small">Featured places are pinned first in "Frequently looked up" (1 = first). The rest of that row fills with the most-viewed places.</p>
        </fieldset>

        <div className="actions end">
          <button type="button" className="btn ghost" onClick={onCancel}>Cancel</button>
          <button type="submit" className="btn primary" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
        </div>
      </form>
    </div>
  );
}
