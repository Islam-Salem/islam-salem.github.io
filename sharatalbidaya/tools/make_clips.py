"""
make_clips.py — cuts the short audio clips the game plays during a round.

HOW TO USE
1. Install ffmpeg once (Windows: open PowerShell and run   winget install ffmpeg   then reopen it).
2. Put the full audio (or video) of each intro in the  tools/source  folder, named by its
   number in the sheet (the # column) — e.g.  0.mp3,  1.m4a,  22.mp4 …
   (Naming by YouTube video ID also works, e.g.  WevtBmOU5qY.mp3)
3. Run from the project folder:      python tools/make_clips.py
4. Upload the new  clips  folder to the repo.

Each clip starts at the song's `start` from songs.js (the same second as in the YouTube video)
and lasts CLIP_SECONDS. If your source file is NOT the same recording as the YouTube video
(so its timing is different), put its own start time in OVERRIDE_START below.
Existing clips are skipped; delete a clip to re-make it.
"""
import json, re, shutil, subprocess, sys
from pathlib import Path

CLIP_SECONDS = 10            # the longest round clip is 8 s — 10 s leaves a little room
OVERRIDE_START = {           # optional: song number -> start second inside YOUR source file
    # 22: 3.5,
}

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "tools" / "source"
OUT = ROOT / "clips"
EXTS = [".mp3", ".m4a", ".aac", ".wav", ".ogg", ".opus", ".webm", ".mp4", ".mkv", ".flac"]


def load_songs():
    js = (ROOT / "songs.js").read_text(encoding="utf-8")
    body = js[js.index("const SONGS"):]
    body = body[body.index("[") : body.index("];") + 1]
    songs = []
    for m in re.finditer(r'\{\s*title:\s*"([^"]*)".*?youtube:\s*"([^"]*)".*?start:\s*([\d.]+)', body, re.S):
        title, yt, start = m.group(1), m.group(2), float(m.group(3))
        vid = re.search(r"(?:v=|youtu\.be/|shorts/|embed/)?([\w-]{11})", yt)
        songs.append({"title": title, "id": vid.group(1) if vid else None, "start": start})
    return songs


def find_source(num, vid):
    for name in (str(num), vid):
        if not name:
            continue
        for ext in EXTS:
            f = SOURCE / f"{name}{ext}"
            if f.exists():
                return f
    return None


def main():
    if not shutil.which("ffmpeg"):
        sys.exit("ffmpeg not found — install it first (Windows: winget install ffmpeg), then reopen the terminal.")
    SOURCE.mkdir(parents=True, exist_ok=True)
    OUT.mkdir(exist_ok=True)
    songs = load_songs()
    made, skipped, missing = 0, 0, []
    for num, s in enumerate(songs):
        if not s["id"]:
            continue
        out = OUT / f"{s['id']}.mp3"
        if out.exists():
            skipped += 1
            continue
        src = find_source(num, s["id"])
        if not src:
            missing.append(f"#{num} {s['title']}")
            continue
        start = OVERRIDE_START.get(num, s["start"])
        fade_at = CLIP_SECONDS - 0.4
        cmd = ["ffmpeg", "-y", "-loglevel", "error", "-ss", str(start), "-t", str(CLIP_SECONDS), "-i", str(src),
               "-vn", "-ac", "1", "-ar", "44100", "-b:a", "96k", "-af", f"afade=t=out:st={fade_at}:d=0.4",
               "-map_metadata", "-1", str(out)]          # -map_metadata -1: strip titles from the file
        r = subprocess.run(cmd, capture_output=True, text=True)
        if r.returncode == 0:
            made += 1
            print(f"✓ #{num} {s['title']}  →  clips/{out.name}")
        else:
            print(f"✗ #{num} {s['title']}: {r.stderr.strip()[:200]}")
    print(f"\nMade {made}, already existed {skipped}, missing source {len(missing)}")
    if missing:
        print("No source file for:\n  " + "\n  ".join(missing))


if __name__ == "__main__":
    main()
