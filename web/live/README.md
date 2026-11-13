# Clipper Live: the code

Clipper Live is written in many small files and shipped as **one**: `tools/live_build.py` joins them into `web/live.html`, with the Terminus font (only the glyphs Live uses, when fontTools is installed) and the example data inside. That single file is what gets downloaded, runs offline on the tablet and the phone, and goes up to Vercel.

```bash
python3 tools/live_build.py                        # -> web/live.html
python3 tools/live_build.py --site build/vercel    # the same, ready to publish
pip install fonttools                              # optional: the font subset (about 55 KiB less)
```

To see it without the synth, tap **See the demo** on the start screen, or open `web/live.html?mock=1&follow=0`.

## No framework, on purpose

Plain HTML, CSS and JavaScript, no dependencies and no bundler. The app has to open from a file on a tablet with no internet, next to the synth, and every byte of it ships in that file. The state is small (one sound, one page, one pattern), the UI redraws by view, and values are painted once a frame, so a framework would add weight and a build step without solving a problem the app has.

## The order: `build-order.txt`

`build-order.txt` says which files are joined and **in what order**. The order matters:

- **CSS:** what comes later wins (the cascade). That is why the screens (`screens/phone.css`, `screens/desktop.css`) and the review's adjustments go last.
- **Code:** everything ends up in one `<script>`. Functions can be used from any file, but what **runs as the page loads** (constants, `addEventListener`, `start.js`) needs what it uses to come before it.

A new file goes into `build-order.txt` in its place; if it is not there, it is not in the app.

## Where things are

```
web/live/
  template.html          the skeleton: bar, rails, nav, sheets, SVG icons (slots __CSS__ __MOCK__ __JS__)
  build-order.txt        the order styles and code are joined in
  styles/
    base.css             tokens (:root), the font, the basics
    frame/               bar, body and rails, nav (+ toasts and the sound list), connection, transport, set
    components/          LIVE's shortcuts, bento and tiles, blocks, special pages (matrix, layer, mod seq, tuning…), scenes
    views/               SAVE, SEQ (+ advanced), folders as on the synth, REC, LIVE, HOME, Studio
    sheets/              Save
    screens/             tablet, phone-base and phone (under 540 px tall: the phone's own layout), pc (≤1100),
                         desktop (with a mouse: a desk's density)
    motion.css           basic transitions
    interactions.css     micro-interactions (press, slide, bounce, the folder line)
    performance.css      content-visibility for long lists
    review.css           what the Impeccable reviews brought (EDIT, --danger, our own sheets, «No contesta»…)
  code/
    core/                base (store, formats), protocol (Link, the C commands), mock (the example FM-1),
                         state (M), connection, receive (what the FM-1 says), send, input (keys and taps)
    frame/               left rail (On the synth, Changes), toasts, scope, transport (PLAY / REC), set
    components/          graphs, cards (tileP), special pages, paint (once a frame), gestures (drag, fine, edges,
                         vibration), page graphs, double tap, scenes
    views/               paint (renderWork and the bar), SAVE, device, folders, REC, LIVE, HOME, quick
      seq/               steps, full (advanced), generate and MIDI, gestures
      studio/            tabs, samples, backup, system, HYBRID, library
    sheets/              sound list, Save, option list
    lang/english.js      English: DICT (phrases) and RX (patterns). The UI is written in Spanish; every new Spanish
                         text needs its entry here
    start.js             last: connect, the demo, ?mock=1, the first paint
  docs/                  DECISIONS (rules), CHANGELOG (history), PRODUCT (the rules, for reviewers), TESTING (with the FM-1),
                         BRIEF (the earlier version) and the Impeccable reports. In Spanish, the owner's language
  proposals/             the mock-ups compared before building
```

## Rules when touching the code

- **The build has to keep coming out right:** after moving or splitting files, run `python3 tools/live_build.py` and compare. A pure reorganization must give a **byte-identical** `web/live.html`.
- **No `100dvh` or `100vw` in CSS:** use `var(--vh)` and `var(--vw)`.
- **Looks go in `styles/`, logic in `code/`.** A new component usually has both: `styles/components/x.css` and `code/components/x.js`.
- **Comments and names in English;** the UI text in Spanish, with its English in `code/lang/english.js`.
- The design rules (colours, square, Terminus, orange, drag…) are in `docs/PRODUCT.md` and `docs/DECISIONS.md`.
