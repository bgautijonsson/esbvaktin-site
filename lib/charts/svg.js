"use strict";

// Dependency-free SVG/chart helpers for build-time chart shortcodes.
// All colour comes from CSS classes (mapped to design tokens in assets/css/charts.css),
// never hard-coded hex — so light/dark theming works with zero JavaScript.

let _uid = 0;
const uid = (prefix) => `${prefix}-${++_uid}`;

const esc = (s) =>
  String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

// Icelandic number formatting (1.234,5). Node ships full ICU.
const fmt = (n) => Number(n).toLocaleString("is-IS");

// Linear scale: maps a value in [d0,d1] onto [r0,r1].
const scale = (d0, d1, r0, r1) => (v) =>
  d1 === d0 ? r0 : r0 + ((v - d0) / (d1 - d0)) * (r1 - r0);

// "Nice" rounded tick values covering [0, max], at most `count` ticks.
function niceTicks(max, count = 4) {
  if (max <= 0) return [0];
  const rawStep = max / count;
  const mag = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const norm = rawStep / mag;
  const niceStep = (norm >= 5 ? 10 : norm >= 2.5 ? 5 : norm >= 2 ? 2 : 1) * mag;
  const ticks = [];
  let t = 0;
  while (t < max) {
    ticks.push(Math.round(t * 1000) / 1000);
    t += niceStep;
  }
  ticks.push(Math.round(t * 1000) / 1000); // first tick >= max, so bars never overflow
  return ticks;
}

// Largest-remainder (Hamilton) apportionment of `total` cells across parts,
// preserving each part's share and summing exactly to `total`.
function apportion(parts, total) {
  const sum = parts.reduce((a, p) => a + p.value, 0);
  if (sum <= 0) return parts.map((p) => ({ ...p, cells: 0 }));
  const raw = parts.map((p) => ({ ...p, exact: (p.value / sum) * total }));
  const floored = raw.map((p) => ({ ...p, cells: Math.floor(p.exact) }));
  let remaining = total - floored.reduce((a, p) => a + p.cells, 0);
  floored
    .map((p, i) => ({ i, frac: raw[i].exact - Math.floor(raw[i].exact) }))
    .sort((a, b) => b.frac - a.frac)
    .forEach(({ i }) => {
      if (remaining > 0) {
        floored[i].cells += 1;
        remaining -= 1;
      }
    });
  return floored;
}

const pct = (part, whole) => (whole ? (part / whole) * 100 : 0);
const round1 = (n) => Math.round(n * 10) / 10;

// Accessible <figure> wrapper: titled/described SVG + visible caption + a
// visually-hidden data <table> fallback for screen readers and no-CSS contexts.
function figure({ cls = "", viewBox, title, desc, inner, caption, table }) {
  const id = uid("chart");
  return `<figure class="chart-figure ${cls}">
  <svg class="chart-svg" viewBox="${viewBox}" role="img" aria-labelledby="${id}-t ${id}-d" preserveAspectRatio="xMidYMid meet" focusable="false">
    <title id="${id}-t">${esc(title)}</title>
    <desc id="${id}-d">${esc(desc)}</desc>
    ${inner}
  </svg>
  ${caption ? `<figcaption class="chart-cap">${caption}</figcaption>` : ""}
  ${table ? `<table class="visually-hidden">${table}</table>` : ""}
</figure>`;
}

module.exports = { uid, esc, fmt, scale, niceTicks, apportion, pct, round1, figure };
