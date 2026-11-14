import { useMemo, useState } from 'react';
import {
  featureExpired, featuredInMonth, fmtDate, monthLabel, monthsEnding, recordPayment, removePayment, rupees,
  shiftMonth, statTotal, thisMonth, todayIST, updatePlace, usePlaceStats,
} from './data';
import { Change } from './Analytics';
import { MonthPicker } from './MonthPicker';
import { BarChart, PaymentForm, Tile, type Row } from './Payments';
import { PlaceForm } from './PlaceForm';
import { CATEGORY_LABEL, STAT_KEYS, type Payment, type Place, type PlaceStats, type PlaceStatus, type StatKey } from './types';

export type Section = 'analytics' | 'edit' | 'payments';
const SECTIONS: { key: Section; label: string }[] = [
  { key: 'analytics', label: 'Analytics' },
  { key: 'edit', label: 'Edit details' },
  { key: 'payments', label: 'Sponsorship & payments' },
];

const SITE = 'https://mydharmapuri.com';
const HISTORY_MONTHS = 12;

/** One business: header with status/actions, then analytics, the edit form, and its payment ledger. */
export function PlaceDetail({ place, section, payments, userEmail, act, onStatus, onDelete }: {
  place: Place;
  section: Section;
  payments: Payment[];
  userEmail: string | null;
  act: (fn: () => Promise<void>, msg: string) => Promise<void>;
  onStatus: (p: Place, s: PlaceStatus) => void;
  onDelete: (p: Place) => void;
}) {
  const sectionHref = (s: Section) => `#/place/${encodeURIComponent(place.id)}${s === 'analytics' ? '' : `/${s}`}`;
  return (
    <div className="stack">
      <a className="back" href="#">← All places</a>

      <header className="detail-head panel">
        <div className="detail-title">
          <div className="card-head">
            <span className="pill">{CATEGORY_LABEL[place.category] ?? place.category}</span>
            {place.subcategory && <span className="pill soft">{place.subcategory}</span>}
            <span className="pill soft">{place.taluk}</span>
            {place.featuredRank != null && (
              <span className={`pill ${featureExpired(place) ? 'bad' : 'warn'}`}>
                Featured #{place.featuredRank}{featureExpired(place) ? ' · expired' : ''}
              </span>
            )}
          </div>
          <h1>{place.name}</h1>
          <p className="muted small">
            {[place.phone, place.address].filter(Boolean).join(' · ') || 'No phone or address yet'}
          </p>
          <p className="muted small">
            {place.source === 'user' && place.submittedBy ? `Submitted by ${place.submittedBy.name ?? ''} ${place.submittedBy.email ?? ''} · ` : ''}
            {place.createdAt && `Added ${place.createdAt.toDate().toLocaleDateString('en-IN')}`}
            {place.updatedAt && ` · Updated ${place.updatedAt.toDate().toLocaleDateString('en-IN')}`}
          </p>
        </div>
        <div className="detail-actions">
          <select className={`input status ${place.status}`} value={place.status} onChange={(e) => onStatus(place, e.target.value as PlaceStatus)}>
            <option value="approved">Approved (live)</option>
            <option value="pending">Pending</option>
            <option value="rejected">Rejected</option>
          </select>
          {place.status === 'approved' && (
            <a className="btn small" href={`${SITE}/place/${encodeURIComponent(place.id)}`} target="_blank" rel="noreferrer">View on site ↗</a>
          )}
          <button className="btn small danger ghost" onClick={() => onDelete(place)}>Delete</button>
        </div>
      </header>

      <nav className="subtabs">
        {SECTIONS.map((s) => (
          <a key={s.key} href={sectionHref(s.key)} className={section === s.key ? 'tab active' : 'tab'}>{s.label}</a>
        ))}
      </nav>

      {section === 'analytics' && <PlaceAnalytics place={place} />}
      {section === 'edit' && (
        <PlaceForm
          key={place.id}
          inline
          initial={place}
          onCancel={() => { location.hash = sectionHref('analytics'); }}
          onSave={(draft) => act(() => updatePlace(place.id, draft), `Saved ${draft.name}`)}
        />
      )}
      {section === 'payments' && (
        <PlacePayments place={place} payments={payments} userEmail={userEmail} act={act} editHref={sectionHref('edit')} />
      )}
    </div>
  );
}

// ---------- Analytics ----------

