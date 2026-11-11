import type { Timestamp } from 'firebase/firestore';

// Keep in sync with app/src/lib/types.ts and app/src/lib/categories.ts.
export const CATEGORIES = [
  { key: 'restaurants', label: 'Restaurants', subLabel: 'Cuisine' },
  { key: 'hotels', label: 'Hotels', subLabel: 'Tier' },
  { key: 'hospitals', label: 'Hospitals', subLabel: 'Speciality' },
  { key: 'sightseeing', label: 'Places to visit', subLabel: null },
  { key: 'showrooms', label: 'Showrooms', subLabel: 'Type' },
  { key: 'colleges', label: 'Colleges', subLabel: 'Stream' },
  { key: 'schools', label: 'Schools', subLabel: 'Type' },
  { key: 'government_offices', label: 'Government offices', subLabel: 'Office type' },
] as const;

export type CategoryKey = (typeof CATEGORIES)[number]['key'];
export const CATEGORY_LABEL = Object.fromEntries(CATEGORIES.map((c) => [c.key, c.label])) as Record<CategoryKey, string>;

export const TALUKS = ['Dharmapuri', 'Harur', 'Karimangalam', 'Nallampalli', 'Palacode', 'Pappireddipatti', 'Pennagaram'];

export type PlaceStatus = 'approved' | 'pending' | 'rejected';

export interface Place {
  id: string;
  category: CategoryKey;
  name: string;
  subcategory: string | null;
  taluk: string;
  address: string | null;
  phone: string | null;
  type: string | null;
  brand: string | null;
  ownership: string | null;
  description: string | null;
  howToReach: string | null;
  image: { url: string; credit: string; license: string; sourcePage: string } | null;
  status: PlaceStatus;
  views: number;
  featuredRank: number | null;
  featuredLabel: string | null;
  source: 'import' | 'user' | 'admin';
  submittedBy: { uid: string; name: string | null; email: string | null } | null;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

/** Fields an admin edits in the place form. */
export type PlaceDraft = Pick<
  Place,
  'category' | 'name' | 'subcategory' | 'taluk' | 'address' | 'phone' | 'type' | 'brand' | 'ownership'
  | 'description' | 'howToReach' | 'status' | 'featuredRank' | 'featuredLabel'
>;

export const EMPTY_DRAFT: PlaceDraft = {
  category: 'restaurants',
  name: '',
  subcategory: null,
  taluk: 'Dharmapuri',
  address: null,
  phone: null,
  type: null,
  brand: null,
  ownership: null,
  description: null,
  howToReach: null,
  status: 'approved',
  featuredRank: null,
  featuredLabel: null,
};
