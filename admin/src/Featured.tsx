import { placeHref } from './links';
import { useMemo, useState } from 'react';
import { featureExpired, fmtDate as fmt, monthLabel, reorderFeatured, rupees, thisMonth, todayIST } from './data';
import { CATEGORY_LABEL, type Payment, type Place } from './types';

const DAY = 86_400_000;

/** Featured / sponsored listings: order, period, fee and this month's payment. */
export function FeaturedTab({ places, payments, clicksThisMonth, onEdit, onUnfeature, act }: {
  places: Place[];
  payments: Payment[];
  clicksThisMonth: Map<string, number>;
  onEdit: (p: Place) => void;
  onUnfeature: (p: Place) => void;
  act: (fn: () => Promise<void>, msg: string) => Promise<void>;
}) {
  const [q, setQ] = useState('');
  const month = thisMonth();
  const today = todayIST();

  const featured = useMemo(
    () => places.filter((p) => p.featuredRank != null).sort((a, b) => (a.featuredRank ?? 0) - (b.featuredRank ?? 0)),
    [places],
  );
  const paidThisMonth = useMemo(
    () => new Map(payments.filter((p) => p.month === month).map((p) => [p.placeId, p])),
    [payments, month],
  );
  const candidates = useMemo(() => {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    if (!words.length) return [];
    return places
      .filter((p) => p.status === 'approved' && p.featuredRank == null)
      .filter((p) => words.every((w) => `${p.name} ${p.taluk} ${p.address ?? ''}`.toLowerCase().includes(w)))
      .slice(0, 8);
  }, [places, q]);

  const move = (i: number, delta: number) => {
    const next = [...featured];
    const [p] = next.splice(i, 1);
    next.splice(i + delta, 0, p);
    act(() => reorderFeatured(next), `Moved ${p.name} to #${i + delta + 1}`);
  };

  const feature = (p: Place) => {
    setQ('');
    onEdit({ ...p, featuredRank: featured.length + 1, featuredLabel: 'Sponsored', featuredFrom: today });
  };

  return (
    <div className="stack">
      <div className="panel">
        <h3>Add a featured business</h3>
        <input className="input" placeholder="Search approved places by name, area or address…" value={q} onChange={(e) => setQ(e.target.value)} />
        {q && (
          <ul className="picker">
            {candidates.length === 0 && <li className="muted small">No matching approved place that isn't already featured.</li>}
            {candidates.map((p) => (
              <li key={p.id}>
                <div>
                  <a className="place-link" href={placeHref(p.id)}><strong>{p.name}</strong></a>
                  <div className="muted small">{CATEGORY_LABEL[p.category] ?? p.category} · {p.taluk}</div>
                </div>
                <button className="btn small primary" onClick={() => feature(p)}>Feature…</button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {featured.length === 0 ? (
        <div className="empty">No featured places yet. Search above to add one.</div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>#</th><th>Business</th><th>Tag</th><th>Period</th><th>Fee / month</th>
                <th>{monthLabel(month, 'short')} payment</th><th>Clicks this month</th><th />
              </tr>
            </thead>
            <tbody>
              {featured.map((p, i) => {
                const paid = paidThisMonth.get(p.id);
                const expired = featureExpired(p);
                const daysLeft = p.featuredUntil ? Math.round((Date.parse(p.featuredUntil) - Date.parse(today)) / DAY) : null;
                return (
                  <tr key={p.id} className={expired ? 'dim' : undefined}>
                    <td className="nowrap">
                      <strong>{p.featuredRank}</strong>
                      <span className="reorder">
                        <button className="icon-btn" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Move up">▲</button>
                        <button className="icon-btn" disabled={i === featured.length - 1} onClick={() => move(i, 1)} aria-label="Move down">▼</button>
                      </span>
                    </td>
                    <td>
                      <a className="place-link" href={placeHref(p.id)}><strong>{p.name}</strong></a>
                      <div className="muted small">{CATEGORY_LABEL[p.category] ?? p.category} · {p.taluk}</div>
                    </td>
                    <td>{p.featuredLabel ? <span className="pill soft">{p.featuredLabel}</span> : <span className="muted">—</span>}</td>
                    <td className="nowrap">
                      <div className="small">{fmt(p.featuredFrom) ?? 'Any time'} → {fmt(p.featuredUntil) ?? 'No end'}</div>
                      {expired ? <span className="pill bad">Ended</span>
                        : daysLeft != null && daysLeft <= 7 ? <span className="pill warn">{daysLeft === 0 ? 'Ends today' : `${daysLeft} day${daysLeft === 1 ? '' : 's'} left`}</span>
                          : p.featuredFrom && p.featuredFrom > today ? <span className="pill soft">Scheduled</span>
                            : <span className="pill">Live</span>}
                    </td>
                    <td>{p.featuredFee ? rupees(p.featuredFee) : <span className="muted">Free</span>}</td>
                    <td>
                      {paid ? <span className="pill">✓ Paid {rupees(paid.amount)}</span>
                        : p.featuredFee ? <span className="pill warn">Due</span>
                          : <span className="muted">—</span>}
                    </td>
                    <td>{(clicksThisMonth.get(p.id) ?? 0).toLocaleString('en-IN')}</td>
                    <td className="nowrap">
                      <button className="btn small" onClick={() => onEdit(p)}>Edit</button>
                      <button className="btn small danger ghost" onClick={() => onUnfeature(p)}>Remove</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="muted small">
        Ended sponsorships are hidden from the app automatically but stay listed here until you remove or renew them.
        Clicks = views + calls + directions + shares.
      </p>
    </div>
  );
}
