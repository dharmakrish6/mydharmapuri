// Runs after `expo export --platform web`:
//  1. Writes each page's <title>, description, canonical, robots and Open Graph/Twitter tags
//     into its <head>, from the data <Seo> embeds in the page (<script id="seo-head">).
//  2. Writes dist/sitemap.xml and dist/robots.txt for every pre-rendered page.
import { copyFileSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const site = (process.env.EXPO_PUBLIC_SITE_URL || 'https://mydharmapuri.com').replace(/\/$/, '');

// Expo Router's built-in route index (/_sitemap) isn't meant for visitors.
rmSync(join(dist, '_sitemap.html'), { force: true });
// Static hosts (Firebase Hosting, Netlify, …) serve 404.html for unknown paths.
copyFileSync(join(dist, '+not-found.html'), join(dist, '404.html'));

// ---------- 1. <head> tags ----------

const attr = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const text = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

function headTags(h) {
  const meta = (k, v, key = 'name') => `<meta ${key}="${k}" content="${attr(v)}"/>`;
  return [
    `<title>${text(h.title)}</title>`,
    meta('description', h.description),
    `<link rel="canonical" href="${attr(h.canonical)}"/>`,
    h.noindex ? meta('robots', 'noindex, follow') : '',
    meta('og:site_name', 'MyDharmapuri', 'property'),
    meta('og:type', 'website', 'property'),
    meta('og:locale', 'en_IN', 'property'),
    meta('og:title', h.title, 'property'),
    meta('og:description', h.description, 'property'),
    meta('og:url', h.canonical, 'property'),
    meta('og:image', h.image, 'property'),
    meta('twitter:card', h.largeImage ? 'summary_large_image' : 'summary'),
    meta('twitter:title', h.title),
    meta('twitter:description', h.description),
    meta('twitter:image', h.image),
  ].join('');
}

function htmlFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return name === '_expo' || name === 'assets' ? [] : htmlFiles(p);
    return name.endsWith('.html') ? [p] : [];
  });
}

const SEO_RE = /<script type="application\/json" id="seo-head">([\s\S]*?)<\/script>/;
let tagged = 0;
const missing = [];
for (const file of htmlFiles(dist)) {
  let html = readFileSync(file, 'utf8');
  const m = html.match(SEO_RE);
  if (!m) {
    missing.push(file.slice(dist.length));
    continue;
  }
  const head = JSON.parse(m[1]);
  html = html.replace(/<title>[\s\S]*?<\/title>/g, '').replace('<head>', `<head>${headTags(head)}`);
  writeFileSync(file, html);
  tagged++;
}
console.log(`seo: head tags written to ${tagged} pages${missing.length ? `; no <Seo> on ${missing.join(', ')}` : ''}`);

// ---------- 2. sitemap.xml + robots.txt ----------

const places = JSON.parse(readFileSync(join(root, 'src', 'data', 'places.seed.json'), 'utf8'));
const today = new Date().toISOString().slice(0, 10);
const day = (iso) => (iso ? String(iso).slice(0, 10) : today);
const latest = (list) => list.reduce((m, p) => (day(p.updatedAt) > m ? day(p.updatedAt) : m), '2000-01-01');
const categories = [...new Set(places.map((p) => p.category))];

const urls = [
  { loc: '/', lastmod: latest(places), priority: '1.0', changefreq: 'daily' },
  ...categories.map((c) => ({
    loc: `/category/${c}`,
    lastmod: latest(places.filter((p) => p.category === c)),
    priority: '0.8',
    changefreq: 'weekly',
  })),
  ...places.map((p) => ({ loc: `/place/${p.id}`, lastmod: day(p.updatedAt), priority: '0.6', changefreq: 'monthly' })),
  { loc: '/urban-services', lastmod: today, priority: '0.3', changefreq: 'monthly' },
  { loc: '/terms', lastmod: '2026-11-13', priority: '0.2', changefreq: 'yearly' },
];

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${text(site + u.loc)}</loc><lastmod>${u.lastmod}</lastmod><changefreq>${u.changefreq}</changefreq><priority>${u.priority}</priority></url>`).join('\n')}
</urlset>
`;
writeFileSync(join(dist, 'sitemap.xml'), xml);
writeFileSync(join(dist, 'robots.txt'), `User-agent: *\nAllow: /\nDisallow: /submit\n\nSitemap: ${site}/sitemap.xml\n`);
console.log(`seo: sitemap with ${urls.length} URLs → dist/sitemap.xml`);
