import { SITE_URL, breadcrumbs, type PageSeo } from '@/components/Seo';
import { CATEGORIES, CATEGORY_BY_KEY, TALUKS, areaSlug } from './categories';
import { placePath, type CategoryKey, type Place } from './types';

/** schema.org type per category, for Google rich results. */
const SCHEMA_TYPE: Record<CategoryKey, string> = {
  restaurants: 'Restaurant',
  hotels: 'Hotel',
  hospitals: 'Hospital',
  sightseeing: 'TouristAttraction',
  showrooms: 'Store',
  colleges: 'CollegeOrUniversity',
  schools: 'School',
  government_offices: 'GovernmentOffice',
  services: 'LocalBusiness',
};

/** Singular, lower-case noun per category for titles ("Hospital in Harur"). */
const NOUN: Record<CategoryKey, string> = {
  restaurants: 'Restaurant',
  hotels: 'Hotel',
  hospitals: 'Hospital',
  sightseeing: 'Tourist place',
  showrooms: 'Shop',
  colleges: 'College',
  schools: 'School',
  government_offices: 'Government office',
  services: 'Service',
};

export function placeSeo(place: Place) {
  const path = placePath(place);
  // Services read better by their type alone: "Two-wheeler mechanic in Harur".
  const noun = place.category === 'services' && place.subcategory ? place.subcategory : NOUN[place.category];
  const kind = place.subcategory && place.category !== 'services' ? `${place.subcategory} ${noun.toLowerCase()}` : noun;
  const where = place.taluk === 'Dharmapuri' ? 'Dharmapuri' : `${place.taluk}, Dharmapuri`;
  const title = `${place.name} – ${noun} in ${where}`;
  // Phone first: descriptions are cut at ~160 characters.
  const description = [
    `${place.name}: ${kind.toLowerCase()} in ${where}, Tamil Nadu.`,
    place.phone && `Phone ${place.phone}.`,
    place.address && `Address: ${place.address.replace(/\.$/, '')}.`,
    place.description,
  ].filter(Boolean).join(' ');

  const meta = CATEGORY_BY_KEY[place.category];
  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': SCHEMA_TYPE[place.category],
      '@id': `${SITE_URL}${path}`,
      name: place.name,
      url: `${SITE_URL}${path}`,
      ...(place.description && { description: place.description }),
      ...(place.phone && { telephone: place.phone }),
      ...(place.image && { image: place.image.url }),
      ...(place.brand && { brand: { '@type': 'Brand', name: place.brand } }),
      address: {
        '@type': 'PostalAddress',
        ...(place.address && { streetAddress: place.address }),
        addressLocality: place.taluk,
        addressRegion: 'Tamil Nadu',
        addressCountry: 'IN',
      },
      areaServed: { '@type': 'AdministrativeArea', name: 'Dharmapuri district' },
    },
    breadcrumbs([
      { name: 'Home', path: '/' },
      { name: meta.label, path: `/category/${place.category}` },
      { name: place.name, path },
    ]),
  ];
  return { title, description, path, image: place.image?.url ?? null, jsonLd };
}

export function categorySeo(key: CategoryKey, places: Place[]) {
  const meta = CATEGORY_BY_KEY[key];
  const path = `/category/${key}`;
  const subs = topValues(places.map((p) => p.subcategory));
  const areas = topValues(places.map((p) => p.taluk), TALUKS.length);
  const title = `${meta.label} in Dharmapuri – ${places.length} listings with phone & address`;
  const description = [
    `${places.length} ${meta.label.toLowerCase()} in Dharmapuri district`,
    subs.length ? `including ${subs.slice(0, 4).join(', ').toLowerCase()}` : null,
    `across ${areas.join(', ')}.`,
  ].filter(Boolean).join(' ') + ' Addresses, phone numbers and directions.';

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: `${meta.label} in Dharmapuri`,
      url: `${SITE_URL}${path}`,
      mainEntity: {
        '@type': 'ItemList',
        numberOfItems: places.length,
        itemListElement: places.slice(0, 50).map((p, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          url: `${SITE_URL}${placePath(p)}`,
          name: p.name,
        })),
      },
    },
    breadcrumbs([{ name: 'Home', path: '/' }, { name: meta.label, path }]),
  ];
  return { title, description, path, jsonLd };
}

