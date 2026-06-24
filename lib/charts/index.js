"use strict";

// Build-time chart builders for esbvaktin.is. Each returns a self-contained,
// accessible <figure> string. Colour comes from CSS classes mapped to design
// tokens (assets/css/charts.css), so charts theme themselves in dark mode with
// no JavaScript. Registered as Nunjucks shortcodes via register().

const taxonomy = require("../../assets/js/site-taxonomy.js");
const { esc, fmt, scale, niceTicks, apportion, pct, round1, figure } = require("./svg");

// Ordinal "evidence ramp": well-supported → contested → unknowable.
const VERDICTS = ["supported", "partially_supported", "unsupported", "misleading", "unverifiable"];
const VCLASS = {
  supported: "v-supported",
  partially_supported: "v-partial",
  unsupported: "v-unsupported",
  misleading: "v-misleading",
  unverifiable: "v-unverifiable",
};
const vlabel = (v, etype) => taxonomy.verdictLabel(v, etype);
const clabel = (c) => taxonomy.categoryLabels[c] || c;

// ── tiny SVG element helpers ──────────────────────────────────────────
const r = (n) => Math.round(n * 100) / 100;
const T = (x, y, s, cls = "", anchor = "start", extra = "") =>
  `<text x="${r(x)}" y="${r(y)}" class="${cls}" text-anchor="${anchor}"${extra ? " " + extra : ""}>${esc(s)}</text>`;
const RECT = (x, y, w, h, cls = "", extra = "") =>
  `<rect x="${r(x)}" y="${r(y)}" width="${r(Math.max(0, w))}" height="${r(Math.max(0, h))}" class="${cls}"${extra ? " " + extra : ""}/>`;
const LINE = (x1, y1, x2, y2, cls = "") =>
  `<line x1="${r(x1)}" y1="${r(y1)}" x2="${r(x2)}" y2="${r(y2)}" class="${cls}"/>`;
const CIRC = (cx, cy, rad, cls = "") => `<circle cx="${r(cx)}" cy="${r(cy)}" r="${rad}" class="${cls}"/>`;
const head = (x, kicker, title) =>
  T(x, 24, kicker, "chart-kicker") + T(x, 50, title, "chart-title");
const parseWeek = (w) => Date.parse(w + "T00:00:00Z");

