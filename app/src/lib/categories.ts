import type { ComponentProps } from 'react';
import type { Ionicons } from '@expo/vector-icons';
import type { ColorKey } from '@/theme';
import type { CategoryKey } from './types';

type IconName = ComponentProps<typeof Ionicons>['name'];

export interface CategoryMeta {
  key: CategoryKey;
  label: string;
  short: string;
  icon: IconName;
  color: ColorKey;
  /** Label for the sub-type filter ("Cuisine", "Speciality", …); null hides it. */
  subLabel: string | null;
  /** "All …" chip text for the sub-type filter. */
  subAll: string;
  /** Fixed sub-types to pick from (instead of free text) when adding a place. */
  subOptions?: readonly string[];
  /** Shown as a tile in the home page grid (Urban services has its own card instead). */
  inGrid?: boolean;
}

/**
 * Urban services offered so far — the sub-types of the `services` category. Add new ones here
 * (and in admin/src/types.ts SERVICE_TYPES); the Urban Services page shows a section per type.
 */
export const SERVICE_TYPES = ['Two-wheeler mechanic', 'RO water purifier service'] as const;

// Ordered by everyday interest — this is the order shown across the app.
export const CATEGORIES: CategoryMeta[] = [
  { key: 'restaurants', label: 'Restaurants', short: 'Food', icon: 'restaurant', color: 'crimson', subLabel: 'Cuisine', subAll: 'All cuisines' },
  { key: 'hotels', label: 'Hotels', short: 'Hotels', icon: 'bed', color: 'sky', subLabel: 'Tier', subAll: 'All tiers' },
  { key: 'hospitals', label: 'Hospitals', short: 'Hospitals', icon: 'medkit', color: 'rose', subLabel: 'Speciality', subAll: 'All specialities' },
  { key: 'sightseeing', label: 'Places to visit', short: 'Places', icon: 'image', color: 'gold', subLabel: null, subAll: 'All' },
  { key: 'showrooms', label: 'Showrooms', short: 'Shops', icon: 'bag-handle', color: 'violet', subLabel: 'Type', subAll: 'All types' },
  { key: 'colleges', label: 'Colleges', short: 'Colleges', icon: 'school', color: 'teal', subLabel: 'Stream', subAll: 'All streams' },
  { key: 'schools', label: 'Schools', short: 'Schools', icon: 'book', color: 'orange', subLabel: 'Type', subAll: 'All types' },
  { key: 'government_offices', label: 'Government offices', short: 'Govt', icon: 'business', color: 'leaf', subLabel: 'Office', subAll: 'All offices' },
  {
    key: 'services', label: 'Urban services', short: 'Services', icon: 'construct', color: 'teal',
    subLabel: 'Service', subAll: 'All services', subOptions: SERVICE_TYPES, inGrid: false,
  },
];

/** Categories shown as tiles on the home page. */
export const GRID_CATEGORIES = CATEGORIES.filter((c) => c.inGrid !== false);

export const CATEGORY_BY_KEY = Object.fromEntries(CATEGORIES.map((c) => [c.key, c])) as Record<CategoryKey, CategoryMeta>;

export const TALUKS = ['Dharmapuri', 'Harur', 'Karimangalam', 'Nallampalli', 'Palacode', 'Pappireddipatti', 'Pennagaram'];

/** URL slug for an area page: "Pappireddipatti" → "pappireddipatti" (/area/pappireddipatti). */
export const areaSlug = (taluk: string) => taluk.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
export const TALUK_BY_SLUG: Record<string, string> = Object.fromEntries(TALUKS.map((t) => [areaSlug(t), t]));