export const HOME_SEO: PageSeo = {
  title: 'MyDharmapuri: Offices, Schools, Hospitals, Hotels & Restaurants',
  description:
    'Dharmapuri district directory: government offices, schools, colleges, hospitals, tourist places like Hogenakkal Falls, showrooms, hotels and restaurants — with addresses, phone numbers and directions.',
  path: '/',
  jsonLd: {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'MyDharmapuri',
    url: `${SITE_URL}/`,
    inLanguage: 'en-IN',
    potentialAction: {
      '@type': 'SearchAction',
      target: `${SITE_URL}/search?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
    publisher: {
      '@type': 'Organization',
      name: 'MyDharmapuri',
      url: `${SITE_URL}/`,
      logo: `${SITE_URL}/icon-512.png`,
    },
  },
};

/** Area (taluk) landing page: every listing in one taluk, grouped by category. */
export function areaSeo(taluk: string, places: Place[]) {
  const path = `/area/${areaSlug(taluk)}`;
  const where = taluk === 'Dharmapuri' ? 'Dharmapuri town & taluk' : `${taluk}, Dharmapuri`;
  const kinds = CATEGORIES.filter((c) => places.some((p) => p.category === c.key)).map((c) => c.label.toLowerCase());
  const title = `${taluk} – ${places.length} places: hospitals, schools, offices, shops & restaurants`;
  const description = `${places.length} listings in ${where}: ${kinds.join(', ')}. Addresses, phone numbers and directions.`;
  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: `Places in ${taluk}, Dharmapuri`,
      url: `${SITE_URL}${path}`,
      about: { '@type': 'AdministrativeArea', name: `${taluk} taluk`, containedInPlace: { '@type': 'AdministrativeArea', name: 'Dharmapuri district' } },
      mainEntity: {
        '@type': 'ItemList',
        numberOfItems: places.length,
        itemListElement: places.slice(0, 50).map((p, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          url: `${SITE_URL}${placePath(p)}`,
          name: p.name,
        })),
      },
    },
    breadcrumbs([{ name: 'Home', path: '/' }, { name: taluk, path }]),
  ];
  return { title, description, path, jsonLd };
}

function topValues(values: (string | null)[], n = 6) {
  const m = new Map<string, number>();
  for (const v of values) if (v) m.set(v, (m.get(v) ?? 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([v]) => v);
}

export const SEARCH_SEO: PageSeo = {
  title: 'Search – MyDharmapuri',
  description: 'Search offices, schools, hospitals, hotels and restaurants across Dharmapuri district.',
  path: '/search',
  noindex: true,
};
export const SUBMIT_SEO: PageSeo = {
  title: 'Add a place – MyDharmapuri',
  description: 'Suggest a business or place in Dharmapuri district for the directory.',
  path: '/submit',
  noindex: true,
};
export function urbanSeo(places: Place[]): PageSeo {
  const path = '/urban-services';
  const types = [...new Set(places.map((p) => p.subcategory).filter(Boolean))] as string[];
  const list = types.length ? types.join(', ').toLowerCase() : 'local service providers';
  return {
    title: `Urban Services in Dharmapuri – ${list.replace(/^./, (c) => c.toUpperCase())}`,
    description: `${places.length || 'Local'} service providers in Dharmapuri district: ${list}. Phone numbers, addresses and directions on MyDharmapuri.`,
    path,
    jsonLd: [
      {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: 'Urban Services in Dharmapuri',
        url: `${SITE_URL}${path}`,
        mainEntity: {
          '@type': 'ItemList',
          numberOfItems: places.length,
          itemListElement: places.slice(0, 50).map((p, i) => ({ '@type': 'ListItem', position: i + 1, url: `${SITE_URL}${placePath(p)}`, name: p.name })),
        },
      },
      breadcrumbs([{ name: 'Home', path: '/' }, { name: 'Urban Services', path }]),
    ],
  };
}
export const NOT_FOUND_SEO: PageSeo = {
  title: 'Page not found – MyDharmapuri',
  description: "This page doesn't exist on MyDharmapuri.",
  path: '/404',
  noindex: true,
};
