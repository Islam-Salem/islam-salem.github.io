// =====================================================================
//  «يلا دورك» — the list of games shown on the home page.
//  To add a new game: copy one block, change the fields, add its icon to games/.
//
//  url    : the game's address on this site (its repo name between slashes)
//  icon   : picture shown on the card (put a 192×192 PNG in the games/ folder)
//  color  : card colour,  ink: text colour on that card
//  status : reads the game's own saved progress to show "played today".
//           Return "done", "started" or "new". (Optional — leave it out if unsure.)
// =====================================================================

const GAMES = [
  {
    name: "شارة الطفولة",
    tag: "🎵 موسيقى",
    desc: "اسمع أول ثانية من الشارة وخمّن المسلسل.",
    url: "/sharatalbidaya/",
    icon: "games/sharah.png",
    color: "#7cc6fe",
    ink: "#14121f",
    status() {
      // Day number counted from the game's first day (Cairo time), like the game itself does
      const s = readJSON("st_state");
      if (!s || s.day !== dayNumber("2026-10-10")) return "new";
      if (s.done) return "done";
      return (s.guesses && s.guesses.length) ? "started" : "new";
    },
  },
  {
    name: "تشكيلة المنتخب",
    tag: "⚽ كورة",
    desc: "كمّل تشكيلة منتخب مصر من لاعبين بيطابقوا الشروط.",
    url: "/tashkila/",
    icon: "games/tashkila.png",
    color: "#14432a",
    ink: "#eef5ec",
    status() {
      const s = readJSON("xi:" + cairoToday());
      if (!s) return "new";
      const filled = s.cells ? Object.keys(s.cells).length : 0;
      if (s.over || filled >= 11) return "done";
      return (filled || s.mistakes) ? "started" : "new";
    },
  },
];