// ════════════════════════════════════════════════════════════════════
// #1 Discourse timeline — weekly sightings by publication date
// ════════════════════════════════════════════════════════════════════
function timeline(d) {
  const weeks = (d.weeks || []).slice().sort((a, b) => parseWeek(a.week) - parseWeek(b.week));
  if (!weeks.length) return "";
  const W = 760, H = 360;
  const m = { top: 70, right: 22, bottom: 40, left: 48 };
  const plotL = m.left, plotR = W - m.right, plotT = m.top, plotB = H - m.bottom;
  const first = parseWeek(d.first_week || weeks[0].week);
  const last = parseWeek(d.last_week || weeks[weeks.length - 1].week);
  const peak = d.peak || weeks.reduce((a, b) => (b.sightings > a.sightings ? b : a), weeks[0]);
  const ticks = niceTicks(peak.sightings, 4);
  const ymax = ticks[ticks.length - 1];
  const x = scale(first, last, plotL, plotR);
  const y = scale(0, ymax, plotB, plotT);

  // Split into runs broken by gaps > 14 days, for honest line/area breaks.
  const GAP = 15 * 864e5;
  const runs = [];
  let cur = [];
  weeks.forEach((w) => {
    const ms = parseWeek(w.week);
    if (cur.length && ms - parseWeek(cur[cur.length - 1].week) > GAP) {
      runs.push(cur);
      cur = [];
    }
    cur.push(w);
  });
  if (cur.length) runs.push(cur);

  let areas = "", lines = "";
  runs.forEach((run) => {
    const pts = run.map((w) => `${r(x(parseWeek(w.week)))},${r(y(w.sightings))}`);
    lines += `<path class="tl-line" d="M${pts.join(" L")}"/>`;
    if (run.length > 1) {
      const x0 = r(x(parseWeek(run[0].week))), x1 = r(x(parseWeek(run[run.length - 1].week)));
      areas += `<path class="tl-area" d="M${x0},${r(plotB)} L${pts.join(" L")} L${x1},${r(plotB)} Z"/>`;
    }
  });

  // y gridlines + labels
  let grid = "";
  ticks.forEach((t) => {
    grid += LINE(plotL, y(t), plotR, y(t), t === 0 ? "axis-base" : "grid");
    grid += T(plotL - 8, y(t) + 4, fmt(t), "axis-label num", "end");
  });

  // x axis: year marks
  const surge = parseWeek("2026-03-02");
  const quiet = RECT(plotL, plotT, x(surge) - plotL, plotB - plotT, "tl-quiet");
  let xaxis = "";
  [["2024", first], ["2025", parseWeek("2025-01-01")], ["2026", parseWeek("2026-01-01")]].forEach(([lab, ms]) => {
    const xx = Math.min(Math.max(x(ms), plotL), plotR);
    xaxis += T(xx, plotB + 20, lab, "axis-label", "middle");
  });

  // annotations
  const px = x(parseWeek(peak.week)), py = y(peak.sightings);
  const ax = px - 12, ay = plotT + 26;
  const ann =
    LINE(px - 3, py + 4, ax + 3, ay + 6, "leader") +
    CIRC(px, py, 3.2, "mark") +
    T(ax, ay, "7. mars 2026", "ann-strong", "end") +
    T(ax, ay + 15, `þingsályktunartillaga · ${fmt(peak.sightings)}`, "ann num", "end");
  const may = weeks.find((w) => w.week === "2026-05-25");
  let ann2 = "";
  if (may) {
    const mx = x(parseWeek(may.week)), my = y(may.sightings);
    ann2 = CIRC(mx, my, 3, "mark") + T(mx - 7, my - 6, `25. maí · ${fmt(may.sightings)}`, "ann num", "end");
  }
  const quietLabel = T((plotL + x(surge)) / 2, plotB - 12, "tvö ár af lágværri umræðu", "ann-muted", "middle");

  const total = d.total_sightings || weeks.reduce((a, w) => a + w.sightings, 0);
  const inner = quiet + grid + areas + lines + ann + ann2 + quietLabel + LINE(plotL, plotB, plotR, plotB, "axis-base") + xaxis +
    head(plotL, "Umfjöllun um ESB í tíma", "Tvö ár af kliði — svo veggur");

  const rows = weeks.map((w) => `<tr><td>${w.week}</td><td>${w.sightings}</td></tr>`).join("");
  const table = `<caption>Vikulegar skráningar eftir birtingardegi</caption><thead><tr><th>Vika</th><th>Skráningar</th></tr></thead><tbody>${rows}</tbody>`;

  return figure({
    cls: "chart-timeline",
    viewBox: `0 0 ${W} ${H}`,
    title: "Vikuleg umfjöllun um ESB eftir birtingardegi, apríl 2024 til júní 2026.",
    desc: `Línurit. Umfjöllun helst lágvær í tvö ár og margfaldast í ${fmt(peak.sightings)} skráningar vikuna 9. mars 2026 þegar ríkisstjórnin lagði fram þingsályktunartillögu um þjóðaratkvæðagreiðslu, með annarri bylgju í maí. Mælir umfjöllun, ekki almenningsálit.`,
    inner,
    caption: `Vikuleg umfjöllun eftir <strong>birtingardegi</strong> greina — fjöldi skráninga á viku. Mælir umfjöllun, ekki almenningsálit. Brot í línu = vikur án gagna.<br><span class="src">Heimild: ESBvaktin · ${fmt(total)} skráningar, ${fmt(d.distinct_outlets || 0)} miðlar</span>`,
    table,
  });
}

