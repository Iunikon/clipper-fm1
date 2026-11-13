/* ----------------------------------------------------------- the state --- */
/* M: what the FM-1 says. S: what this screen shows */
const M = { edited: false, link: null, info: null, pdesc: [], gdesc: [], xdesc: [], x: [], state: null, rec: 0, p: [], g: [], engine: 0, preset: 0, list: [], favs: [], favCur: -1, page: null, homeIds: [127, 127, 127, 127], mock: false };
const S = { folder: "LIVE", follow: true, hot: new Map() };
const FAM = { 0: "HOME", 1: "ENV", 2: "LFO", 3: "FX", 4: "SEL", 5: "EDIT", 6: "GLO", 7: "SAVE", 8: "ARP", 9: "SEQ" };
const NAV = [["LIVE", "play"], ["HOME", "home"], ["EDIT", "edit"], ["ENV", "env"], ["LFO", "lfo"], ["FX", "fx"], ["SEL", "sel"], ["ARP", "arp"], ["SEQ", "seq"], ["REC", "rec"], ["GLO", "glo"], ["SAVE", "save"], ["ESTUDIO", "studio"]];
const ICON = { HOME: "home", EDIT: "edit", ENV: "env", LFO: "lfo", FX: "fx", SEL: "sel", ARP: "arp", SEQ: "seq", GLO: "glo", SAVE: "save" };
const LAYOUT = JSON.parse($("mockdata").textContent).pages;     /* the device's pages (params.c PAGES), as the firmware lays them out */
/* FMX's own pages (params.c GR_FMX, ui_synth.c X_F*): the device shows them on FMX only, so a dump made on another engine
   has none; they go after EDIT 2, as on the device */
const FMXP = [["OP", [19, 20, 21, 22]], ["OP 2", [23, 24, 25, 26]], ["OP ENV", [27, 28, 29, 30]], ["ROUTE", [31, 32, 33, 34]], ["FMX", [35, 36, 37, 38]], ["STORE", [39, 40, 127, 127]]];
if (!LAYOUT.some((x) => x.title === "OP")) { const at = LAYOUT.findIndex((x) => x.title === "EDIT 2") + 1; LAYOUT.splice(at, 0, ...FMXP.map(([title, ids]) => ({ folder: "EDIT", title, scope: 3, ids, fmx: true }))); }
else LAYOUT.forEach((x) => { if (FMXP.some(([t]) => t === x.title)) x.fmx = true; });
const isFmx = () => M.info && M.info.engines[M.engine] === "FMX";
const pageOn = (x) => !x.fmx || isFmx();
const desc = (s, id) => (s === 4 ? hyDesc(id) : s === 3 ? M.xdesc[id] : s ? M.gdesc[id] : M.pdesc[id]);   /* (3: a synth page's X_*) */
const val = (s, id) => (s === 4 ? hyVal(id) : s === 3 ? M.x[id] : s ? M.g[id] : M.p[id]);
const keyOf = (s, id) => s + ":" + id;
const frac = (d, v) => (d && d.max > d.min ? (Math.max(d.min, Math.min(d.max, v)) - d.min) / (d.max - d.min) : 0);
const entryNow = () => (M.page && M.page.cur != null ? M.page.cur : M.list.findIndex((x) => x.e === M.engine && x.k === M.preset));

