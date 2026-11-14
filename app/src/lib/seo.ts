import { SITE_URL, breadcrumbs, type PageSeo } from '@/components/Seo';
import { CATEGORY_BY_KEY, TALUKS } from './categories';
import type { CategoryKey, Place } from './types';

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
};

export function placeSeo(place: Place) {
  const path = `/place/${place.id}`;
  const kind = place.subcategory ? `${place.subcategory} ${NOUN[place.category].toLowerCase()}` : NOUN[place.category];
  const where = place.taluk === 'Dharmapuri' ? 'Dharmapuri' : `${place.taluk}, Dharmapuri`;
  const title = `${place.name} – ${NOUN[place.category]} in ${where}`;
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
          url: `${SITE_URL}/place/${p.id}`,
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
export const URBAN_SEO: PageSeo = {
  title: 'Urban Services in Dharmapuri – Coming soon',
  description: 'Home, auto, beauty, repair, cleaning and 13 more local service categories for Dharmapuri — launching soon on MyDharmapuri.',
  path: '/urban-services',
};
export const NOT_FOUND_SEO: PageSeo = {
  title: 'Page not found – MyDharmapuri',
  description: "This page doesn't exist on MyDharmapuri.",
  path: '/404',
  noindex: true,
};
