# يلا دورك

Home page for all the daily games. This repo **must be named `islam-salem.github.io`** —
GitHub then serves it at https://islam-salem.github.io/ and every other repo with Pages turned on
appears under it automatically (e.g. `/sharatalbidaya/`, `/tashkila/`).

## Adding a new game
1. Make the game in its own repo, turn on Pages → it's live at `/<repo-name>/`.
2. Here: add a block to `games.js` and its 192×192 icon to `games/`.
3. Add its address to `sitemap.xml`.
4. In the game itself, add a link back to `/` (the «يلا دورك» link in the footer).

## Renaming a game's repo
Add the old → new name to `MOVED` at the top of `404.html` so old links keep working.

## Own domain later
Settings → Pages → Custom domain in THIS repo. All the games follow automatically
(yoursite.com/sharatalbidaya/ …). Then replace `https://islam-salem.github.io/` in
`index.html`, `robots.txt`, `sitemap.xml`.
