#!/usr/bin/env python3
"""
Builds the data for «تشكيلة المنتخب»: a daily 4-3-3 line-up where every spot asks for an
Egypt international who played in that position and matches two conditions.

Who counts as an Egypt international (senior men's team), checked against three sources:
  1. English Wikipedia: Category:Egypt international footballers (players with senior caps)
  2. Arabic Wikipedia:  تصنيف:لاعبو منتخب مصر لكرة القدم
  3. Wikidata: "member of sports team" = the senior Egypt national team
A player is in the game when English Wikipedia lists him, or when the other two both do,
or when config.json adds him by hand ("add_players").

Career details come from the player's Wikipedia infobox (English, else Arabic), which is the
most carefully kept record of senior clubs; Wikidata is only used for players without one.
Positions combine the infobox and Wikidata. Honours (World Cup, Africa Cup of Nations,
Olympics, Premier League) come from English Wikipedia categories.

Outputs (in data/xi/):
  data.json      players + conditions (what the site loads)
  lineups.json   one line-up per date (formation + spots) (past days and today are never changed)

Only uses the Python standard library, so it runs on GitHub Actions as-is.

Usage:
  python scraper/build_xi.py                    # download + build
  python scraper/build_xi.py --raw-out raw.json # also keep the download (to rebuild offline)
  python scraper/build_xi.py --raw-in raw.json  # rebuild offline
  python scraper/build_xi.py --relineup         # no download: rebuild line-ups after today
"""
import argparse
import datetime as dt
import json
import os
import random
import re
import sys
from collections import defaultdict

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import build_data as B  # noqa: E402  (shared Wikidata / photo / crest helpers)

ROOT = B.ROOT
log = B.log

EGYPT = "Q79"
EN_CATEGORY = "Category:Egypt international footballers"
AR_CATEGORY = "تصنيف:لاعبو منتخب مصر لكرة القدم"
SENIOR_TEAM_TITLES = {"egypt national football team", "منتخب مصر لكرة القدم"}

# honours, from English Wikipedia categories
HONOURS = {
    "hon:wc": {"l": "شارك في كأس العالم", "cats": [f"Category:{y} FIFA World Cup players"
                                                    for y in (1934, 1990, 2018, 2026, 2030)]},
    "hon:afcon": {"l": "فاز بأمم أفريقيا", "cats": ["Category:Africa Cup of Nations-winning players"]},
    "hon:olympics": {"l": "شارك في الأولمبياد", "cats": ["Category:Olympic footballers of Egypt"]},
    "hon:epl": {"l": "لعب في الدوري الإنجليزي", "cats": ["Category:Premier League players"]},
}

DEFAULTS = {
    "out_dir": "data/xi",
    "start_date": "2026-10-12",
    "salt": "tashkila",
    "days_ahead": 90,
    "known_links": 10,         # a well-known player has at least this many Wikipedia articles
    "min_answers": 2,          # every spot needs at least this many answers...
    "min_known": 2,            # ...of which at least this many are well-known
    "min_club": 4,             # a club becomes a condition with at least this many internationals
    "min_abroad": 4,           # "played in <country>"
    "min_honour": 4,
    "max_uses": 3,             # one condition appears on at most this many spots a day
    "repeat_days": 6,          # the same spot (position + both conditions) not again within this many days
    "gk_repeat_days": 3,       # goalkeepers are few, so their spots may come back sooner
    "big_clubs": ["club:Q223566", "club:Q286504"],   # Al Ahly, Zamalek: one of them is on every spot...
    "pro_share": 0.25,         # ...or, this often (vs 1 for each club), a pro who never played for either
    "add_players": [],         # QIDs to add to the pool by hand
    "remove_players": [],      # QIDs to take out
    "add_members": {},         # {"club:Q223566": ["Q123"]}: fixes for missing career facts
    "remove_members": {},      # {"club:Q223566": ["Q123"]}: fixes for wrong ones
    "labels": {"abroad:Q145": "لعب في بريطانيا", "abroad:Q878": "لعب في الإمارات"},
    "names_ar": {},            # QID -> the Arabic name to show
    "exclude": [],             # condition ids never used
    "sheet_id": "",            # the review Google Sheet (shared as "anyone with the link can view")
    "photo_sources": ["commons_category", "thesportsdb"],
    "photo_retry_days": 30,
    "photo_lookup_limit": 2000,
    "photo_minutes": 20,
    "badge_sources": ["thesportsdb", "wikidata"],
    "badge_minutes": 15,
    "lang": "ar",
}

# The formation(s) used. With more than one, the formation changes every day (never the same two days running).
FORMATIONS = {"4-3-3": 1}   # name: how often. Add more (e.g. "4-4-2": 1) to change the formation every day


def slots_of(formation):
    """'4-2-3-1' -> ['gk', 'df' x4, 'mf' x2, 'mf' x3, 'fw']: first line defends, last attacks."""
    lines = [int(x) for x in formation.split("-")]
    out = ["gk"]
    for k, n in enumerate(lines):
        out += [("df" if k == 0 else "fw" if k == len(lines) - 1 else "mf")] * n
    return out
