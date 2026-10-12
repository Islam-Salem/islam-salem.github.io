"""
The review sheet for «تشكيلة المنتخب»: one row per player, so you can reject, add or adjust facts.

How your edits are applied (scraper/build_xi.py, every run):
  * data/xi/sheet_base.json remembers what each cell said when the sheet was made.
  * A cell you did not touch keeps following the downloaded data (which gets better over time).
  * A cell you changed wins over the downloaded data, every run.
  * A row you add (with or without a Wikidata id) adds that player with the facts you typed.

make_sheet.py writes the sheet (.xlsx, to upload to Google Drive) and sheet_base.json.
"""
import csv
import io
import re
import urllib.request

AHLY, ZAMALEK = "club:Q223566", "club:Q286504"
YES = "✓"
POS_COLS = [("حارس", "pos:gk"), ("مدافع", "pos:df"), ("وسط", "pos:mf"), ("مهاجم", "pos:fw")]
CLUB_COLS = [("الأهلي", AHLY), ("الزمالك", ZAMALEK)]
HON_COLS = [("كأس العالم", "hon:wc", "شارك في كأس العالم"), ("أمم أفريقيا", "hon:afcon", "فاز بأمم أفريقيا"),
            ("الأولمبياد", "hon:olympics", "شارك في الأولمبياد"), ("الدوري الإنجليزي", "hon:epl", "لعب في الدوري الإنجليزي")]
COL_ID, COL_NAME, COL_EN, COL_IN = "رقم ويكي بيانات", "الاسم", "الاسم بالإنجليزية", "في اللعبة"
COL_COUNTRIES, COL_FCLUBS, COL_NOTES = "لعب في (بلاد)", "أندية خارج مصر", "ملاحظات"
HEADERS = ([COL_ID, COL_NAME, COL_EN, COL_IN] + [c for c, _ in POS_COLS] + [c for c, _ in CLUB_COLS]
           + [COL_COUNTRIES, COL_FCLUBS] + [c for c, _, _ in HON_COLS] + [COL_NOTES])
SEP = re.compile(r"\s*[،,;؛]\s*")


def split_list(text):
    return sorted({x.strip() for x in SEP.split(text or "") if x.strip()})


def norm(col, value):
    """Cell text in a form that ignores spacing and order (so re-typing the same thing is not a change)."""
    value = (value or "").strip()
    if col in (COL_COUNTRIES, COL_FCLUBS):
        return "، ".join(split_list(value))
    if col == COL_IN:
        return "لا" if value in ("لا", "no", "No", "0", "x", "X") else "نعم"
    if col in [c for c, _ in POS_COLS + CLUB_COLS] + [c for c, _, _ in HON_COLS]:
        return YES if value in (YES, "✔", "v", "V", "1", "نعم", "x", "X", "TRUE", "True", "true") else ""
    return value


def country_name(label):
    return re.sub(r"^لعب في\s*", "", label or "").strip()


def rows_from_data(data):
    """The sheet's rows (dicts) from data.json-style data with every condition (full.json)."""
    crit = data["criteria"]
    members = {cid: set(c["m"]) for cid, c in crit.items()}
    rows = []
    for i, p in enumerate(data["players"]):
        has = lambda cid: YES if i in members.get(cid, ()) else ""   # noqa: E731
        row = {COL_ID: p[0], COL_NAME: p[1], COL_EN: p[2], COL_IN: "نعم"}
        row.update({col: has(cid) for col, cid in POS_COLS + CLUB_COLS})
        row[COL_COUNTRIES] = "، ".join(sorted(country_name(c["l"]) for cid, c in crit.items()
                                             if c["t"] == "abroad" and i in members[cid]))
        row[COL_FCLUBS] = "، ".join(sorted(c["l"] for cid, c in crit.items()
                                          if c["t"] == "fclub" and i in members[cid]))
        row.update({col: has(cid) for col, cid, _ in HON_COLS})
        row[COL_NOTES] = ""
        rows.append(row)
    return rows


