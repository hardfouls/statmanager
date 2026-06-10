const CACHE = 'statmanager-v2';

const SCOPE = self.registration.scope;
const ASSETS = ['', 'app.js', 'manifest.json', 'icon.svg'].map(p => SCOPE + p);

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.url.includes('/api/')) return;

  const path = new URL(e.request.url).pathname;
  const isShell = path.endsWith('/') || path.endsWith('index.html') || path.endsWith('app.js');

  if (isShell) {
    // Network-first: always try to get the latest; fall back to cache if offline.
    e.respondWith(
      fetch(e.request)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy));
          return res;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // Cache-first for stable assets (manifest, icons, etc.)
  e.respondWith(caches.match(e.request).then(cached => cached || fetch(e.request)));
});
