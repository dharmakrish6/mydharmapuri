import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  addDoc,
  collection,
  doc,
  increment,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import seed from '@/data/places.seed.json';
import { db, firebaseConfigured } from './firebase';
import type { CategoryKey, Place } from './types';

const FEATURED_SLOTS = 8;

export type TrackEvent = 'views' | 'calls' | 'directions' | 'shares';

/** Today and this month in India time, as YYYY-MM-DD / YYYY-MM. */
function istDate() {
  return new Date(Date.now() + 330 * 60_000).toISOString().slice(0, 10);
}

/** Drop the featured pin from places whose sponsorship has ended. */
function withActiveFeatured(list: Place[]): Place[] {
  const today = istDate();
  return list.map((p) =>
    p.featuredRank != null && p.featuredUntil && p.featuredUntil < today
      ? { ...p, featuredRank: null, featuredLabel: null }
      : p,
  );
}

interface PlacesState {
  places: Place[];
  loading: boolean;
  error: string | null;
  /** True when showing bundled data because Firebase isn't configured or is unreachable. */
  offline: boolean;
  byId: (id: string) => Place | undefined;
  /** Featured (pinned/sponsored) first, then the most viewed places. */
  popular: Place[];
  recordView: (id: string) => void;
  /** Count a call / directions / share tap for the monthly analytics (once per session each). */
  track: (id: string, event: Exclude<TrackEvent, 'views'>) => void;
  submitPlace: (input: NewPlaceInput, user: { uid: string; name: string | null; email: string | null }) => Promise<string>;
}

export interface NewPlaceInput {
  category: CategoryKey;
  name: string;
  subcategory: string | null;
  taluk: string;
  address: string;
  phone: string | null;
  description: string | null;
}

const PlacesContext = createContext<PlacesState | null>(null);

export function PlacesProvider({ children }: { children: ReactNode }) {
  // Start from the bundled snapshot so pages render real content immediately
  // (and in the static HTML that search engines read); Firestore replaces it live.
  // `loading` stays true until the live data arrives, so unknown ids aren't redirected early.
  const [places, setPlaces] = useState<Place[]>(() => withActiveFeatured(seed as Place[]));
  const [loading, setLoading] = useState(firebaseConfigured);
  const [error, setError] = useState<string | null>(null);
  const [offline, setOffline] = useState(!firebaseConfigured);
  const viewed = useRef(new Set<string>());

  useEffect(() => {
    if (!db) return;
    const q = query(collection(db, 'places'), where('status', '==', 'approved'));
    return onSnapshot(
      q,
      (snap) => {
        setPlaces(withActiveFeatured(snap.docs.map((d) => ({ ...(d.data() as Omit<Place, 'id'>), id: d.id }))));
        setLoading(false);
        setOffline(false);
      },
      (err) => {
        // Fall back to bundled data so the app stays usable.
        setError(err.message);
        setPlaces(withActiveFeatured(seed as Place[]));
        setOffline(true);
        setLoading(false);
      },
    );
  }, []);

  const index = useMemo(() => new Map(places.map((p) => [p.id, p])), [places]);
  const byId = useCallback((id: string) => index.get(id), [index]);

  const popular = useMemo(() => {
    const featured = places
      .filter((p) => p.featuredRank != null)
      .sort((a, b) => (a.featuredRank ?? 0) - (b.featuredRank ?? 0));
    const rest = places
      .filter((p) => p.featuredRank == null && p.views > 0)
      .sort((a, b) => b.views - a.views);
    return [...featured, ...rest].slice(0, Math.max(FEATURED_SLOTS, featured.length));
  }, [places]);

  const bumpMonthly = useCallback((id: string, event: TrackEvent) => {
    if (!db || offline) return Promise.resolve();
    const month = istDate().slice(0, 7);
    return setDoc(doc(db, 'stats', `${id}_${month}`), { placeId: id, month, [event]: increment(1) }, { merge: true });
  }, [offline]);

  const recordView = useCallback((id: string) => {
    // Count each place once per app session.
    if (!db || offline || viewed.current.has(id)) return;
    viewed.current.add(id);
    updateDoc(doc(db, 'places', id), { views: increment(1) }).catch(() => viewed.current.delete(id));
    bumpMonthly(id, 'views').catch(() => {});
  }, [offline, bumpMonthly]);

  const track = useCallback((id: string, event: Exclude<TrackEvent, 'views'>) => {
    const key = `${event}:${id}`;
    if (viewed.current.has(key)) return;
    viewed.current.add(key);
    bumpMonthly(id, event).catch(() => viewed.current.delete(key));
  }, [bumpMonthly]);

  const submitPlace = useCallback<PlacesState['submitPlace']>(async (input, user) => {
    if (!db) throw new Error('Submissions need Firebase to be configured.');
    const ref = await addDoc(collection(db, 'places'), {
      ...input,
      type: null,
      brand: null,
      ownership: null,
      howToReach: null,
      image: null,
      status: 'pending',
      views: 0,
      featuredRank: null,
      featuredLabel: null,
      source: 'user',
      submittedBy: user,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return ref.id;
  }, []);

  const value = useMemo(
    () => ({ places, loading, error, offline, byId, popular, recordView, track, submitPlace }),
    [places, loading, error, offline, byId, popular, recordView, track, submitPlace],
  );
  return <PlacesContext.Provider value={value}>{children}</PlacesContext.Provider>;
}

export function usePlaces() {
  const ctx = useContext(PlacesContext);
  if (!ctx) throw new Error('usePlaces must be used inside PlacesProvider');
  return ctx;
}
