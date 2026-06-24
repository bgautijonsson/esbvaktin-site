"use strict";

// Build-time data source for the chart shortcodes. Reads the exported JSON in
// assets/data/ and exposes ready-to-render slices as `charts.*` in templates.
// Heavy lifting (summing verdicts, picking top recurring claims) happens once
// here, so templates pass small objects to the shortcodes.

const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "assets", "data");
const load = (name) => JSON.parse(fs.readFileSync(path.join(DATA_DIR, name), "utf8"));

module.exports = function () {
  const topics = load("topics.json");
  const timeline = load("weekly_timeline.json");
  const claims = load("claims.json");

  // Global verdict totals across all published claims (summed from topics).
  const verdictTotals = {};
  topics.forEach((t) => {
    Object.entries(t.verdict_counts || {}).forEach(([v, c]) => {
      verdictTotals[v] = (verdictTotals[v] || 0) + c;
    });
  });

  // Most-repeated claims (top 8 by sighting count) — only the fields the row needs.
  const recurringClaims = claims
    .slice()
    .sort((a, b) => (b.sighting_count || 0) - (a.sighting_count || 0))
    .slice(0, 8)
    .map((c) => ({
      canonical_text_is: c.canonical_text_is,
      category: c.category,
      verdict: c.verdict,
      epistemic_type: c.epistemic_type,
      sighting_count: c.sighting_count,
    }));

  return { timeline, topics, verdictTotals, recurringClaims };
};
