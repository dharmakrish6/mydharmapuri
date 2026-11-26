// Gives every place a `slug` for its page URL (mydharmapuri.com/place/<slug>).
// Places imported with readable IDs ("restaurants-athiyan-hotel") keep their ID as the slug so existing links
// keep working; places with random Firestore IDs get one from their name ("bright-ro-systems").
//
//   node scripts/backfill-slugs.mjs          (dry run)
//   node scripts/backfill-slugs.mjs --write
import { db } from './admin-sdk.mjs';

const write = process.argv.includes('--write');
const slugify = (s) => s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);

const snap = await db.collection('places').get();
const taken = new Set(snap.docs.flatMap((d) => [d.id, d.get('slug')].filter(Boolean)));
let changed = 0;
for (const d of snap.docs) {
  if (d.get('slug')) continue;
  let slug = /^[a-z0-9-]+$/.test(d.id) ? d.id : null;
  if (!slug) {
    const base = slugify(d.get('name') ?? '') || 'place';
    const taluk = slugify(d.get('taluk') ?? '');
    slug = [base, taluk && `${base}-${taluk}`].find((s) => s && !taken.has(s));
    for (let n = 2; !slug; n++) if (!taken.has(`${base}-${n}`)) slug = `${base}-${n}`;
  }
  taken.add(slug);
  changed++;
  if (slug !== d.id) console.log(`${d.id}  →  ${slug}   (${d.get('name')}, ${d.get('status')})`);
  if (write) await d.ref.update({ slug });
}
console.log(`${changed} place(s) ${write ? 'updated' : 'would get a slug'}; ${snap.size} total.`);
