import { useEffect, useState } from 'react';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  documentId,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';
import type { Payment, Place, PlaceDraft, PlaceStats, PlaceStatus, StatKey, TrafficDay } from './types';

// ---------- Dates (all in India time) ----------

/** Today as YYYY-MM-DD in IST. */
export const todayIST = () => new Date(Date.now() + 330 * 60_000).toISOString().slice(0, 10);
/** This month as YYYY-MM in IST. */
export const thisMonth = () => todayIST().slice(0, 7);

export function shiftMonth(month: string, delta: number) {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return d.toISOString().slice(0, 7);
}

/** The `count` months ending at `end`, oldest first. */
export const monthsEnding = (end: string, count: number) =>
  Array.from({ length: count }, (_, i) => shiftMonth(end, i - count + 1));

export function monthLabel(month: string, style: 'long' | 'short' = 'long') {
  const [y, m] = month.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleString('en-IN', {
    month: style, year: style === 'long' ? 'numeric' : '2-digit', timeZone: 'UTC',
  });
}

/** Whether a place's sponsorship covers any day of `month`. ("-31" sorts after every real day.) */
export function featuredInMonth(p: Place, month: string) {
  if (p.featuredRank == null) return false;
  if (p.featuredFrom && p.featuredFrom > `${month}-31`) return false;
  if (p.featuredUntil && p.featuredUntil < `${month}-01`) return false;
  return true;
}

export const featureExpired = (p: Place) => !!p.featuredUntil && p.featuredUntil < todayIST();

/** YYYY-MM-DD → "12 Nov 2026". */
export function fmtDate(date: string | null | undefined) {
  if (!date) return null;
  return new Date(`${date}T00:00:00Z`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

export const rupees = (n: number) => `₹${n.toLocaleString('en-IN')}`;

export const statTotal = (s: Partial<Record<StatKey, number>> | undefined) =>
  (s?.views ?? 0) + (s?.calls ?? 0) + (s?.directions ?? 0) + (s?.shares ?? 0);

/** Live list of every place (all statuses). Admin-only by Firestore rules. */
// ---------- Page URLs (slugs) ----------

/** Latest places seen by usePlaces(), used to keep slugs unique. */
let known: Place[] = [];

const slugify = (s: string) =>
  s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);

/** "Bright RO Systems" → "bright-ro-systems" (or "-harur", "-2" … if taken). Same rules as backend/scripts/backfill-slugs.mjs. */
function newSlug(name: string, taluk: string, ownId?: string) {
  const taken = new Set(known.filter((p) => p.id !== ownId).flatMap((p) => [p.id, p.slug].filter(Boolean) as string[]));
  const base = slugify(name) || 'place';
  const t = slugify(taluk);
  for (const s of [base, t && `${base}-${t}`]) if (s && !taken.has(s)) return s;
  for (let n = 2; ; n++) if (!taken.has(`${base}-${n}`)) return `${base}-${n}`;
}

/** The slug a place should have: its existing one, else a new one from its name. */
const slugFor = (id: string, name: string, taluk: string) => known.find((p) => p.id === id)?.slug || newSlug(name, taluk, id);

export const SITE = 'https://mydharmapuri.com';
export const sitePath = (p: Pick<Place, 'id' | 'slug'>) => `/place/${p.slug || p.id}`;

export function usePlaces() {
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!db) return;
    return onSnapshot(
      collection(db, 'places'),
      (snap) => {
        known = snap.docs.map((d) => ({ ...(d.data() as Omit<Place, 'id'>), id: d.id }));
        setPlaces(known);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      },
    );
  }, []);

  return { places, loading, error };
}

function clean(draft: PlaceDraft) {
  const t = (v: string | null) => (v && v.trim() ? v.trim() : null);
  return {
    ...draft,
    name: draft.name.trim(),
    image: draft.image?.url.trim()
      ? { url: draft.image.url.trim(), credit: draft.image.credit.trim(), license: draft.image.license.trim(), sourcePage: draft.image.sourcePage.trim() }
      : null,
    subcategory: t(draft.subcategory),
    address: t(draft.address),
    phone: t(draft.phone),
    type: t(draft.type),
    brand: t(draft.brand),
    ownership: t(draft.ownership),
    description: t(draft.description),
    howToReach: t(draft.howToReach),
    featuredLabel: draft.featuredRank == null ? null : t(draft.featuredLabel),
    featuredFee: draft.featuredRank == null || !draft.featuredFee ? null : draft.featuredFee,
    featuredFrom: draft.featuredRank == null ? null : t(draft.featuredFrom),
    featuredUntil: draft.featuredRank == null ? null : t(draft.featuredUntil),
  };
}