// ════════════════════════════════════════════════════════════════════
// #2 Verdict waffle — of every 100 statements
// ════════════════════════════════════════════════════════════════════
function waffle(totals) {
  const parts = VERDICTS.map((v) => ({ key: v, value: totals[v] || 0 }));
  const total = parts.reduce((a, p) => a + p.value, 0);
  if (!total) return "";
  const cells = apportion(parts, 100);
  const W = 760, H = 384;
  const cs = 26, gap = 5, gx0 = 40, gy0 = 92;

  // flatten to 100 ordered cells
  const order = [];
  cells.forEach((p) => { for (let i = 0; i < p.cells; i++) order.push(p.key); });
  let grid = "";
  order.forEach((v, idx) => {
    const c = idx % 10, row = Math.floor(idx / 10);
    grid += RECT(gx0 + c * (cs + gap), gy0 + row * (cs + gap), cs, cs, VCLASS[v], 'rx="2"');
  });

  // legend
  const lx = gx0 + 10 * cs + 9 * gap + 44;
  let legend = "";
  parts.forEach((p, i) => {
    const ly = gy0 + 6 + i * 56;
    legend +=
      RECT(lx, ly, 15, 15, VCLASS[p.key], 'rx="2"') +
      T(lx + 24, ly + 12, vlabel(p.key), "lg-label") +
      T(lx + 24, ly + 32, `${fmt(round1(pct(p.value, total)))}%`, "lg-pct num") +
      T(lx + 24 + 60, ly + 32, `· ${fmt(p.value)}`, "lg-n num t-muted");
  });

  const backed = round1(pct((totals.supported || 0) + (totals.partially_supported || 0), total));
  const inner = head(gx0, "Niðurstaða mats · allar staðhæfingar", "Af hverjum 100 staðhæfingum") + grid + legend;

  const table = `<caption>Niðurstaða mats á birtum staðhæfingum</caption><thead><tr><th>Niðurstaða</th><th>Hlutfall</th><th>Fjöldi</th></tr></thead><tbody>${
    parts.map((p) => `<tr><td>${esc(vlabel(p.key))}</td><td>${round1(pct(p.value, total))}%</td><td>${p.value}</td></tr>`).join("")
  }</tbody>`;

  return figure({
    cls: "chart-waffle",
    viewBox: `0 0 ${W} ${H}`,
    title: `Niðurstaða mats á ${fmt(total)} birtum staðhæfingum, sýnd sem 100 reitir.`,
    desc: `Reitarit með 100 reitum. Langstærsti hlutinn er að hluta staðfestur og staðfestur — saman ${fmt(backed)}% — og aðeins lítill hluti óstuddur, villandi eða óstaðfestanlegur. Umræðan er að mestu studd með fyrirvörum, ekki ósannindi.`,
    inner,
    caption: `Hver reitur ≈ 1% af ${fmt(total)} birtum staðhæfingum (námundað; hlutföll sýna réttu tölu). Staðfest og að hluta staðfest eru saman <strong>${fmt(backed)}%</strong> — umræðan er að mestu studd með fyrirvörum, ekki ósannindi.<br><span class="src">Heimild: ESBvaktin</span>`,
    table,
  });
}

