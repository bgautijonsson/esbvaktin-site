/**
 * ESBvaktin Discourse Tracker — Client-side report browser
 *
 * Loads report listing from JSON and provides interactive filtering,
 * grouping, and sorting entirely in the browser.
 */

(function () {
  "use strict";

  // ── Configuration ────────────────────────────────────────────────
  const DATA_BASE = document.currentScript?.dataset.base || "/assets/data";
  const JSON_URL = `${DATA_BASE}/reports.json`;

  // Icelandic labels
  const VERDICT_LABELS = {
    supported: "Staðfest",
    partially_supported: "Að hluta",
    unsupported: "Óstutt",
    misleading: "Villandi",
    unverifiable: "Ósannanlegt",
  };

  const CATEGORY_LABELS = {
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

  const VERDICT_CLASSES = {
    supported: "verdict-supported",
    partially_supported: "verdict-partial",
    unsupported: "verdict-unsupported",
    misleading: "verdict-misleading",
    unverifiable: "verdict-unverifiable",
  };

  const SOURCE_CLASSES = {
    "Vísir": "source-visir",
    "RÚV": "source-ruv",
    "Morgunblaðið": "source-mbl",
    "Heimildin": "source-heimildin",
    "Kjarninn": "source-kjarninn",
    "Stundin": "source-stundin",
    "Fréttablaðið": "source-frettabladid",
  };

  const GROUP_LABELS = {
    "": "Engin flokkun",
    source: "Fjölmiðill",
    date: "Dagsetning",
    category: "Efnisflokkur",
  };

  // Icelandic month names for date formatting
  const IS_MONTHS = [
    "", "janúar", "febrúar", "mars", "apríl", "maí", "júní",
    "júlí", "ágúst", "september", "október", "nóvember", "desember",
  ];

  // ── State ────────────────────────────────────────────────────────
  let jsonData = null;

  let filters = {
    search: "",
    source: "",
    category: "",
    groupBy: "",
    sort: "article_date",
    sortDir: "DESC",
  };

  // ── DOM references ───────────────────────────────────────────────
  const root = document.getElementById("discourse-tracker");
  if (!root) return;

  // ── Initialisation ───────────────────────────────────────────────

  async function init() {
    renderSkeleton();

    const resp = await fetch(JSON_URL);
    if (!resp.ok) throw new Error(`Failed to fetch ${JSON_URL}: ${resp.status}`);
    jsonData = await resp.json();

    renderStats();
    renderResults();
    bindEvents();
  }

  // ── Query layer ──────────────────────────────────────────────────

  function queryReports() {
    let results = [...jsonData];

    if (filters.search) {
      const q = filters.search.toLowerCase();
      results = results.filter(
        (r) =>
          r.article_title?.toLowerCase().includes(q) ||
          r.summary?.toLowerCase().includes(q) ||
          r.article_author?.toLowerCase().includes(q)
      );
    }
    if (filters.source) {
      results = results.filter((r) => r.article_source === filters.source);
    }
    if (filters.category) {
      results = results.filter(
        (r) => r.dominant_category === filters.category || r.categories?.includes(filters.category)
      );
    }

    const sort = filters.sort || "article_date";
    const dir = filters.sortDir === "ASC" ? 1 : -1;
    results.sort((a, b) => {
      const va = a[sort] ?? "";
      const vb = b[sort] ?? "";
      if (typeof va === "number") return (va - vb) * dir;
      return String(va).localeCompare(String(vb), "is") * dir;
    });

    return results;
  }

  function groupReports(reports) {
    const groupBy = filters.groupBy;
    if (!groupBy) return [{ key: "", label: "", reports }];

    const groups = new Map();

    for (const r of reports) {
      let key;
      if (groupBy === "source") {
        key = r.article_source || "Óþekkt";
      } else if (groupBy === "date") {
        key = r.article_date || "Óþekkt";
      } else if (groupBy === "category") {
        key = r.dominant_category || "other";
      } else {
        key = "";
      }

      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(r);
    }

    return Array.from(groups.entries()).map(([key, items]) => {
      let label;
      if (groupBy === "source") {
        label = key;
      } else if (groupBy === "date") {
        label = formatIsDate(key);
      } else if (groupBy === "category") {
        label = CATEGORY_LABELS[key] || key;
      } else {
        label = key;
      }
      return { key, label, reports: items };
    });
  }

  function queryStats() {
    const data = jsonData || [];
    const sources = new Set(data.map((r) => r.article_source).filter(Boolean));
    const totalClaims = data.reduce((s, r) => s + (r.claim_count || 0), 0);
    return {
      total: data.length,
      sources: sources.size,
      totalClaims,
    };
  }

  // ── Rendering ────────────────────────────────────────────────────

  function renderSkeleton() {
    // Collect sources from data if available, otherwise show empty
    const sourceOptions = jsonData
      ? [...new Set(jsonData.map((r) => r.article_source).filter(Boolean))].sort((a, b) =>
          a.localeCompare(b, "is")
        )
      : [];

    const categoryOptions = jsonData
      ? [
          ...new Set(
            jsonData.flatMap((r) => r.categories || []).filter(Boolean)
          ),
        ].sort((a, b) =>
          (CATEGORY_LABELS[a] || a).localeCompare(CATEGORY_LABELS[b] || b, "is")
        )
      : [];

    root.innerHTML = `
      <div class="dt-stats" id="dt-stats">
        <div class="ct-stat-loading">Hle&eth; g&ouml;gnum&hellip;</div>
      </div>

      <div class="ct-controls">
        <div class="ct-search-wrap">
          <input type="search" id="dt-search" class="ct-search"
                 placeholder="Leita í greiningum…" autocomplete="off" />
        </div>
        <div class="ct-filter-row">
          <select id="dt-source" class="ct-select">
            <option value="">Allir fjölmiðlar</option>
            ${sourceOptions.map((s) => `<option value="${s}">${s}</option>`).join("")}
          </select>
          <select id="dt-category" class="ct-select">
            <option value="">Allir flokkar</option>
            ${categoryOptions.map((k) => `<option value="${k}">${CATEGORY_LABELS[k] || k}</option>`).join("")}
          </select>
          <select id="dt-group" class="ct-select">
            ${Object.entries(GROUP_LABELS)
              .map(([k, v]) => `<option value="${k}">${v}</option>`)
              .join("")}
          </select>
          <select id="dt-sort" class="ct-select">
            <option value="article_date">Dagsetning greinar</option>
            <option value="analysis_date">Dagsetning greiningar</option>
            <option value="claim_count">Fjöldi fullyrðinga</option>
            <option value="article_source">Fjölmiðill</option>
          </select>
        </div>
      </div>

      <div class="dt-results" id="dt-results">
        <div class="ct-loading">Hle&eth; greiningum&hellip;</div>
      </div>
    `;
  }

  function renderStats() {
    const stats = queryStats();
    const el = document.getElementById("dt-stats");
    el.innerHTML = `
      <div class="ct-stat">
        <span class="ct-stat-num">${stats.total}</span>
        <span class="ct-stat-label">greiningar</span>
      </div>
      <div class="ct-stat">
        <span class="ct-stat-num">${stats.sources}</span>
        <span class="ct-stat-label">fjölmiðlar</span>
      </div>
      <div class="ct-stat">
        <span class="ct-stat-num">${stats.totalClaims}</span>
        <span class="ct-stat-label">fullyrðingar</span>
      </div>
    `;
  }

  function renderResults() {
    const reports = queryReports();
    const el = document.getElementById("dt-results");

    if (reports.length === 0) {
      el.innerHTML = `<div class="ct-empty">Engar greiningar fundust.</div>`;
      return;
    }

    const groups = groupReports(reports);

    if (groups.length === 1 && !groups[0].key) {
      // No grouping — flat grid
      el.innerHTML = `<div class="dt-grid">${reports.map(renderReportCard).join("")}</div>`;
    } else {
      el.innerHTML = groups
        .map(
          (g) => `
        <div class="dt-group">
          <h3 class="dt-group-header">${escapeHtml(g.label)}<span class="dt-group-count">${g.reports.length}</span></h3>
          <div class="dt-grid">${g.reports.map(renderReportCard).join("")}</div>
        </div>
      `
        )
        .join("");
    }
  }

  function renderReportCard(report) {
    const sourceClass = SOURCE_CLASSES[report.article_source] || "source-other";
    const sourceBadge = report.article_source
      ? `<span class="dt-source-badge ${sourceClass}">${escapeHtml(report.article_source)}</span>`
      : "";

    const dateStr = report.article_date
      ? formatIsDate(report.article_date)
      : report.analysis_date
        ? formatIsDate(report.analysis_date)
        : "";

    const authorStr = report.article_author
      ? `<span class="dt-author">${escapeHtml(report.article_author)}</span>`
      : "";

    const externalLink = report.article_url
      ? `<a href="${escapeHtml(report.article_url)}" class="dt-external-link" target="_blank" rel="noopener" title="Upprunaleg grein" onclick="event.stopPropagation()">&#x2197;</a>`
      : "";

    // Verdict pills
    const verdicts = Object.entries(report.verdict_counts || {})
      .map(([v, count]) => {
        const cls = VERDICT_CLASSES[v] || "";
        const label = VERDICT_LABELS[v] || v;
        return `<span class="ct-verdict-pill ${cls}">${label}: ${count}</span>`;
      })
      .join("");

    // Category tag
    const categoryTag = report.dominant_category
      ? `<span class="ct-category-tag">${CATEGORY_LABELS[report.dominant_category] || report.dominant_category}</span>`
      : "";

    return `
      <a href="/umraedan/${escapeHtml(report.slug)}/" class="dt-card">
        <div class="dt-card-top">
          ${sourceBadge}
          ${categoryTag}
          ${externalLink}
        </div>
        <h4 class="dt-card-title">${escapeHtml(report.article_title)}</h4>
        <div class="dt-card-meta">
          ${dateStr ? `<time>${dateStr}</time>` : ""}
          ${authorStr}
        </div>
        ${report.summary ? `<p class="dt-card-summary">${escapeHtml(report.summary)}</p>` : ""}
        <div class="dt-card-footer">
          <div class="dt-card-verdicts">${verdicts}</div>
          <span class="dt-card-count">${report.claim_count} fullyrðingar</span>
        </div>
      </a>
    `;
  }

  // ── Events ───────────────────────────────────────────────────────

  let searchTimeout = null;

  function bindEvents() {
    const searchInput = document.getElementById("dt-search");
    const sourceSelect = document.getElementById("dt-source");
    const categorySelect = document.getElementById("dt-category");
    const groupSelect = document.getElementById("dt-group");
    const sortSelect = document.getElementById("dt-sort");

    searchInput.addEventListener("input", (e) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        filters.search = e.target.value.trim();
        renderResults();
      }, 200);
    });

    sourceSelect.addEventListener("change", (e) => {
      filters.source = e.target.value;
      renderResults();
    });

    categorySelect.addEventListener("change", (e) => {
      filters.category = e.target.value;
      renderResults();
    });

    groupSelect.addEventListener("change", (e) => {
      filters.groupBy = e.target.value;
      renderResults();
    });

    sortSelect.addEventListener("change", (e) => {
      filters.sort = e.target.value;
      renderResults();
    });
  }

  // ── Utilities ────────────────────────────────────────────────────

  function escapeHtml(str) {
    if (!str) return "";
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function formatIsDate(dateStr) {
    if (!dateStr) return "";
    const parts = dateStr.split("-");
    if (parts.length !== 3) return dateStr;
    const day = parseInt(parts[2], 10);
    const month = parseInt(parts[1], 10);
    const monthName = IS_MONTHS[month] || "";
    return `${day}. ${monthName} ${parts[0]}`;
  }

  // ── Boot ─────────────────────────────────────────────────────────
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
