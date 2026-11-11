// Converts the legacy data/*.json files into one flat list of places — the
// shape stored in the Firestore `places` collection. Writes it to
// app/src/data/places.seed.json, which is both the import source for
// Firestore and the offline fallback the app uses before Firebase is set up.
//
//   node backend/scripts/build-seed.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (f) => JSON.parse(readFileSync(join(ROOT, 'data', f), 'utf8'));

const directory = read('directory.json');
const sources = {
  restaurants: read('restaurants.json').restaurants,
  hotels: read('hotels.json').hotels,
  hospitals: read('hospitals.json').hospitals,
  sightseeing: read('sightseeing.json').places,
  showrooms: read('showrooms.json').showrooms,
  colleges: directory.categories.colleges,
  schools: directory.categories.schools,
  government_offices: directory.categories.government_offices,
};

// Which legacy field becomes the filterable `subcategory` for each category.
// Several legacy files used `category` for the sub-type, which clashes with
// the top-level category key, so it is renamed here.
const SUBCATEGORY_FIELD = {
  restaurants: 'category',
  hotels: 'tier',
  hospitals: 'category',
  sightseeing: null,
  showrooms: 'category',
  colleges: 'stream',
  schools: 'type',
  government_offices: 'type',
};

const featured = read('featured.json').featured;

function slugify(s) {
  return s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80);
}

const places = [];
const ids = new Set();
for (const [category, entries] of Object.entries(sources)) {
  const subField = SUBCATEGORY_FIELD[category];
  for (const e of entries) {
    let id = slugify(`${category}-${e.name}`);
    for (let n = 2; ids.has(id); n++) id = slugify(`${category}-${e.name}`) + `-${n}`;
    ids.add(id);

    const rank = featured.findIndex((f) => f.category === category && f.name === e.name);
    places.push({
      id,
      category,
      name: e.name,
      subcategory: subField ? e[subField] ?? null : null,
      taluk: e.taluk,
      address: e.address ?? null,
      phone: e.phone ?? null,
      // category-specific extras (null when not applicable)
      type: category === 'colleges' ? e.type : null,
      brand: e.brand ?? null,
      ownership: e.ownership ?? null,
      description: e.description ?? null,
      howToReach: e.howToReach ?? null,
      image: e.image ?? null,
      status: 'approved',
      views: 0,
      featuredRank: rank === -1 ? null : rank + 1,
      featuredLabel: rank === -1 ? null : featured[rank].label ?? null,
      source: 'import',
      submittedBy: null,
    });
  }
}

const out = join(ROOT, 'app', 'src', 'data', 'places.seed.json');
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(places, null, 1) + '\n');
console.log(`Wrote ${places.length} places to ${out}`);
