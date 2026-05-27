const crypto = require("crypto");
const taxonomy = require("./assets/js/site-taxonomy.js");
const markdownIt = require("markdown-it");

const INLINE_SCRIPT_RE = /<script(?![^>]*\bsrc=)([^>]*)>([\s\S]*?)<\/script>/g;

/** @type {import("@11ty/eleventy").UserConfig} */
module.exports = async function (eleventyConfig) {
  // ── Plugins ─────────────────────────────────────────────────────
  // eleventy-plugin-rss is ESM-only since v3; load via dynamic import from this CJS config.
  const { default: pluginRss } = await import("@11ty/eleventy-plugin-rss");
  eleventyConfig.addPlugin(pluginRss);

  // ── CSP hash injection ──────────────────────────────────────────
  // Scan every rendered page for inline <script> blocks (JSON-LD), hash them,
  // and replace 'unsafe-inline' in the CSP script-src with per-page sha256 allowlist.
  // style-src keeps 'unsafe-inline' (the BMAC widget injects inline styles).
  eleventyConfig.addTransform("cspScriptHashes", function (content, outputPath) {
    if (!outputPath || !outputPath.endsWith(".html")) return content;

    const hashes = new Set();
    INLINE_SCRIPT_RE.lastIndex = 0;
    let match;
    while ((match = INLINE_SCRIPT_RE.exec(content)) !== null) {
      const body = match[2];
      const hash = crypto.createHash("sha256").update(body).digest("base64");
      hashes.add(`'sha256-${hash}'`);
    }

    if (!hashes.size) return content;
    const hashList = [...hashes].join(" ");
    return content.replace(
      "script-src 'self' 'unsafe-inline' https://cdnjs.buymeacoffee.com https://gc.zgo.at",
      `script-src 'self' ${hashList} https://cdnjs.buymeacoffee.com https://gc.zgo.at`,
    );
  });

  // ── Passthrough copy ──────────────────────────────────────────────
  // Assets served as-is — 11ty never processes JS, CSS, or data files
  eleventyConfig.addPassthroughCopy("assets");
  eleventyConfig.addWatchTarget("assets/data");

  // Presentation slides (rendered by Quarto, passed through as-is)
  eleventyConfig.addPassthroughCopy("althjodastofnun");
  eleventyConfig.addPassthroughCopy("althjodamalastofnun");

  // CNAME for GitHub Pages custom domain
  eleventyConfig.addPassthroughCopy("CNAME");
  eleventyConfig.addPassthroughCopy("robots.txt");

  // ── Icelandic slug filter ─────────────────────────────────────────
  // Mirrors Python's icelandic_slugify() in src/esbvaktin/utils/slugify.py.
  // Icelandic-specific replacements first, then NFKD decomposition for
  // non-Icelandic diacritics (e.g. Croatian č→c, French ü→u).
  eleventyConfig.addFilter("isSlug", (str) => {
    if (!str) return "";
    return str
      .replace(/[þÞ]/g, "th")
      .replace(/[ðÐ]/g, "d")
      .replace(/[æÆ]/g, "ae")
      .replace(/[öÖ]/g, "o")
      .replace(/[áÁà]/g, "a")
      .replace(/[éÉè]/g, "e")
      .replace(/[íÍì]/g, "i")
      .replace(/[óÓò]/g, "o")
      .replace(/[úÚù]/g, "u")
      .replace(/[ýÝỳ]/g, "y")
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
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
      "janúar",
      "febrúar",
      "mars",
      "apríl",
      "maí",
      "júní",
      "júlí",
      "ágúst",
      "september",
      "október",
      "nóvember",
      "desember",
    ];
    return `${d.getUTCDate()}. ${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
  };

  eleventyConfig.addFilter("isDate", formatIsDate);

  const MONTHS_SHORT = [
    "jan",
    "feb",
    "mar",
    "apr",
    "maí",
    "jún",
    "júl",
    "ágú",
    "sep",
    "okt",
    "nóv",
    "des",
  ];

  eleventyConfig.addFilter("isMonthShort", (date) => {
    if (!date) return "";
    return MONTHS_SHORT[new Date(date).getUTCMonth()];
  });

  eleventyConfig.addFilter("isDayOfMonth", (date) => {
    if (!date) return "";
    return new Date(date).getUTCDate();
  });

  eleventyConfig.addFilter("isDateToMs", (date) => {
    if (!date) return 0;
    return new Date(date).getTime();
  });

  eleventyConfig.addFilter("isMonth1", (date) => {
    if (!date) return 0;
    return new Date(date).getUTCMonth() + 1;
  });

  eleventyConfig.addFilter("isDateRange", (start, end) => {
    if (!start && !end) return "";
    if (!start) return formatIsDate(end);
    if (!end) return formatIsDate(start);

    const from = new Date(start);
    const to = new Date(end);
    const sameYear = from.getUTCFullYear() === to.getUTCFullYear();
    const sameMonth = sameYear && from.getUTCMonth() === to.getUTCMonth();
    const months = [
      "janúar",
      "febrúar",
      "mars",
      "apríl",
      "maí",
      "júní",
      "júlí",
      "ágúst",
      "september",
      "október",
      "nóvember",
      "desember",
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
  eleventyConfig.addFilter("verdictLabel", (v, epistemicType) =>
    taxonomy.verdictLabel(v, epistemicType),
  );
  eleventyConfig.addFilter("verdictDescription", (v, epistemicType) => {
    return taxonomy.verdictDescription
      ? taxonomy.verdictDescription(v, epistemicType)
      : v;
  });
  eleventyConfig.addFilter(
    "epistemicTypeLabel",
    (v) => taxonomy.epistemicTypeLabels[v] || v,
  );
  eleventyConfig.addFilter(
    "epistemicTypeDescription",
    (v) => taxonomy.epistemicTypeDescriptions[v] || v,
  );

  // ── Category label filter ─────────────────────────────────────────
  eleventyConfig.addFilter(
    "categoryLabel",
    (c) => taxonomy.categoryLabels[c] || c,
  );
  eleventyConfig.addFilter(
    "topicLabel",
    (c) => taxonomy.categoryLabels[c] || c,
  );

  // ── Source type label filter ─────────────────────────────────────
  eleventyConfig.addFilter(
    "sourceTypeLabel",
    (s) => taxonomy.evidenceSourceTypeLabels[s] || s,
  );

  // ── Domain label filter ─────────────────────────────────────────
  eleventyConfig.addFilter("domainLabel", (d) => taxonomy.domainLabels[d] || d);
  eleventyConfig.addFilter(
    "confidenceLabel",
    (c) => taxonomy.confidenceLabels[c] || c,
  );
  eleventyConfig.addFilter(
    "entityTypeLabel",
    (t) => taxonomy.entityTypeLabels[t] || t,
  );
  eleventyConfig.addFilter(
    "attributionLabel",
    (a) => taxonomy.attributionLabels[a] || a,
  );

  // ── Source domain → display name + CSS class ───────────────────
  // Map lives in assets/js/site-taxonomy.js so the Eleventy filter and client JS share one definition.
  eleventyConfig.addFilter("sourceName", (domain) =>
    taxonomy.sourceName(domain),
  );
  eleventyConfig.addFilter("sourceClass", (domain) =>
    taxonomy.sourceClass(domain),
  );

  // ── Number formatting ───────────────────────────────────────────
  eleventyConfig.addFilter("localeString", (n) => {
    if (n == null) return "";
    return Number(n).toLocaleString("is-IS");
  });

  // ── Party CSS class filter ────────────────────────────────────────
  eleventyConfig.addFilter(
    "partyClass",
    (p) => taxonomy.partyClasses[p] || "party-other",
  );

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
      (_, id) =>
        `<a href="/heimildir/${id.toLowerCase()}/" class="evidence-link" data-evidence-id="${id}">${id}</a>`,
    );
  });

  // Convert plain-text evidence IDs (e.g. HOUS-DATA-006) to hoverable links
  eleventyConfig.addFilter("evidenceLinksFromText", (text) => {
    if (!text) return text;
    return text.replace(
      /\b([A-Z]+-[A-Z]+-\d+)\b/g,
      (_, id) =>
        `<a href="/heimildir/${id.toLowerCase()}/" class="evidence-link" data-evidence-id="${id}">${id}</a>`,
    );
  });

  // ── Markdown rendering filter ─────────────────────────────────────
  const md = markdownIt({ html: true, linkify: true });
  eleventyConfig.addFilter("markdown", (str) => {
    if (!str) return "";
    return md.render(str);
  });

  // ── Date string → RFC 3339 (for Atom feed) ─────────────────────
  eleventyConfig.addFilter("toRfc3339", (str) => {
    if (!str) return "";
    return new Date(str).toISOString();
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
