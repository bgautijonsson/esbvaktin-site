/**
 * ESBvaktin Discourse Tracker — Client-side report browser
 *
 * Loads report listing from JSON and provides interactive filtering,
 * grouping, and sorting entirely in the browser.
 */

(function () {
  "use strict";

  const TAXONOMY = globalThis.ESBvaktinTaxonomy || {};
  const utils = globalThis.ESBvaktinTrackerUtils || {};
  const renderer = globalThis.ESBvaktinTrackerRenderer;
  const controllerLib = globalThis.ESBvaktinTrackerController || {};
  const createController = controllerLib.create;
  const escapeHtml = utils.escapeHtml || ((value) => String(value ?? ""));
  const formatIsDate = utils.formatIsDate || ((value) => String(value ?? ""));
  const normalizeReportSummary = utils.normalizeReportSummary || ((value) => String(value ?? ""));
  const DATA_BASE = utils.getDataBase
    ? utils.getDataBase(document.currentScript, "/assets/data")
    : (document.currentScript?.dataset.base || "/assets/data");
  const JSON_URL = `${DATA_BASE}/reports.json`;
  const VERDICT_LABELS = TAXONOMY.verdictLabels || {};
  const CATEGORY_LABELS = TAXONOMY.categoryLabels || {};
  const VERDICT_CLASSES = TAXONOMY.verdictClasses || {};

  const VERDICT_ORDER = [
    "supported",
    "partially_supported",
    "unverifiable",
    "misleading",
    "unsupported",
  ];

  const SOURCE_CLASSES = {
    "Vísir": "source-visir",
    "RÚV": "source-ruv",
    "Morgunblaðið": "source-mbl",
    "Heimildin": "source-heimildin",
    "Kjarninn": "source-kjarninn",
    "Stundin": "source-stundin",
    "Fréttablaðið": "source-frettabladid",
    "Silfrið (RÚV)": "source-silfrid",
  };

  const GROUP_LABELS = {
    "": "Engin flokkun",
    source: "Fjölmiðill",
    date: "Dagsetning",
    category: "Efnisflokkur",
  };

  const root = document.getElementById("discourse-tracker");
  if (!root || !renderer || !createController) return;

  const controller = createController({
    root,
    initialState: {
      search: "",
      source: "",
      category: "",
      groupBy: "date",
      sort: "article_date",
      sortDir: "DESC",
    },
    initialData: [],
    async load(api) {
      const reports = await api.loadJson(JSON_URL);
      return Array.isArray(reports)
        ? reports.map((report) => ({
            ...report,
            summary: normalizeReportSummary(report.summary),
          }))
        : [];
    },
    renderShell,
    renderStats,
    renderResults,
    initialRender: "all",
    onError() {
      renderShell();
      const stats = document.getElementById("dt-stats");
      const results = document.getElementById("dt-results");
      if (stats) {
        stats.innerHTML = renderer.renderMessage("Gat ekki hlaðið gögnum.", "ct-stat-loading");
      }
      if (results) {
        results.innerHTML = renderer.renderMessage("Engar greiningar fundust.", "ct-empty");
      }
    },
  });

  function getReports() {
    return controller.getData() || [];
  }

  function getFilters() {
    return controller.getState();
  }

  function queryReports() {
    const filters = getFilters();
    let results = [...getReports()];

    if (filters.search) {
      const q = filters.search.toLowerCase();
      results = results.filter(
        (report) =>
          report.article_title?.toLowerCase().includes(q) ||
          report.summary?.toLowerCase().includes(q) ||
          report.article_author?.toLowerCase().includes(q) ||
          report.speakers?.some((speaker) => speaker.name?.toLowerCase().includes(q))
      );
    }

    if (filters.source) {
      results = results.filter((report) => report.article_source === filters.source);
    }

    if (filters.category) {
      results = results.filter(
        (report) =>
          report.dominant_category === filters.category ||
          report.categories?.includes(filters.category)
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
    const groupBy = getFilters().groupBy;
    if (!groupBy) return [{ key: "", label: "", reports }];

    const groups = new Map();

    for (const report of reports) {
      let key;
      if (groupBy === "source") {
        key = report.article_source || "Óþekkt";
      } else if (groupBy === "date") {
        key = report.article_date || "Óþekkt";
      } else if (groupBy === "category") {
        key = report.dominant_category || "other";
      } else {
        key = "";
      }

      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(report);
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
    const reports = getReports();
    const sources = new Set(reports.map((report) => report.article_source).filter(Boolean));
    return {
      total: reports.length,
      sources: sources.size,
      totalClaims: reports.reduce((sum, report) => sum + (report.claim_count || 0), 0),
    };
  }

  function renderShell() {
    const filters = getFilters();
    const reports = getReports();

    const sourceOptions = [...new Set(reports.map((report) => report.article_source).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b, "is"));

    const categoryOptions = [...new Set(reports.flatMap((report) => report.categories || []).filter(Boolean))]
      .sort((a, b) => (CATEGORY_LABELS[a] || a).localeCompare(CATEGORY_LABELS[b] || b, "is"));

    root.innerHTML = `
      <div class="dt-stats" id="dt-stats">${renderer.renderMessage("Hleð gögnum…", "ct-stat-loading")}</div>

      ${renderer.renderControlBlock({
        wrapperClass: "ct-controls",
        search: {
          id: "dt-search",
          className: "ct-search",
          wrapClass: "ct-search-wrap",
          placeholder: "Leita í greiningum…",
          value: filters.search,
        },
        rows: [{
          className: "ct-filter-row",
          controls: [
            renderer.renderSelect({
              id: "dt-source",
              className: "ct-select",
              placeholder: "Allir fjölmiðlar",
              options: sourceOptions,
              selectedValue: filters.source,
            }),
            renderer.renderSelect({
              id: "dt-category",
              className: "ct-select",
              placeholder: "Allir flokkar",
              options: categoryOptions.map((value) => ({
                value,
                label: CATEGORY_LABELS[value] || value,
              })),
              selectedValue: filters.category,
            }),
            renderer.renderSelect({
              id: "dt-group",
              className: "ct-select",
              options: Object.entries(GROUP_LABELS).map(([value, label]) => ({ value, label })),
              selectedValue: filters.groupBy,
            }),
            renderer.renderSelect({
              id: "dt-sort",
              className: "ct-select",
              options: [
                { value: "article_date", label: "Dagsetning greinar" },
                { value: "analysis_date", label: "Dagsetning greiningar" },
                { value: "claim_count", label: "Fjöldi fullyrðinga" },
                { value: "article_source", label: "Fjölmiðill" },
              ],
              selectedValue: filters.sort,
            }),
          ],
        }],
      })}

      <div class="dt-legend">
        ${VERDICT_ORDER.map((verdict) => `<span class="dt-legend-item"><span class="dt-legend-dot ${VERDICT_CLASSES[verdict]}"></span>${VERDICT_LABELS[verdict]}</span>`).join("")}
      </div>

      <div class="dt-results" id="dt-results">
        ${renderer.renderMessage("Hleð greiningum…", "ct-loading")}
      </div>
    `;
  }

  function renderStats() {
    const stats = queryStats();
    const el = document.getElementById("dt-stats");
    if (!el) return;

    el.innerHTML = renderer.renderStatItems({
      items: [
        { value: stats.total, label: "greiningar" },
        { value: stats.sources, label: "fjölmiðlar" },
        { value: stats.totalClaims, label: "fullyrðingar" },
      ],
    });
  }

  function renderResults() {
    const reports = queryReports();
    const el = document.getElementById("dt-results");
    if (!el) return;

    if (reports.length === 0) {
      el.innerHTML = renderer.renderMessage("Engar greiningar fundust.", "ct-empty");
      return;
    }

    const groups = groupReports(reports);
    el.innerHTML = renderer.renderGroupedCollection({
      groups,
      getKey: (group) => group.key,
      getItems: (group) => group.reports,
      renderItem: renderReportCard,
      gridClass: "dt-grid",
      groupClass: "dt-group",
      renderHeader: (group, count) =>
        `<h3 class="dt-group-header">${escapeHtml(group.label)}<span class="dt-group-count">${count}</span></h3>`,
    });
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
      : report.source_type === "panel_show" && report.participants?.length
        ? `<span class="dt-participants-badge">${report.participants.length} þátttakendur</span>`
        : "";

    const externalLink = report.article_url
      ? `<a href="${escapeHtml(report.article_url)}" class="dt-external-link" target="_blank" rel="noopener">Upprunaleg grein &#x2197;</a>`
      : "";

    const total = report.claim_count || Object.values(report.verdict_counts || {}).reduce((sum, count) => sum + count, 0);
    const counts = report.verdict_counts || {};
    const verdicts = total
      ? VERDICT_ORDER
          .filter((verdict) => counts[verdict])
          .map((verdict) => {
            const count = counts[verdict];
            const cls = VERDICT_CLASSES[verdict] || "";
            const pct = ((count / total) * 100).toFixed(1);
            const label = VERDICT_LABELS[verdict] || verdict;
            return `<span class="dt-bar-seg ${cls}" style="width:${pct}%" title="${label}: ${count}">${count}</span>`;
          })
          .join("")
      : "";

    const categoryTag = report.dominant_category
      ? `<span class="ct-category-tag">${CATEGORY_LABELS[report.dominant_category] || report.dominant_category}</span>`
      : "";

    return `
      <div class="dt-card">
        <div class="dt-card-top">
          ${sourceBadge}
          ${categoryTag}
          ${externalLink}
        </div>
        <h4 class="dt-card-title">
          <a href="/umraedan/${escapeHtml(report.slug)}/" class="dt-card-link">${escapeHtml(report.article_title)}</a>
        </h4>
        <div class="dt-card-meta">
          ${dateStr ? `<time>${dateStr}</time>` : ""}
          ${authorStr}
        </div>
        ${report.summary ? `<p class="dt-card-summary">${escapeHtml(report.summary)}</p>` : ""}
        <div class="dt-card-footer">
          <span class="dt-card-count">${report.claim_count} fullyrðingar</span>
          <div class="dt-verdict-bar">${verdicts}</div>
        </div>
      </div>
    `;
  }

  controller.bindInput(
    "#dt-search",
    (value, _target, _event, api) => {
      api.setState({ search: value }, "results");
    },
    { debounceMs: 200, trim: true }
  );

  controller.bindChange("#dt-source", (value, _target, _event, api) => {
    api.setState({ source: value }, "results");
  });

  controller.bindChange("#dt-category", (value, _target, _event, api) => {
    api.setState({ category: value }, "results");
  });

  controller.bindChange("#dt-group", (value, _target, _event, api) => {
    api.setState({ groupBy: value }, "results");
  });

  controller.bindChange("#dt-sort", (value, _target, _event, api) => {
    api.setState({ sort: value }, "results");
  });

  controller.start();
})();
