# يلا دورك

Daily Arabic mini-games, one site and one app: https://islam-salem.github.io/

This repo **must be named `islam-salem.github.io`** — GitHub then serves it at the root address.

```
index.html, games.js      the home page (game cards, today's progress, install box)
about.html, privacy.html  عن يلا دورك / سياسة الخصوصية (the privacy page the Play Store asks for)
offline.html              shown when there's no internet and the page isn't saved yet
404.html                  "page not found" + sends old addresses to new ones (MOVED list at the top)
sw.js                     the ONE service worker for the whole site (install + offline)
site.webmanifest          the app: name, icons, colours, shortcuts to each game, screenshots
icons/, games/            app icons; one 192×192 icon per game card
screenshots/              app screenshots (install screen + Play Store listing)
store/                    Play Store listing images (icon 512, feature graphic 1024×500)
.well-known/assetlinks.json   proves to Android that the Play Store app owns this site (see below)
.nojekyll                 needed so GitHub Pages publishes the .well-known folder
tools/set_domain.py       moves everything to your own domain in one step

sharatalbidaya/           «شارة البداية»  (its own README)
tashkila/                 «تشكيلة المنتخب» (its own README)
.github/workflows/        tashkila's weekly data update
```

Every game page links `/site.webmanifest` and registers `/sw.js`, so installing from any game installs
the whole «يلا دورك» app, and all games share one saved-progress store (same address).

## Adding a new game
1. Put it in a new folder, e.g. `newgame/` (lowercase, no spaces) → live at `/newgame/`.
2. In its pages' `<head>`: `<link rel="manifest" href="/site.webmanifest">`, and register the worker:
   `navigator.serviceWorker.register("/sw.js", {scope:"/"})`. Add a link back to `/` («يلا دورك» in the footer).
3. Here: a block in `games.js` + a 192×192 icon in `games/`; a shortcut in `site.webmanifest`;
   its address in `sitemap.xml`; its main files in `SHELL` at the top of `sw.js`.
4. Save keys in localStorage must start with the game's own prefix (all games share one address).

## Own domain
1. Buy the domain. At the domain company, point it to GitHub Pages
   (4 `A` records: 185.199.108.153, 185.199.109.153, 185.199.110.153, 185.199.111.153, and a
   `CNAME` record `www` → `islam-salem.github.io`).
2. Run `python tools/set_domain.py yourdomain.com` → updates every full address and writes `CNAME`. Upload the changed files.
3. Settings → Pages → Custom domain → same domain → Save → tick **Enforce HTTPS**.
   `islam-salem.github.io` then forwards to the new domain automatically.

⚠️ Saved progress and stats live in the browser per address, so players start fresh on a new domain.
Do this **before** the Play Store app, because the app is tied to one address.

## Play Store app
The app is the website in a full-screen Chrome window (a "Trusted Web Activity"): every update you upload
to GitHub shows up in the app immediately, no new app version needed.

1. Go to https://www.pwabuilder.com → enter the site address → **Package for stores** → **Android**.
   - Package ID: `com.yalladorak.app` (must match `.well-known/assetlinks.json`; can't change after publishing)
   - App name «يلا دورك», launcher name «يلا دورك», keep the rest.
   - Download the zip. **Keep the signing key file and its passwords safe** — you need them for every app update.
2. Play Console (one-time $25 developer account) → Create app → upload the `.aab` from the zip.
3. Play Console → your app → **Setup → App signing** → copy the **SHA-256 certificate fingerprint**.
   Put it in `.well-known/assetlinks.json` instead of `PASTE:THE:SHA-256:...` (keep the quotes) and upload.
   PWABuilder's zip also has an `assetlinks.json` with its own key's fingerprint — you can list both.
   Without this step the app shows a browser address bar at the top.
4. Store listing: icon `store/play-icon-512.png`, feature graphic `store/feature-graphic.png`,
   phone screenshots in `screenshots/`, privacy policy `https://<your address>/privacy.html`.
5. Data safety form: the games collect no data and have no accounts; progress is saved only on the phone.
   «شارة البداية» shows a YouTube video after each round, and the pages load Google Fonts.
