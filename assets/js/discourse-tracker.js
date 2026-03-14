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
  const buildReturnUrl = utils.buildReturnUrl || (() => "");
  const formatIsDate = utils.formatIsDate || ((value) => String(value ?? ""));
  const normalizeReportSummary = utils.normalizeReportSummary || ((value) => String(value ?? ""));
  const restoreReturnTarget = utils.restoreReturnTarget || (() => false);
  const withReturnUrl = utils.withReturnUrl || ((url) => url);
  const createSortComparator = utils.createSortComparator;
  const createCommitState = utils.createCommitState;
  const createErrorHandler = utils.createErrorHandler;
  const renderActiveFilterChips = utils.renderActiveFilterChips;
  const DATA_BASE = utils.getDataBase
    ? utils.getDataBase(document.currentScript, "/assets/data")
    : (document.currentScript?.dataset.base || "/assets/data");
  const JSON_URL = `${DATA_BASE}/reports.json`;
  const VERDICT_LABELS = TAXONOMY.verdictLabels || {};
  const VERDICT_DESCRIPTIONS = TAXONOMY.verdictDescriptions || {};
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

  const SORT_LABELS = {
    article_date: "Dagsetning greinar",
    analysis_date: "Dagsetning greiningar",
    claim_count: "Fjöldi fullyrðinga",
    article_source: "Fjölmiðill",
  };

  const root = document.getElementById("discourse-tracker");
  if (!root || !renderer || !createController) return;
  const params = new URLSearchParams(window.location.search);

  const controller = createController({
    root,
    trackerName: "discourse",
    initialState: {
      search: params.get("q") || "",
      source: params.get("source") || "",
      category: params.get("category") || "",
      groupBy: params.get("group") || "date",
      sort: params.get("sort") || "article_date",
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
    onError: createErrorHandler({
      renderShell,
      renderer,
      statsId: "dt-stats",
      resultsId: "dt-results",
      resultsMessage: "Engar greiningar fundust.",
    }),
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
          report.capsule?.toLowerCase().includes(q) ||
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

    results.sort(createSortComparator(filters.sort || "article_date", filters.sortDir || "DESC"));

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
          label: "Leita í greiningum",
          placeholder: "Leita í greiningum…",
          value: filters.search,
        },
        rows: [{
          className: "ct-filter-row",
          controls: [
            renderer.renderSelect({
              id: "dt-source",
              className: "ct-select",
              label: "Fjölmiðill",
              placeholder: "Allir fjölmiðlar",
              options: sourceOptions,
              selectedValue: filters.source,
            }),
            renderer.renderSelect({
              id: "dt-category",
              className: "ct-select",
              label: "Efnisflokkur",
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
              label: "Flokka eftir",
              options: Object.entries(GROUP_LABELS).map(([value, label]) => ({ value, label })),
              selectedValue: filters.groupBy,
            }),
            renderer.renderSelect({
              id: "dt-sort",
              className: "ct-select",
              label: "Röðun",
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
        ${VERDICT_ORDER.map((verdict) => `<span class="dt-legend-item" title="${VERDICT_DESCRIPTIONS[verdict] || ""}"><span class="dt-legend-dot ${VERDICT_CLASSES[verdict]}"></span>${VERDICT_LABELS[verdict]}</span>`).join("")}
      </div>

      <div id="dt-active-filters"></div>

      <p class="ct-results-meta" id="dt-results-meta" aria-live="polite"></p>

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
    renderActiveFilters();
    updateResultsMeta(reports.length, getReports().length);

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
    restoreReturnTarget(el);
  }

  function updateResultsMeta(visibleCount, totalCount) {
    const el = document.getElementById("dt-results-meta");
    if (!el) return;

    if (visibleCount === totalCount) {
      el.textContent = `Sýni allar ${totalCount} greiningar.`;
      return;
    }

    el.textContent = `Sýni ${visibleCount} af ${totalCount} greiningum.`;
  }

  function renderReportCard(report) {
    const cardId = `dt-report-${report.slug}`;
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
            return `<span class="dt-bar-seg ${cls}" style="width:${pct}%" title="${label}: ${count}">${pct >= 15 ? Math.round(pct) + "%" : ""}</span>`;
          })
          .join("")
      : "";

    const categoryTag = report.dominant_category
      ? `<span class="ct-category-tag">${CATEGORY_LABELS[report.dominant_category] || report.dominant_category}</span>`
      : "";

    const detailUrl = withReturnUrl(`/umraedan/${report.slug}/`, buildReturnUrl(cardId));

    return `
      <div class="dt-card" id="${escapeHtml(cardId)}">
        <div class="dt-card-top">
          ${sourceBadge}
          ${categoryTag}
          ${externalLink}
        </div>
        <h4 class="dt-card-title">
          <a href="${escapeHtml(detailUrl)}" class="dt-card-link">${escapeHtml(report.article_title)}</a>
        </h4>
        <div class="dt-card-meta">
          ${dateStr ? `<time>${dateStr}</time>` : ""}
          ${authorStr}
        </div>
        ${report.capsule ? `<p class="dt-card-summary">${escapeHtml(report.capsule)}</p><span class="dt-card-ai-tag">Samantekt gervigreindar</span>` : report.summary ? `<p class="dt-card-summary">${escapeHtml(report.summary)}</p>` : ""}
        <div class="dt-card-footer">
          <span class="dt-card-count">${report.claim_count} fullyrðingar</span>
          <div class="dt-verdict-bar">${verdicts}</div>
        </div>
      </div>
    `;
  }

  function getActiveFilterChips() {
    const filters = getFilters();
    const chips = [];

    if (filters.search) {
      chips.push({ key: "search", text: `Leit: ${filters.search}` });
    }

    if (filters.source) {
      chips.push({ key: "source", text: `Fjölmiðill: ${filters.source}` });
    }

    if (filters.category) {
      chips.push({ key: "category", text: `Efnisflokkur: ${CATEGORY_LABELS[filters.category] || filters.category}` });
    }

    if (filters.groupBy && filters.groupBy !== "date") {
      chips.push({ key: "group", text: `Flokkun: ${GROUP_LABELS[filters.groupBy] || filters.groupBy}` });
    }

    if (filters.sort && filters.sort !== "article_date") {
      chips.push({ key: "sort", text: `Röðun: ${SORT_LABELS[filters.sort] || filters.sort}` });
    }

    return chips;
  }

  function renderActiveFilters() {
    renderActiveFilterChips("dt-active-filters", renderer, getActiveFilterChips);
  }

  function clearFilter(key, api) {
    const patch = {};

    if (key === "search") patch.search = "";
    if (key === "source") patch.source = "";
    if (key === "category") patch.category = "";
    if (key === "group") patch.groupBy = "date";
    if (key === "sort") patch.sort = "article_date";

    commitState(patch, "all", api);
  }

  function clearAllFilters(api) {
    commitState(
      {
        search: "",
        source: "",
        category: "",
        groupBy: "date",
        sort: "article_date",
      },
      "all",
      api
    );
  }

  const commitState = createCommitState(function syncUrl(state) {
    (utils.updateUrlQuery || function () {})(({
      q: state.search,
      source: state.source,
      category: state.category,
      group: state.groupBy === "date" ? "" : state.groupBy,
      sort: state.sort === "article_date" ? "" : state.sort,
    }));
  });

  controller.bindInput(
    "#dt-search",
    (value, _target, _event, api) => {
      commitState({ search: value }, "results", api);
    },
    { debounceMs: 200, trim: true }
  );

  controller.bindChange("#dt-source", (value, _target, _event, api) => {
    commitState({ source: value }, "results", api);
  });

  controller.bindChange("#dt-category", (value, _target, _event, api) => {
    commitState({ category: value }, "results", api);
  });

  controller.bindChange("#dt-group", (value, _target, _event, api) => {
    commitState({ groupBy: value }, "results", api);
  });

  controller.bindChange("#dt-sort", (value, _target, _event, api) => {
    commitState({ sort: value }, "results", api);
  });

  controller.bindClick("[data-clear-filter]", (target, _event, api) => {
    clearFilter(target.getAttribute("data-clear-filter"), api);
  });

  controller.bindClick("[data-clear-all-filters]", (_target, _event, api) => {
    clearAllFilters(api);
  });

  controller.start();
})();
