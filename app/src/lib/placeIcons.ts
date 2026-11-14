import type { ComponentProps } from 'react';
import type { MaterialIcons } from '@expo/vector-icons';
import type { CategoryKey, Place } from './types';

export type ArtIcon = ComponentProps<typeof MaterialIcons>['name'];

/** Artwork icon per category → subcategory, used when a place has no photo. */
const BY_SUBCATEGORY: Record<CategoryKey, Record<string, ArtIcon> & { default: ArtIcon }> = {
  restaurants: {
    default: 'restaurant',
    'Bakery & Cafe': 'bakery-dining',
    Biryani: 'rice-bowl',
    'Chicken / Non-Veg': 'kebab-dining',
    Chinese: 'ramen-dining',
    'Fast Food': 'fastfood',
    'Ice Cream & Sweets': 'icecream',
    'Multi-Cuisine': 'restaurant',
    'North Indian': 'dinner-dining',
    Pizza: 'local-pizza',
    'South Indian': 'set-meal',
    Vegetarian: 'eco',
  },
  hotels: { default: 'hotel', Budget: 'hotel', Business: 'business-center', Resort: 'pool' },
  hospitals: {
    default: 'local-hospital',
    'Children & Dental': 'child-care',
    'Eye Care': 'visibility',
    'Fertility & Maternity': 'pregnant-woman',
    General: 'local-hospital',
    'Multi-Speciality': 'medical-services',
    Orthopaedics: 'accessible',
    'Skin & ENT': 'hearing',
  },
  sightseeing: { default: 'landscape' },
  showrooms: {
    default: 'storefront',
    Apparel: 'checkroom',
    'Bakery & Sweets': 'cake',
    Cars: 'directions-car',
    Electronics: 'tv',
    Footwear: 'directions-walk',
    Furniture: 'chair',
    Jewellery: 'diamond',
    'Mobile Phones': 'smartphone',
    Optical: 'visibility',
    Stationery: 'edit',
    'Two-wheelers': 'two-wheeler',
  },
  colleges: {
    default: 'school',
    'Arts & Science': 'science',
    Engineering: 'engineering',
    'ITI / Vocational': 'construction',
    Law: 'gavel',
    Medical: 'medical-services',
    Polytechnic: 'precision-manufacturing',
  },
  schools: { default: 'school', Government: 'school', Private: 'menu-book' },
  government_offices: {
    default: 'account-balance',
    Collectorate: 'account-balance',
    'District Court': 'gavel',
    'District Education Office': 'school',
    'Electricity Board (TANGEDCO) Office': 'bolt',
    'Employment Office': 'work',
    'Government Hospital': 'local-hospital',
    'Government Medical College Hospital': 'local-hospital',
    'Municipality Office': 'location-city',
    'Police Office (DSP Office)': 'local-police',
    'Police Office (SP Office)': 'local-police',
    'Police Station': 'local-police',
    RTO: 'directions-car',
    'Revenue Office': 'request-quote',
    'Taluk Office': 'apartment',
  },
};

/** Places to visit have no subcategory; pick by what the name says. */
const SIGHTSEEING: [RegExp, ArtIcon][] = [
  [/temple|kovil|koil/i, 'temple-hindu'],
  [/fort/i, 'fort'],
  [/falls|dam|lake|river/i, 'water'],
  [/wildlife|sanctuary|forest|hills/i, 'forest'],
  [/museum/i, 'museum'],
  [/archaeolog|heritage|stones?/i, 'history-edu'],
];

export function placeArtIcon(place: Pick<Place, 'category' | 'subcategory' | 'name'>): ArtIcon {
  if (place.category === 'sightseeing') {
    return SIGHTSEEING.find(([re]) => re.test(place.name))?.[1] ?? 'landscape';
  }
  const map = BY_SUBCATEGORY[place.category];
  if (!map) return 'place';
  return (place.subcategory && map[place.subcategory]) || map.default;
}
