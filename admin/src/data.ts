import { useEffect, useState } from 'react';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { db } from './firebase';
import type { Place, PlaceDraft, PlaceStatus } from './types';

/** Live list of every place (all statuses). Admin-only by Firestore rules. */
export function usePlaces() {
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!db) return;
    return onSnapshot(
      collection(db, 'places'),
      (snap) => {
        setPlaces(snap.docs.map((d) => ({ ...(d.data() as Omit<Place, 'id'>), id: d.id })));
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
    subcategory: t(draft.subcategory),
    address: t(draft.address),
    phone: t(draft.phone),
    type: t(draft.type),
    brand: t(draft.brand),
    ownership: t(draft.ownership),
    description: t(draft.description),
    howToReach: t(draft.howToReach),
    featuredLabel: draft.featuredRank == null ? null : t(draft.featuredLabel),
  };
}

export async function createPlace(draft: PlaceDraft) {
  await addDoc(collection(db!, 'places'), {
    ...clean(draft),
    image: null,
    views: 0,
    source: 'admin',
    submittedBy: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updatePlace(id: string, draft: PlaceDraft) {
  await updateDoc(doc(db!, 'places', id), { ...clean(draft), updatedAt: serverTimestamp() });
}

export async function setStatus(id: string, status: PlaceStatus) {
  await updateDoc(doc(db!, 'places', id), { status, updatedAt: serverTimestamp() });
}

export async function removePlace(id: string) {
  await deleteDoc(doc(db!, 'places', id));
}
