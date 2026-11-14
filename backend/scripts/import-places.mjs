// Pushes app/src/data/places.seed.json into the Firestore `places` collection.
// Safe to re-run: documents are keyed by id, and fields that change at runtime
// (views, status, featured) are kept when a document already exists unless
// --overwrite is passed.
//
//   npm run import            (from backend/)
//   npm run import -- --overwrite
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FieldValue } from 'firebase-admin/firestore';
import { db } from './admin-sdk.mjs';

const overwrite = process.argv.includes('--overwrite');
const seedPath = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'app', 'src', 'data', 'places.seed.json');
const places = JSON.parse(readFileSync(seedPath, 'utf8'));

const existing = new Map();
for (const doc of (await db.collection('places').get()).docs) existing.set(doc.id, doc.data());

let created = 0, updated = 0;
const writer = db.bulkWriter();
for (const { id, ...place } of places) {
  const prev = existing.get(id);
  if (prev && !overwrite) {
    const { views, status, featuredRank, featuredLabel, ...content } = place;
    writer.set(db.doc(`places/${id}`), { ...content, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    updated++;
  } else {
    writer.set(db.doc(`places/${id}`), {
      ...place,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    created++;
  }
}
await writer.close();
console.log(`Imported ${places.length} places (${created} created, ${updated} updated).`);
