#!/usr/bin/env python3
# SPDX-License-Identifier: GPL-3.0-only
# web/live/{live.html, live.css, live.js} -> one file, web/live.html: the FM-1's Terminus font (from editor.html) and the
# mock's data (tools/live_dump.py, build/live-mock.json) inside, so it runs offline from the tablet's downloads.
#   python3 tools/live_build.py [out]      (default: web/live.html)
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
src = ROOT / "web" / "live"
font = re.search(r'/\*SLOOP-FONT\*/url\((data:font/ttf;base64,[A-Za-z0-9+/=]+)\)', (ROOT / "web" / "editor.html").read_text()).group(1)
mock = (ROOT / "build" / "live-mock.json").read_text().replace("</", "<\\/")
css = (src / "live.css").read_text().replace("__FONT__", font)
js = (src / "live.js").read_text()
html = (src / "live.html").read_text()
for k, v in (("__CSS__", css), ("__MOCK__", mock), ("__JS__", js)):
    assert html.count(k) == 1, k
    html = html.replace(k, v)
out = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "web" / "live.html"
out.write_text(html)
print(f"{out}: {len(html) // 1024} KiB")
