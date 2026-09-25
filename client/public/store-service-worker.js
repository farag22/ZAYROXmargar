const STATIC_CACHE = "zayrox-static-v2";
const STORE_CACHE = "zayrox-store-data-v1";
const APP_SHELL = ["/", "/store-manifest.webmanifest"];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(STATIC_CACHE).then(cache => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(key => ![STATIC_CACHE, STORE_CACHE].includes(key)).map(key => caches.delete(key)))).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith("/api/trpc/storefront.get")) {
    event.respondWith(networkFirst(request, STORE_CACHE));
    return;
  }

  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/__manus__/")) return;
  event.respondWith(cacheFirst(request, STATIC_CACHE));
});

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok && response.type === "basic") {
      const cache = await caches.open(cacheName);
      await cache.put(request, response.clone());
    }
    return response;
  } catch {
    return caches.match("/");
  }
}

async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      await cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached || new Response(JSON.stringify({ error: "OFFLINE_STORE_UNAVAILABLE" }), { status: 503, headers: { "Content-Type": "application/json" } });
  }
}