POS_LABEL = {"gk": "حارس مرمى", "df": "مدافع", "mf": "لاعب وسط", "fw": "مهاجم"}

# how often each kind of condition is picked
KIND_WEIGHT = {"club": 4.0, "fclub": 1.0, "abroad": 2.0, "region": 1.5, "hon": 2.0}


def load_config():
    cfg = dict(DEFAULTS)
    if os.path.exists(B.CONFIG_PATH):
        with open(B.CONFIG_PATH, encoding="utf-8") as f:
            cfg.update(json.load(f).get("xi", {}))
    return cfg


# ---------------------------------------------------------------- Wikipedia helpers

def api_all(host, params):
    """All results of a Wikipedia API query, following 'continue'. Yields each response."""
    params = dict(params)
    while True:
        resp = B.wiki_api(host, params)
        if not resp:
            return
        yield resp
        cont = resp.get("continue")
        if not cont:
            return
        params.update(cont)


def category_members(host, category):
    """{wikidata id: article title} of the articles in a category."""
    out = {}
    for resp in api_all(host, {"action": "query", "generator": "categorymembers", "gcmtitle": category,
                               "gcmnamespace": "0", "gcmlimit": "500", "prop": "pageprops",
                               "ppprop": "wikibase_item"}):
        for page in resp.get("query", {}).get("pages", []):
            q = (page.get("pageprops") or {}).get("wikibase_item")
            if q:
                out[q] = page["title"]
    log(f"  {host} {category}: {len(out)} players")
    return out


def page_map(resp):
    """title asked -> title returned, following normalisation and redirects."""
    q = resp.get("query", {})
    alias = {}
    for n in q.get("normalized", []) + q.get("redirects", []):
        alias[n["from"]] = n["to"]
    return alias


def resolve(alias, title):
    for _ in range(3):
        if title in alias:
            title = alias[title]
    return title


def fetch_pages(host, titles, categories=()):
    """{title: {"text": wikitext, "cats": [matching categories]}} for up to thousands of titles."""
    out = {}
    for batch in B.chunks(sorted(set(titles)), 50):
        params = {"action": "query", "prop": "revisions", "rvprop": "content", "rvslots": "main",
                  "redirects": "1", "titles": "|".join(batch)}
        if categories:
            params.update({"prop": "revisions|categories", "clcategories": "|".join(categories),
                           "cllimit": "max"})
        got = {}
        alias = {}
        for resp in api_all(host, params):
            alias.update(page_map(resp))
            for page in resp.get("query", {}).get("pages", []):
                d = got.setdefault(page["title"], {"text": "", "cats": []})
                revs = page.get("revisions") or []
                if revs and not d["text"]:
                    d["text"] = ((revs[0].get("slots") or {}).get("main") or {}).get("content") or ""
                d["cats"] += [c["title"] for c in page.get("categories", []) if c["title"] not in d["cats"]]
        for t in batch:
            r = resolve(alias, t)
            if r in got:
                out[t] = got[r]
    return out


def wikidata_ids(host, titles):
    """{title: QID} for article titles (following redirects)."""
    out = {}
    for batch in B.chunks(sorted(set(titles)), 50):
        resp = B.wiki_api(host, {"action": "query", "prop": "pageprops", "ppprop": "wikibase_item",
                                 "redirects": "1", "titles": "|".join(batch)})
        alias = page_map(resp)
        found = {p["title"]: (p.get("pageprops") or {}).get("wikibase_item")
                 for p in resp.get("query", {}).get("pages", [])}
        for t in batch:
            q = found.get(resolve(alias, t))
            if q:
                out[t] = q
    return out


# ---------------------------------------------------------------- infobox parsing

INFOBOX = re.compile(r"\{\{\s*(Infobox[ _]football[ _]biography|Infobox[ _]footballer|"
                     r"Football[ _]player[ _]infobox|صندوق[ _]معلومات[ _]لاعب[ _]كرة[ _]قدم|"
                     r"معلومات[ _]لاعب[ _]كرة[ _]قدم|معلومات[ _]لاعب[ _]كرة[ _]القدم|"
                     r"صندوق[ _]معلومات[ _]سيرة[ _]كرة[ _]قدم)\s*(?=[|}<\n])", re.I)
LINK = re.compile(r"\[\[\s*([^\]|#]+?)\s*(?:#[^\]|]*)?(?:\|[^\]]*)?\]\]")


def strip_noise(text):
    text = re.sub(r"<!--.*?-->", "", text, flags=re.S)
    text = re.sub(r"<ref[^>/]*/>", "", text)
    text = re.sub(r"<ref[^>]*>.*?</ref>", "", text, flags=re.S)
    return text