// ════════════════════════════════════════════════════════════════════
// #3 Topic verdict small-multiple — same pattern across 14 topics
// ════════════════════════════════════════════════════════════════════
function topicGrid(topics) {
  const list = (topics || []).slice().sort((a, b) => b.published_claim_count - a.published_claim_count);
  if (!list.length) return "";
  const W = 760, H = 588;
  const marginX = 36, gutter = 28;
  const colW = (W - marginX * 2 - gutter) / 2;
  const startY = 116, rowH = 64, barH = 14;

  // legend
  let legend = "";
  let lx = marginX;
  VERDICTS.forEach((v) => {
    legend += RECT(lx, 70, 12, 12, VCLASS[v], 'rx="2"') + T(lx + 17, 80, vlabel(v), "lg-sm");
    lx += 17 + vlabel(v).length * 6.6 + 18;
  });

  let panels = "";
  list.forEach((t, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x0 = marginX + col * (colW + gutter);
    const yRow = startY + row * rowH;
    const n = t.published_claim_count || 0;
    panels += T(x0, yRow, t.label_is, "chart-cat") + T(x0 + colW, yRow, `n=${fmt(n)}`, "num t-muted", "end");
    let cx = x0;
    const by = yRow + 9;
    VERDICTS.forEach((v) => {
      const c = (t.verdict_counts && t.verdict_counts[v]) || 0;
      if (!c) return;
      const w = (c / n) * colW;
      panels += `<rect x="${r(cx)}" y="${r(by)}" width="${r(w)}" height="${barH}" class="seg ${VCLASS[v]}"><title>${esc(vlabel(v))}: ${c}</title></rect>`;
      cx += w;
    });
    panels += RECT(x0, by, colW, barH, "bar-frame");
  });

  // superlative: highest (unsupported+misleading) share among well-powered topics (n>=100)
  const big = list.filter((t) => (t.published_claim_count || 0) >= 100);
  const tailShare = (t) => pct(((t.verdict_counts.unsupported || 0) + (t.verdict_counts.misleading || 0)), t.published_claim_count);
  const lead = big.slice().sort((a, b) => tailShare(b) - tailShare(a))[0];

  const inner = head(marginX, "Úrskurður eftir málefni · öll 14", "Hvert málefni — sama mynstrið") + legend + panels;
  const table = `<caption>Úrskurðahlutfall eftir málefni</caption><thead><tr><th>Málefni</th><th>Fjöldi</th>${VERDICTS.map((v) => `<th>${esc(vlabel(v))}</th>`).join("")}</tr></thead><tbody>${
    list.map((t) => `<tr><td>${esc(t.label_is)}</td><td>${t.published_claim_count}</td>${VERDICTS.map((v) => `<td>${(t.verdict_counts && t.verdict_counts[v]) || 0}</td>`).join("")}</tr>`).join("")
  }</tbody>`;

  return figure({
    cls: "chart-topicgrid",
    viewBox: `0 0 ${W} ${H}`,
    title: "Úrskurðahlutfall fyrir öll 14 málefni, raðað eftir fjölda staðhæfinga.",
    desc: `Smárit með 14 láréttum stöplum. Að hluta staðfest er ríkjandi í öllum málefnum, með litla hala óstuddra og villandi staðhæfinga. ${lead ? `Hæst hlutfall meðal stærri mála er í málefninu ${lead.label_is}.` : ""}`,
    inner,
    caption: `Hver stöpull leggst saman í 100%. Að hluta staðfest er ríkjandi alls staðar.${lead ? ` Lengstan hala óstuddra/villandi meðal stærri mála (n≥100) hefur <strong>${esc(lead.label_is)}</strong> (${fmt(round1(tailShare(lead)))}%).` : ""}<br><span class="src">Heimild: ESBvaktin · birtar staðhæfingar</span>`,
    table,
  });
}

