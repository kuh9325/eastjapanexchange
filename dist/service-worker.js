const CACHE_PREFIX = "eastjapanexchange-";
const CACHE_NAME = `${CACHE_PREFIX}3ba4a5bd075d`;
const PRECACHE = [
  "./index.html",
  "./src/styles.css?v=3ba4a5bd075d",
  "./src/app.js?v=3ba4a5bd075d",
  "./data/regions.js",
  "./assets/gallery-manifest.json",
  "./assets/intro/SOURCE.md",
  "./assets/intro/japan.svg",
  "./fixtures/full/gallery/activity-1.svg",
  "./fixtures/full/gallery/activity-2.svg",
  "./fixtures/full/gallery/activity-3.svg",
  "./fixtures/full/gallery/activity-4.svg",
  "./fixtures/full/gallery/activity-5.svg",
  "./fixtures/full/gallery/activity-6.svg",
  "./fixtures/full/leaders/leader-1.svg",
  "./fixtures/full/leaders/leader-2.svg",
  "./fixtures/full/leaders/leader-3.svg",
  "./fixtures/full/leaders/leader-4.svg",
  "./fixtures/full/meeting/group.svg"
].map((entry) => new URL(entry, self.registration.scope).href);
const INDEX_URL = new URL("./index.html", self.registration.scope).href;

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(names
        .filter((name) => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME)
        .map((name) => caches.delete(name))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).then((response) => {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(INDEX_URL, copy));
        }
        return response;
      }).catch(() => caches.match(request).then((cached) => cached || caches.match(INDEX_URL)))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response && response.ok && response.type === "basic") {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      }).catch(() => { throw new Error("offline resource unavailable"); });
    })
  );
});
