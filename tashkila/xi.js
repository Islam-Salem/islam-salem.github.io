/* «تشكيلة المنتخب»: a daily 4-3-3 of Egypt internationals.
 * Every spot asks for a player in that position who matches two conditions. 5 mistakes allowed. */
(() => {
  "use strict";
  const DATA_DIR = "data/xi/";
  const KEY = "xi";
  const MAX_MISTAKES = 5;
  /** The day's lines from attack (top of the pitch) down to the goalkeeper: [[pos, [spot indexes]], ...] */
  function linesOf(formation) {
    const nums = formation.split("-").map(Number);
    const lines = [["gk", [0]]];
    let i = 1;
    nums.forEach((n, k) => {
      lines.push([k === 0 ? "df" : k === nums.length - 1 ? "fw" : "mf", Array.from({ length: n }, () => i++)]);
    });
    return lines.reverse();
  }
  const POS = { gk: "حارس مرمى", df: "مدافع", mf: "لاعب وسط", fw: "مهاجم" };
  const POS_SHORT = { gk: "حارس", df: "دفاع", mf: "وسط", fw: "هجوم" };
  const CONTACT = "islamspo@gmail.com";
  const SITE = location.origin + location.pathname.replace(/[^/]*$/, "");   // the site address, wherever it is hosted
  const HON_SHORT = { "hon:wc": "كأس العالم", "hon:afcon": "أمم أفريقيا", "hon:olympics": "الأولمبياد", "hon:epl": "الدوري الإنجليزي" };

  // ---------------------------------------------------------------- helpers
  const $ = (s, el = document) => el.querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const ar = (n) => String(n).replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[d]);
  const store = {
    get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* private mode */ } },
  };
  function cairoParts(d = new Date()) {
    const o = {};
    new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Cairo", year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).formatToParts(d).forEach((p) => { o[p.type] = p.value; });
    return o;
  }
  const cairoToday = () => { const o = cairoParts(); return `${o.year}-${o.month}-${o.day}`; };
  function secondsToMidnight() { const o = cairoParts(); return 86400 - (+o.hour * 3600 + +o.minute * 60 + +o.second); }
  const pretty = (ds) => new Date(ds + "T12:00:00Z").toLocaleDateString("ar-EG", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
  const clock = (s) => ar([Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60].map((x) => String(x).padStart(2, "0")).join(":"));
  function norm(s) {
    return (s || "").normalize("NFD")
      .replace(/[ً-ٰٟـ]/g, "").replace(/[̀-ͯ]/g, "")
      .replace(/[أإآٱ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي").replace(/ؤ/g, "و").replace(/ئ/g, "ي")
      .toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();
  }
  const commons = (file, w) => "https://commons.wikimedia.org/wiki/Special:FilePath/" + encodeURIComponent(file) + "?width=" + w;
  const asset = (file, w) => (/^https?:/.test(file) ? file : /^(photos|badges)\//.test(file) ? file : commons(file, w));

  const ICON = {
    help: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9.5"/><path d="M9.3 9.2a2.8 2.8 0 0 1 5.4 1c0 1.9-2.7 2.4-2.7 4"/><circle cx="12" cy="17.4" r=".6" fill="currentColor"/></svg>',
    stats: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 20V11M12 20V5M18 20v-6"/></svg>',
    cal: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    globe: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.6 2.8 2.6 15.2 0 18M12 3c-2.6 2.8-2.6 15.2 0 18"/></svg>',
    cup: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 3h10v2h3.5v2.2A4.6 4.6 0 0 1 16.6 12 5.6 5.6 0 0 1 13 15v2.5h3V21H8v-3.5h3V15a5.6 5.6 0 0 1-3.6-3A4.6 4.6 0 0 1 3.5 7.2V5H7V3Zm-1.5 4v.2A2.6 2.6 0 0 0 7 9.6V7H5.5Zm13 0H17v2.6a2.6 2.6 0 0 0 1.5-2.4V7Z"/></svg>',
    rings: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="6" cy="10" r="3.6"/><circle cx="12" cy="10" r="3.6"/><circle cx="18" cy="10" r="3.6"/><circle cx="9" cy="14" r="3.6"/><circle cx="15" cy="14" r="3.6"/></svg>',
    ball: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M12 7.5l4 2.9-1.5 4.7h-5L8 10.4z" fill="currentColor"/></svg>',
  };
  const SHIRT = '<svg viewBox="0 0 50 46" aria-hidden="true"><path class="body" d="M17 2 8.5 5.2 1.5 13.4l6.4 7 3.6-2.9V44h27V17.5l3.6 2.9 6.4-7-7-8.2L33 2c-1.6 4.3-4.6 6.6-8 6.6S18.6 6.3 17 2Z"/><path class="trim" d="M17 2c1.6 4.3 4.6 6.6 8 6.6s6.4-2.3 8-6.6" /></svg>';
  const EG_FLAG = '<svg class="flag-eg" viewBox="0 0 9 6" aria-hidden="true"><rect width="9" height="2" fill="#CE1126"/><rect y="2" width="9" height="2" fill="#fff"/><rect y="4" width="9" height="2" fill="#000"/><circle cx="4.5" cy="3" r=".55" fill="#C09300"/></svg>';

  // ---------------------------------------------------------------- data
  let players, crit, sets, lineups, today, date, lineup, state, names, byId = {};
  let active = null, activeRes = -1, timer = null, LINES = [];

  const keyFor = (d) => `${KEY}:${d}`;
  const answersOf = (i) => {
    const [pos, a, b] = lineup.spots[i];
    return [...sets["pos:" + pos]].filter((p) => sets[a].has(p) && sets[b].has(p)).sort((x, y) => x - y);
  };
  const fits = (i, p) => { const [pos, a, b] = lineup.spots[i]; return sets["pos:" + pos].has(p) && sets[a].has(p) && sets[b].has(p); };
  const usedBy = (p) => Object.keys(state.cells).find((i) => state.cells[i] === p);
  const filledCount = () => Object.keys(state.cells).length;

  function load() {
    const s = store.get(keyFor(date));
    const fresh = { cells: {}, wrong: [], mistakes: 0, over: false, sig: sig() };
    if (!s || s.sig !== sig()) { state = fresh; return; }   // the day's line-up was replaced: start again
    const cells = {};
    for (const [i, q] of Object.entries(s.cells || {})) if (byId[q] !== undefined) cells[i] = byId[q];
    state = { cells, wrong: s.wrong || [], mistakes: s.mistakes || 0, over: !!s.over, sig: s.sig };
  }
  function save() {
    const cells = {};
    for (const [i, p] of Object.entries(state.cells)) cells[i] = players[p][0];
    store.set(keyFor(date), { cells, wrong: state.wrong, mistakes: state.mistakes, over: state.over, sig: state.sig });
  }
  const sig = () => lineup.spots.map((s) => s.join("+")).join("|");

  // ---------------------------------------------------------------- pieces
  function shortLabel(cid) {
    const c = crit[cid];
    if (c.t === "abroad") return c.l.replace(/^لعب في\s*/, "");
    if (c.t === "region") return c.l.replace(/^لعب في\s*/, "");
    if (c.t === "hon") return HON_SHORT[cid] || c.l;
    return c.l;
  }
  function fullLabel(cid) {
    const c = crit[cid];
    if (c.t === "club" || c.t === "fclub") return "لعب " + (c.l.startsWith("ال") ? "لل" + c.l.slice(2) : "ل" + c.l);
    return c.l;
  }
  function icon(cid) {
    const c = crit[cid];
    if (c.t === "abroad" && c.f) return `<span class="ico"><img class="flag" alt="" loading="lazy" referrerpolicy="no-referrer" src="${esc(commons(c.f, 60))}"></span>`;
    if (c.t === "region") return `<span class="ico">${ICON.globe}</span>`;
    if (c.t === "hon") return `<span class="ico">${cid === "hon:olympics" ? ICON.rings : cid === "hon:epl" ? ICON.ball : ICON.cup}</span>`;
    const col = (c.c && c.c[0]) ? "#" + c.c[0] : "#6B7B70";
    const shield = `<span class="shield" style="background:${esc(col)}">${esc((c.l || "?").replace(/^ال/, "").slice(0, 1))}</span>`;
    if (c.b) return `<span class="ico" data-fallback="${esc(shield)}"><img alt="" loading="lazy" referrerpolicy="no-referrer" src="${esc(asset(c.b, 64))}"></span>`;
    return `<span class="ico">${shield}</span>`;
  }
  function face(p, cls) {
    const [, name, , , img] = players[p];
    const ini = esc((name || "?").trim().slice(0, 1));
    if (img) return `<img class="${cls}" alt="" loading="lazy" referrerpolicy="no-referrer" src="${esc(asset(img, 120))}" data-ini="${ini}">`;
    return `<span class="${cls} ini">${ini}</span>`;
  }
  function shortName(p) {
    const full = players[p][1];
    const words = full.split(" ");
    if (words.length <= 2 || full.length <= 15) return full;          // "عبد الله السعيد" stays whole
    if (/^عبد$/.test(words[0])) return words.slice(0, 3).join(" ");   // "عبد الله ..."
    // "محمد أبو تريكة" -> "أبو تريكة", "محمد عبد الوهاب" -> "عبد الوهاب": keep compound surnames together
    const k = words.length - 2;
    if (/^(أبو|ابو|عبد|بن)$/.test(words[k])) return words.slice(k).join(" ");
    return words.slice(0, 2).join(" ");
  }


  // ---------------------------------------------------------------- layout
  function shell() {
    document.body.innerHTML = `
      <header class="top">
        <div class="side"><button class="icon-btn" id="b-help" aria-label="طريقة اللعب">${ICON.help}</button></div>
        <div class="brand">
          <h1>تشكيلة المنتخب</h1>
          <span class="tri" aria-label="منتخب مصر"><i></i><i></i><i></i></span>
          <p class="edition" id="edition"></p>
        </div>
        <div class="side end">
          <button class="icon-btn" id="b-archive" aria-label="التشكيلات السابقة">${ICON.cal}</button>
          <button class="icon-btn" id="b-stats" aria-label="إحصائياتك">${ICON.stats}</button>
        </div>
      </header>
      <div class="strip">
        <div class="cards" aria-live="polite"><span class="lbl">الأخطاء</span><span class="card-row" id="cards"></span></div>
        <div class="count" id="count"></div>
      </div>
      <main class="pitch-wrap">
        <div class="pitch">
          <svg class="lines" viewBox="0 0 100 150" aria-hidden="true"></svg>
          <div class="formation" id="formation"></div>
        </div>
      </main>
      <section class="result" id="result" hidden></section>
      <div class="actions" id="actions"></div>
      <div class="install" id="install" hidden>
        <img src="/icons/icon-192.png" alt="">
        <div class="t">ثبّت «يلا دورك» على موبايلك<small>تشكيلة المنتخب وكل ألعاب اليوم في تطبيق واحد</small></div>
        <button class="go" id="install-go">تثبيت</button>
        <button class="x" id="install-x" aria-label="إغلاق">${ICON.close}</button>
      </div>
      <footer class="foot">
        <a class="home" href="/">🎮 يلا دورك: كل الألعاب</a>
        <div>البيانات من ويكيبيديا وويكي بيانات، والصور من ويكيميديا كومنز</div>
        <nav><a href="about.html">عن اللعبة</a><a href="privacy.html">الخصوصية</a><a href="credits.html">حقوق الصور</a></nav>
      </footer>
      <div class="modal" id="m-pick" hidden><div class="sheet" role="dialog" aria-modal="true" aria-labelledby="pick-title">
        <div class="sheet-head"><h2 id="pick-title"></h2><button class="close" data-close aria-label="إغلاق">${ICON.close}</button></div>
        <div class="ask" id="pick-ask"></div>
        <input class="search" id="q" type="search" autocomplete="off" placeholder="اكتب اسم اللاعب" aria-label="اسم اللاعب" aria-controls="results">
        <div class="msg" id="msg" aria-live="assertive"></div>
        <ul class="results" id="results" role="listbox"></ul>
      </div></div>
      <div class="modal" id="m-info" hidden><div class="sheet" role="dialog" aria-modal="true" aria-labelledby="info-title">
        <div class="sheet-head"><h2 id="info-title"></h2><button class="close" data-close aria-label="إغلاق">${ICON.close}</button></div>
        <div id="info-body"></div>
      </div></div>`;
    $("#b-help").onclick = showHelp;
    $("#b-stats").onclick = showStats;
    $("#b-archive").onclick = showArchive;
    document.querySelectorAll("[data-close]").forEach((b) => { b.onclick = closeModals; });
    document.querySelectorAll(".modal").forEach((m) => m.addEventListener("click", (e) => { if (e.target === m) closeModals(); }));
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModals(); });
    $("#q").addEventListener("input", (e) => results(e.target.value));
    $("#q").addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); move(e.key === "ArrowDown" ? 1 : -1); }
      if (e.key === "Enter") { const b = document.querySelectorAll("#results button:not([disabled])")[activeRes]; if (b) b.click(); }
    });
    document.addEventListener("error", (e) => {      // broken crest -> coloured shield; broken photo -> initial
      const img = e.target;
      if (!(img instanceof HTMLImageElement)) return;
      if (img.classList.contains("crest")) { img.remove(); return; }
      const box = img.closest(".ico[data-fallback]");
      if (box) { box.innerHTML = box.dataset.fallback; return; }
      if (img.dataset.ini !== undefined) {
        const s = document.createElement("span");
        s.className = img.className + " ini";
        s.textContent = img.dataset.ini;
        img.replaceWith(s);
      }
    }, true);
  }

  function render() {
    $("#edition").textContent = `التشكيلة رقم ${ar(lineup.n)}، ${pretty(date)}`;
    $("#cards").innerHTML = Array.from({ length: MAX_MISTAKES }, (_, k) =>
      `<span class="card ${k < state.mistakes ? "used" : ""}"></span>`).join("");
    $(".cards").setAttribute("aria-label", `الأخطاء: ${ar(state.mistakes)} من ${ar(MAX_MISTAKES)}`);
    const left = 11 - filledCount();
    $("#count").innerHTML = !left ? "اكتملت التشكيلة" : left === 1 ? "باقي <b>مركز واحد</b>"
      : left === 2 ? "باقي <b>مركزان</b>" : `باقي <b>${ar(left)}</b> ${left > 10 ? "مركزًا" : "مراكز"}`;
    const reveal = state.over ? revealPicks() : {};
    $("#formation").style.gridTemplateRows = `repeat(${LINES.length}, 1fr)`;
    $(".pitch").style.setProperty("--rows", LINES.length);
    $("#formation").innerHTML = LINES.map(([pos, idx]) =>
      `<div class="line ${pos} n${idx.length}">${idx.map((i) => spotHtml(i, reveal)).join("")}</div>`).join("");
    drawLines();
    document.querySelectorAll(".spot").forEach((b) => { b.onclick = () => openSpot(+b.dataset.i); });
    renderEnd();
  }

  /** After the game: one different answer for every empty spot (most famous first, no player twice). */
  function revealPicks() {
    const empty = lineup.spots.map((_, i) => i).filter((i) => state.cells[i] === undefined);
    const taken = new Set(Object.values(state.cells));
    const owner = new Map();
    const place = (i, seen) => {
      for (const p of answersOf(i)) {
        if (taken.has(p) || seen.has(p)) continue;
        seen.add(p);
        if (!owner.has(p) || place(owner.get(p), seen)) { owner.set(p, i); return true; }
      }
      return false;
    };
    empty.forEach((i) => place(i, new Set()));
    const out = {};
    owner.forEach((i, p) => { out[i] = p; });
    empty.forEach((i) => { if (out[i] === undefined) out[i] = answersOf(i)[0]; });
    return out;
  }

  /** Pitch markings at real proportions (68 m x 105 m), with room for the goals around them. */
  function drawLines() {
    const svg = $(".lines");
    if (!svg) return;
    const W = 68, L = 105, r = 9.15, dx = Math.sqrt(r * r - 5.5 * 5.5).toFixed(2);
    const end = (top) => {
      const y = (d) => (top ? d : L - d);
      const box = top ? 0 : L - 16.5, six = top ? 0 : L - 5.5;
      return `<rect x="13.84" y="${box}" width="40.32" height="16.5"/><rect x="24.84" y="${six}" width="18.32" height="5.5"/>
        <circle class="dot" cx="34" cy="${y(11)}" r=".45"/>
        <path d="M${34 - dx} ${y(16.5)}A${r} ${r} 0 0 ${top ? 0 : 1} ${34 + +dx} ${y(16.5)}"/>
        <rect class="goal" x="30.34" y="${top ? -1.8 : L}" width="7.32" height="1.8"/>`;
    };
    svg.setAttribute("viewBox", "-3 -3 74 111");
    svg.innerHTML = `<rect x="0" y="0" width="${W}" height="${L}"/>
      <line x1="0" y1="${L / 2}" x2="${W}" y2="${L / 2}"/><circle cx="34" cy="${L / 2}" r="${r}"/>
      <circle class="dot" cx="34" cy="${L / 2}" r=".45"/>${end(true)}${end(false)}
      <path d="M0 1A1 1 0 0 0 1 0M67 0A1 1 0 0 0 68 1M0 104A1 1 0 0 1 1 105M67 105A1 1 0 0 1 68 104"/>`;
  }

  // Every spot has Al Ahly or Zamalek: that club is the shirt; the other condition is written under it.
  const AHLY = "club:Q223566", ZAMALEK = "club:Q286504", PRO = "pro:noaz";
  function splitSpot(i) {
    const [pos, a, b] = lineup.spots[i];
    const club = [AHLY, ZAMALEK, PRO].find((c) => c === a || c === b) || a;
    return { pos, club, other: club === a ? b : a, a, b };
  }
  /** A club shirt: Al Ahly all red with white trim, Zamalek white with its two red stripes. */
  function kit(club, i) {
    const id = "k" + i;
    const zam = club === ZAMALEK;

    const pro = club === PRO;   // a pro who never played for Al Ahly or Zamalek: black with gold
    const base = zam ? "#F4F3EE" : pro ? "#1D1F1E" : "#C8102E";
    const trim = zam ? "#C8102E" : pro ? "#E2B444" : "#FFFFFF";
    const body = "M71 20C63 24 52 27 40 31L12 50 24 87 47 78 48 180C80 188 120 188 152 180L153 78 176 87 188 50 160 31C148 27 137 24 129 20 122 34 112 41 100 41S78 34 71 20Z";
    return `<svg viewBox="0 0 200 196" aria-hidden="true">
    <defs>
      <clipPath id="${id}c"><path d="${body}"/></clipPath>
      <linearGradient id="${id}x" x1="0" x2="1">
        <stop offset="0" stop-color="#000" stop-opacity=".30"/><stop offset=".2" stop-color="#000" stop-opacity=".06"/>
        <stop offset=".5" stop-color="#fff" stop-opacity=".10"/><stop offset=".8" stop-color="#000" stop-opacity=".06"/>
        <stop offset="1" stop-color="#000" stop-opacity=".30"/></linearGradient>
      <linearGradient id="${id}y" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#fff" stop-opacity=".14"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/>
        <stop offset="1" stop-color="#000" stop-opacity=".18"/></linearGradient>
    </defs>
    <path d="M71 20C80 13 120 13 129 20 122 34 112 41 100 41S78 34 71 20Z" fill="${zam ? "#CFCCC3" : pro ? "#000000" : "#7E0919"}"/>
    <path d="M74 19C84 15 116 15 126 19" fill="none" stroke="${trim}" stroke-width="3" stroke-opacity=".8"/>
    <path d="${body}" fill="${base}"/>
    <g clip-path="url(#${id}c)">
      ${zam ? `<path d="M46 60H154V71H46ZM46 79H154V90H46Z" fill="${trim}"/>` : `<path d="M48 78V180M152 78V180" stroke="#000" stroke-opacity=".10" stroke-width="2"/>`}
      <path d="M12 50 24 87 32 83.6 20.4 46.4Z M188 50 176 87 168 83.6 179.6 46.4Z" fill="${trim}"/>
      <path d="M40 31 47 78M160 31 153 78" stroke="#000" stroke-opacity=".14" stroke-width="1.6" fill="none"/>
      <rect width="200" height="196" fill="url(#${id}x)"/>
      <rect width="200" height="196" fill="url(#${id}y)"/>
    </g>
    <path d="M71 20C78 34 88 41 100 41S122 34 129 20" fill="none" stroke="${trim}" stroke-width="6.5" stroke-linejoin="round"/>
    <path d="${body}" fill="none" stroke="#000" stroke-opacity=".35" stroke-width="1.6" stroke-linejoin="round"/>
</svg>`;
}

  /** The club crest on the chest; dropped quietly if it can't load. */
  function crestImg(club) {
    const b = crit[club] && crit[club].b;
    return b ? `<img class="crest" alt="" loading="lazy" referrerpolicy="no-referrer" src="${esc(asset(b, 64))}">` : "";
  }

  function spotHtml(i, reveal) {
    const { pos, club, other } = splitSpot(i);
    const p = state.cells[i];
    let cls = "spot " + pos + (club === ZAMALEK ? " zam" : club === PRO ? " pro" : " ahly"), name = "";
    if (p !== undefined) {
      cls += " filled";
      name = `<span class="name">${esc(shortName(p))}</span>`;
    } else if (state.over) {
      const best = reveal[i];
      cls += " missed";
      if (best !== undefined) name = `<span class="name">${esc(shortName(best))}</span>`;
    }
    const label = p !== undefined ? `${POS[pos]}: ${players[p][1]}` : `${POS[pos]}، ${fullLabel(club)} و${fullLabel(other)}`;
    return `<button class="${cls}" data-i="${i}" aria-label="${esc(label)}">
      <span class="shirt">${kit(club, i)}${crestImg(club)}<span class="pos">${club === PRO ? '<small>محترف</small>' : ""}${POS_SHORT[pos]}</span>${p !== undefined ? '<span class="tick">✓</span>' : ""}</span>${name}
      <span class="cond">${icon(other)}<span>${esc(shortLabel(other))}</span></span>
    </button>`;
  }

  function renderEnd() {
    const res = $("#result"), act = $("#actions");
    const done = filledCount() === 11;
    if (state.over || done) {
      res.hidden = false;
      const n = filledCount();
      const title = done ? (state.mistakes === 0 ? "تشكيلة كاملة بدون أخطاء!" : "تشكيلة كاملة!") : `أكملت ${ar(n)} من ${ar(11)}`;
      res.innerHTML = `<h2>${title}</h2><p>${state.over && !done ? "اضغط على أي مركز لترى كل الإجابات. " : ""}${date === today ? `التشكيلة الجديدة بعد <span class="next" id="next">${clock(secondsToMidnight())}</span>` : ""}</p><a class="more" href="/">🎮 باقي ألعاب اليوم</a>`;
      act.innerHTML = `<button class="btn primary" id="b-share">شارك النتيجة</button><button class="btn" id="b-stats2">إحصائياتك</button>`;
      $("#b-share").onclick = share;
      $("#b-stats2").onclick = showStats;
      clearInterval(timer);
      if (date === today) timer = setInterval(() => {
        const s = secondsToMidnight();
        const el = $("#next");
        if (el) el.textContent = clock(s);
        if (s <= 1) location.reload();
      }, 1000);
    } else {
      res.hidden = true;
      act.innerHTML = `<button class="btn warn" id="b-give">أظهر الإجابات</button>`;
      $("#b-give").onclick = (e) => {
        if (e.target.dataset.sure) { finish(); return; }
        e.target.dataset.sure = "1";
        e.target.textContent = "متأكد؟ اضغط مرة أخرى";
      };
    }
  }

  function finish() {
    state.over = true;
    save();
    render();
    recordStats();
  }

  // ---------------------------------------------------------------- picking a player
  function openSpot(i) {
    const { pos, club: a, other: b } = splitSpot(i);
    if (state.over || state.cells[i] !== undefined) { showAnswers(i); return; }
    active = i;
    document.querySelectorAll(".spot").forEach((s) => s.classList.toggle("active", +s.dataset.i === i));
    $("#pick-title").textContent = `اختر ${POS[pos]}`;
    $("#pick-ask").innerHTML = `<div class="row">${icon(a)}<span>${esc(fullLabel(a))}</span></div>
      <div class="row">${icon(b)}<span>${esc(fullLabel(b))}</span></div>`;
    $("#msg").textContent = "";
    $("#q").value = "";
    results("");
    openModal("#m-pick");
    setTimeout(() => $("#q").focus(), 60);
  }

  function search(q) {
    const t = norm(q).split(" ").filter(Boolean);
    if (!t.length || t.join("").length < 2) return null;
    const out = [];
    for (let p = 0; p < players.length; p++) if (t.every((w) => names[p].includes(w))) out.push(p);
    const score = (p) => (names[p].startsWith(t[0]) ? 0 : names[p].includes(" " + t[0]) ? 1 : 2);
    return out.sort((a, b) => score(a) - score(b) || a - b).slice(0, 12);
  }

  function results(q) {
    const list = $("#results");
    const res = search(q);
    activeRes = -1;
    if (res === null) { list.innerHTML = `<li class="none">اكتب حرفين على الأقل من اسم اللاعب، بالعربي أو الإنجليزي.</li>`; return; }
    if (!res.length) { list.innerHTML = `<li class="none">لا يوجد لاعب بهذا الاسم في لاعبي المنتخب.</li>`; return; }
    list.innerHTML = res.map((p) => {
      const [, shown, en, , , year] = players[p];
      const where = usedBy(p);
      const sub = [en && en !== shown ? esc(en) : "", year ? "مواليد " + ar(year) : "", where !== undefined ? "في التشكيلة بالفعل" : ""].filter(Boolean).join("، ");
      return `<li><button type="button" data-p="${p}" ${where !== undefined ? "disabled" : ""}>
        <span class="who"><span class="who-name">${esc(shown)}</span><span class="who-sub">${sub}</span></span></button></li>`;
    }).join("");
    list.querySelectorAll("button").forEach((b) => { b.onclick = () => pick(+b.dataset.p); });
    move(0, true);
  }
  function move(d, reset) {
    const bs = [...document.querySelectorAll("#results button:not([disabled])")];
    if (!bs.length) return;
    activeRes = reset ? 0 : (activeRes + d + bs.length) % bs.length;
    bs.forEach((b, k) => b.classList.toggle("active", k === activeRes));
    if (!reset) bs[activeRes].scrollIntoView({ block: "nearest" });
  }

  function pick(p) {
    const i = active;
    if (i === null || state.over || usedBy(p) !== undefined) return;
    const tag = `${i}:${players[p][0]}`;
    if (state.wrong.includes(tag)) { $("#msg").textContent = "جربت هذا اللاعب هنا من قبل."; return; }
    if (fits(i, p)) {
      state.cells[i] = p;
      closeModals();
      save();
      render();
      const el = document.querySelector(`.spot[data-i="${i}"]`);
      if (el) el.classList.add("pop");
      if (filledCount() === 11) finish();
      return;
    }
    state.wrong.push(tag);
    state.mistakes += 1;
    save();
    if (state.mistakes >= MAX_MISTAKES) { closeModals(); finish(); return; }
    render();
    const left = MAX_MISTAKES - state.mistakes;
    $("#msg").textContent = `${players[p][1]} لا ينطبق عليه الشرطان. ${left === 1 ? "باقي خطأ واحد" : `باقي ${ar(left)} أخطاء`}.`;
    const el = document.querySelector(`.spot[data-i="${i}"]`);
    if (el) { el.classList.remove("shake"); void el.offsetWidth; el.classList.add("shake"); el.classList.add("active"); }
    $("#q").select();
  }

  // ---------------------------------------------------------------- sheets
  function openModal(sel) { document.querySelectorAll(".modal").forEach((m) => { m.hidden = true; }); $(sel).hidden = false; }
  function closeModals() {
    document.querySelectorAll(".modal").forEach((m) => { m.hidden = true; });
    active = null;
    document.querySelectorAll(".spot.active").forEach((s) => s.classList.remove("active"));
  }
  function info(title, html) {
    $("#info-title").textContent = title;
    $("#info-body").innerHTML = html;
    openModal("#m-info");
  }

  function showAnswers(i) {
    const { pos, club: a, other: b } = splitSpot(i);
    const mine = state.cells[i];
    const all = answersOf(i);
    const subj = encodeURIComponent(`تشكيلة المنتخب: ملاحظة على التشكيلة رقم ${lineup.n}`);
    info(`${POS[pos]}: كل الإجابات (${ar(all.length)})`, `
      <div class="ask"><div class="row">${icon(a)}<span>${esc(fullLabel(a))}</span></div><div class="row">${icon(b)}<span>${esc(fullLabel(b))}</span></div></div>
      <ul class="answers">${all.map((p) => `<li class="${p === mine ? "mine" : ""}">
        <span class="who"><span class="who-name">${esc(players[p][1])}</span><span class="who-sub">${esc(players[p][2] || "")}</span></span></li>`).join("")}</ul>
      <p class="muted" style="font-size:.85rem;color:var(--soft)">لاعب ناقص أو معلومة خاطئة؟ <a href="mailto:${CONTACT}?subject=${subj}">أخبرنا</a></p>`);
  }

  function showHelp() {
    info("طريقة اللعب", `
      <ul>
        <li>كل يوم تشكيلة ٤-٣-٣ جديدة، وكل اللاعبين فيها لعبوا لمنتخب مصر.</li>
        <li>التيشيرت الأحمر يعني أنه لعب للأهلي، والأبيض بالخطين الأحمرين يعني أنه لعب للزمالك، والأسود يعني لاعبًا محترفًا لم يلعب للأهلي ولا للزمالك.</li>
        <li>اضغط على أي مركز واختر لاعبًا لعب في هذا المركز، وللنادي صاحب التيشيرت، وينطبق عليه الشرط المكتوب تحته.</li>
        <li>الشعار تحت التيشيرت يعني نادٍ آخر لعب له، والعلم يعني أنه لعب في هذا البلد، في أي وقت من مسيرته.</li>
        <li>لا يمكن استخدام اللاعب نفسه في أكثر من مركز.</li>
        <li>مسموح لك بـ ٥ أخطاء، ومع الخطأ الخامس تنتهي المحاولة.</li>
        <li>تشكيلة جديدة كل يوم عند منتصف الليل بتوقيت القاهرة.</li>
      </ul>
      <div style="text-align:center;margin-top:14px"><button class="btn primary" data-close>يلا نلعب</button></div>`);
    document.querySelectorAll("#info-body [data-close]").forEach((b) => { b.onclick = closeModals; });
  }

  function history() {
    const out = [];
    for (const ds of Object.keys(lineups).sort()) {
      if (ds > today) break;
      const s = store.get(keyFor(ds));
      if (s && (s.over || Object.keys(s.cells || {}).length === 11)) out.push({ ds, n: Object.keys(s.cells || {}).length, m: s.mistakes || 0 });
    }
    return out;
  }
  function recordStats() { /* stats are worked out from the saved days; nothing extra to store */ }
  function showStats() {
    const h = history();
    const full = h.filter((g) => g.n === 11);
    const doneDays = new Set(full.map((g) => g.ds));
    let streak = 0, best = 0, run = 0;
    for (const ds of Object.keys(lineups).sort()) {
      if (ds > today) break;
      if (doneDays.has(ds)) { run += 1; best = Math.max(best, run); } else if (ds !== today) run = 0;
    }
    streak = run;
    const avg = h.length ? (h.reduce((s, g) => s + g.n, 0) / h.length).toFixed(1) : "0";
    info("إحصائياتك", `
      <div class="stats-grid">
        <div><b>${ar(h.length)}</b><span>لعبت</span></div>
        <div><b>${ar(full.length)}</b><span>تشكيلة كاملة</span></div>
        <div><b>${ar(streak)}</b><span>أيام متتالية</span></div>
        <div><b>${ar(best)}</b><span>أفضل سلسلة</span></div>
      </div>
      <p style="text-align:center;color:var(--soft);margin:0">متوسط اللاعبين في التشكيلة: ${ar(avg).replace(".", "٫")} من ${ar(11)}</p>`);
  }
  function showArchive() {
    const days = Object.keys(lineups).filter((d) => d <= today).sort().reverse();
    info("التشكيلات السابقة", `<ul class="archive">${days.map((d) => {
      const s = store.get(keyFor(d));
      const st = !s ? "لم تلعبها" : Object.keys(s.cells || {}).length === 11 ? "كاملة" : s.over ? `${ar(Object.keys(s.cells || {}).length)} من ${ar(11)}` : "لم تكتمل";
      return `<li><a href="${d === today ? "./" : "?d=" + d}"><span>رقم ${ar(lineups[d].n)}، ${pretty(d)}</span><span class="st">${st}</span></a></li>`;
    }).join("")}</ul>`);
  }

  function share() {
    const row = (idx) => idx.map((i) => (state.cells[i] !== undefined ? "🟥" : "⬜")).join("");
    const lines = LINES.map(([, idx]) => row(idx));
    const text = `تشكيلة المنتخب رقم ${ar(lineup.n)}\n${lines.join("\n")}\n${ar(filledCount())} من ${ar(11)}، الأخطاء ${ar(state.mistakes)} من ${ar(MAX_MISTAKES)}\n${SITE}`;
    if (navigator.share) { navigator.share({ text }).catch(() => {}); return; }
    const wa = "https://wa.me/?text=" + encodeURIComponent(text);
    if (navigator.clipboard) navigator.clipboard.writeText(text).then(() => toast("تم نسخ النتيجة")).catch(() => window.open(wa, "_blank"));
    else window.open(wa, "_blank");
  }
  function toast(msg) {
    const t = document.createElement("div");
    t.className = "toast";
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 1800);
  }

  // ---------------------------------------------------------------- install «يلا دورك» as an app
  // The page links the site's main manifest (/site.webmanifest), so installing from here installs «يلا دورك».
  let installEvt = null;
  window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); installEvt = e; showInstall(); });
  window.addEventListener("appinstalled", () => { const b = $("#install"); if (b) b.hidden = true; toast("تم التثبيت 🎉"); });
  function showInstall() {
    const box = $("#install");
    if (!box) return;
    const ua = navigator.userAgent;
    const standalone = matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
    const phone = /android|iphone|ipad|ipod/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const hiddenUntil = store.get("yd_install_x") || 0;               // shared with the other games: closing it once hides it everywhere
    box.hidden = standalone || hiddenUntil > Date.now() || !(phone || installEvt);
  }
  function setupInstall() {
    const ua = navigator.userAgent;
    const isIOS = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const inApp = /FBAN|FBAV|FB_IAB|Instagram|Line\/|Snapchat|TikTok|musical_ly|; wv\)/i.test(ua);   // apps' built-in browsers
    const isIOSSafari = isIOS && /safari/i.test(ua) && !/crios|fxios|edgios|gsa\//i.test(ua) && !inApp;
    const steps = (list) => `<ol class="isteps">${list.map((x) => `<li>${x}</li>`).join("")}</ol>`;
    $("#install-go").onclick = async () => {
      if (installEvt) {                                                // Android / Chrome: direct install
        installEvt.prompt();
        const r = await installEvt.userChoice.catch(() => null);
        installEvt = null;
        if (r && r.outcome === "accepted") $("#install").hidden = true;
        return;
      }
      if (inApp || (isIOS && !isIOSSafari)) {
        info("افتح الموقع في المتصفح", `<p>${isIOS ? "التثبيت على الآيفون يعمل من Safari فقط." : "التطبيقات زي فيسبوك وإنستجرام لا تسمح بالتثبيت من داخلها."}</p>` + steps([
          "اضغط زر <b>القائمة</b> (⋯ أو ⋮) في أعلى أو أسفل الشاشة",
          isIOS ? "اختر <b>«فتح في Safari»</b>" : "اختر <b>«فتح في Chrome»</b> أو «فتح في المتصفح»",
          "ثم اضغط «تثبيت» مرة أخرى من هناك"]));
      } else if (isIOS) {
        info("ثبّت يلا دورك على الآيفون", steps([
          "اضغط زر <b>المشاركة</b> في شريط Safari",
          "اختر <b>«إضافة إلى الشاشة الرئيسية»</b>",
          "اضغط <b>«إضافة»</b> — وهتلاقي «يلا دورك» على شاشتك!"]));
      } else {
        info("ثبّت يلا دورك على موبايلك", steps([
          "اضغط زر <b>القائمة ⋮</b> أعلى الشاشة في Chrome",
          "اختر <b>«تثبيت التطبيق»</b> أو <b>«إضافة إلى الشاشة الرئيسية»</b>",
          "اضغط <b>«تثبيت»</b> — وهتلاقي «يلا دورك» على شاشتك!"]));
      }
    };
    $("#install-x").onclick = () => { $("#install").hidden = true; store.set("yd_install_x", Date.now() + 14 * 864e5); };   // hide for 14 days
    showInstall();
  }

  // ---------------------------------------------------------------- start
  async function start() {
    document.body.innerHTML = `<div class="loading">جاري تحميل التشكيلة…</div>`;
    try {
      const bust = "?t=" + Math.floor(Date.now() / 600000);
      const [d, l] = await Promise.all([fetch(DATA_DIR + "data.json" + bust).then((r) => r.json()),
                                       fetch(DATA_DIR + "lineups.json" + bust).then((r) => r.json())]);
      players = d.players; crit = d.criteria; lineups = l;
    } catch (e) {
      document.body.innerHTML = `<div class="loading">تعذر تحميل التشكيلة. تحقق من الاتصال ثم أعد تحميل الصفحة.</div>`;
      return;
    }
    sets = {};
    for (const [k, c] of Object.entries(crit)) sets[k] = new Set(c.m);
    players.forEach((p, i) => { byId[p[0]] = i; });
    names = players.map((p) => norm([p[1], p[2], p[6] || ""].join(" ")));
    today = cairoToday();
    const days = Object.keys(lineups).filter((x) => x <= today).sort();
    const asked = new URLSearchParams(location.search).get("d");
    date = asked && lineups[asked] && asked <= today ? asked : (lineups[today] ? today : days[days.length - 1]);
    if (!date) { document.body.innerHTML = `<div class="loading">أول تشكيلة تبدأ قريبًا.</div>`; return; }
    lineup = lineups[date];
    LINES = linesOf(lineup.f || "4-3-3");
    shell();
    load();
    render();
    setupInstall();
    if (!store.get(KEY + ":seen-help")) { store.set(KEY + ":seen-help", 1); showHelp(); }
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {});   // the one service worker for the whole site
  }
  start();
})();
