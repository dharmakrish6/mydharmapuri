import { placeHref } from './links';
import { useMemo, useState } from 'react';
import { monthLabel, monthsEnding, shiftMonth, statTotal, thisMonth, useStats } from './data';
import { MonthPicker } from './MonthPicker';
import { BarChart, Tile } from './Payments';
import { CATEGORIES, CATEGORY_LABEL, STAT_KEYS, type Place, type PlaceStats, type StatKey } from './types';

const TREND_MONTHS = 6;
type Counts = Record<StatKey, number>;
const zero = (): Counts => ({ views: 0, calls: 0, directions: 0, shares: 0 });

/** Monthly clicks per business: views, calls, directions and shares from the app. */
export function AnalyticsTab({ places }: { places: Place[] }) {
  const [month, setMonth] = useState(thisMonth);
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('');
  const [featuredOnly, setFeaturedOnly] = useState(false);
  const [sort, setSort] = useState<StatKey | 'total'>('total');

  const months = useMemo(() => monthsEnding(month, TREND_MONTHS), [month]);
  const { stats, loading, error } = useStats(months);
  const prev = shiftMonth(month, -1);

  const { byPlace, monthTotals } = useMemo(() => {
    const byPlace = new Map<string, Map<string, PlaceStats>>();
    const monthTotals = new Map<string, Counts>(months.map((m) => [m, zero()]));
    for (const s of stats) {
      if (!byPlace.has(s.placeId)) byPlace.set(s.placeId, new Map());
      byPlace.get(s.placeId)!.set(s.month, s);
      const t = monthTotals.get(s.month);
      if (t) for (const { key } of STAT_KEYS) t[key] += s[key] ?? 0;
    }
    return { byPlace, monthTotals };
  }, [stats, months]);

  const rows = useMemo(() => {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    const placeById = new Map(places.map((p) => [p.id, p]));
    const ids = new Set([...byPlace.keys()].filter((id) => byPlace.get(id)!.has(month)));
    if (featuredOnly) for (const p of places) if (p.featuredRank != null) ids.add(p.id);
    return [...ids]
      .map((id) => {
        const place = placeById.get(id);
        const series = byPlace.get(id);
        const cur = series?.get(month);
        const counts: Counts = { views: cur?.views ?? 0, calls: cur?.calls ?? 0, directions: cur?.directions ?? 0, shares: cur?.shares ?? 0 };
        return {
          id,
          place,
          counts,
          total: statTotal(counts),
          prevTotal: statTotal(series?.get(prev)),
          trend: months.map((m) => ({ month: m, value: statTotal(series?.get(m)) })),
        };
      })
      .filter((r) => !featuredOnly || r.place?.featuredRank != null)
      .filter((r) => !cat || r.place?.category === cat)
      .filter((r) => words.every((w) => (r.place?.name ?? r.id).toLowerCase().includes(w)))
      .sort((a, b) => (sort === 'total' ? b.total - a.total : b.counts[sort] - a.counts[sort]));
  }, [places, byPlace, month, prev, months, q, cat, featuredOnly, sort]);

  const cur = monthTotals.get(month) ?? zero();
  const before = monthTotals.get(prev);

  const exportCsv = () => {
    const header = ['Business', 'Category', 'Area', 'Featured', ...STAT_KEYS.map((s) => s.label), 'Total', `Total ${prev}`];
    const lines = rows.map((r) => [
      r.place?.name ?? `(deleted ${r.id})`,
      r.place ? CATEGORY_LABEL[r.place.category] ?? r.place.category : '',
      r.place?.taluk ?? '',
      r.place?.featuredRank != null ? `#${r.place.featuredRank}` : '',
      ...STAT_KEYS.map((s) => r.counts[s.key]),
      r.total,
      r.prevTotal,
    ]);
    const csv = [header, ...lines].map((l) => l.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `dharmapuri-clicks-${month}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="stack">
      <div className="toolbar">
        <MonthPicker month={month} onChange={setMonth} />
        <div className="spacer" />
        <button className="btn" onClick={exportCsv} disabled={!rows.length}>Download CSV</button>
      </div>

      <section className="stats">
        {STAT_KEYS.map(({ key, label }) => (
          <Tile key={key} label={label} value={cur[key].toLocaleString('en-IN')} sub={before && <Change now={cur[key]} before={before[key]} />} />
        ))}
      </section>

      <div className="panel">
        <h3>All clicks per month</h3>
        <BarChart
          data={months.map((m) => ({ month: m, value: statTotal(monthTotals.get(m)) }))}
          format={(n) => `${n.toLocaleString('en-IN')} clicks`}
          highlight={month}
          onSelect={setMonth}
        />
      </div>

      <div className="filters">
        <input className="input grow" placeholder="Search business…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="input" value={cat} onChange={(e) => setCat(e.target.value)}>
          <option value="">All categories</option>
          {CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
        </select>
        <label className="check"><input type="checkbox" checked={featuredOnly} onChange={(e) => setFeaturedOnly(e.target.checked)} /> Featured only</label>
      </div>

      {error && <p className="error">{error}</p>}
      {loading ? <div className="spinner" /> : rows.length === 0 ? (
        <div className="empty">No clicks recorded for {monthLabel(month)} yet.</div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Business</th>
                {STAT_KEYS.map((s) => <SortTh key={s.key} label={s.label} active={sort === s.key} onClick={() => setSort(s.key)} />)}
                <SortTh label="Total" active={sort === 'total'} onClick={() => setSort('total')} />
                <th>vs {monthLabel(prev, 'short')}</th>
                <th>Last {TREND_MONTHS} months</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>
                    <strong>{r.place ? <a className="place-link" href={placeHref(r.id)}>{r.place.name}</a> : <span className="muted">Deleted place</span>}</strong>
                    {r.place && (
                      <div className="muted small">
                        {CATEGORY_LABEL[r.place.category] ?? r.place.category} · {r.place.taluk}
                        {r.place.featuredRank != null && <> · <span className="pill soft">Featured #{r.place.featuredRank}</span></>}
                      </div>
                    )}
                  </td>
                  {STAT_KEYS.map((s) => <td key={s.key} className="num">{r.counts[s.key].toLocaleString('en-IN')}</td>)}
                  <td className="num"><strong>{r.total.toLocaleString('en-IN')}</strong></td>
                  <td><Change now={r.total} before={r.prevTotal} /></td>
                  <td><Sparkline data={r.trend} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="muted small">
        Views count once per visitor session; calls, directions and shares count the first tap per session. Months are in India time.
      </p>
    </div>
  );
}

function SortTh({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <th className="num">
      <button className={`th-sort ${active ? 'on' : ''}`} onClick={onClick}>{label}{active ? ' ↓' : ''}</button>
    </th>
  );
}

export function Change({ now, before }: { now: number; before: number }) {
  if (!before) return now ? <span className="muted small">new</span> : <span className="muted small">—</span>;
  const pct = Math.round(((now - before) / before) * 100);
  return (
    <span className={`small change ${pct > 0 ? 'up' : pct < 0 ? 'down' : ''}`}>
      {pct > 0 ? '▲' : pct < 0 ? '▼' : '•'} {Math.abs(pct)}%
    </span>
  );
}

function Sparkline({ data }: { data: { month: string; value: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <span className="spark">
      {data.map((d) => (
        <span
          key={d.month}
          className="spark-bar"
          style={{ height: `${Math.max(d.value ? 8 : 2, (d.value / max) * 100)}%` }}
          title={`${monthLabel(d.month)}: ${d.value.toLocaleString('en-IN')}`}
        />
      ))}
    </span>
  );
}
