import { Platform } from 'react-native';
import Head from 'expo-router/head';

/** Public site origin used for canonical URLs, Open Graph and structured data. */
export const SITE_URL = (process.env.EXPO_PUBLIC_SITE_URL || 'https://mydharmapuri.com').replace(/\/$/, '');
export const SITE_NAME = 'MyDharmapuri';
const DEFAULT_IMAGE = `${SITE_URL}/icon-512.png`;

export interface PageSeo {
  title: string;
  description: string;
  /** Path starting with "/", e.g. "/place/abc". */
  path: string;
  image?: string | null;
  noindex?: boolean;
  /** One or more schema.org objects. */
  jsonLd?: object | object[];
}

/**
 * Per-page SEO (web only):
 * - keeps the browser tab title right during client-side navigation;
 * - renders schema.org JSON-LD into the page (Google reads it from the body);
 * - embeds this page's <head> details, which scripts/seo-postbuild.mjs writes into
 *   the static HTML's <head> (title, description, canonical, Open Graph, robots).
 */
export function Seo({ title, description, path, image, noindex, jsonLd }: PageSeo) {
  if (Platform.OS !== 'web') return null;
  const head = {
    title,
    description: clip(description, 160),
    canonical: `${SITE_URL}${path}`,
    image: image || DEFAULT_IMAGE,
    largeImage: !!image,
    noindex: !!noindex,
  };
  return (
    <>
      <Head><title>{title}</title></Head>
      <script type="application/json" id="seo-head" dangerouslySetInnerHTML={{ __html: safeJson(head) }} />
      {jsonLd && (
        <script
          type="application/ld+json"
          // Escape "<" so place text can never close the script tag.
          dangerouslySetInnerHTML={{ __html: safeJson(jsonLd) }}
        />
      )}
    </>
  );
}

/** JSON that can't close the surrounding <script> tag. */
const safeJson = (v: unknown) => JSON.stringify(v).replace(/</g, '\\u003c');

export function clip(text: string, max: number) {
  const t = text.replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(' '), max - 20))}…`;
}

export const breadcrumbs = (items: { name: string; path: string }[]) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: items.map((it, i) => ({
    '@type': 'ListItem',
    position: i + 1,
    name: it.name,
    item: `${SITE_URL}${it.path}`,
  })),
});