def infobox(text):
    """The parameters of the player's infobox, lower-case keys -> raw values. {} if none."""
    text = strip_noise(text or "")
    m = INFOBOX.search(text)
    if not m:
        return {}
    i, depth, start = m.start(), 0, m.end()
    end = None
    while i < len(text) - 1:
        two = text[i:i + 2]
        if two == "{{":
            depth += 1
            i += 2
        elif two == "}}":
            depth -= 1
            i += 2
            if depth == 0:
                end = i - 2
                break
        else:
            i += 1
    body = text[start:end] if end else text[start:]
    parts, cur, braces, links = [], [], 0, 0
    i = 0
    while i < len(body):
        two = body[i:i + 2]
        if two in ("{{", "}}", "[[", "]]"):
            braces += (two == "{{") - (two == "}}")
            links += (two == "[[") - (two == "]]")
            cur.append(two)
            i += 2
            continue
        if body[i] == "|" and braces == 0 and links == 0:
            parts.append("".join(cur))
            cur = []
        else:
            cur.append(body[i])
        i += 1
    parts.append("".join(cur))
    out = {}
    for p in parts:
        if "=" in p:
            k, v = p.split("=", 1)
            out[k.strip().lower()] = v.strip()
    return out


def numbered(box, names):
    """Values of clubs1, clubs2, ... (any of the given base names), in number order."""
    rows = []
    for k, v in box.items():
        for name in names:
            m = re.fullmatch(re.escape(name) + r"\s*(\d+)", k)
            if m:
                rows.append((int(m.group(1)), v))
    return [v for _, v in sorted(rows)]


def first_link(value):
    m = LINK.search(value or "")
    return m.group(1).replace("_", " ").strip() if m else None


CLUB_KEYS = ["clubs", "أندية", "الأندية", "نادي"]
NT_KEYS = ["nationalteam", "منتخب", "المنتخب الوطني"]
CAPS_KEYS = ["nationalcaps", "مباريات دولية"]


def career(box):
    """(senior club titles, plays_for_senior_egypt: True/False/None) from an infobox."""
    clubs = []
    for v in numbered(box, CLUB_KEYS):
        t = first_link(v)
        if t and t not in clubs:
            clubs.append(t)
    teams = numbered(box, NT_KEYS)
    caps = numbered(box, CAPS_KEYS)
    senior = None
    for n, v in enumerate(teams):
        t = (first_link(v) or "").lower()
        if t in SENIOR_TEAM_TITLES:
            c = re.sub(r"[^\d]", "", caps[n]) if n < len(caps) else ""
            senior = (c == "" or int(c) > 0)   # listed with 0 caps = called up, never played
    return clubs, senior


POS_WORDS = [
    ("gk", r"goal ?keeper|\bkeeper\b|حارس"),
    ("df", r"defender|back\b|sweeper|libero|مدافع|ظهير|قلب دفاع|دفاع"),
    ("mf", r"midfield|playmaker|وسط|صانع ألعاب"),
    ("fw", r"forward|striker|winger|attacker|centre[- ]forward|مهاجم|جناح|هجوم|رأس حربة"),
]


def positions_from(box):
    text = " ".join(LINK.sub(lambda m: m.group(0).split("|")[-1], box.get(k, ""))
                    for k in ("position", "المركز", "مركز")).lower()
    return sorted({key for key, rx in POS_WORDS if re.search(rx, text)})


# ---------------------------------------------------------------- download

