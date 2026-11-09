#!/usr/bin/env python3
# SPDX-License-Identifier: GPL-3.0-only
# What web/live.html shows, read from the firmware as it is built (tests/live_sim.c, the real editor protocol on the
# host), as JSON for live.html's mock (?mock=1): INFO, every parameter's descriptor (an engine's eight for each
# engine), the list PRESETS walks, the pages of each family with what their knobs edit, HOME's four per engine, a DUMP.
#   python3 tools/live_dump.py build/host/edfz/live_sim > build/live-mock.json
import json
import subprocess
import sys

HDR = [0x7D, 0x46, 0x4C]
FAMS = {1: "ENV", 2: "LFO", 3: "FX", 4: "SEL", 5: "EDIT", 6: "GLO", 7: "SAVE", 8: "ARP", 9: "SEQ"}


class Sim:
    def __init__(self, exe):
        self.p = subprocess.Popen([exe], stdin=subprocess.PIPE, stdout=subprocess.PIPE, text=True, bufsize=1)

    def line(self, s):
        self.p.stdin.write(s + "\n")
        self.p.stdin.flush()

    def until_dot(self):
        while True:
            ln = self.p.stdout.readline()
            if not ln or ln.strip() == ".":
                return

    def req(self, cmd, args=()):
        self.line("S " + bytes(HDR + [cmd] + list(args)).hex())
        while True:
            ln = self.p.stdout.readline().strip()
            if ln.startswith("R"):
                b = bytes.fromhex(ln[1:].strip()) if len(ln) > 1 else b""
                if len(b) < 6 or b[4] != cmd:
                    raise SystemExit(f"no reply to cmd {cmd}")
                return Reader(list(b[5:-1]))

    def do(self, c):
        self.line(c)
        self.until_dot()


class Reader:
    def __init__(self, a):
        self.a, self.i = a, 0

    def b(self):
        v = self.a[self.i]
        self.i += 1
        return v

    def v(self):
        lo = self.b()
        return (lo | self.b() << 7) - 8192

    def s(self):
        out = ""
        while True:
            c = self.b()
            if not c:
                return out
            out += chr(c)

    def more(self):
        return self.i < len(self.a)


def desc(sim, scope, i):
    r = sim.req(5, [scope, i])
    o = {"fmt": 0, "min": 0, "max": 0, "def": 0, "label": "", "unit": "", "names": []}
    r.b(), r.b()
    o["fmt"], o["min"], o["max"], o["def"] = r.b(), r.v(), r.v(), r.v()
    o["label"], o["unit"] = r.s(), r.s()
    if o["fmt"] == 8:
        while r.more() and len(o["names"]) <= o["max"] - o["min"]:
            o["names"].append(r.s())
    return o


def page(sim):
    r = sim.req(97)
    o = {"home": r.b(), "fam": r.b(), "page": r.b(), "title": r.s(), "scope": r.b()}
    o["ids"] = [r.b() for _ in range(4)]
    o["homeIds"] = [r.b() for _ in range(4)]
    return o


def main():
    sim = Sim(sys.argv[1])
    r = sim.req(1)
    info = {"version": r.s(), "nengines": r.b(), "pcount": r.b(), "gcount": r.b(), "nstep": r.b(), "pe0": r.b()}
    info["engines"] = [r.s() for _ in range(info["nengines"])]
    info["ntrk"], info["proto"] = r.b(), r.b()
    out = {"info": info}
    lst = []
    while True:                                       # the list, 16 at a time
        st = len(lst)
        r = sim.req(102, [st & 127, st >> 7, 16])
        total = r.b() | r.b() << 7
        r.b(), r.b()
        for _ in range(r.b()):
            lst.append([r.b(), r.b(), r.s(), r.s()])
        if len(lst) >= total:
            break
    out["list"] = lst
    out["gdesc"] = [desc(sim, 1, i) for i in range(info["gcount"])]
    out["pdesc"] = [desc(sim, 0, i) for i in range(info["pcount"])]
    eng = {}
    home = {}
    for e in range(info["nengines"]):                 # each engine's eight, and its HOME four: its first sound loaded
        n = next((i for i, x in enumerate(lst) if x[0] == e), None)
        if n is None:
            continue
        sim.req(103, [n & 127, n >> 7])
        sim.do("U 3")
        eng[e] = [desc(sim, 0, info["pe0"] + k) for k in range(8)]
        home[e] = page(sim)["homeIds"]
    out["engineDesc"], out["homeIds"] = eng, home
    pages = []
    for f, name in FAMS.items():                      # each family's pages: its button pressed until they come round
        sim.do("H")
        seen = []
        for _ in range(24):
            sim.do(f"F {f}")
            pg = page(sim)
            if pg["title"] in seen:
                break
            seen.append(pg["title"])
            pages.append({"folder": name, "title": pg["title"], "scope": pg["scope"], "ids": pg["ids"]})
    out["pages"] = pages
    sim.do("H")
    sim.req(103, [0, 0])
    sim.do("U 3")
    r = sim.req(4)
    d = {"engine": r.b(), "preset": r.b()}
    d["p"] = [r.v() for _ in range(info["pcount"])]
    d["g"] = [r.v() for _ in range(info["gcount"])]
    out["dump"] = d
    json.dump(out, sys.stdout, separators=(",", ":"))


if __name__ == "__main__":
    main()
