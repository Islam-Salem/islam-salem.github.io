// Retired. The whole site now has ONE service worker at /sw.js.
// Phones that still have this game's old worker download this file on their next visit:
// it deletes the game's old saved files and removes itself, so /sw.js takes over.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k.startsWith("tashkila-")).map((k) => caches.delete(k)));
    await self.registration.unregister();
  })());
});
