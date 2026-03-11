const taxonomy = require("./assets/js/site-taxonomy.js");

/** @type {import("@11ty/eleventy").UserConfig} */
module.exports = function (eleventyConfig) {
  // ── Passthrough copy ──────────────────────────────────────────────
  // Assets served as-is — 11ty never processes JS, CSS, or data files
  eleventyConfig.addPassthroughCopy("assets");
  eleventyConfig.addWatchTarget("assets/data");

  // CNAME for GitHub Pages custom domain
  eleventyConfig.addPassthroughCopy("CNAME");

  // ── Icelandic slug filter ─────────────────────────────────────────
  eleventyConfig.addFilter("isSlug", (str) => {
    if (!str) return "";
    return str
      .toLowerCase()
      .replace(/[áà]/g, "a")
      .replace(/[ðÐ]/g, "d")
      .replace(/[éè]/g, "e")
      .replace(/[íì]/g, "i")
      .replace(/[óò]/g, "o")
      .replace(/[úù]/g, "u")
      .replace(/[ýỳ]/g, "y")
      .replace(/[þÞ]/g, "th")
      .replace(/[æÆ]/g, "ae")
      .replace(/[öÖ]/g, "o")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  });

  // ── Date formatting ───────────────────────────────────────────────
  eleventyConfig.addFilter("isoDate", (date) => {
    if (!date) return "";
    return new Date(date).toISOString().slice(0, 10);
  });

  eleventyConfig.addFilter("isDate", (date) => {
    if (!date) return "";
    const d = new Date(date);
    const months = [
      "janúar", "febrúar", "mars", "apríl", "maí", "júní",
      "júlí", "ágúst", "september", "október", "nóvember", "desember",
    ];
    return `${d.getUTCDate()}. ${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
  });

  // ── Verdict label filter ──────────────────────────────────────────
  eleventyConfig.addFilter("verdictLabel", (v) => taxonomy.verdictLabels[v] || v);

  // ── Category label filter ─────────────────────────────────────────
  eleventyConfig.addFilter("categoryLabel", (c) => taxonomy.categoryLabels[c] || c);
  eleventyConfig.addFilter("topicLabel", (c) => taxonomy.categoryLabels[c] || c);

  // ── Source type label filter ─────────────────────────────────────
  eleventyConfig.addFilter("sourceTypeLabel", (s) => taxonomy.evidenceSourceTypeLabels[s] || s);

  // ── Domain label filter ─────────────────────────────────────────
  eleventyConfig.addFilter("domainLabel", (d) => taxonomy.domainLabels[d] || d);
  eleventyConfig.addFilter("confidenceLabel", (c) => taxonomy.confidenceLabels[c] || c);
  eleventyConfig.addFilter("entityTypeLabel", (t) => taxonomy.entityTypeLabels[t] || t);
  eleventyConfig.addFilter("attributionLabel", (a) => taxonomy.attributionLabels[a] || a);

  // ── Number formatting ───────────────────────────────────────────
  eleventyConfig.addFilter("localeString", (n) => {
    if (n == null) return "";
    return Number(n).toLocaleString("is-IS");
  });

  // ── Party CSS class filter ────────────────────────────────────────
  eleventyConfig.addFilter("partyClass", (p) => taxonomy.partyClasses[p] || "party-other");

  // ── Rewrite evidence links to internal /heimildir/ pages ─────────
  // Explanation HTML from the pipeline contains <a href="https://...">FISH-LEGAL-001</a>.
  // This filter rewrites those to point at /heimildir/fish-legal-001/ instead.
  eleventyConfig.addFilter("evidenceLinks", (html) => {
    if (!html) return html;
    return html.replace(
      /<a\s+href="[^"]*"[^>]*>([A-Z]+-[A-Z]+-\d+)<\/a>/g,
      (_, id) => `<a href="/heimildir/${id.toLowerCase()}/" class="evidence-link" title="${id}">${id}</a>`
    );
  });

  // ── Ignore files ─────────────────────────────────────────────────
  eleventyConfig.ignores.add("CLAUDE.md");
  eleventyConfig.ignores.add("AGENTS.md");
  eleventyConfig.ignores.add("**/CLAUDE.md");
  eleventyConfig.ignores.add("**/AGENTS.md");
  eleventyConfig.ignores.add(".claude/**");

  return {
    dir: {
      input: ".",
      output: "_site",
      includes: "_includes",
      data: "_data",
    },
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
  };
};
