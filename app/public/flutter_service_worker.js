// This site used to be a Flutter web app whose service worker cached the old app in
// visitors' browsers. Browsers re-check this file on each visit; this version deletes the
// old caches, unregisters itself and reloads open tabs so they load the current site.
// Keep it deployed for a few months so returning visitors pick it up.
self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => caches.delete(k)));
    await self.registration.unregister();
    const clients = await self.clients.matchAll({ type: 'window' });
    for (const client of clients) client.navigate(client.url);
  })());
});