export async function createPlace(draft: PlaceDraft) {
  await addDoc(collection(db!, 'places'), {
    ...clean(draft),
    slug: newSlug(draft.name.trim(), draft.taluk),
    views: 0,
    source: 'admin',
    submittedBy: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updatePlace(id: string, draft: PlaceDraft) {
  await updateDoc(doc(db!, 'places', id), { ...clean(draft), slug: slugFor(id, draft.name.trim(), draft.taluk), updatedAt: serverTimestamp() });
}

export async function setStatus(id: string, status: PlaceStatus) {
  const p = known.find((x) => x.id === id);
  await updateDoc(doc(db!, 'places', id), {
    status,
    ...(p && !p.slug && { slug: newSlug(p.name, p.taluk, id) }), // user submissions get their URL on review
    updatedAt: serverTimestamp(),
  });
}

export async function removePlace(id: string) {
  await deleteDoc(doc(db!, 'places', id));
}

// ---------- Featured ----------

/** Rewrite featured positions as 1..n in the given order. */
export async function reorderFeatured(ordered: Place[]) {
  const batch = writeBatch(db!);
  ordered.forEach((p, i) => {
    if (p.featuredRank !== i + 1) batch.update(doc(db!, 'places', p.id), { featuredRank: i + 1, updatedAt: serverTimestamp() });
  });
  await batch.commit();
}

export async function unfeature(id: string) {
  await updateDoc(doc(db!, 'places', id), {
    featuredRank: null, featuredLabel: null, featuredFee: null, featuredFrom: null, featuredUntil: null,
    updatedAt: serverTimestamp(),
  });
}

// ---------- Analytics ----------

/** Live monthly counters for the given months (max 30). */
export function useStats(months: string[]) {
  const key = months.join(',');
  const [result, setResult] = useState<{ key: string; stats: PlaceStats[]; error: string | null }>({ key: '', stats: [], error: null });

  useEffect(() => {
    if (!db || !key) return;
    return onSnapshot(
      query(collection(db, 'stats'), where('month', 'in', key.split(','))),
      (snap) => setResult({ key, stats: snap.docs.map((d) => ({ ...(d.data() as Omit<PlaceStats, 'id'>), id: d.id })), error: null }),
      (err) => setResult({ key, stats: [], error: err.message }),
    );
  }, [key]);

  const fresh = result.key === key;
  return { stats: fresh ? result.stats : [], loading: !fresh, error: fresh ? result.error : null };
}

/** Every monthly counter for one place (live). */
export function usePlaceStats(placeId: string) {
  const [result, setResult] = useState<{ id: string; stats: PlaceStats[]; error: string | null }>({ id: '', stats: [], error: null });
  useEffect(() => {
    if (!db) return;
    return onSnapshot(
      query(collection(db, 'stats'), where('placeId', '==', placeId)),
      (snap) => setResult({ id: placeId, stats: snap.docs.map((d) => ({ ...(d.data() as Omit<PlaceStats, 'id'>), id: d.id })), error: null }),
      (err) => setResult({ id: placeId, stats: [], error: err.message }),
    );
  }, [placeId]);
  const fresh = result.id === placeId;
  return { stats: fresh ? result.stats : [], loading: !fresh, error: fresh ? result.error : null };
}

/** Live site-wide visit counters for every day of `month` (YYYY-MM). */
export function useTraffic(month: string) {
  const [result, setResult] = useState<{ month: string; days: TrafficDay[]; error: string | null }>({ month: '', days: [], error: null });
  useEffect(() => {
    if (!db) return;
    return onSnapshot(
      query(collection(db, 'traffic'), where(documentId(), '>=', `${month}-01`), where(documentId(), '<=', `${month}-31`)),
      (snap) => setResult({ month, days: snap.docs.map((d) => ({ ...(d.data() as Omit<TrafficDay, 'id'>), id: d.id })), error: null }),
      (err) => setResult({ month, days: [], error: err.message }),
    );
  }, [month]);
  const fresh = result.month === month;
  return { days: fresh ? result.days : [], loading: !fresh, error: fresh ? result.error : null };
}

/** Page views + visitors summed over days. */
export function trafficTotals(days: TrafficDay[]) {
  const t = { webViews: 0, webVisits: 0, appViews: 0, appVisits: 0 };
  for (const d of days) {
    t.webViews += d.webViews ?? 0;
    t.webVisits += d.webVisits ?? 0;
    t.appViews += d.appViews ?? 0;
    t.appVisits += d.appVisits ?? 0;
  }
  return { ...t, views: t.webViews + t.appViews, visits: t.webVisits + t.appVisits };
}

// ---------- Payments ----------

export function usePayments() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!db) return;
    return onSnapshot(
      collection(db, 'payments'),
      (snap) => setPayments(snap.docs.map((d) => ({ ...(d.data() as Omit<Payment, 'id'>), id: d.id }))),
      (err) => setError(err.message),
    );
  }, []);
  return { payments, error };
}

export async function recordPayment(
  place: Pick<Place, 'id' | 'name'>,
  month: string,
  input: { amount: number; method: string; paidOn: string; note: string | null },
  recordedBy: string | null,
) {
  await setDoc(doc(db!, 'payments', `${place.id}_${month}`), {
    placeId: place.id,
    placeName: place.name,
    month,
    amount: input.amount,
    method: input.method,
    paidOn: input.paidOn,
    note: input.note?.trim() || null,
    recordedBy,
    createdAt: serverTimestamp(),
  });
}

export async function removePayment(id: string) {
  await deleteDoc(doc(db!, 'payments', id));
}
