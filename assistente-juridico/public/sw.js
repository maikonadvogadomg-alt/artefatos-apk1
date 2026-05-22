const CACHE_NAME = 'iara-v23';
const NAV_CACHE = 'iara-nav-v23';
const SHELL = ['./','./index.html'];

const CACHEABLE = ['.js','.css','.woff2','.woff','.ttf','.otf',
                   '.png','.jpg','.jpeg','.webp','.svg','.ico',
                   '.json','.wasm','.txt','.html'];

function isCacheable(url) {
  return CACHEABLE.some(ext => url.pathname.endsWith(ext));
}

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL).catch(() => {}))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter(n => n !== CACHE_NAME && n !== NAV_CACHE)
          .map(n => caches.delete(n))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);

  if (url.pathname.includes('/api/')) return;
  if (url.hostname !== self.location.hostname) return;

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          const clone = res.clone();
          caches.open(NAV_CACHE).then((c) => c.put(event.request, clone));
          return res;
        })
        .catch(() =>
          caches.match(event.request)
            .then(r => r ||
              caches.match('./index.html') ||
              caches.match('./')
            )
        )
    );
    return;
  }

  if (isCacheable(url)) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(event.request);
        const fetchPromise = fetch(event.request).then((res) => {
          if (res.ok) cache.put(event.request, res.clone());
          return res;
        }).catch(() => cached || new Response('', { status: 503 }));

        return cached || fetchPromise;
      })
    );
    return;
  }

  event.respondWith(
    fetch(event.request).catch(() =>
      caches.match(event.request).then(r => r || new Response('', { status: 503 }))
    )
  );
});
