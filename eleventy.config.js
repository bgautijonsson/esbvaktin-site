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
    return `${d.getUTCDate()}. ${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
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

  // ── Source type label filter ─────────────────────────────────────
  const sourceTypeLabels = {
    official_statistics: "Opinber tölfræði",
    legal_text: "Lagalegur texti",
    academic_paper: "Fræðigrein",
    expert_analysis: "Sérfræðigreining",
    international_org: "Alþjóðastofnun",
    parliamentary_record: "Þingskjal",
  };
  eleventyConfig.addFilter("sourceTypeLabel", (s) => sourceTypeLabels[s] || s);

  // ── Domain label filter ─────────────────────────────────────────
  const domainLabels = {
    legal: "Lögfræðilegt",
    economic: "Efnahagslegt",
    political: "Stjórnmálalegt",
    precedent: "Fordæmi",
  };
  eleventyConfig.addFilter("domainLabel", (d) => domainLabels[d] || d);

  // ── Number formatting ───────────────────────────────────────────
  eleventyConfig.addFilter("localeString", (n) => {
    if (n == null) return "";
    return Number(n).toLocaleString("is-IS");
  });

  // ── Party CSS class filter ────────────────────────────────────────
  const partyClasses = {
    "Sjálfstæðisflokkur": "party-xd",
    "Samfylkingin": "party-s",
    "Framsóknarflokkur": "party-b",
    "Miðflokkurinn": "party-m",
    "Viðreisn": "party-c",
    "Vinstrihreyfingin - grænt framboð": "party-v",
    "Píratar": "party-p",
    "Flokkur fólksins": "party-f",
    "Hreyfingin": "party-hr",
  };
  eleventyConfig.addFilter("partyClass", (p) => partyClasses[p] || "party-other");

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
