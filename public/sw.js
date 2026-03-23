// Basic Service worker to fulfill PWA install schema requirements.
self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
    // Empty fetch pass-through to avoid breaking routing caching while natively validating PWA schemas
});