// ════════════════════════════════════════════════════════════════════
// #7 Evidence-coverage ratio — claims per curated evidence entry
// ════════════════════════════════════════════════════════════════════
function coverage(topics) {
  const all = (topics || []).map((t) => ({
    label: t.label_is,
    claims: t.published_claim_count || 0,
    evidence: t.evidence_count || 0,
    ratio: t.evidence_count ? (t.published_claim_count || 0) / t.evidence_count : null,
  }));
  const withEv = all.filter((t) => t.ratio != null).sort((a, b) => b.ratio - a.ratio);
  const noEv = all.filter((t) => t.ratio == null && t.claims > 0);
  const ordered = [...noEv, ...withEv];
  if (!ordered.length) return "";

  const W = 760, H = 524;
  const labelW = 132, barX0 = labelW + 24, barX1 = W - 24;
  const barAreaW = barX1 - barX0;
  const maxRatio = Math.max(...withEv.map((t) => t.ratio), 1);
  const xmax = Math.ceil(maxRatio / 2) * 2;
  const x = scale(0, xmax, barX0, barX1);
  const startY = 112, rowH = 26, barH = 15;

  // x gridlines
  let grid = "";
  for (let t = 0; t <= xmax; t += 2) {
    grid += LINE(x(t), startY - 6, x(t), startY + ordered.length * rowH, t === 0 ? "axis-base" : "grid");
    grid += T(x(t), startY + ordered.length * rowH + 16, fmt(t), "axis-label num", "middle");
  }

  let bars = "";
  ordered.forEach((t, i) => {
    const y = startY + i * rowH;
    bars += T(barX0 - 8, y + 11, t.label, "chart-cat", "end");
    if (t.ratio == null) {
      bars += RECT(barX0, y, barAreaW, barH, "cov-ghost", 'fill="url(#cov-hatch)"') +
        T(barX0 + 8, y + 11, `engin heimild · ${fmt(t.claims)}/0`, "num cov-ghost-label");
    } else {
      const w = x(t.ratio) - barX0;
      bars += RECT(barX0, y, w, barH, "mark-bar") +
        T(barX0 + w + 6, y + 11, `${fmt(round1(t.ratio))} · ${fmt(t.claims)}/${fmt(t.evidence)}`, "num t-muted");
    }
  });

  const defs = `<defs><pattern id="cov-hatch" width="6" height="6" patternTransform="rotate(45)" patternUnits="userSpaceOnUse"><line x1="0" y1="0" x2="0" y2="6" class="hatch-line"/></pattern></defs>`;
  const inner = defs + head(24, "Þekja · staðhæfingar á hverja heimild", "Hvar er stoðin sterk — og hvar þunn") + grid + bars;
  const table = `<caption>Staðhæfingar á hverja staðfesta heimild</caption><thead><tr><th>Málefni</th><th>Staðhæfingar</th><th>Heimildir</th><th>Hlutfall</th></tr></thead><tbody>${
    ordered.map((t) => `<tr><td>${esc(t.label)}</td><td>${t.claims}</td><td>${t.evidence}</td><td>${t.ratio == null ? "—" : round1(t.ratio)}</td></tr>`).join("")
  }</tbody>`;

  return figure({
    cls: "chart-coverage",
    viewBox: `0 0 ${W} ${H}`,
    title: "Fjöldi staðhæfinga á hverja staðfesta heimild, eftir málefni.",
    desc: "Lárétt súlurit. Lengstu súlur (þynnsta stoð) eru á stærstu, mest umdeildu málefnunum; þetta er þekjumæling, ekki dómur um áreiðanleika.",
    inner,
    caption: `Staðhæfingar á hverja staðfesta heimild — lengri súla merkir þynnri stoð, þar sem við metum af meiri varúð. Þetta er <strong>þekjumæling</strong>, ekki dómur um áreiðanleika.<br><span class="src">Heimild: ESBvaktin</span>`,
    table,
  });
}

// ════════════════════════════════════════════════════════════════════
// #4 Recurring claims — ranked rows (semantic HTML, not SVG)
// ════════════════════════════════════════════════════════════════════
function recurringClaims(claims, limit = 8) {
  const top = (claims || []).slice().sort((a, b) => (b.sighting_count || 0) - (a.sighting_count || 0)).slice(0, limit);
  if (!top.length) return "";
  const rows = top.map((c) => {
    const v = c.verdict, etype = c.epistemic_type;
    return `<li class="rc-row">
      <div class="rc-main">
        <span class="rc-kicker">${esc(clabel(c.category))}</span>
        <p class="rc-text">${esc(c.canonical_text_is)}</p>
      </div>
      <div class="rc-meta">
        <span class="rc-count num">${fmt(c.sighting_count)}</span>
        <span class="rc-count-label">birtingar</span>
        <span class="rc-stamp ${VCLASS[v]}">${esc(vlabel(v, etype))}</span>
      </div>
    </li>`;
  }).join("");
  return `<figure class="chart-figure chart-claims">
  <ol class="rc-list">${rows}</ol>
  <figcaption class="chart-cap">Mest endurteknu staðhæfingar — fjöldi birtinga í umfjöllun (ekki hve oft einn aðili sagði þær), með mati heimildanna sem stimpil.<br><span class="src">Heimild: ESBvaktin · ${fmt(top.length)} efstu</span></figcaption>
</figure>`;
}

// ── shortcode registration ────────────────────────────────────────────
function register(eleventyConfig) {
  eleventyConfig.addShortcode("chartTimeline", (d) => (d ? timeline(d) : ""));
  eleventyConfig.addShortcode("chartWaffle", (d) => (d ? waffle(d) : ""));
  eleventyConfig.addShortcode("chartTopicGrid", (d) => (d ? topicGrid(d) : ""));
  eleventyConfig.addShortcode("chartCoverage", (d) => (d ? coverage(d) : ""));
  eleventyConfig.addShortcode("chartRecurringClaims", (d) => (d ? recurringClaims(d) : ""));
}

module.exports = { register, timeline, waffle, topicGrid, coverage, recurringClaims };