def fetch_raw(cfg):
    log("Egypt internationals...")
    en_cat = category_members("en.wikipedia.org", EN_CATEGORY)
    ar_cat = category_members("ar.wikipedia.org", AR_CATEGORY)

    rows = B.try_query("national team items", f"""
        SELECT DISTINCT ?t ?l WHERE {{
          ?t wdt:P31/wdt:P279* wd:{B.NATIONAL_TEAM_CLASS} .
          {{ ?t wdt:P17 wd:{EGYPT} }} UNION {{ ?t wdt:P1532 wd:{EGYPT} }}
          OPTIONAL {{ ?t rdfs:label ?l FILTER(lang(?l)="en") }}
        }}""")
    youth = re.compile(r"under|u-?\d\d|olympic|women|ladies|\bb\b|amateur|futsal|beach|military|universit", re.I)
    nt_items = sorted({B.qid(r["t"]) for r in rows if not youth.search(B.val(r, "l") or "")})
    log(f"  senior team items: {nt_items}")
    wd = set()
    if nt_items:
        rows = B.try_query("national team players", f"""
            SELECT DISTINCT ?p WHERE {{
              VALUES ?t {{ {B.values(nt_items)} }}
              ?p p:P54 ?s . ?s ps:P54 ?t ; wikibase:rank ?r . FILTER(?r != wikibase:DeprecatedRank)
              ?p wdt:P31 wd:Q5 .
            }}""")
        wd = {B.qid(r["p"]) for r in rows}
    log(f"  Wikidata: {len(wd)} players")

    candidates = set(en_cat) | set(ar_cat) | wd | set(cfg["add_players"])
    raw = {"fetched": dt.date.today().isoformat(), "players": {}, "items": {}, "position_roots": {},
           "national_team": nt_items}
    P = raw["players"]
    for p in candidates:
        P[p] = {"en": None, "ar": None, "links": 0, "female": False, "teams": [], "pos": [], "occ": [],
                "src": [s for s, group in (("en", en_cat), ("ar", ar_cat), ("wd", wd)) if p in group],
                "wiki": {}}
        if p in en_cat:
            P[p]["wiki"]["en"] = en_cat[p]
        if p in ar_cat:
            P[p]["wiki"]["ar"] = ar_cat[p]

    log("Names, Wikidata careers and positions...")
    for batch in B.chunks(sorted(P), 150):
        rows = B.try_query("labels", f"""
            SELECT ?p ?en ?mul ?ar ?links ?sex ?img ?birth ?cat WHERE {{
              VALUES ?p {{ {B.values(batch)} }}
              OPTIONAL {{ ?p rdfs:label ?en FILTER(lang(?en)="en") }}
              OPTIONAL {{ ?p rdfs:label ?mul FILTER(lang(?mul)="mul") }}
              OPTIONAL {{ ?p rdfs:label ?ar FILTER(lang(?ar)="ar") }}
              OPTIONAL {{ ?p wikibase:sitelinks ?links }}
              OPTIONAL {{ ?p wdt:P21 ?sex }}
              OPTIONAL {{ ?p wdt:P18 ?img }}
              OPTIONAL {{ ?p wdt:P569 ?birth }}
              OPTIONAL {{ ?p wdt:P373 ?cat }}
            }}""")
        for r in rows:
            d = P[B.qid(r["p"])]
            d["en"] = d["en"] or B.val(r, "en") or B.val(r, "mul")
            d["ar"] = d["ar"] or B.val(r, "ar")
            d["links"] = int(B.val(r, "links") or 0)
            if B.val(r, "img") and not d.get("img"):
                d["img"] = B.urllib.parse.unquote(B.val(r, "img").rsplit("/", 1)[-1])
            if B.val(r, "birth") and not d.get("birth"):
                d["birth"] = B.val(r, "birth")[:10]
            if B.val(r, "cat") and not d.get("cat"):
                d["cat"] = B.val(r, "cat")
            if B.val(r, "sex") and B.qid(r["sex"]) == B.FEMALE:
                d["female"] = True
        rows = B.try_query("articles", f"""
            SELECT ?p ?site ?title WHERE {{
              VALUES ?p {{ {B.values(batch)} }}
              ?a schema:about ?p ; schema:isPartOf ?site ; schema:name ?title .
              FILTER(?site IN (<https://ar.wikipedia.org/>, <https://en.wikipedia.org/>))
            }}""")
        for r in rows:
            wiki = "ar" if "//ar." in B.val(r, "site") else "en"
            P[B.qid(r["p"])]["wiki"].setdefault(wiki, B.val(r, "title"))
        rows = B.try_query("teams", f"""
            SELECT ?p ?t WHERE {{
              VALUES ?p {{ {B.values(batch)} }}
              ?p p:P54 ?s . ?s ps:P54 ?t ; wikibase:rank ?r . FILTER(?r != wikibase:DeprecatedRank)
            }}""")
        for r in rows:
            d, t = P[B.qid(r["p"])], B.qid(r["t"])
            if t not in d["teams"]:
                d["teams"].append(t)
        rows = B.try_query("positions + occupation", f"""
            SELECT ?p ?prop ?v WHERE {{
              VALUES ?p {{ {B.values(batch)} }} VALUES ?prop {{ wdt:P413 wdt:P106 }}
              ?p ?prop ?v .
            }}""")
        for r in rows:
            d = P[B.qid(r["p"])]
            k = "pos" if B.qid(r["prop"]) == "P413" else "occ"
            if B.qid(r["v"]) not in d[k]:
                d[k].append(B.qid(r["v"]))

    log("Infoboxes and honours from Wikipedia...")
    cats = [c for h in HONOURS.values() for c in h["cats"]]
    en_titles = {d["wiki"]["en"]: p for p, d in P.items() if d["wiki"].get("en")}
    for title, page in fetch_pages("en.wikipedia.org", en_titles, cats).items():
        d = P[en_titles[title]]
        box = infobox(page["text"])
        d["box_en"] = {"clubs": career(box)[0], "senior": career(box)[1], "pos": positions_from(box)}
        d["cats"] = page["cats"]
    ar_titles = {d["wiki"]["ar"]: p for p, d in P.items()
                 if d["wiki"].get("ar") and not (d.get("box_en") or {}).get("clubs")}
    for title, page in fetch_pages("ar.wikipedia.org", ar_titles).items():
        d = P[ar_titles[title]]
        box = infobox(page["text"])
        d["box_ar"] = {"clubs": career(box)[0], "senior": career(box)[1], "pos": positions_from(box)}

    log("Linking infobox clubs to Wikidata...")
    for wiki, key in (("en.wikipedia.org", "box_en"), ("ar.wikipedia.org", "box_ar")):
        titles = {t for d in P.values() for t in (d.get(key) or {}).get("clubs", [])}
        ids = wikidata_ids(wiki, titles)
        log(f"  {wiki}: {len(ids)}/{len(titles)} club links found on Wikidata")
        for d in P.values():
            if d.get(key):
                d[key]["club_ids"] = [ids[t] for t in d[key]["clubs"] if t in ids]

    log("Club / country details...")
    item_ids = set()
    for d in P.values():
        item_ids |= set(d["teams"])
        for key in ("box_en", "box_ar"):
            item_ids |= set((d.get(key) or {}).get("club_ids", []))
    B.fetch_items(raw, item_ids)
    countries = {c for i in raw["items"].values() for c in i["country"]} | {EGYPT}
    B.fetch_items(raw, countries - set(raw["items"]))

    positions = {p for d in P.values() for p in d["pos"]}
    for batch in B.chunks(sorted(positions), 200):
        rows = B.try_query("position roots", f"""
            SELECT ?pos ?root WHERE {{
              VALUES ?pos {{ {B.values(batch)} }} VALUES ?root {{ {B.values(B.POSITION_ROOTS)} }}
              ?pos wdt:P279* ?root .
            }}""")
        for r in rows:
            raw["position_roots"][B.qid(r["pos"])] = B.POSITION_ROOTS[B.qid(r["root"])]
    return raw


