// Runs after `expo export --platform web`:
//  1. Writes each page's <title>, description, canonical, robots and Open Graph/Twitter tags
//     into its <head>, from the data <Seo> embeds in the page (<script id="seo-head">).
//  2. Writes dist/sitemap.xml (an index) + four sitemaps, and dist/robots.txt.
import { copyFileSync, existsSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
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

// ---------- 2. Sitemaps + robots.txt ----------
// /sitemap.xml is an index of four sitemaps: businesses (place pages), locations (area pages),
// categories and content (home and other standalone pages).

const places = JSON.parse(readFileSync(join(root, 'src', 'data', 'places.seed.json'), 'utf8'));
const today = new Date().toISOString().slice(0, 10);
const day = (iso) => (iso ? String(iso).slice(0, 10) : today);
const latest = (list) => list.reduce((m, p) => (day(p.updatedAt) > m ? day(p.updatedAt) : m), '2000-01-01');
const by = (key) => [...new Set(places.map((p) => p[key]))].sort();
// Must match areaSlug() in src/lib/categories.ts.
const areaSlug = (t) => t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const sitemaps = {
  'sitemap-businesses.xml': places.map((p) => ({
    loc: `/place/${p.id}`, lastmod: day(p.updatedAt), changefreq: 'monthly', priority: '0.6',
    image: p.image ? { url: p.image.url, title: p.name, caption: p.image.credit } : null,
  })),
  'sitemap-locations.xml': by('taluk').filter((t) => existsSync(join(dist, 'area', `${areaSlug(t)}.html`))).map((t) => ({
    loc: `/area/${areaSlug(t)}`, lastmod: latest(places.filter((p) => p.taluk === t)), changefreq: 'weekly', priority: '0.7',
  })),
  'sitemap-categories.xml': by('category').map((c) => ({
    loc: `/category/${c}`, lastmod: latest(places.filter((p) => p.category === c)), changefreq: 'weekly', priority: '0.8',
  })),
  'sitemap-content.xml': [
    { loc: '/', lastmod: latest(places), changefreq: 'daily', priority: '1.0' },
    { loc: '/urban-services', lastmod: today, changefreq: 'monthly', priority: '0.3' },
    { loc: '/terms', lastmod: '2026-11-13', changefreq: 'yearly', priority: '0.2' },
  ].filter((u) => u.loc === '/' || existsSync(join(dist, `${u.loc.slice(1)}.html`))),
};

const urlXml = (u) => [
  `  <url><loc>${text(site + u.loc)}</loc><lastmod>${u.lastmod}</lastmod>`,
  `<changefreq>${u.changefreq}</changefreq><priority>${u.priority}</priority>`,
  u.image ? `<image:image><image:loc>${text(u.image.url)}</image:loc><image:title>${text(u.image.title)}</image:title><image:caption>${text(u.image.caption)}</image:caption></image:image>` : '',
  '</url>',
].join('');

for (const [file, urls] of Object.entries(sitemaps)) {
  const ns = urls.some((u) => u.image) ? ' xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"' : '';
  writeFileSync(join(dist, file), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"${ns}>
${urls.map(urlXml).join('\n')}
</urlset>
`);
}

const newest = (urls) => urls.reduce((m, u) => (u.lastmod > m ? u.lastmod : m), '2000-01-01');
writeFileSync(join(dist, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${Object.entries(sitemaps).map(([file, urls]) => `  <sitemap><loc>${site}/${file}</loc><lastmod>${newest(urls)}</lastmod></sitemap>`).join('\n')}
</sitemapindex>
`);
writeFileSync(join(dist, 'robots.txt'), `User-agent: *\nAllow: /\nDisallow: /submit\n\nSitemap: ${site}/sitemap.xml\n`);
console.log(`seo: sitemap index → ${Object.entries(sitemaps).map(([f, u]) => `${f} (${u.length})`).join(', ')}`);