type Counts = Record<StatKey, number>;
const countsOf = (s: PlaceStats | undefined): Counts => ({
  views: s?.views ?? 0, calls: s?.calls ?? 0, directions: s?.directions ?? 0, shares: s?.shares ?? 0,
});

function PlaceAnalytics({ place }: { place: Place }) {
  const { stats, loading, error } = usePlaceStats(place.id);
  const [month, setMonth] = useState(thisMonth);
  const byMonth = useMemo(() => new Map(stats.map((s) => [s.month, s])), [stats]);
  const months = useMemo(() => monthsEnding(thisMonth(), HISTORY_MONTHS), []);
  const cur = countsOf(byMonth.get(month));
  const before = countsOf(byMonth.get(shiftMonth(month, -1)));
  const allTime = useMemo(() => stats.reduce((n, s) => n + statTotal(s), 0), [stats]);

  const table = useMemo(() => [...months].reverse().map((m) => ({ month: m, counts: countsOf(byMonth.get(m)) })), [months, byMonth]);

  const exportCsv = () => {
    const header = ['Month', ...STAT_KEYS.map((s) => s.label), 'Total'];
    const lines = table.map((r) => [r.month, ...STAT_KEYS.map((s) => r.counts[s.key]), statTotal(r.counts)]);
    const csv = [header, ...lines].map((l) => l.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `${place.id}-clicks.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  if (loading) return <div className="spinner" />;
  return (
    <div className="stack">
      {error && <p className="error">{error}</p>}
      <div className="toolbar">
        <MonthPicker month={month} onChange={setMonth} />
        <div className="spacer" />
        <button className="btn" onClick={exportCsv}>Download CSV</button>
      </div>

      <section className="stats">
        {STAT_KEYS.map(({ key, label }) => (
          <Tile key={key} label={label} value={cur[key].toLocaleString('en-IN')} sub={<Change now={cur[key]} before={before[key]} />} />
        ))}
        <Tile label={`All clicks in ${monthLabel(month, 'short')}`} value={statTotal(cur).toLocaleString('en-IN')} sub={<Change now={statTotal(cur)} before={statTotal(before)} />} />
      </section>

      <div className="panel">
        <h3>Clicks per month · {allTime.toLocaleString('en-IN')} since tracking began · {(place.views || 0).toLocaleString('en-IN')} views all time</h3>
        <BarChart
          data={months.map((m) => ({ month: m, value: statTotal(byMonth.get(m)) }))}
          format={(n) => `${n.toLocaleString('en-IN')} clicks`}
          highlight={month}
          onSelect={setMonth}
        />
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>Month</th>{STAT_KEYS.map((s) => <th key={s.key} className="num">{s.label}</th>)}<th className="num">Total</th></tr>
          </thead>
          <tbody>
            {table.map((r) => (
              <tr key={r.month} className={r.month === month ? 'on' : statTotal(r.counts) ? '' : 'dim'} onClick={() => setMonth(r.month)}>
                <td>{monthLabel(r.month)}</td>
                {STAT_KEYS.map((s) => <td key={s.key} className="num">{r.counts[s.key].toLocaleString('en-IN')}</td>)}
                <td className="num"><strong>{statTotal(r.counts).toLocaleString('en-IN')}</strong></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="muted small">
        Counts come from the app and website: a view is one visitor opening this page in a session; calls, directions and
        shares count the first tap per session. Months are in India time.
      </p>
    </div>
  );
}

// ---------- Sponsorship & payments ----------

function PlacePayments({ place, payments, userEmail, act, editHref }: {
  place: Place;
  payments: Payment[];
  userEmail: string | null;
  act: (fn: () => Promise<void>, msg: string) => Promise<void>;
  editHref: string;
}) {
  const [recording, setRecording] = useState<{ row: Row; month: string } | null>(null);
  const mine = useMemo(() => payments.filter((p) => p.placeId === place.id), [payments, place.id]);

  const ledger = useMemo(() => {
    const now = thisMonth();
    const paid = new Map(mine.map((p) => [p.month, p]));
    // From the sponsorship start (or first payment), capped at two years, through this month.
    const starts = [place.featuredFrom?.slice(0, 7), ...mine.map((p) => p.month)].filter((m): m is string => !!m).sort();
    const first = starts[0] && starts[0] < now ? starts[0] : shiftMonth(now, -(HISTORY_MONTHS - 1));
    const from = first < shiftMonth(now, -23) ? shiftMonth(now, -23) : first;
    const months: string[] = [];
    for (let m = now; m >= from; m = shiftMonth(m, -1)) months.push(m);
    for (const p of mine) if (!months.includes(p.month)) months.push(p.month); // advance or very old payments
    return months
      .sort((a, b) => b.localeCompare(a))
      .map((m) => ({ month: m, due: featuredInMonth(place, m) && m <= now ? place.featuredFee ?? 0 : 0, payment: paid.get(m) }))
      .filter((r) => r.due || r.payment);
  }, [mine, place]);

  const collected = mine.reduce((n, p) => n + p.amount, 0);
  const outstanding = ledger.filter((r) => r.due && !r.payment).reduce((n, r) => n + r.due, 0);
  const active = place.featuredRank != null && !featureExpired(place) && (!place.featuredFrom || place.featuredFrom <= todayIST());

  const openForm = (month: string, payment?: Payment) => setRecording({
    month,
    row: { id: place.id, place, fee: place.featuredFee, sponsored: featuredInMonth(place, month), payment },
  });

  return (
    <div className="stack">
      <section className="stats">
        <Tile
          label="Sponsorship"
          value={place.featuredRank == null ? 'Not featured' : active ? `Featured #${place.featuredRank}` : featureExpired(place) ? 'Expired' : 'Scheduled'}
          sub={place.featuredRank != null && (
            <span className="muted">
              {place.featuredLabel ?? 'No tag'} · {fmtDate(place.featuredFrom) ?? 'start'} → {fmtDate(place.featuredUntil) ?? 'no end date'}
            </span>
          )}
        />
        <Tile label="Monthly fee" value={place.featuredFee ? rupees(place.featuredFee) : '—'} />
        <Tile label="Collected (all time)" value={rupees(collected)} />
        <Tile label="Outstanding" value={rupees(outstanding)} tone={outstanding ? 'warn' : undefined} />
      </section>

      <div className="toolbar">
        <a className="btn" href={editHref}>{place.featuredRank == null ? 'Feature this business…' : 'Change sponsorship…'}</a>
        <div className="spacer" />
        <button className="btn primary" onClick={() => openForm(thisMonth())} disabled={mine.some((p) => p.month === thisMonth())}>
          Record payment for {monthLabel(thisMonth(), 'short')}
        </button>
      </div>

      {ledger.length === 0 ? (
        <div className="empty">No payments yet{place.featuredFee ? '' : ', and no monthly fee is set'}.</div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Month</th><th className="num">Fee due</th><th>Status</th><th>Paid on</th><th>Method</th><th>Note</th><th /></tr>
            </thead>
            <tbody>
              {ledger.map((r) => (
                <tr key={r.month}>
                  <td className="nowrap">{monthLabel(r.month)}</td>
                  <td className="num">{r.due ? rupees(r.due) : <span className="muted">—</span>}</td>
                  <td>{r.payment ? <span className="pill">✓ Paid {rupees(r.payment.amount)}</span> : <span className="pill warn">Due</span>}</td>
                  <td className="nowrap">{fmtDate(r.payment?.paidOn) ?? <span className="muted">—</span>}</td>
                  <td>{r.payment?.method ?? <span className="muted">—</span>}</td>
                  <td className="small">{r.payment?.note ?? ''}{r.payment?.recordedBy && <div className="muted">by {r.payment.recordedBy}</div>}</td>
                  <td className="nowrap">
                    {r.payment ? (
                      <button
                        className="btn small danger ghost"
                        onClick={() => {
                          if (confirm(`Remove the ${monthLabel(r.month)} payment?`)) {
                            act(() => removePayment(r.payment!.id), `Removed ${monthLabel(r.month)} payment`);
                          }
                        }}
                      >Undo</button>
                    ) : (
                      <button className="btn small success" onClick={() => openForm(r.month)}>Record payment</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {recording && (
        <PaymentForm
          row={recording.row}
          month={recording.month}
          onCancel={() => setRecording(null)}
          onSave={async (input) => {
            await act(() => recordPayment(place, recording.month, input, userEmail), `Recorded ${rupees(input.amount)} for ${monthLabel(recording.month)}`);
            setRecording(null);
          }}
        />
      )}
    </div>
  );
}
