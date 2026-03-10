/** @type {import("@11ty/eleventy").UserConfig} */
module.exports = function (eleventyConfig) {
  // ── Passthrough copy ──────────────────────────────────────────────
  // Assets served as-is — 11ty never processes JS, CSS, or data files
  eleventyConfig.addPassthroughCopy("assets");

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
    return `${d.getDate()}. ${months[d.getMonth()]} ${d.getFullYear()}`;
  });

  // ── Verdict label filter ──────────────────────────────────────────
  const verdictLabels = {
    supported: "Staðfest",
    partially_supported: "Að hluta staðfest",
    unsupported: "Óstutt",
    misleading: "Villandi",
    unverifiable: "Ósannanlegt",
  };
  eleventyConfig.addFilter("verdictLabel", (v) => verdictLabels[v] || v);

  // ── Category label filter ─────────────────────────────────────────
  const categoryLabels = {
    fisheries: "Sjávarútvegur",
    trade: "Viðskipti",
    sovereignty: "Fullveldi",
    agriculture: "Landbúnaður",
    labour: "Vinnumarkaður",
    currency: "Gjaldmiðill",
    precedents: "Fordæmi",
    eea_eu_law: "EES/ESB-löggjöf",
    housing: "Húsnæðismál",
    polling: "Kannanir",
    party_positions: "Flokkastefnur",
    org_positions: "Samtakastefnur",
    energy: "Orkumál",
  };
  eleventyConfig.addFilter("categoryLabel", (c) => categoryLabels[c] || c);

  // ── Ignore files ─────────────────────────────────────────────────
  eleventyConfig.ignores.add("CLAUDE.md");

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
