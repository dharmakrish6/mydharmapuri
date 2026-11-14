import { placeHref } from './links';
import { useMemo, useState } from 'react';
import { featuredInMonth, fmtDate as fmt, monthLabel, monthsEnding, recordPayment, removePayment, rupees, shiftMonth, thisMonth, todayIST } from './data';
import { MonthPicker } from './MonthPicker';
import { CATEGORY_LABEL, PAYMENT_METHODS, type Payment, type Place } from './types';

export interface Row {
  id: string;
  place: Pick<Place, 'id' | 'name'> & Partial<Place>;
  fee: number | null;
  sponsored: boolean;
  payment: Payment | undefined;
}

/** Monthly sponsorship ledger: who should pay, who has paid, what's outstanding. */
export function PaymentsTab({ places, payments, userEmail, act }: {
  places: Place[];
  payments: Payment[];
  userEmail: string | null;
  act: (fn: () => Promise<void>, msg: string) => Promise<void>;
}) {
  const [month, setMonth] = useState(thisMonth);
  const [recording, setRecording] = useState<Row | null>(null);

  const rows = useMemo<Row[]>(() => {
    const paid = new Map(payments.filter((p) => p.month === month).map((p) => [p.placeId, p]));
    const out: Row[] = places
      .filter((p) => featuredInMonth(p, month) && (p.featuredFee || paid.has(p.id)))
      .map((p) => ({ id: p.id, place: p, fee: p.featuredFee, sponsored: true, payment: paid.get(p.id) }));
    const listed = new Set(out.map((r) => r.id));
    // Payments for places that are no longer featured (or were deleted).
    for (const pay of paid.values()) {
      if (listed.has(pay.placeId)) continue;
      const place = places.find((p) => p.id === pay.placeId);
      out.push({ id: pay.placeId, place: place ?? { id: pay.placeId, name: pay.placeName }, fee: null, sponsored: false, payment: pay });
    }
    return out.sort((a, b) => Number(!!a.payment) - Number(!!b.payment) || a.place.name.localeCompare(b.place.name));
  }, [places, payments, month]);

  const totals = useMemo(() => {
    const expected = rows.reduce((n, r) => n + (r.sponsored ? r.fee ?? 0 : 0), 0);
    const collected = rows.reduce((n, r) => n + (r.payment?.amount ?? 0), 0);
    const dueRows = rows.filter((r) => r.sponsored && !r.payment && r.fee);
    return { expected, collected, outstanding: dueRows.reduce((n, r) => n + (r.fee ?? 0), 0), dueCount: dueRows.length };
  }, [rows]);

  const history = useMemo(() => {
    const months = monthsEnding(thisMonth(), 12);
    const byMonth = new Map(months.map((m) => [m, 0]));
    for (const p of payments) if (byMonth.has(p.month)) byMonth.set(p.month, byMonth.get(p.month)! + p.amount);
    return months.map((m) => ({ month: m, value: byMonth.get(m)! }));
  }, [payments]);

  return (
    <div className="stack">
      <div className="toolbar">
        <MonthPicker month={month} onChange={setMonth} max={shiftMonth(thisMonth(), 1)} />
      </div>

      <section className="stats">
        <Tile label={`Expected for ${monthLabel(month, 'short')}`} value={rupees(totals.expected)} />
        <Tile label="Collected" value={rupees(totals.collected)} />
        <Tile label={`Outstanding · ${totals.dueCount} business${totals.dueCount === 1 ? '' : 'es'}`} value={rupees(totals.outstanding)} tone={totals.outstanding ? 'warn' : undefined} />
      </section>

      {rows.length === 0 ? (
        <div className="empty">No paid sponsorships in {monthLabel(month)}. Set a monthly fee on a featured place to see it here.</div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Business</th><th>Monthly fee</th><th>Status</th><th>Paid on</th><th>Method</th><th>Note</th><th /></tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>
                    <strong>{r.place.category ? <a className="place-link" href={placeHref(r.id)}>{r.place.name}</a> : r.place.name}</strong>
                    <div className="muted small">
                      {r.place.category ? `${CATEGORY_LABEL[r.place.category] ?? r.place.category} · ${r.place.taluk}` : 'Place removed'}
                      {!r.sponsored && ' · not featured this month'}
                    </div>
                  </td>
                  <td>{r.fee ? rupees(r.fee) : <span className="muted">—</span>}</td>
                  <td>
                    {r.payment ? <span className="pill">✓ Paid {rupees(r.payment.amount)}</span> : <span className="pill warn">Due</span>}
                  </td>
                  <td className="nowrap">{fmt(r.payment?.paidOn) ?? <span className="muted">—</span>}</td>
                  <td>{r.payment?.method ?? <span className="muted">—</span>}</td>
                  <td className="small">{r.payment?.note ?? ''}</td>
                  <td className="nowrap">
                    {r.payment ? (
                      <button
                        className="btn small danger ghost"
                        onClick={() => {
                          if (confirm(`Remove the ${monthLabel(month)} payment from ${r.place.name}?`)) {
                            act(() => removePayment(r.payment!.id), `Removed payment from ${r.place.name}`);
                          }
                        }}
                      >Undo</button>
                    ) : (
                      <button className="btn small success" onClick={() => setRecording(r)}>Record payment</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="panel">
        <h3>Collected per month</h3>
        <BarChart data={history} format={rupees} highlight={month} onSelect={setMonth} />
      </div>

      {recording && (
        <PaymentForm
          row={recording}
          month={month}
          onCancel={() => setRecording(null)}
          onSave={async (input) => {
            await act(() => recordPayment(recording.place, month, input, userEmail), `Recorded ${rupees(input.amount)} from ${recording.place.name}`);
            setRecording(null);
          }}
        />
      )}
    </div>
  );
}

export function PaymentForm({ row, month, onSave, onCancel }: {
  row: Row;
  month: string;
  onSave: (input: { amount: number; method: string; paidOn: string; note: string | null }) => Promise<void>;
  onCancel: () => void;
}) {
  const [amount, setAmount] = useState(row.fee ?? 0);
  const [method, setMethod] = useState<string>(PAYMENT_METHODS[0]);
  const [paidOn, setPaidOn] = useState(todayIST);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <form
        className="modal narrow"
        onClick={(e) => e.stopPropagation()}
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            await onSave({ amount, method, paidOn, note: note || null });
          } finally {
            setBusy(false);
          }
        }}
      >
        <h2>Record payment</h2>
        <p className="muted small">{row.place.name} · {monthLabel(month)}</p>
        <div className="grid2">
          <label>Amount (₹)
            <input className="input" type="number" min={1} required value={amount || ''} onChange={(e) => setAmount(Number(e.target.value))} />
          </label>
          <label>Method
            <select className="input" value={method} onChange={(e) => setMethod(e.target.value)}>
              {PAYMENT_METHODS.map((m) => <option key={m}>{m}</option>)}
            </select>
          </label>
        </div>
        <label>Paid on<input className="input" type="date" required value={paidOn} onChange={(e) => setPaidOn(e.target.value)} /></label>
        <label>Note<input className="input" placeholder="UPI ref, receipt no…" value={note} onChange={(e) => setNote(e.target.value)} /></label>
        <div className="actions end">
          <button type="button" className="btn ghost" onClick={onCancel}>Cancel</button>
          <button type="submit" className="btn primary" disabled={busy || amount <= 0}>{busy ? 'Saving…' : 'Save payment'}</button>
        </div>
      </form>
    </div>
  );
}

