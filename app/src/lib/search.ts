import type { Place } from './types';

/** Case-insensitive match of every word in `q` against the place's text fields. */
export function matches(p: Place, q: string) {
  const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const hay = [p.name, p.subcategory, p.taluk, p.address, p.brand, p.ownership, p.description]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return words.every((w) => hay.includes(w));
}