# ---------------------------------------------------------------- build

def short_ar_title(title):
    """'محمد صلاح (لاعب كرة قدم)' -> 'محمد صلاح'."""
    return re.sub(r"\s*\(.*?\)\s*$", "", title or "").strip()


def build_data(raw, cfg):
    items = raw["items"]
    nt_items = set(raw.get("national_team") or [])
    added = set(cfg["add_players"])
    removed = set(cfg["remove_players"])

    def is_national(t):
        it = items.get(t, {})
        en = (it.get("en") or "").lower()
        return (t in nt_items or B.NATIONAL_TEAM_CLASS in it.get("types", [])
                or "national" in en or "olympic" in en or "under-" in en)

    def is_other_sport(t):
        it = items.get(t, {})
        en, ar = (it.get("en") or "").lower(), it.get("ar") or ""
        return "women" in en or "ladies" in en or any(w in en or w in ar for w in B.NOT_FOOTBALL)

    # who is in: English Wikipedia's list, or both others; an infobox showing 0 senior caps keeps him out
    pool, report = [], defaultdict(int)
    for p, d in raw["players"].items():
        src = set(d["src"])
        box = d.get("box_en") or d.get("box_ar") or {}
        occ = d.get("occ") or []
        footballer = not occ or B.FOOTBALLER in occ or B.FOOTBALL_MANAGER in occ
        confirmed = "en" in src or {"ar", "wd"} <= src or (box.get("senior") is True and len(src) >= 1)
        if box.get("senior") is False and "en" not in src:
            confirmed = False
        if p in added:
            confirmed = True
        if p in removed or d["female"] or not footballer or not (d["ar"] or d["en"]):
            confirmed = False
        report["in" if confirmed else "left out"] += 1
        if confirmed:
            pool.append(p)
    log(f"  Egypt internationals: {report['in']} in, {report['left out']} left out (only one weak source)")

    pool.sort(key=lambda p: (-raw["players"][p]["links"], raw["players"][p]["en"] or ""))
    index = {p: i for i, p in enumerate(pool)}
    members, meta = defaultdict(set), {}
    from_box = from_wd = 0

    for p in pool:
        d, i = raw["players"][p], index[p]
        box = d.get("box_en") if (d.get("box_en") or {}).get("club_ids") else d.get("box_ar")
        if box and box.get("club_ids"):
            teams = box["club_ids"]
            from_box += 1
        else:
            teams = d["teams"]
            from_wd += 1
        for t in teams:
            if is_national(t) or is_other_sport(t):
                continue
            it = items.get(t, {})
            countries = it.get("country") or []
            name = B.club_name(it, "ar") or B.club_name(it, "en")
            if not name:
                continue
            if EGYPT in countries:
                cid = f"club:{t}"
                meta[cid] = ("club", name)
            else:
                cid = f"fclub:{t}"
                where = B.name_of(items.get(countries[0]), "ar") if countries else None
                meta[cid] = ("fclub", B.fclub_label(name, where, "ar"))
                for c in countries:
                    aid = f"abroad:{c}"
                    members[aid].add(i)
                    meta[aid] = ("abroad", f"لعب في {B.name_of(items.get(c), 'ar') or c}")
            members[cid].add(i)
        pos = {raw["position_roots"].get(x) for x in d["pos"]} - {None}
        for key in ("box_en", "box_ar"):
            pos |= set((d.get(key) or {}).get("pos", []))
        for x in pos:
            members[f"pos:{x}"].add(i)
            meta[f"pos:{x}"] = ("pos", POS_LABEL[x])
        cats = set(d.get("cats") or [])
        for hid, h in HONOURS.items():
            if cats & set(h["cats"]):
                members[hid].add(i)
                meta[hid] = ("hon", h["l"])
    log(f"  careers: {from_box} from Wikipedia infoboxes, {from_wd} from Wikidata")

    def extras(cid):
        typ, _, ref = cid.partition(":")
        it = items.get(ref) or {}
        out = {}
        if typ == "abroad":
            out["f"] = it.get("flag") or ""
        elif typ in ("club", "fclub"):
            if it.get("colors"):
                out["c"] = it["colors"][:2]
            badge = B.local_badge(ref)
            if badge:
                out["b"] = badge
            elif it.get("logo"):
                out["wb"] = it["logo"]
            if typ == "fclub":
                c = (it.get("country") or [""])[0]
                out["f"] = (items.get(c) or {}).get("flag") or ""
        return {k: v for k, v in out.items() if v}

    minimum = {"club": cfg["min_club"], "fclub": cfg["min_club"], "abroad": cfg["min_abroad"],
               "hon": cfg["min_honour"], "pos": 1}
    criteria = {}
    for cid, m in members.items():
        typ, label = meta[cid]
        if len(m) >= minimum[typ]:
            criteria[cid] = {"t": typ, "l": label, **extras(cid), "m": sorted(m)}

    players = []
    for p in pool:
        d = raw["players"][p]
        shown = (cfg["names_ar"].get(p) or short_ar_title(d["wiki"].get("ar")) or d["ar"] or d["en"])
        born = d.get("birth") or ""
        row = [p, shown, d["en"] or "", d["links"], B.local_photo(p) or d.get("img") or "",
               int(born[:4]) if born[:4].isdigit() else 0]
        if d["ar"] and d["ar"] != shown:
            row.append(d["ar"])          # the full Wikidata name: found by search, never shown
        players.append(row)
    data = {"updated": raw["fetched"], "players": players, "criteria": criteria}
    apply_sheet(data, cfg)
    finish(data, cfg)
    return data


