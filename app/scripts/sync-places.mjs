// Snapshot approved places from Firestore into src/data/places.seed.json before a web build,
// so the statically rendered pages (and the offline fallback) match what admins have published.
// Uses the public web API key: Firestore rules only expose approved places.
// If Firestore can't be reached, the existing snapshot is kept and the build continues.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const seedPath = join(root, 'src', 'data', 'places.seed.json');

function readEnv() {
  const env = { ...process.env };
  try {
    for (const line of readFileSync(join(root, '.env'), 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
      if (m && !(m[1] in process.env)) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  } catch {}
  return env;
}

/** Firestore REST value → plain JSON. */
function decode(v) {
  if ('nullValue' in v) return null;
  if ('stringValue' in v) return v.stringValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('timestampValue' in v) return v.timestampValue;
  if ('arrayValue' in v) return (v.arrayValue.values ?? []).map(decode);
  if ('mapValue' in v) return Object.fromEntries(Object.entries(v.mapValue.fields ?? {}).map(([k, x]) => [k, decode(x)]));
  return null;
}

const KEEP = [
  'category', 'name', 'subcategory', 'taluk', 'address', 'phone', 'type', 'brand', 'ownership',
  'description', 'howToReach', 'image', 'status', 'views', 'featuredRank', 'featuredLabel', 'featuredUntil',
];
const ORDER = ['restaurants', 'hotels', 'hospitals', 'sightseeing', 'showrooms', 'colleges', 'schools', 'government_offices'];

const env = readEnv();
const projectId = env.EXPO_PUBLIC_FIREBASE_PROJECT_ID;
const apiKey = env.EXPO_PUBLIC_FIREBASE_API_KEY;
if (!projectId || !apiKey) {
  console.warn('sync-places: Firebase not configured in app/.env — keeping the existing snapshot.');
  process.exit(0);
}

try {
  const res = await fetch(
    `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: 'places' }],
          where: { fieldFilter: { field: { fieldPath: 'status' }, op: 'EQUAL', value: { stringValue: 'approved' } } },
        },
      }),
    },
  );
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  const rows = (await res.json()).filter((r) => r.document);
  if (!rows.length) throw new Error('no approved places returned');

  const places = rows.map(({ document: d }) => {
    const data = decode({ mapValue: { fields: d.fields } });
    const place = { id: d.name.split('/').pop() };
    for (const k of KEEP) place[k] = data[k] ?? (k === 'views' ? 0 : null);
    // Who submitted a place is never shipped in the public bundle.
    place.submittedBy = null;
    place.updatedAt = data.updatedAt ?? d.updateTime;
    return place;
  });
  places.sort((a, b) => ORDER.indexOf(a.category) - ORDER.indexOf(b.category) || a.name.localeCompare(b.name));
  writeFileSync(seedPath, `${JSON.stringify(places, null, 2)}\n`);
  console.log(`sync-places: wrote ${places.length} approved places from Firestore.`);
} catch (err) {
  console.warn(`sync-places: could not read Firestore (${err.message}) — keeping the existing snapshot.`);
}