def base_of(rows):
    return {r[COL_ID]: {c: norm(c, r.get(c)) for c in HEADERS if c not in (COL_ID, COL_NOTES)} for r in rows}


def download(sheet_id, log):
    """The first tab of a Google Sheet shared as 'anyone with the link can view', as rows (dicts)."""
    url = f"https://docs.google.com/spreadsheets/d/{sheet_id}/export?format=csv&gid=0"
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (tashkila data update)"})
        with urllib.request.urlopen(req, timeout=60) as r:
            text = r.read().decode("utf-8-sig")
    except Exception as e:  # noqa: BLE001
        log(f"  review sheet: could not download it ({e}) - is it shared as 'anyone with the link'? Skipping.")
        return None
    rows = list(csv.DictReader(io.StringIO(text)))
    if rows and COL_NAME not in rows[0]:
        log("  review sheet: the first tab does not look like the players tab - skipping.")
        return None
    return rows


def apply(data, rows, base, log):
    """Apply your changes from the sheet to data (players + every condition), in place."""
    crit = data["criteria"]
    players = data["players"]
    index = {p[0]: i for i, p in enumerate(players)}
    members = {cid: set(c["m"]) for cid, c in crit.items()}
    by_label = {}
    for cid, c in crit.items():
        if c["t"] == "abroad":
            by_label[("abroad", country_name(c["l"]))] = cid
        elif c["t"] == "fclub":
            by_label[("fclub", c["l"])] = cid

    def cond(kind, name):
        cid = by_label.get((kind, name))
        if not cid:   # a country or club the data does not have yet
            cid = f"{kind}:{name}"
            crit[cid] = {"t": kind, "l": f"لعب في {name}" if kind == "abroad" else name, "m": []}
            members[cid] = set()
            by_label[(kind, name)] = cid
        return cid

    def put(cid, i, on, label=None):
        if cid not in crit:
            if not on:
                return
            t = cid.split(":")[0]
            crit[cid] = {"t": t, "l": label or cid, "m": []}
            members[cid] = set()
        (members[cid].add if on else members[cid].discard)(i)

    changed = added = removed = 0
    gone = set()
    for row in rows:
        row = {k.strip(): (v or "").strip() for k, v in row.items() if k}
        name = row.get(COL_NAME, "")
        pid = row.get(COL_ID, "") or (f"S:{name}" if name else "")
        if not pid:
            continue
        old = base.get(pid)
        if pid not in index:   # a player you added
            if not name:
                continue
            players.append([pid, name, row.get(COL_EN, ""), 10, "", 0])
            index[pid] = len(players) - 1
            old = {}
            added += 1
        i = index[pid]
        diff = [c for c in HEADERS if c not in (COL_ID, COL_NOTES) and norm(c, row.get(c)) != (old or {}).get(c, "")]
        if old is None:          # in the data but not in the sheet's starting copy: treat every cell as yours
            diff = [c for c in HEADERS if c not in (COL_ID, COL_NOTES)]
        if not diff:
            continue
        changed += 1
        for col in diff:
            val = norm(col, row.get(col))
            if col == COL_NAME and val:
                if players[i][1] != val:
                    if len(players[i]) < 7:
                        players[i].append(players[i][1])   # the old name stays searchable
                    players[i][1] = val
            elif col == COL_EN:
                players[i][2] = val
            elif col == COL_IN and val == "لا":
                gone.add(i)
            for c, cid in POS_COLS + CLUB_COLS:
                if col == c:
                    put(cid, i, val == YES)
            for c, cid, label in HON_COLS:
                if col == c:
                    put(cid, i, val == YES, label)
            if col in (COL_COUNTRIES, COL_FCLUBS):
                kind = "abroad" if col == COL_COUNTRIES else "fclub"
                want = {cond(kind, x) for x in split_list(val)}
                for cid in [c for c, v in crit.items() if v["t"] == kind]:
                    put(cid, i, cid in want)
    for cid in members:
        members[cid] -= gone
    removed = len(gone)
    for cid, c in crit.items():
        c["m"] = sorted(members[cid])
    log(f"  review sheet: {changed} players changed, {added} added, {removed} taken out")
