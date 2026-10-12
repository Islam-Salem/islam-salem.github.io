// Makes «يلا دورك» installable as an app.
// It deliberately does NOT intercept any requests, so it can never interfere with the games
// (each game lives in its own folder and keeps its own behaviour).
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil(self.clients.claim()));
