"use strict";
/* Clipper Live: the tablet beside the FM-1. Talks to it over Web MIDI with the editor's protocol (v15: PAGE, FAVS,
   LIST; web/EDITOR_PROTOCOL.md), or to a mock with the device's own descriptors (?mock=1, data from tools/live_dump.py).
   One request in flight at a time (Link, as the editor's); the device pushes CHANGED / RELOAD / PAGE / FAVS_CHANGED. */

/* ------------------------------------------------------------------ basics --- */
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const KC = ["var(--k1)", "var(--k2)", "var(--k3)", "var(--k4)"], KH = ["#287cff", "#1ecc70", "#ffc618", "#ff621a"];
const STUDIO_URL = "clipper-editor-1.3.1.html";      /* the classic editor, next to this file in the tablet's downloads */
const QS = new URLSearchParams(location.search);
const store = { get(k) { try { return JSON.parse(localStorage.getItem("clipperlive:" + k)); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem("clipperlive:" + k, JSON.stringify(v)); } catch (e) { /* private mode: no cache */ } } };

/* formats, as editor.html fmtValue (firmware params.c F_*) */
const F = { INT: 0, PCT: 1, BIPCT: 2, TIME: 3, LFOHZ: 4, CUTOFF: 5, DB: 6, SEMI: 7, ENUM: 8, BPM: 9, NOTE: 10, ONOFF: 11, OCT: 12, STEPS: 13,
  SWING: 14, FILT: 15, CDB: 16, SPLIT: 17 };
const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
function fmtValue(d, v) {
  if (d.txt) return d.txt(v);                          /* (a value with its own reading: the HYBRID patch's) */
  const sign = (x) => (x > 0 ? "+" + x : String(x));
  switch (d.fmt) {
    case F.PCT: return [String(d.max > 0 ? Math.trunc((v * 100 + Math.trunc(d.max / 2)) / d.max) : v), "%"];
    case F.SWING: return [String(Math.max(0, Math.min(100, v))), ""];
    case F.CDB: return [sign(v - Math.trunc((d.min + d.max) / 2)), "dB"];
    case F.SPLIT: { const n = Math.max(0, v - 4); return [NOTE_NAMES[n % 12] + (Math.trunc(n / 12) - 1), ""]; }
    case F.FILT: return !v ? ["OFF", ""] : v < 0 ? ["LP" + Math.trunc((-v * 100 + 32) / 64), "%"] : ["HP" + Math.trunc((v * 100 + 31) / 63), "%"];
    case F.BIPCT: return [sign(Math.trunc(v * 100 / 64)), "%"];
    case F.TIME: {
      const ms10 = Math.round(10 * Math.pow(10000, (v & 127) / 127));
      if (ms10 < 100) return [(ms10 / 10).toFixed(1), "ms"];
      if (ms10 < 10000) return [String(Math.round(ms10 / 10)), "ms"];
      return [(ms10 / 10000).toFixed(2), "s"];
    }
    case F.LFOHZ: { const h = 0.05 * Math.pow(800, (v & 127) / 127); return [h < 10 ? h.toFixed(2) : h.toFixed(1), "Hz"]; }
    case F.CUTOFF: { const h = 30 * Math.pow(16000 / 30, (v & 127) / 127); return h < 1000 ? [String(Math.round(h)), "Hz"] : [(h / 1000).toFixed(1), "kHz"]; }
    case F.DB: return v <= 0 ? ["OFF", ""] : [((v - 112) / 2).toFixed(1), "dB"];
    case F.SEMI: return [sign(v), "st"];
    case F.ENUM: return [d.names[v - d.min] ?? String(v), d.unit || ""];
    case F.BPM: return [String(v), "BPM"];
    case F.NOTE: return [NOTE_NAMES[((v % 12) + 12) % 12], ""];
    case F.ONOFF: return [v ? "ON" : "OFF", ""];
    case F.STEPS: return [String(v), "STEP"];
    default: return [d.names && d.names[v - d.min] != null ? d.names[v - d.min] : String(v), d.unit || ""];
  }
}

