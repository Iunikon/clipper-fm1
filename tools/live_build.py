#!/usr/bin/env python3
# SPDX-License-Identifier: GPL-3.0-only
# web/live -> one file, web/live.html: template.html with the styles (styles/) and the code (code/) joined in the order
# web/live/build-order.txt gives, the FM-1's Terminus font (from editor.html) and the mock's data (tools/live_dump.py,
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


def subset_font(uri, text):
    """The Terminus with only what Live can show: ASCII, Latin-1 (names typed here, Spanish) and every other character
    the sources hold (arrows, the minus, the dashes...). 453 glyphs -> ~220, about half the bytes. Needs fontTools
    (pip install fonttools); without it the whole font goes in, as before."""
    try:
        from fontTools import subset
        from fontTools.ttLib import TTFont
    except ImportError:
        print("live_build: fontTools not installed: the whole Terminus goes in (pip install fonttools for the subset)")
        return uri
    import io
    f = TTFont(io.BytesIO(base64.b64decode(uri.split(",", 1)[1])))
    keep = set(range(0x20, 0x7F)) | set(range(0xA0, 0x100)) | {ord(c) for c in text if ord(c) > 0x7E}
    opt = subset.Options()
    opt.notdef_outline = True
    opt.name_IDs = ["*"]
    opt.layout_features = []
    sub = subset.Subsetter(opt)
    sub.populate(unicodes=sorted(keep))
    sub.subset(f)
    out = io.BytesIO()
    f.save(out)
    return "data:font/ttf;base64," + base64.b64encode(out.getvalue()).decode()
parts, sect = {"css": [], "js": []}, None                   # build-order.txt: [css], then [js], a file a line, # a note
for line in (src / "build-order.txt").read_text().splitlines():
    line = line.split("#", 1)[0].strip()
    if line in ("[css]", "[js]"):
        sect = line[1:-1]
    elif line:
        assert sect and (src / line).is_file(), f"build-order.txt: {line}"
        parts[sect].append((src / line).read_text())
js = "".join(parts["js"])
html = (src / "template.html").read_text()
font = subset_font(font, "".join(parts["css"]) + js + html + mock)
css = "".join(parts["css"]).replace("__FONT__", font)
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
