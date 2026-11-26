export type CategoryKey =
  | 'restaurants'
  | 'hotels'
  | 'hospitals'
  | 'sightseeing'
  | 'showrooms'
  | 'colleges'
  | 'schools'
  | 'government_offices'
  | 'services';

export type PlaceStatus = 'approved' | 'pending' | 'rejected';

export interface PlaceImage {
  url: string;
  credit: string;
  license: string;
  sourcePage: string;
}

export interface Place {
  id: string;
  /** Readable URL name: mydharmapuri.com/place/<slug>. Missing on places not yet approved. */
  slug?: string | null;
  category: CategoryKey;
  name: string;
  /** Filterable sub-type: cuisine, hotel tier, speciality, stream, … */
  subcategory: string | null;
  taluk: string;
  address: string | null;
  phone: string | null;
  type: string | null;
  brand: string | null;
  ownership: string | null;
  description: string | null;
  howToReach: string | null;
  image: PlaceImage | null;
  status: PlaceStatus;
  views: number;
  featuredRank: number | null;
  featuredLabel: string | null;
  /** Last day (YYYY-MM-DD, IST) the place stays featured; null = no end date. */
  featuredUntil?: string | null;
  submittedBy: { uid: string; name: string | null; email: string | null } | null;
}

/** A place's page path, by its readable slug when it has one. */
export const placePath = (p: Pick<Place, 'id' | 'slug'>) => `/place/${p.slug || p.id}` as const;
