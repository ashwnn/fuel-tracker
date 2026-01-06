// Service Worker for FuelTracker PWA - Optimized caching strategy
const CACHE_VERSION = 'v2'; // Increment this to invalidate all caches
const STATIC_CACHE = `fueltracker-static-${CACHE_VERSION}`;
const DASHBOARD_CACHE = `fueltracker-dashboard-${CACHE_VERSION}`;
const IMAGE_CACHE = `fueltracker-images-${CACHE_VERSION}`;
const API_CACHE = `fueltracker-api-${CACHE_VERSION}`;

// Dashboard data cache TTL (5 minutes)
const DASHBOARD_CACHE_TTL = 5 * 60 * 1000;

// Assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/manifest.webmanifest',
];

// Allow clients to tell this worker to activate immediately
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Cache expiration timestamps stored in IndexedDB
let cacheTimestamps = {};

// Initialize IndexedDB for cache metadata
function initDB() {
  return new Promise((resolve) => {
    const request = indexedDB.open('FuelTrackerCache', 1);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('cacheTimestamps')) {
        db.createObjectStore('cacheTimestamps');
      }
    };
    request.onsuccess = () => resolve(request.result);
  });
}

// Store cache timestamp
async function setCacheTimestamp(key, timestamp) {
  const db = await initDB();
  db.transaction(['cacheTimestamps'], 'readwrite')
    .objectStore('cacheTimestamps')
    .put(timestamp, key);
}

// Get cache timestamp
async function getCacheTimestamp(key) {
  const db = await initDB();
  return new Promise((resolve) => {
    const request = db
      .transaction(['cacheTimestamps'], 'readonly')
      .objectStore('cacheTimestamps')
      .get(key);
    request.onsuccess = () => resolve(request.result);
  });
}

// Check if cache is expired
async function isCacheExpired(key, ttl) {
  const timestamp = await getCacheTimestamp(key);
  if (!timestamp) return true;
  return Date.now() - timestamp > ttl;
}

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => !name.includes(CACHE_VERSION))
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch event - Smart caching strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Dashboard API - Cache first, revalidate in background
  if (url.pathname === '/api/dashboard') {
    event.respondWith(
      (async () => {
        const cache = await caches.open(DASHBOARD_CACHE);
        const cached = await cache.match(request);
        const expired = await isCacheExpired('/api/dashboard', DASHBOARD_CACHE_TTL);

        if (cached && !expired) {
          // Cache still valid, use it and revalidate in background
          fetch(request).then((response) => {
            if (response.ok) {
              cache.put(request, response.clone());
              setCacheTimestamp('/api/dashboard', Date.now());
            }
          });
          return cached;
        }

        // Cache expired or missing, fetch fresh
        try {
          const response = await fetch(request);
          if (response.ok) {
            cache.put(request, response.clone());
            setCacheTimestamp('/api/dashboard', Date.now());
          }
          return response;
        } catch {
          // Network failed, return stale cache if available
          return cached || new Response('Offline - no cached data available', { status: 503 });
        }
      })()
    );
    return;
  }

  // Other API requests - Network first with fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(request);
          if (response.ok) {
            const cache = await caches.open(API_CACHE);
            cache.put(request, response.clone());
          }
          return response;
        } catch {
          const cache = await caches.open(API_CACHE);
          return cache.match(request) || new Response('Offline', { status: 503 });
        }
      })()
    );
    return;
  }

  // Images - Cache first with aggressive caching
  if (url.pathname.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        return cached || fetch(request).then((response) => {
          if (response.ok) {
            const cache = caches.open(IMAGE_CACHE);
            cache.then((c) => c.put(request, response.clone()));
          }
          return response;
        }).catch(() => {
          // Return placeholder or cached version
          return cached || new Response('', { status: 404 });
        });
      })
    );
    return;
  }

  // Static assets - Cache first
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(request).then((response) => {
        if (!response || response.status !== 200 || response.type === 'error') {
          return response;
        }

        const responseToCache = response.clone();
        caches.open(STATIC_CACHE).then((cache) => {
          cache.put(request, responseToCache);
        });

        return response;
      });
    })
  );
});

// Background sync for queued entries (if supported)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-entries') {
    event.waitUntil(syncQueuedEntries());
  }
});

/**
 * Sync queued entries when connection is restored
 * This enables offline support - users can create entries while offline
 * and they'll be synced when reconnected
 */
async function syncQueuedEntries() {
  try {
    const db = await initDB();
    const transaction = db.transaction(['queuedEntries'], 'readonly');
    const store = transaction.objectStore('queuedEntries');
    
    // Get all queued entries
    const queuedEntries = await new Promise((resolve) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
    });

    // Sync each entry
    for (const entry of queuedEntries) {
      try {
        await fetch('/api/vehicles/' + entry.vehicleId + '/entries', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + entry.token,
          },
          body: JSON.stringify(entry.data),
        });

        // Remove from queue after successful sync
        const deleteTransaction = db.transaction(['queuedEntries'], 'readwrite');
        deleteTransaction.objectStore('queuedEntries').delete(entry.id);
      } catch (error) {
        // If sync fails, leave in queue for next sync
      }
    }
  } catch (error) {
    // Sync failed, will retry on next sync event
  }
}
