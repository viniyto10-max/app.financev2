const CACHE_NAME = 'minhas-economias-v1';
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/icon.svg',
  '/icon-maskable.svg',
  '/pwa-192x192.png',
  '/pwa-512x512.png',
  '/pwa-maskable-512x512.png',
  '/apple-touch-icon.png',
  '/favicon.ico',
  '/favicon.png',
];

self.addEventListener('install', (e) => e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(PRECACHE_ASSETS))));
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // NUNCA cachear webhooks, leituras da planilha, ou APIs proxy
  if (
    url.hostname.includes('hook.us2.make.com') ||
    url.hostname.includes('docs.google.com') ||
    url.pathname.startsWith('/api/')
  ) {
    return; // Rede direto
  }

  // Network-first para o resto (app files, HTML, JS, CSS)
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
