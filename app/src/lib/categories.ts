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
}

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
];

export const CATEGORY_BY_KEY = Object.fromEntries(CATEGORIES.map((c) => [c.key, c])) as Record<CategoryKey, CategoryMeta>;

export const TALUKS = ['Dharmapuri', 'Harur', 'Karimangalam', 'Nallampalli', 'Palacode', 'Pappireddipatti', 'Pennagaram'];
