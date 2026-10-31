// Service worker for the booth check-in page only (registered with scope <base>checkin/).
// Guest invitation pages are never controlled by it.
//  - Page loads: network first, fall back to the cached app shell when the booth is offline.
//  - Static files (scripts, styles, fonts): cache first (they are content-hashed).
//  - API calls are never cached here; the page keeps its own offline data and queue.
const CACHE = 'expo-checkin-v1';
const SHELL = new URL('__shell', self.registration.scope).href;

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => {
  event.waitUntil(
    caches
      .keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith('expo-checkin-') && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout')), ms);
    promise.then(
      v => (clearTimeout(t), resolve(v)),
      e => (clearTimeout(t), reject(e)),
    );
  });
}

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || url.pathname.includes('/api/')) return;

  if (req.mode === 'navigate') {
    event.respondWith(
      withTimeout(fetch(req), 5000)
        .then(res => {
          if (res.ok) caches.open(CACHE).then(c => c.put(SHELL, res.clone()));
          return res;
        })
        .catch(() => caches.match(SHELL).then(r => r || new Response('Offline', { status: 503 }))),
    );
    return;
  }

  event.respondWith(
    caches.match(req).then(
      hit =>
        hit ||
        fetch(req).then(res => {
          if (res.ok && res.type === 'basic') caches.open(CACHE).then(c => c.put(req, res.clone()));
          return res;
        }),
    ),
  );
});
