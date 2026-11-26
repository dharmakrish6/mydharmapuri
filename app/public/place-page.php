<?php
// /place/<slug> for places approved after the last deploy (pages that weren't pre-rendered).
// Looks the place up in Firestore and serves the app's place template with the right <title>, description and
// Open Graph tags, so shared links show a proper preview in WhatsApp, Facebook, Telegram, X, etc.
// Old links by Firestore ID get a 301 to the readable /place/<slug> URL. Unknown places get the 404 page.

const PROJECT = 'dharmapuri-directory';
const SITE = 'https://mydharmapuri.com';
const FIRESTORE = 'https://firestore.googleapis.com/v1/projects/' . PROJECT . '/databases/(default)/documents';

function not_found(): void {
  http_response_code(404);
  readfile(__DIR__ . '/404.html');
  exit;
}

function http_json(string $url, ?array $body = null): ?array {
  $ch = curl_init($url);
  curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 8]);
  if ($body !== null) {
    curl_setopt_array($ch, [CURLOPT_POST => true, CURLOPT_POSTFIELDS => json_encode($body), CURLOPT_HTTPHEADER => ['Content-Type: application/json']]);
  }
  $res = curl_exec($ch);
  $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
  curl_close($ch);
  return $code === 200 ? json_decode($res, true) : null;
}

/** Firestore REST value → plain PHP value. */
function fs_value(array $v) {
  if (isset($v['stringValue'])) return $v['stringValue'];
  if (isset($v['integerValue'])) return (int) $v['integerValue'];
  if (isset($v['doubleValue'])) return (float) $v['doubleValue'];
  if (isset($v['booleanValue'])) return $v['booleanValue'];
  if (isset($v['mapValue'])) return array_map('fs_value', $v['mapValue']['fields'] ?? []);
  return null;
}

$key = $_GET['p'] ?? '';
if (!preg_match('/^[A-Za-z0-9-]{1,120}$/', $key)) not_found();

// By slug first, then by document ID (old links).
$doc = null;
$rows = http_json(FIRESTORE . ':runQuery', ['structuredQuery' => [
  'from' => [['collectionId' => 'places']],
  'where' => ['compositeFilter' => ['op' => 'AND', 'filters' => [
    ['fieldFilter' => ['field' => ['fieldPath' => 'slug'], 'op' => 'EQUAL', 'value' => ['stringValue' => $key]]],
    ['fieldFilter' => ['field' => ['fieldPath' => 'status'], 'op' => 'EQUAL', 'value' => ['stringValue' => 'approved']]],
  ]]],
  'limit' => 1,
]]);
if ($rows && isset($rows[0]['document'])) $doc = $rows[0]['document'];
if (!$doc) $doc = http_json(FIRESTORE . '/places/' . rawurlencode($key));
if (!$doc) not_found();

$p = array_map('fs_value', $doc['fields'] ?? []);
if (($p['status'] ?? '') !== 'approved' || empty($p['name'])) not_found();
if (!empty($p['slug']) && $p['slug'] !== $key) {
  header('Location: ' . SITE . '/place/' . $p['slug'], true, 301);
  exit;
}

// ---- Same wording as placeSeo() in src/lib/seo.ts ----
$nouns = [
  'restaurants' => 'Restaurant', 'hotels' => 'Hotel', 'hospitals' => 'Hospital', 'sightseeing' => 'Tourist place',
  'showrooms' => 'Shop', 'colleges' => 'College', 'schools' => 'School', 'government_offices' => 'Government office',
  'services' => 'Service',
];
$cat = $p['category'] ?? '';
$sub = $p['subcategory'] ?? null;
$noun = ($cat === 'services' && $sub) ? $sub : ($nouns[$cat] ?? 'Place');
$kind = ($sub && $cat !== 'services') ? "$sub " . strtolower($noun) : $noun;
$taluk = $p['taluk'] ?? 'Dharmapuri';
$where = $taluk === 'Dharmapuri' ? 'Dharmapuri' : "$taluk, Dharmapuri";
$title = "{$p['name']} – $noun in $where";
$desc = implode(' ', array_filter([
  "{$p['name']}: " . strtolower($kind) . " in $where, Tamil Nadu.",
  !empty($p['phone']) ? "Phone {$p['phone']}." : null,
  !empty($p['address']) ? 'Address: ' . rtrim($p['address'], '.') . '.' : null,
  $p['description'] ?? null,
]));
$desc = trim(preg_replace('/\s+/', ' ', $desc));
if (mb_strlen($desc) > 160) $desc = rtrim(mb_substr($desc, 0, 159)) . '…';
$image = $p['image']['url'] ?? (SITE . '/icon-512.png');
$canonical = SITE . '/place/' . ($p['slug'] ?? $key);

$e = fn($s) => htmlspecialchars((string) $s, ENT_QUOTES, 'UTF-8');
$m = fn($k, $v, $attr = 'name') => "<meta $attr=\"$k\" content=\"{$e($v)}\"/>";
$tags = implode('', [
  "<title>{$e($title)}</title>",
  $m('description', $desc),
  "<link rel=\"canonical\" href=\"{$e($canonical)}\"/>",
  $m('og:site_name', 'MyDharmapuri', 'property'),
  $m('og:type', 'website', 'property'),
  $m('og:locale', 'en_IN', 'property'),
  $m('og:title', $title, 'property'),
  $m('og:description', $desc, 'property'),
  $m('og:url', $canonical, 'property'),
  $m('og:image', $image, 'property'),
  $m('og:image:alt', $title, 'property'),
  $m('twitter:card', isset($p['image']['url']) ? 'summary_large_image' : 'summary'),
  $m('twitter:title', $title),
  $m('twitter:description', $desc),
  $m('twitter:image', $image),
]);

$html = file_get_contents(__DIR__ . '/place/[id].html');
$html = preg_replace('#<title>.*?</title>#s', '', $html);
$html = preg_replace('#<head>#', '<head>' . $tags, $html, 1);
header('Content-Type: text/html; charset=utf-8');
header('Cache-Control: public, max-age=300');
echo $html;
