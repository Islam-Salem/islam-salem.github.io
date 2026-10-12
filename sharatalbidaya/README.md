# شارة البداية

Daily "name the intro from the first second" game for TV-show intro songs.
Clips unlock at 1 → 2 → 4 → 6 → 8 seconds (5 tries). Wrong guess or skip = longer clip.

## Files
This folder is one game inside the «يلا دورك» site (see the README in the main folder).
```
index.html            the game
songs.js              the song list (Claude updates it from the Google Sheet)
about.html            عن اللعبة — how to play, copyright note, contact
privacy.html          سياسة الخصوصية
page.css              style for about / privacy
clips/                the audio clips (one mp3 per song, named by YouTube video ID)
tools/make_clips.py   makes the clips
sw.js                 retired (the whole site uses /sw.js) — keep it: it cleans up old phones
favicon.ico, favicon-32.png, apple-touch-icon.png,
icon-192.png, icon-512.png, icon-maskable-512.png   icons
og-image.jpg          picture shown when the link is shared (WhatsApp, Facebook…)
```
Install / app settings, the "page not found" page, robots.txt and sitemap.xml are in the main folder.

## Audio clips (no spoilers)
During a round the game plays a short audio clip, not YouTube — YouTube's player shows the
video title in phone notifications / the lock screen / Chrome's media button, which gives the answer away.
The YouTube video is only loaded after the round, for the reveal.

- Clips live in `clips/` and are named by YouTube video ID: `clips/WevtBmOU5qY.mp3`
- A song with no clip still works — it falls back to YouTube (with the title leak).
  Test mode (`?test=N`) shows 🎵 مقطع or ⚠️ يوتيوب so you can see which songs still need a clip.

Making the clips (`sharatalbidaya/tools/make_clips.py`, run it from inside the `sharatalbidaya` folder):
1. Install ffmpeg once (Windows PowerShell: `winget install ffmpeg`, then reopen PowerShell).
2. Put each intro's full audio/video in `tools/source/`, named by its sheet number: `0.mp3`, `22.m4a` …
3. Run `python tools/make_clips.py` from the project folder → it writes 10-second clips into `clips/`,
   starting at each song's `start` time, with titles stripped from the files.
4. Upload the `clips` folder. Do NOT upload `tools/source` (big files, not needed online).

## Moving to your own domain later
Run `python tools/set_domain.py yourdomain.com` in the main folder — it updates this game too.

## Settings (top of the script in index.html)
- `START_DATE` — the date of puzzle #1 (Cairo time).
- `CLIPS` — clip lengths per attempt.
- `--bg` (top of the CSS) — page background color.

## Testing songs
Add `?test=0` to the address. Use السابقة / التالية to go through every song.
Nothing is saved in test mode.

## Hosting
Works on GitHub Pages as-is. Open it through a server (GitHub Pages, VS Code Live Server),
not by double-clicking index.html.
