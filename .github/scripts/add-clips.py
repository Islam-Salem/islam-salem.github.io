"""
add_clips.py — run automatically by GitHub (see .github/workflows/add-clips.yml).

Upload a clip into  sharatalbidaya/clips  named like:
    Title - YouTubeID - StartSecond.mp3
    e.g.  مارتن مستري - sO_371leHlo - 1.mp3
and this script will:
  1. rename it to clips/<YouTubeID>.mp3 (so the title never shows in the audio URL)
  2. add the song to the END of SONGS in songs.js (so upcoming days don't change)
     - if the title is in EXTRA_TITLES, its aliases are reused and it's removed from there
     - if the YouTube ID is already in SONGS, only the clip is replaced
"""
import json, re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2] / "sharatalbidaya"   # the game's folder in the site repo
CLIPS = ROOT / "clips"
SONGS_JS = ROOT / "songs.js"

NAME_RE = re.compile(r"^(?P<title>.*?)\s*-\s*(?P<vid>[A-Za-z0-9_-]{11})\s*-\s*(?P<start>\d+(?:\.\d+)?)\s*$")
INVISIBLE = re.compile(r"[\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]")

def parse(stem):
    stem = INVISIBLE.sub("", stem).replace("–", "-").replace("—", "-")
    m = NAME_RE.match(stem)
    return (m["title"].strip(), m["vid"], m["start"]) if m else None

def bounds(text):
    """Start and end positions of the SONGS list's contents."""
    s = re.search(r"const\s+SONGS\s*=\s*\[", text)
    if not s:
        sys.exit("Couldn't find 'const SONGS = [' in songs.js")
    e = re.compile(r"^[ \t]*\][ \t]*;?[ \t]*$", re.M).search(text, s.end())
    if not e:
        sys.exit("Couldn't find the '];' that closes SONGS in songs.js")
    return s.end(), e.start()

def main():
    if not SONGS_JS.exists():
        sys.exit(f"songs.js not found at {SONGS_JS}")
    text = SONGS_JS.read_text(encoding="utf-8")

    bounds(text)  # fail early if songs.js isn't in the expected shape

    new_lines, changed = [], False
    for f in sorted(CLIPS.glob("*.mp3")):
        info = parse(f.stem)
        if not info:
            continue  # already a plain <ID>.mp3, or not in the upload format
        title, vid, start = info
        target = CLIPS / f"{vid}.mp3"
        if target.exists():
            target.unlink()
        f.rename(target)
        changed = True
        print(f"Clip renamed: {f.name} -> {target.name}")

        a, b = bounds(text)
        songs_part = text[a:b] + "".join(new_lines)
        if vid in songs_part:
            print(f"  {vid} is already in SONGS — clip replaced, songs.js unchanged")
            continue

        # Reuse aliases from EXTRA_TITLES and remove the decoy entry
        aliases = "[]"
        extra_m = re.search(r"EXTRA_TITLES", text)
        if extra_m:
            line_re = re.compile(r"^[^\n]*title:\s*" + re.escape(json.dumps(title, ensure_ascii=False)) + r"[^\n]*\n", re.M)
            lm = line_re.search(text, extra_m.end())
            if lm:
                am = re.search(r"aliases:\s*(\[[^\]]*\])", lm.group(0))
                if am:
                    aliases = am.group(1)
                text = text[:lm.start()] + text[lm.end():]
                print(f"  moved «{title}» out of EXTRA_TITLES")

        start_num = int(float(start)) if float(start).is_integer() else float(start)
        new_lines.append(f'  {{ title: {json.dumps(title, ensure_ascii=False)}, aliases: {aliases}, '
                         f'youtube: "{vid}", start: {start_num} }},\n')
        print(f"  added «{title}» to the end of SONGS")

    if new_lines:
        _, b = bounds(text)
        before = text[:b]
        if before and not before.endswith("\n"):
            before += "\n"
        text = before + "".join(new_lines) + text[b:]

    if new_lines or changed:
        SONGS_JS.write_text(text, encoding="utf-8")
    print(f"Done: {len(new_lines)} song(s) added.")

if __name__ == "__main__":
    main()
