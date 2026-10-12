// Service worker for «يلا دورك» — makes the home page installable as an app.
// It only handles the home page's own files. Anything inside a game's folder
// (/sharatalbidaya/, /tashkila/, any future game) is left completely alone —
// each game has its own service worker.
const CACHE = "yalla-v1";
const SHELL = ["/", "/index.html", "/games.js", "/about.html", "/privacy.html", "/page.css",
               "/icons/icon-192.png", "/icons/icon-512.png", "/games/sharah.png", "/games/tashkila.png"];
const HUB_ROOT_FILES = /^\/[^\/]*$|^\/(icons|games)\//;   // files at the top level, or in icons/ and games/

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.all(SHELL.map(f => c.add(f).catch(() => {}))))   // a missing file never blocks install
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith("yalla-") && k !== CACHE).map(k => caches.delete(k))))   // only the hub's own old caches
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return;   // fonts etc.: untouched
  if (!HUB_ROOT_FILES.test(url.pathname)) return;                             // game folders: untouched
  // Network first (updates show immediately); saved copy only when offline
  e.respondWith(
    fetch(e.request)
      .then(res => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }
        return res;
      })
      .catch(() => caches.match(e.request).then(m => m || caches.match("/")))
  );
});
