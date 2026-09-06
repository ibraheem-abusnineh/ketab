// Self-unregistering service worker.
//
// The ketab app does not currently use a service worker. This file
// exists to unregister any stale service worker that may have been
// installed by an older build of the app (or by a browser extension
// that interfered with fetches). It does not handle any requests.
//
// Once all clients have been claimed and unregistered, the browser
// will no longer intercept fetches for this origin.
//
// Bump CACHE_NAME to force the browser to install this version over
// any prior registration.
const CACHE_NAME = 'ketab-sw-kill-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Unregister this SW so no future fetches are intercepted.
      await self.registration.unregister();
      // Take control of any open clients immediately.
      if (self.clients && typeof self.clients.claim === 'function') {
        await self.clients.claim();
      }
    })()
  );
});

// Fetch handler intentionally does nothing — fall through to network.
self.addEventListener('fetch', (event) => {
  // No-op. The browser will use the default network behavior.
});
