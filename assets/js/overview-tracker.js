/**
 * ESBvaktin Overview Tracker — Client-side weekly overview browser
 *
 * Loads overview data from JSON and renders a reverse-chronological
 * list of weekly briefings entirely in the browser.
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
  const restoreReturnTarget = utils.restoreReturnTarget || (() => false);
  const withReturnUrl = utils.withReturnUrl || ((url) => url);
  const createCommitState = utils.createCommitState;
  const createErrorHandler = utils.createErrorHandler;
  const DATA_BASE = utils.getDataBase
    ? utils.getDataBase(document.currentScript, "/assets/data")
    : (document.currentScript?.dataset.base || "/assets/data");
  const OVERVIEWS_URL = `${DATA_BASE}/overviews.json`;
  const CATEGORY_LABELS = TAXONOMY.categoryLabels || {};

  const root = document.getElementById("overview-tracker");
  if (!root || !renderer || !createController) return;

  const controller = createController({
    root,
    trackerName: "overview",
    initialState: {},
    initialData: {
      overviews: [],
    },
    async load(api) {
      const overviews = await api.loadJson(OVERVIEWS_URL);
      // Sort reverse-chronological
      overviews.sort((a, b) => (b.period_start || "").localeCompare(a.period_start || ""));
      return { overviews };
    },
    renderShell,
    renderStats,
    renderResults,
    initialRender: "stats+results",
    onError: createErrorHandler({
      renderShell,
      renderer,
      statsId: "ov-stats",
      resultsId: "ov-results",
      resultsMessage: "Engin vikuyfirlit fundust.",
    }),
  });

  function getData() {
    return controller.getData() || {};
  }

  function getOverviews() {
    return getData().overviews || [];
  }

  function renderShell() {
    root.innerHTML = `
      <div class="ov-stats" id="ov-stats">${renderer.renderMessage("Hleð gögnum…", "ov-stat-loading")}</div>
      <div id="ov-results">
        ${renderer.renderMessage("Hleð vikuyfirlitum…", "ov-loading")}
      </div>
    `;
  }

  function renderStats() {
    const overviews = getOverviews();
    const el = document.getElementById("ov-stats");
    if (!el) return;

    el.innerHTML = renderer.renderStatItems({
      statClass: "ov-stat",
      numClass: "ov-stat-num",
      labelClass: "ov-stat-label",
      items: [
        { value: overviews.length, label: "vikuyfirlit" },
      ],
    });
  }

  function formatDateRange(start, end) {
    const months = ["janúar", "febrúar", "mars", "apríl", "maí", "júní",
      "júlí", "ágúst", "september", "október", "nóvember", "desember"];

    function fmt(dateStr) {
      const d = new Date(dateStr);
      return `${d.getUTCDate()}. ${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
    }

    if (!start && !end) return "";
    if (!start) return fmt(end);
    if (!end) return fmt(start);

    const from = new Date(start);
    const to = new Date(end);

    if (from.getUTCFullYear() === to.getUTCFullYear() && from.getUTCMonth() === to.getUTCMonth()) {
      return `${from.getUTCDate()}.–${to.getUTCDate()}. ${months[from.getUTCMonth()]} ${from.getUTCFullYear()}`;
    }

    return `${fmt(start)} – ${fmt(end)}`;
  }

  function renderResults() {
    const overviews = getOverviews();
    const el = document.getElementById("ov-results");
    if (!el) return;

    if (overviews.length === 0) {
      el.innerHTML = renderer.renderMessage("Engin vikuyfirlit fundust.", "ov-empty");
      return;
    }

    el.innerHTML = `<div class="ov-list">${overviews.map(renderOverviewCard).join("")}</div>`;
    restoreReturnTarget(el);
  }

  function renderOverviewCard(overview) {
    const cardId = `ov-${overview.slug}`;
    const detailUrl = withReturnUrl(`/vikuyfirlit/${overview.slug}/`, buildReturnUrl(cardId));
    const dateRange = formatDateRange(overview.period_start, overview.period_end);

    const topicsHtml = (overview.top_topics || [])
      .map((slug) => {
        const label = CATEGORY_LABELS[slug] || slug;
        return `<span class="ct-category-tag">${escapeHtml(label)}</span>`;
      })
      .join("");

    const diversityPct = overview.diversity_score != null
      ? Math.round(overview.diversity_score * 100)
      : null;

    return `
      <div class="ov-card" id="${escapeHtml(cardId)}">
        <div class="ov-card-header">
          <h3 class="ov-card-title"><a href="${detailUrl}" class="ov-card-link">${escapeHtml(dateRange)}</a></h3>
        </div>
        <div class="ov-card-stats">
          <span class="ov-card-stat"><strong>${overview.articles_analysed || 0}</strong> greinar</span>
          <span class="ov-card-stat"><strong>${overview.new_claims || 0}</strong> fullyrðingar</span>
          ${diversityPct != null ? `<span class="ov-card-stat"><strong>${diversityPct}%</strong> fjölbreytni</span>` : ""}
        </div>
        ${overview.editorial_excerpt ? `<p class="ov-card-excerpt">${escapeHtml(overview.editorial_excerpt)}</p>` : ""}
        ${topicsHtml ? `<div class="ov-card-topics">${topicsHtml}</div>` : ""}
        <a href="${detailUrl}" class="ov-see-more">Lesa yfirlit &rarr;</a>
      </div>
    `;
  }

  controller.start();
})();
