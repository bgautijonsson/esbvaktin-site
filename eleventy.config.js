const taxonomy = require("./assets/js/site-taxonomy.js");
const markdownIt = require("markdown-it");

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

  const formatIsDate = (date) => {
    if (!date) return "";
    const d = new Date(date);
    const months = [
      "janúar", "febrúar", "mars", "apríl", "maí", "júní",
      "júlí", "ágúst", "september", "október", "nóvember", "desember",
    ];
    return `${d.getUTCDate()}. ${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
  };

  eleventyConfig.addFilter("isDate", formatIsDate);

  eleventyConfig.addFilter("isDateRange", (start, end) => {
    if (!start && !end) return "";
    if (!start) return formatIsDate(end);
    if (!end) return formatIsDate(start);

    const from = new Date(start);
    const to = new Date(end);
    const sameYear = from.getUTCFullYear() === to.getUTCFullYear();
    const sameMonth = sameYear && from.getUTCMonth() === to.getUTCMonth();
    const months = [
      "janúar", "febrúar", "mars", "apríl", "maí", "júní",
      "júlí", "ágúst", "september", "október", "nóvember", "desember",
    ];

    if (sameMonth) {
      return `${from.getUTCDate()}.–${to.getUTCDate()}. ${months[to.getUTCMonth()]} ${to.getUTCFullYear()}`;
    }

    if (sameYear) {
      return `${from.getUTCDate()}. ${months[from.getUTCMonth()]} – ${to.getUTCDate()}. ${months[to.getUTCMonth()]} ${to.getUTCFullYear()}`;
    }

    return `${formatIsDate(start)} – ${formatIsDate(end)}`;
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

  // ── Source domain → display name + CSS class ───────────────────
  const sourceDomainMap = {
    "visir.is":    { name: "Vísir",        css: "source-visir" },
    "ruv.is":      { name: "RÚV",          css: "source-ruv" },
    "mbl.is":      { name: "Morgunblaðið", css: "source-mbl" },
    "heimildin.is":{ name: "Heimildin",    css: "source-heimildin" },
    "kjarninn.is": { name: "Kjarninn",     css: "source-kjarninn" },
    "stundin.is":  { name: "Stundin",      css: "source-stundin" },
    "frettabladid.is": { name: "Fréttablaðið", css: "source-frettabladid" },
    "althingi.is": { name: "Alþingi",      css: "source-althingi" },
  };
  eleventyConfig.addFilter("sourceName", (domain) => {
    const entry = sourceDomainMap[domain];
    return entry ? entry.name : domain;
  });
  eleventyConfig.addFilter("sourceClass", (domain) => {
    const entry = sourceDomainMap[domain];
    return entry ? entry.css : "source-other";
  });

  // ── Number formatting ───────────────────────────────────────────
  eleventyConfig.addFilter("localeString", (n) => {
    if (n == null) return "";
    return Number(n).toLocaleString("is-IS");
  });

  // ── Party CSS class filter ────────────────────────────────────────
  eleventyConfig.addFilter("partyClass", (p) => taxonomy.partyClasses[p] || "party-other");

  // ── Navigation state filter ───────────────────────────────────────
  eleventyConfig.addFilter("navCurrent", (pageUrl, item) => {
    if (!pageUrl || !item || !item.href) return false;
    if (item.match === "prefix") return pageUrl.startsWith(item.href);
    return pageUrl === item.href;
  });

  // ── Rewrite evidence links to internal /heimildir/ pages ─────────
  // Explanation HTML from the pipeline contains <a href="https://...">FISH-LEGAL-001</a>.
  // This filter rewrites those to point at /heimildir/fish-legal-001/ instead.
  eleventyConfig.addFilter("evidenceLinks", (html) => {
    if (!html) return html;
    return html.replace(
      /<a\s+href="[^"]*"[^>]*>([A-Z]+-[A-Z]+-\d+)<\/a>/g,
      (_, id) => `<a href="/heimildir/${id.toLowerCase()}/" class="evidence-link" data-evidence-id="${id}">${id}</a>`
    );
  });

  // ── Markdown rendering filter ─────────────────────────────────────
  const md = markdownIt({ html: true, linkify: true });
  eleventyConfig.addFilter("markdown", (str) => {
    if (!str) return "";
    return md.render(str);
  });

  // ── Ignore files ─────────────────────────────────────────────────
  eleventyConfig.ignores.add("CLAUDE.md");
  eleventyConfig.ignores.add("AGENTS.md");
  eleventyConfig.ignores.add("README.md");
  eleventyConfig.ignores.add("**/README.md");
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
