import { useEffect, useMemo, useState } from 'react';
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, configured, db } from './firebase';
import { createPlace, featuredInMonth, removePlace, rupees, setStatus, statTotal, thisMonth, unfeature, updatePlace, usePayments, usePlaces, useStats } from './data';
import { PlaceForm } from './PlaceForm';
import { FeaturedTab } from './Featured';
import { PaymentsTab } from './Payments';
import { AnalyticsTab } from './Analytics';
import { PlaceDetail, type Section } from './PlaceDetail';
import { placeHref } from './links';
import { CATEGORIES, CATEGORY_LABEL, TALUKS, type Place, type PlaceDraft, type PlaceStatus } from './types';

type Gate = 'loading' | 'signed-out' | 'not-admin' | 'admin';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [gate, setGate] = useState<Gate>('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!auth) return;
    return onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (!u) return setGate('signed-out');
      try {
        const snap = await getDoc(doc(db!, 'admins', u.uid));
        setGate(snap.exists() ? 'admin' : 'not-admin');
      } catch {
        setGate('not-admin');
      }
    });
  }, []);

  if (!configured) {
    return (
      <Center>
        <h1>Admin not configured</h1>
        <p className="muted">Copy <code>admin/.env.example</code> to <code>admin/.env</code>, add your Firebase web config, then restart <code>npm run dev</code>.</p>
      </Center>
    );
  }
  if (gate === 'loading') return <Center><div className="spinner" /></Center>;
  if (gate === 'signed-out') {
    return (
      <Center>
        <img className="brand-mark big" src="/logo.png" alt="MyDharmapuri logo" />
        <h1>MyDharmapuri Admin</h1>
        <p className="muted">Sign in with an admin Google account.</p>
        <button className="btn primary" onClick={() => signInWithPopup(auth!, new GoogleAuthProvider()).catch((e) => setError(e.message))}>
          Continue with Google
        </button>
        {error && <p className="error">{error}</p>}
      </Center>
    );
  }
  if (gate === 'not-admin') {
    return (
      <Center>
        <h1>No admin access</h1>
        <p className="muted">{user?.email} is not an admin. Ask an existing admin to run:</p>
        <code className="block">cd backend && npm run set-admin -- {user?.email}</code>
        <button className="btn" onClick={() => signOut(auth!)}>Sign out</button>
      </Center>
    );
  }
  return <Dashboard user={user!} />;
}

function Center({ children }: { children: React.ReactNode }) {
  return <div className="center"><div className="center-card">{children}</div></div>;
}

type Tab = 'pending' | 'all' | 'featured' | 'payments' | 'analytics';