def apply_sheet(data, cfg):
    """Your edits from the review sheet (config.json "xi" -> "sheet_id"); see scraper/sheet.py."""
    if not cfg.get("sheet_id"):
        return
    import sheet
    rows = sheet.download(cfg["sheet_id"], log)
    if rows is None:
        return
    base_path = os.path.join(ROOT, cfg["out_dir"], "sheet_base.json")
    try:
        with open(base_path, encoding="utf-8") as f:
            base = json.load(f)
    except (OSError, ValueError):
        base = {}
    sheet.apply(data, rows, base, log)


def finish(data, cfg):
    """Shared by both builds: merged countries, regions, hand fixes, labels."""
    B.merge_countries(data)
    B.add_regions(data, dict(cfg, lang="ar", min_abroad=cfg["min_abroad"]))
    index = {p[0]: i for i, p in enumerate(data["players"])}
    for cid, pids in cfg["add_members"].items():
        if cid in data["criteria"]:
            data["criteria"][cid]["m"] = sorted(set(data["criteria"][cid]["m"]) | {index[p] for p in pids if p in index})
    for cid, pids in cfg["remove_members"].items():
        if cid in data["criteria"]:
            gone = {index[p] for p in pids if p in index}
            data["criteria"][cid]["m"] = [i for i in data["criteria"][cid]["m"] if i not in gone]
    for cid in list(data["criteria"]):
        if cid in cfg["exclude"]:
            del data["criteria"][cid]
        elif cid in cfg["labels"]:
            data["criteria"][cid]["l"] = cfg["labels"][cid]
    add_pro(data, cfg)


PRO = "pro:noaz"


def add_pro(data, cfg):
    """'محترف لم يلعب للأهلي أو الزمالك': played abroad, never for Al Ahly or Zamalek (the third kind of shirt)."""
    crit = data["criteria"]
    abroad = set()
    for c in crit.values():
        if c["t"] in ("abroad", "fclub"):
            abroad |= set(c["m"])
    big = set()
    for cid in cfg["big_clubs"]:
        big |= set((crit.get(cid) or {}).get("m", []))
    crit[PRO] = {"t": "pro", "l": "محترف لم يلعب للأهلي أو الزمالك", "m": sorted(abroad - big)}


# ---------------------------------------------------------------- line-ups

REGION_OF = {c: key for key, reg in B.REGIONS.items() for c in reg["countries"]}
ENGLAND = {"Q145", "Q21"}


def country_of(cid, crit):
    """The country a condition is about (for clubs abroad / played in), else None."""
    typ, _, ref = cid.partition(":")
    if typ == "abroad":
        return ref
    if typ == "fclub":
        return crit[cid].get("country")
    return None


