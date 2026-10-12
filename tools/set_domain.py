"""Move «يلا دورك» to your own domain in one step.

    python tools/set_domain.py yalladorak.com

- replaces the current full address (https://islam-salem.github.io) in every page,
  sitemap and robots file (link previews, Google, canonical links)
- writes the CNAME file GitHub Pages needs for a custom domain

Then: repo Settings → Pages → Custom domain → type the same domain → Save → tick "Enforce HTTPS".
Run it from the repo's main folder. Running it again with another domain works too.
"""
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CNAME = os.path.join(ROOT, "CNAME")
TEXT = (".html", ".xml", ".txt", ".js", ".webmanifest")
SKIP_DIRS = {".git", "data", "clips", "scraper", "tools", "node_modules"}


def current_base():
    if os.path.exists(CNAME):
        return "https://" + open(CNAME, encoding="utf-8").read().strip()
    return "https://islam-salem.github.io"


def main():
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    domain = re.sub(r"^https?://", "", sys.argv[1]).strip("/").lower()
    if "." not in domain or "/" in domain:
        sys.exit("Give just the domain, for example: yalladorak.com")
    old, new = current_base(), "https://" + domain
    changed = 0
    for folder, dirs, files in os.walk(ROOT):
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
        for name in files:
            if not name.endswith(TEXT):
                continue
            path = os.path.join(folder, name)
            text = open(path, encoding="utf-8").read()
            if old in text:
                open(path, "w", encoding="utf-8").write(text.replace(old, new))
                changed += 1
                print("updated", os.path.relpath(path, ROOT))
    open(CNAME, "w", encoding="utf-8").write(domain + "\n")
    print(f"\n{changed} files now use {new}  —  CNAME written.")
    print("Upload the changed files + CNAME, then set the same domain in Settings → Pages.")


if __name__ == "__main__":
    main()
