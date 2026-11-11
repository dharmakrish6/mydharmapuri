export type CategoryKey =
  | 'restaurants'
  | 'hotels'
  | 'hospitals'
  | 'sightseeing'
  | 'showrooms'
  | 'colleges'
  | 'schools'
  | 'government_offices';

export type PlaceStatus = 'approved' | 'pending' | 'rejected';

export interface PlaceImage {
  url: string;
  credit: string;
  license: string;
  sourcePage: string;
}

export interface Place {
  id: string;
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
  submittedBy: { uid: string; name: string | null; email: string | null } | null;
}