def compatible(a, b, crit):
    """No pair that says the same thing twice ('الاتحاد السعودي' + 'لعب في السعودية')."""
    if a == b:
        return False
    ta, tb = crit[a]["t"], crit[b]["t"]
    ca, cb = country_of(a, crit), country_of(b, crit)
    if ca and cb and ca == cb:
        return False
    for x, y, cx in ((a, b, ca), (b, a, cb)):
        if crit[y]["t"] == "region" and cx and REGION_OF.get(cx) == y.split(":")[1]:
            return False
        if y == "hon:epl" and (cx in ENGLAND or x == "region:europe"):
            return False
    if ta == "region" and tb == "region":
        return False
    if PRO in (a, b) and {a, b} & {"club:Q223566", "club:Q286504"}:
        return False   # a pro who never played for Al Ahly or Zamalek can't have played for them
    return True


def matching_ok(spots, sets):
    """True when 11 different players can fill the 11 spots at once."""
    owner = {}

    def place(s, seen):
        for p in sets[s]:
            if p in seen:
                continue
            seen.add(p)
            if p not in owner or place(owner[p], seen):
                owner[p] = s
                return True
        return False
    return all(place(s, set()) for s in range(len(spots)))


def spot_answers(spot, crit):
    pos, a, b = spot
    return set(crit[f"pos:{pos}"]["m"]) & set(crit[a]["m"]) & set(crit[b]["m"])


def spot_ok(spot, crit, known, cfg):
    ans = spot_answers(spot, crit)
    return len(ans) >= cfg["min_answers"] and len(ans & known) >= cfg["min_known"]


def lineup_ok(spots, crit, known, cfg, formation):
    if formation not in FORMATIONS or [s[0] for s in spots] != slots_of(formation):
        return False
    if not all(f"pos:{s[0]}" in crit and s[1] in crit and s[2] in crit for s in spots):
        return False
    if not all(compatible(s[1], s[2], crit) and spot_ok(s, crit, known, cfg) for s in spots):
        return False
    big = set(cfg["big_clubs"]) & set(crit)
    if big and not all((big | {PRO}) & set(s[1:]) for s in spots):
        return False
    if any(crit[c]["t"] == "club" and c not in big for s in spots for c in s[1:]):
        return False   # no other Egyptian clubs
    if any(len(big & set(s[1:])) > 1 for s in spots):
        return False   # the shirt is already Al Ahly or Zamalek: the second condition is never the other one
    pairs = [frozenset(s[1:]) for s in spots]
    if len(set(pairs)) != len(pairs):
        return False
    return matching_ok(spots, [sorted(spot_answers(s, crit) & known) for s in spots])


def make_lineup(date, crit, known, cfg, recent, yesterday=None, day_no=0):
    """Every spot: Al Ahly or Zamalek (the clubs fans know) + one more fact about that player's career."""
    rng = random.Random(f"{cfg['salt']}:{date}")
    names = [f for f in FORMATIONS if f != yesterday] or list(FORMATIONS)
    formation = rng.choices(names, [FORMATIONS[f] for f in names])[0]
    slots = slots_of(formation)
    big = [c for c in cfg["big_clubs"] if c in crit]
    # the shirt of each spot: Al Ahly, Zamalek, or now and then a pro who never played for either
    anchors = big + ([PRO] if PRO in crit else [])
    anchor_w = [1.0] * len(big) + [cfg["pro_share"]] * (len(anchors) - len(big))
    # the second condition is never a club: the shirt already shows Al Ahly / Zamalek,
    # and other Egyptian clubs are left out (fans only follow those two)
    conds = [c for c, v in crit.items() if v["t"] in KIND_WEIGHT and c not in cfg["exclude"]
             and v["t"] != "club"]
    # the second condition: well-known facts come up more (weight grows with the well-known players in it)
    weights = [KIND_WEIGHT[crit[c]["t"]] * (2 if c in big else 1) * len(set(crit[c]["m"]) & known) ** 0.5
               for c in conds]
    for _ in range(400):
        uses = defaultdict(int)
        order = sorted(range(len(slots)), key=lambda i: (slots[i] != "gk", rng.random()))   # hardest first
        filled = {}
        for i in order:
            pos = slots[i]
            for _ in range(200):
                a = rng.choices(anchors, anchor_w)[0]
                b = rng.choices(conds, weights)[0]
                if a == PRO and b in big:
                    continue
                spot = (pos, *sorted((a, b)))
                if (not compatible(a, b, crit) or (b not in big and uses[b] >= cfg["max_uses"])
                        or frozenset((a, b)) in {frozenset(x[1:]) for x in filled.values()}
                        or day_no - recent.get(spot, -999) <= cfg["gk_repeat_days" if pos == "gk" else "repeat_days"]
                        or not spot_ok(spot, crit, known, cfg)):
                    continue
                filled[i] = spot
                uses[b] += 1
                break
            else:
                break
        if len(filled) < len(slots):
            continue
        spots = [list(filled[i]) for i in range(len(slots))]
        # Al Ahly and Zamalek both get at least 4 spots
        if any(sum(c in x for x in spots) < 4 for c in big):
            continue
        if lineup_ok(spots, crit, known, cfg, formation):
            return formation, spots
    return None


