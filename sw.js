// «يلا دورك» — the ONE service worker for the whole site (home page + every game).
// Needed to install the site as an app (phones, and the Play Store version), and lets it open offline.
//
// Strategy: network first — when online you always get the latest files and today's puzzle;
// the saved copy is used only when the network fails. With no saved copy, offline.html is shown.
//
// After big changes you can bump the version below; old saved files are then deleted.
const CACHE = "yalla-v2";

// Saved at install, so the app opens offline even before you visit each page
const SHELL = [
  "/", "/index.html", "/games.js", "/offline.html", "/about.html", "/privacy.html", "/page.css",
  "/icons/icon-192.png", "/icons/icon-512.png", "/games/sharah.png", "/games/tashkila.png",
  "/sharatalbidaya/", "/sharatalbidaya/songs.js", "/sharatalbidaya/icon-192.png",
  "/tashkila/", "/tashkila/xi.js", "/tashkila/xi.css",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => Promise.all(SHELL.map((f) => c.add(f).catch(() => {}))))   // a missing file never blocks install
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  // this worker owns the whole site, so every other saved copy is old (incl. the games' former "sharah-…" / "tashkila-…")
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== location.origin) return;   // YouTube, fonts, Wikimedia images: untouched
  if (url.pathname.startsWith("/.well-known/")) return;                  // Play Store app check: always straight from the server
  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res.status === 200) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {}); }
        return res;
      })
      .catch(async () => {
        // offline: the saved copy (ignoring ?t=… / ?d=… so data files and pages still match)
        const hit = await caches.match(req) || await caches.match(req, { ignoreSearch: true });
        if (hit) return hit;
        if (req.mode === "navigate") return caches.match("/offline.html");
        return Response.error();
      })
  );
});
