const CACHE_NAME = 'side-scrolling-game-v2';
// Use a separate cache for updated resources
const TEMP_CACHE_NAME = 'side-scrolling-game-new-v2';
const ASSETS_TO_CACHE = [
  './',
  'index.html',
  'styles.css',
  'game.js',
  'manifest.json',
  'assets/game-modes-char.png',
  'assets/splatoon-inline2.jpg',
  'assets/Splatoon_2_-_Inkling_with_Splatlings.png',
  'assets/app-icon.png',
  'assets/octoling.jpg',
  'assets/octoslob.jpg'
  // Add other assets that should be cached here
];

// Install event - cache assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches and promote temp cache if exists
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all([
        // Clean up old version caches
        ...cacheNames.filter(cacheName => {
          return cacheName !== CACHE_NAME && 
                 cacheName !== TEMP_CACHE_NAME;
        }).map(cacheName => {
          return caches.delete(cacheName);
        }),
        
        // If we have a temp cache with updates, promote it to the main cache
        caches.has(TEMP_CACHE_NAME).then(hasTempCache => {
          if (hasTempCache) {
            return caches.open(TEMP_CACHE_NAME).then(tempCache => {
              return tempCache.keys().then(tempKeys => {
                return caches.open(CACHE_NAME).then(mainCache => {
                  return Promise.all(
                    tempKeys.map(key => {
                      return tempCache.match(key).then(response => {
                        return mainCache.put(key, response);
                      });
                    })
                  ).then(() => {
                    return caches.delete(TEMP_CACHE_NAME);
                  });
                });
              });
            });
          }
          return Promise.resolve();
        })
      ]);
    }).then(() => self.clients.claim())
  );
});

// Fetch event - stale-while-revalidate pattern
self.addEventListener('fetch', event => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;
  
  // Handle the fetch event with our cache-first, update-in-background strategy
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      const fetchPromise = fetch(event.request)
        .then(networkResponse => {
          // If we got a valid response, cache it in the temp cache for next launch
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            // Store in temp cache that will be promoted on next activation
            const responseToCache = networkResponse.clone();
            caches.open(TEMP_CACHE_NAME).then(cache => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // Network request failed, just continue with cached response
          console.log('Network request failed, using cache only');
        });

      // Return the cached response immediately if we have it,
      // otherwise wait for the network response
      return cachedResponse || fetchPromise;
    })
  );
}); 