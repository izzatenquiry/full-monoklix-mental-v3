const CACHE_NAME = 'monoklix-cache-v2'; // Bump version to force update
const URLS_TO_CACHE = [
  '/',
  '/index.html',
  '/index.css',
  '/manifest.json'
  // Do not cache index.tsx as it's the main app bundle and changes often.
  // The browser will cache it based on headers if needed.
];

// Install the service worker and cache the app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('ServiceWorker: Caching app shell');
        return cache.addAll(URLS_TO_CACHE);
      })
  );
});

// Clean up old caches on activation
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('ServiceWorker: Deleting old cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Intercept fetch requests
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // --- STRATEGY 1: API Calls (Network Only) ---
  // Always go to the network for API calls to Supabase or our own proxy.
  // This ensures data is always fresh and avoids caching POST/PATCH requests.
  if (url.origin.includes('supabase.co') || url.pathname.startsWith('/api/')) {
    // By simply returning, we let the browser handle the request as normal.
    // The service worker will not interfere.
    return;
  }

  // --- STRATEGY 2: App Shell & Static Assets (Stale-While-Revalidate) ---
  // For all other GET requests, serve from cache first for speed, but
  // fetch an update in the background to keep the cache fresh.
  if (request.method === 'GET') {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.match(request).then((cachedResponse) => {
          const fetchPromise = fetch(request).then((networkResponse) => {
            // If we get a valid response, update the cache.
            if (networkResponse && networkResponse.status === 200) {
              cache.put(request, networkResponse.clone());
            }
            return networkResponse;
          }).catch(err => {
            // The network failed, but we might have a cached response to serve.
            // If not, the error will propagate.
            console.warn('ServiceWorker: Network request failed for', request.url, err);
          });

          // Return cached response immediately if it exists.
          // Otherwise, wait for the network to respond.
          return cachedResponse || fetchPromise;
        });
      })
    );
    return;
  }
  
  // For any other requests (non-GET, non-API), just let them pass through.
  return;
});