<?php
// Serves images uploaded from the admin: https://mydharmapuri.com/media/<file> (rewritten here by .htaccess).
// They live outside public_html so website deploys don't delete them; see admin/public/upload.php.

$f = $_GET['f'] ?? '';
if (!preg_match('/^[a-z0-9-]{1,80}\.(webp|jpg|png)$/', $f, $m)) {
  http_response_code(404);
  exit;
}
$path = dirname(__DIR__) . '/mydharmapuri-media/' . $f;
if (!is_file($path)) {
  http_response_code(404);
  exit;
}
header('Content-Type: ' . ['webp' => 'image/webp', 'jpg' => 'image/jpeg', 'png' => 'image/png'][$m[1]]);
header('Content-Length: ' . filesize($path));
header('Cache-Control: public, max-age=31536000, immutable'); // names are unique, never overwritten
header('Access-Control-Allow-Origin: *');
readfile($path);
