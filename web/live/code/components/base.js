/* ------------------------------------------------------------------ bento --- */
/* The folders, EDITAR and RÁPIDO as a bento grid (12 columns), not the device's pages of four: a page with a graph is a
   large module and the graph is the control (drag it), with what it draws under it; every other parameter is a tile of
   its own, sized by what it is (a switch small, a choice of up to four as its options, a value as a fader you slide
   sideways). A parameter keeps the colour of the knob that turns it on its page; its page's name is in its corner. */
const GRAPH = { ENV: "env", "ENV 2": "env", LFO: "lfo", "LFO 2": "lfo", "LFO 3": "lfo", FILTER: "filt", FX: "meters", MACROS: "meters",
  HOME: "arcs", DLY: "echo", REVERB: "verb", "EQ+COMP": "eq" };
/* what each graph draws (its page's knobs, by position): those are its readouts; the rest of the page, tiles */
const GUSE = { env: [0, 1, 2, 3], lfo: [0, 1, 2], filt: [0], meters: [0, 1, 2, 3], arcs: [0, 1, 2, 3], echo: [0, 1, 2, 3], verb: [1, 2, 3], eq: [0, 1, 2] };
const live = (ids) => ids.map((id, k) => ({ id, k })).filter((x) => x.id < 127);
const isOnOff = (d) => d && (d.fmt === F.ONOFF || (d.fmt === F.ENUM && d.names.length === 2 && d.names[0] === "OFF"));
const isEnum = (d) => d && d.fmt === F.ENUM;
const ff = (s, id) => (desc(s, id) ? frac(desc(s, id), val(s, id)) : 0);

