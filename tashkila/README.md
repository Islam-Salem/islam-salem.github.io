# تشكيلة المنتخب

A daily football game about Egypt internationals (this folder: `index.html` + `xi.js` + `xi.css`).
It is one game inside the «يلا دورك» site — see the README in the main folder.
Every day there is a new 4-3-3; every spot is an Al Ahly or Zamalek shirt with one more condition
under it, and asks for an Egypt international who played in that position, for that club, and matches the condition.
5 mistakes allowed.

- **Data:** `scraper/build_xi.py` builds `data/xi/data.json` (players + conditions) and
  `data/xi/lineups.json` (one line-up per day, 90 days ahead; past days and today never change).
- **Who counts as an Egypt international:** listed in English Wikipedia's "Egypt international
  footballers", or in both Arabic Wikipedia's «لاعبو منتخب مصر لكرة القدم» and Wikidata.
- **Clubs:** from the career table (infobox) of the player's Wikipedia page; Wikidata only when there is none.
- **Updates:** the GitHub Action (`.github/workflows/update-data.yml` in the main folder) runs the scraper every Monday (or by hand from the Actions tab).
- **Fixes by hand:** `config.json` → `"xi"`: `add_players`, `remove_players`, `add_members`,
  `remove_members`, `names_ar`, `labels`, `exclude`.
- `python tashkila/scraper/build_xi.py --relineup` (from the main folder) rebuilds the line-ups after today without downloading.

`scraper/build_data.py` holds shared helpers (Wikidata queries, crests) used by `build_xi.py`.