/** #/place/{id}[/edit|/payments] opens one business; anything else shows the tabs. */
function readRoute(): { id: string; section: Section } | null {
  const m = location.hash.match(/^#\/place\/([^/]+)(?:\/(edit|payments))?$/);
  return m ? { id: decodeURIComponent(m[1]), section: (m[2] as Section) ?? 'analytics' } : null;
}

function useRoute() {
  const [route, setRoute] = useState(readRoute);
  useEffect(() => {
    const on = () => {
      setRoute(readRoute());
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return route;
}

const closePlace = () => {
  if (location.hash) location.hash = '';
};

function Dashboard({ user }: { user: User }) {
  const { places, loading, error } = usePlaces();
  const { payments, error: paymentsError } = usePayments();
  const month = thisMonth();
  const monthList = useMemo(() => [month], [month]);
  const { stats: monthStats } = useStats(monthList);
  const clicksThisMonth = useMemo(() => new Map(monthStats.map((s) => [s.placeId, statTotal(s)])), [monthStats]);
  const [tab, setTabState] = useState<Tab>('pending');
  const route = useRoute();
  const opened = route ? places.find((p) => p.id === route.id) : undefined;
  const setTab = (t: Tab) => {
    setTabState(t);
    closePlace();
  };
  const [editing, setEditing] = useState<Place | 'new' | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const pending = useMemo(
    () => places.filter((p) => p.status === 'pending').sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0)),
    [places],
  );
  const stats = useMemo(() => ({
    approved: places.filter((p) => p.status === 'approved').length,
    rejected: places.filter((p) => p.status === 'rejected').length,
    featured: places.filter((p) => p.featuredRank != null).length,
    views: places.reduce((n, p) => n + (p.views || 0), 0),
    clicks: monthStats.reduce((n, s) => n + statTotal(s), 0),
    due: places
      .filter((p) => featuredInMonth(p, month) && p.featuredFee && !payments.some((x) => x.placeId === p.id && x.month === month))
      .reduce((n, p) => n + (p.featuredFee ?? 0), 0),
  }), [places, monthStats, payments, month]);

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };
  const act = async (fn: () => Promise<void>, msg: string) => {
    try {
      await fn();
      flash(msg);
    } catch (e) {
      flash(`Failed: ${e instanceof Error ? e.message : e}`);
    }
  };

  const save = async (draft: PlaceDraft) => {
    if (editing === 'new') await act(() => createPlace(draft), `Added ${draft.name}`);
    else if (editing) await act(() => updatePlace(editing.id, draft), `Saved ${draft.name}`);
    setEditing(null);
  };

  return (
    <div className="layout">
      <header className="topbar">
        <div className="brand"><img className="brand-mark" src="/logo.png" alt="" /><strong>Admin</strong></div>
        <nav className="tabs">
          <button className={!route && tab === 'pending' ? 'tab active' : 'tab'} onClick={() => setTab('pending')}>
            Pending {pending.length > 0 && <span className="pill warn">{pending.length}</span>}
          </button>
          <button className={route || tab === 'all' ? 'tab active' : 'tab'} onClick={() => setTab('all')}>All places</button>
          <button className={!route && tab === 'featured' ? 'tab active' : 'tab'} onClick={() => setTab('featured')}>Featured</button>
          <button className={!route && tab === 'payments' ? 'tab active' : 'tab'} onClick={() => setTab('payments')}>
            Payments {stats.due > 0 && <span className="pill warn">{rupees(stats.due)}</span>}
          </button>
          <button className={!route && tab === 'analytics' ? 'tab active' : 'tab'} onClick={() => setTab('analytics')}>Analytics</button>
        </nav>
        <div className="spacer" />
        <button className="btn primary" onClick={() => setEditing('new')}>+ Add place</button>
        <span className="muted small hide-sm">{user.email}</span>
        <button className="btn ghost" onClick={() => signOut(auth!)}>Sign out</button>
      </header>

      <main className="content">
        {route ? (
          loading ? <div className="spinner" /> : opened ? (
            <PlaceDetail
              place={opened}
              section={route.section}
              payments={payments}
              userEmail={user.email}
              act={act}
              onStatus={(p, s) => act(() => setStatus(p.id, s), `${p.name} → ${s}`)}
              onDelete={(p) => {
                if (confirm(`Delete "${p.name}" permanently?`)) {
                  act(() => removePlace(p.id), `Deleted ${p.name}`);
                  closePlace();
                }
              }}
            />
          ) : (
            <div className="empty">This place doesn't exist any more. <a href="#">Back to all places</a></div>
          )
        ) : <>
        <section className="stats">
          <Stat label="Live places" value={stats.approved} />
          <Stat label="Waiting review" value={pending.length} tone={pending.length ? 'warn' : undefined} />
          <Stat label="Featured" value={stats.featured} />
          <Stat label="Clicks this month" value={stats.clicks.toLocaleString('en-IN')} />
          <Stat label="Payments due this month" value={rupees(stats.due)} tone={stats.due ? 'warn' : undefined} />
        </section>

        {error && <p className="error">{error}</p>}
        {paymentsError && (tab === 'payments' || tab === 'featured') && <p className="error">{paymentsError}</p>}
        {loading ? <div className="spinner" /> : tab === 'featured' ? (
          <FeaturedTab
            places={places}
            payments={payments}
            clicksThisMonth={clicksThisMonth}
            onEdit={setEditing}
            onUnfeature={(p) => {
              if (confirm(`Stop featuring "${p.name}"? Its fee and dates will be cleared; past payments are kept.`)) {
                act(() => unfeature(p.id), `${p.name} is no longer featured`);
              }
            }}
            act={act}
          />
        ) : tab === 'payments' ? (
          <PaymentsTab places={places} payments={payments} userEmail={user.email} act={act} />
        ) : tab === 'analytics' ? (
          <AnalyticsTab places={places} />
        ) : tab === 'pending' ? (
          <PendingList
            places={pending}
            onApprove={(p) => act(() => setStatus(p.id, 'approved'), `Approved ${p.name}`)}
            onReject={(p) => act(() => setStatus(p.id, 'rejected'), `Rejected ${p.name}`)}
            onEdit={setEditing}
          />
        ) : (
          <AllPlaces
            places={places}
            onEdit={setEditing}
            onStatus={(p, s) => act(() => setStatus(p.id, s), `${p.name} → ${s}`)}
            onDelete={(p) => {
              if (confirm(`Delete "${p.name}" permanently?`)) act(() => removePlace(p.id), `Deleted ${p.name}`);
            }}
          />
        )}
        </>}
      </main>

      {editing && (
        <PlaceForm
          initial={editing === 'new' ? null : editing}
          onCancel={() => setEditing(null)}
          onSave={save}
        />
      )}
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number | string; tone?: 'warn' }) {
  return (
    <div className={`stat ${tone ?? ''}`}>
      <span className="stat-value">{value}</span>
      <span className="muted small">{label}</span>
    </div>
  );
}

function PendingList({ places, onApprove, onReject, onEdit }: {
  places: Place[];
  onApprove: (p: Place) => void;
  onReject: (p: Place) => void;
  onEdit: (p: Place) => void;
}) {
  if (!places.length) return <div className="empty">🎉 Nothing waiting for review.</div>;
  return (
    <div className="cards">
      {places.map((p) => (
        <article key={p.id} className="card">
          <div className="card-head">
            <span className="pill">{CATEGORY_LABEL[p.category] ?? p.category}</span>
            {p.subcategory && <span className="pill soft">{p.subcategory}</span>}
            <span className="muted small">{p.createdAt?.toDate().toLocaleString() ?? 'just now'}</span>
          </div>
          <h3><a className="place-link" href={placeHref(p.id)}>{p.name}</a></h3>
          <dl>
            <dt>Area</dt><dd>{p.taluk}</dd>
            <dt>Address</dt><dd>{p.address ?? '—'}</dd>
            <dt>Phone</dt><dd>{p.phone ?? '—'}</dd>
            {p.description && <><dt>About</dt><dd>{p.description}</dd></>}
            <dt>Submitted by</dt><dd>{p.submittedBy ? `${p.submittedBy.name ?? ''} ${p.submittedBy.email ?? ''}`.trim() : '—'}</dd>
          </dl>
          <div className="actions">
            <button className="btn success" onClick={() => onApprove(p)}>Approve</button>
            <button className="btn" onClick={() => onEdit(p)}>Edit</button>
            <button className="btn danger ghost" onClick={() => onReject(p)}>Reject</button>
          </div>
        </article>
      ))}
    </div>
  );
}

function AllPlaces({ places, onEdit, onStatus, onDelete }: {
  places: Place[];
  onEdit: (p: Place) => void;
  onStatus: (p: Place, s: PlaceStatus) => void;
  onDelete: (p: Place) => void;
}) {
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('');
  const [taluk, setTaluk] = useState('');
  const [status, setStatusFilter] = useState('');
  const [sort, setSort] = useState<'name' | 'views' | 'featured'>('name');

  const rows = useMemo(() => {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    return places
      .filter((p) => (!cat || p.category === cat) && (!taluk || p.taluk === taluk) && (!status || p.status === status))
      .filter((p) => {
        const hay = `${p.name} ${p.subcategory ?? ''} ${p.address ?? ''} ${p.phone ?? ''}`.toLowerCase();
        return words.every((w) => hay.includes(w));
      })
      .sort((a, b) =>
        sort === 'views' ? b.views - a.views
          : sort === 'featured' ? (a.featuredRank ?? 999) - (b.featuredRank ?? 999)
            : a.name.localeCompare(b.name));
  }, [places, q, cat, taluk, status, sort]);

  return (
    <>
      <div className="filters">
        <input className="input grow" placeholder="Search name, address, phone…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="input" value={cat} onChange={(e) => setCat(e.target.value)}>
          <option value="">All categories</option>
          {CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
        </select>
        <select className="input" value={taluk} onChange={(e) => setTaluk(e.target.value)}>
          <option value="">All areas</option>
          {TALUKS.map((t) => <option key={t}>{t}</option>)}
        </select>
        <select className="input" value={status} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">Any status</option>
          <option value="approved">Approved</option>
          <option value="pending">Pending</option>
          <option value="rejected">Rejected</option>
        </select>
        <select className="input" value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}>
          <option value="name">Sort: Name</option>
          <option value="views">Sort: Most viewed</option>
          <option value="featured">Sort: Featured first</option>
        </select>
      </div>
      <p className="muted small">{rows.length} of {places.length}</p>
      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>Name</th><th>Category</th><th>Area</th><th>Phone</th><th>Views</th><th>Featured</th><th>Status</th><th /></tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr
                key={p.id}
                className="clickable"
                onClick={(e) => {
                  if (!(e.target as HTMLElement).closest('a, button, select')) location.hash = placeHref(p.id);
                }}
              >
                <td>
                  <a className="place-link" href={placeHref(p.id)}><strong>{p.name}</strong></a>
                  {p.subcategory && <div className="muted small">{p.subcategory}</div>}
                </td>
                <td>{CATEGORY_LABEL[p.category] ?? p.category}</td>
                <td>{p.taluk}</td>
                <td className="nowrap">{p.phone ?? <span className="muted">—</span>}</td>
                <td>{p.views || 0}</td>
                <td>{p.featuredRank != null ? <span className="pill soft">#{p.featuredRank}{p.featuredLabel ? ` · ${p.featuredLabel}` : ''}</span> : ''}</td>
                <td>
                  <select className={`input status ${p.status}`} value={p.status} onChange={(e) => onStatus(p, e.target.value as PlaceStatus)}>
                    <option value="approved">Approved</option>
                    <option value="pending">Pending</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </td>
                <td className="nowrap">
                  <a className="btn small" href={placeHref(p.id)}>Open</a>
                  <button className="btn small" onClick={() => onEdit(p)}>Quick edit</button>
                  <button className="btn small danger ghost" onClick={() => onDelete(p)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
