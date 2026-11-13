#!/usr/bin/env python3
# SPDX-License-Identifier: GPL-3.0-only
# web/live -> one file, web/live.html: plantilla.html with the styles (estilos/) and the code (codigo/) joined in the order
# web/live/montaje.txt gives, the FM-1's Terminus font (from editor.html) and the mock's data (tools/live_dump.py,
# build/live-mock.json) inside, so it runs offline from the tablet's or the phone's downloads.
#   python3 tools/live_build.py [out]      (default: web/live.html)
#   python3 tools/live_build.py --site DIR (a folder to host, as on Vercel: index.html, and the same page as
#                                          clipper-live.html for its download button)
import base64
import gzip
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
src = ROOT / "web" / "live"
font = re.search(r'/\*SLOOP-FONT\*/url\((data:font/ttf;base64,[A-Za-z0-9+/=]+)\)', (ROOT / "web" / "editor.html").read_text()).group(1)
mock = (ROOT / "build" / "live-mock.json").read_text().replace("</", "<\\/")
parts, sect = {"css": [], "js": []}, None                   # montaje.txt: [css], then [js], a file a line, # a note
for line in (src / "montaje.txt").read_text().splitlines():
    line = line.split("#", 1)[0].strip()
    if line in ("[css]", "[js]"):
        sect = line[1:-1]
    elif line:
        assert sect and (src / line).is_file(), f"montaje.txt: {line}"
        parts[sect].append((src / line).read_text())
css = "".join(parts["css"]).replace("__FONT__", font)
js = "".join(parts["js"])
html = (src / "plantilla.html").read_text()
for k, v in (("__CSS__", css), ("__MOCK__", mock), ("__JS__", js)):
    assert html.count(k) == 1, k
    html = html.replace(k, v)
if len(sys.argv) > 2 and sys.argv[1] == "--site":
    site = Path(sys.argv[2])
    site.mkdir(parents=True, exist_ok=True)
    (site / "index.html").write_text(html)
    (site / "clipper-live.html").write_text(html)
    print(f"{site}: index.html, clipper-live.html ({len(html) // 1024} KiB)")
    sys.exit(0)
out = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "web" / "live.html"
out.write_text(html)
print(f"{out}: {len(html) // 1024} KiB")