export function Tile({ label, value, sub, tone }: { label: string; value: string; sub?: React.ReactNode; tone?: 'warn' }) {
  return (
    <div className={`stat ${tone ?? ''}`}>
      <span className="stat-value">{value}</span>
      <span className="muted small">{label}</span>
      {sub && <span className="small">{sub}</span>}
    </div>
  );
}

/** Single-series vertical bars by month, with hover values and click-to-select. */
export function BarChart({ data, format, highlight, onSelect }: {
  data: { month: string; value: number }[];
  format: (n: number) => string;
  highlight?: string;
  onSelect?: (month: string) => void;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="bars" role="list">
      {data.map((d) => (
        <button
          key={d.month}
          type="button"
          role="listitem"
          className={`bar-col ${d.month === highlight ? 'on' : ''}`}
          onClick={() => onSelect?.(d.month)}
          aria-label={`${monthLabel(d.month)}: ${format(d.value)}`}
        >
          <span className="bar-tip">{monthLabel(d.month)}<strong>{format(d.value)}</strong></span>
          <span className="bar-track"><span className="bar" style={{ height: `${(d.value / max) * 100}%` }} /></span>
          <span className="bar-label">{monthLabel(d.month, 'short')}</span>
        </button>
      ))}
    </div>
  );
}