def build_lineups(data, cfg, existing, today):
    crit = data["criteria"]
    players = data["players"]
    known = {i for i, p in enumerate(players) if p[3] >= cfg["known_links"]}
    start = dt.date.fromisoformat(cfg["start_date"])
    end = today + dt.timedelta(days=cfg["days_ahead"])
    out, recent, last = {}, {}, None
    day = start
    while day <= end:
        ds = day.isoformat()
        old = existing.get(ds)
        playable = old and all(f"pos:{s[0]}" in crit and s[1] in crit and s[2] in crit for s in old["spots"])
        formation = (old or {}).get("f", "4-3-3")
        if old and (day < today or (day == today and playable)
                    or (playable and (formation != last or len(FORMATIONS) == 1) and lineup_ok(old["spots"], crit, known, cfg, formation))):
            spots = old["spots"]
        elif day < today:
            day += dt.timedelta(days=1)
            continue
        else:
            made = None
            # when the pool is small, allow spots to come back sooner, step by step
            for relax in ({}, {"repeat_days": 3, "gk_repeat_days": 1}, {"repeat_days": 1, "gk_repeat_days": 0},
                          {"repeat_days": 0, "gk_repeat_days": 0, "min_known": 1}):
                made = make_lineup(ds, crit, known, dict(cfg, **relax), recent, last, (day - start).days)
                if made:
                    break
            if made is None:
                log(f"could not build a line-up for {ds}")
                day += dt.timedelta(days=1)
                continue
            formation, spots = made
        out[ds] = {"n": (day - start).days + 1, "f": formation, "spots": spots}
        last = formation
        for s in spots:
            recent[tuple(s)] = (day - start).days
        day += dt.timedelta(days=1)
    return out


def write_all(data, cfg, today):
    out_dir = os.path.join(ROOT, cfg["out_dir"])
    os.makedirs(out_dir, exist_ok=True)
    path = os.path.join(out_dir, "lineups.json")
    existing = {}
    if os.path.exists(path):
        with open(path, encoding="utf-8") as f:
            existing = json.load(f)
    lineups = build_lineups(data, cfg, existing, today)
    # only conditions the line-ups use go to the page (plus positions)
    used = {c for v in lineups.values() for s in v["spots"] for c in s[1:]}
    for cid in list(data["criteria"]):
        if cid not in used and not cid.startswith("pos:"):
            del data["criteria"][cid]
    with open(os.path.join(out_dir, "data.json"), "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, separators=(",", ":"))
    with open(path, "w", encoding="utf-8") as f:
        json.dump(lineups, f, ensure_ascii=False, indent=0, sort_keys=True)
    log(f"Wrote {len(lineups)} line-ups ({min(lineups)} .. {max(lineups)}), "
        f"{len(data['players'])} players, {len(data['criteria'])} conditions")


def add_countries(data, raw):
    """Clubs abroad remember their country, so a spot never pairs a club with its own country."""
    for cid, c in data["criteria"].items():
        if c["t"] == "fclub":
            countries = (raw["items"].get(cid.split(":")[1]) or {}).get("country") or []
            if countries:
                c["country"] = B.SAME_COUNTRY.get(countries[0], countries[0])


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--raw-in")
    ap.add_argument("--raw-out")
    ap.add_argument("--today", help="override today's date (YYYY-MM-DD)")
    ap.add_argument("--relineup", action="store_true", help="no download: rebuild line-ups after today")
    args = ap.parse_args()
    cfg = load_config()
    today = dt.date.fromisoformat(args.today) if args.today else B.cairo_today()
    out_dir = os.path.join(ROOT, cfg["out_dir"])
    if args.relineup:
        with open(os.path.join(out_dir, "data.json"), encoding="utf-8") as f:
            data = json.load(f)
        with open(os.path.join(out_dir, "full.json"), encoding="utf-8") as f:
            data["criteria"] = json.load(f)   # every condition, not only the ones in use
        add_pro(data, cfg)
        write_all(data, cfg, today)
        return
    if args.raw_in:
        with open(args.raw_in, encoding="utf-8") as f:
            raw = json.load(f)
    else:
        raw = fetch_raw(cfg)
        if args.raw_out:
            with open(args.raw_out, "w", encoding="utf-8") as f:
                json.dump(raw, f, ensure_ascii=False)
    data = build_data(raw, cfg)
    if len(data["players"]) < 150:
        sys.exit(f"Only {len(data['players'])} players found (Wikipedia/Wikidata problem?) - keeping the old data")
    add_countries(data, raw)
    live = not args.raw_in
    # player photos are not shown for now; to bring them back: B.fill_extra_photos(data, raw, cfg, out_dir, live)
    B.fill_badges(data, raw, cfg, out_dir, live)
    os.makedirs(out_dir, exist_ok=True)
    with open(os.path.join(out_dir, "full.json"), "w", encoding="utf-8") as f:
        json.dump(data["criteria"], f, ensure_ascii=False, separators=(",", ":"))
    write_all(data, cfg, today)


if __name__ == "__main__":
    main()
