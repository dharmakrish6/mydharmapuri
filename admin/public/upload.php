<?php
// Image upload for the MyDharmapuri admin (admin.mydharmapuri.com/upload.php).
//
// POST multipart: token = the signed-in user's Firebase ID token, file = the image, name = optional place name.
// Only admins may upload: we ask Firestore for /admins/{uid} *with the user's own token*, so Firestore checks the
// token (signature, expiry, project) and the security rules for us — a 200 means a valid admin.
//
// Files are stored outside both web roots (deploys replace public_html) and served by mydharmapuri.com/media/<file>.

const PROJECT = 'dharmapuri-directory';
const MAX_BYTES = 8 * 1024 * 1024;
const PUBLIC_BASE = 'https://mydharmapuri.com/media/';

header('Content-Type: application/json');
header('Cache-Control: no-store');
header('X-Robots-Tag: noindex');

function fail(int $code, string $msg): void {
  http_response_code($code);
  echo json_encode(['error' => $msg]);
  exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') fail(405, 'POST only.');

// ---- Who is this? ----
$token = $_POST['token'] ?? '';
$parts = explode('.', $token);
if (count($parts) !== 3) fail(401, 'Sign in again.');
$claims = json_decode(base64_decode(strtr($parts[1], '-_', '+/')), true);
$uid = is_array($claims) ? ($claims['user_id'] ?? '') : '';
if (($claims['aud'] ?? '') !== PROJECT || !preg_match('/^[A-Za-z0-9]{1,128}$/', $uid)) fail(401, 'Sign in again.');

$ch = curl_init('https://firestore.googleapis.com/v1/projects/' . PROJECT . '/databases/(default)/documents/admins/' . $uid);
curl_setopt_array($ch, [
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_HTTPHEADER => ['Authorization: Bearer ' . $token],
  CURLOPT_TIMEOUT => 10,
]);
curl_exec($ch);
$status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);
if ($status === 404) fail(403, 'Only admins can upload images.');
if ($status !== 200) fail(401, 'Sign in again.');

// ---- The file ----
$f = $_FILES['file'] ?? null;
if (!$f || ($f['error'] ?? 1) !== UPLOAD_ERR_OK) fail(400, 'No image received (or it was too large for the server).');
if ($f['size'] > MAX_BYTES) fail(413, 'Image is larger than 8 MB.');
$info = @getimagesize($f['tmp_name']);
$ext = [IMAGETYPE_JPEG => 'jpg', IMAGETYPE_PNG => 'png', IMAGETYPE_WEBP => 'webp'][$info[2] ?? 0] ?? null;
if (!$ext) fail(415, 'Use a JPG, PNG or WebP image.');

// Readable, unguessable file name: "ayyanar-sweets-3f9a1c2b7d.webp".
$slug = trim(preg_replace('/[^a-z0-9]+/', '-', strtolower($_POST['name'] ?? '')), '-');
$slug = substr($slug, 0, 50);
$file = ($slug !== '' ? $slug . '-' : '') . bin2hex(random_bytes(5)) . '.' . $ext;

$dir = dirname(__DIR__, 2) . '/mydharmapuri-media';
if (!is_dir($dir) && !mkdir($dir, 0755, true)) fail(500, 'Storage folder is not writable.');
if (!move_uploaded_file($f['tmp_name'], "$dir/$file")) fail(500, 'Could not save the image.');
chmod("$dir/$file", 0644);

echo json_encode(['url' => PUBLIC_BASE . $file, 'width' => $info[0], 'height' => $info[1]]);
