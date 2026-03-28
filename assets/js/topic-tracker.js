/**
 * ESBvaktin Topic Tracker — Client-side topic browser
 *
 * Loads topic data from JSON and provides interactive sorting
 * with verdict breakdown cards entirely in the browser.
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
  const renderActiveFilterChips = utils.renderActiveFilterChips;
  const DATA_BASE = utils.getDataBase
    ? utils.getDataBase(document.currentScript, "/assets/data")
    : (document.currentScript?.dataset.base || "/assets/data");
  const TOPICS_URL = `${DATA_BASE}/topics.json`;
  const VERDICT_LABELS = (TAXONOMY.verdictLabels && TAXONOMY.verdictLabels.factual) || {};
  const VERDICT_DESCRIPTIONS = (TAXONOMY.verdictDescriptions && TAXONOMY.verdictDescriptions.factual) || TAXONOMY.verdictDescriptions || {};
  const VERDICT_ORDER = ["supported", "partially_supported", "unverifiable", "unsupported", "misleading"];
  const SORT_LABELS = {
    claim_count: "Fullyrðingar",
    evidence_count: "Heimildir",
    sighting_count: "Tilvísanir",
    label_is: "Nafn",
  };
  const params = new URLSearchParams(window.location.search);

  const root = document.getElementById("topic-tracker");
  if (!root || !renderer || !createController) return;

  const controller = createController({
    root,
    trackerName: "topics",
    initialState: {
      search: params.get("q") || "",
      sort: params.get("sort") || "claim_count",
      sortDir: "DESC",
    },
    initialData: {
      topics: [],
    },
    async load(api) {
      const topics = await api.loadJson(TOPICS_URL);
      return { topics };
    },
    renderShell,
    renderStats,
    renderResults,
    initialRender: "stats+results",
    onError: createErrorHandler({
      renderShell,
      renderer,
      statsId: "tp-stats",
      resultsId: "tp-results",
      resultsMessage: "Engin málefni fundust.",
    }),
  });

  function getData() {
    return controller.getData() || {};
  }

  function getTopics() {
    return getData().topics || [];
  }

  function getFilters() {
    return controller.getState();
  }

  function queryTopics() {
    const filters = getFilters();
    let results = [...getTopics()];

    if (filters.search) {
      const q = filters.search.toLowerCase();
      results = results.filter(
        (topic) =>
          topic.label_is?.toLowerCase().includes(q) ||
          topic.label_en?.toLowerCase().includes(q)
      );
    }

    const sortKey = filters.sort || "claim_count";
    const dir = filters.sortDir === "ASC" ? 1 : -1;

    if (sortKey === "label_is") {
      results.sort((a, b) => dir * String(a.label_is ?? "").localeCompare(String(b.label_is ?? ""), "is"));
    } else {
      results.sort((a, b) => dir * ((a[sortKey] || 0) - (b[sortKey] || 0)));
    }

    return results;
  }

  function queryStats() {
    const topics = getTopics();
    const totalClaims = topics.reduce((sum, t) => sum + (t.published_claim_count || 0), 0);
    const totalEvidence = topics.reduce((sum, t) => sum + (t.evidence_count || 0), 0);
    return {
      total: topics.length,
      claims: totalClaims,
      evidence: totalEvidence,
    };
  }

  function renderShell() {
    const filters = getFilters();

    root.innerHTML = `
      <div class="tp-stats" id="tp-stats">${renderer.renderMessage("Hleð gögnum…", "tp-stat-loading")}</div>

      ${renderer.renderControlBlock({
        wrapperClass: "tp-controls",
        search: {
          id: "tp-search",
          className: "tp-search",
          wrapClass: "tp-search-wrap",
          label: "Leita í málefnum",
          placeholder: "Leita í málefnum…",
          value: filters.search,
        },
        rows: [{
          className: "tp-filter-row",
          controls: [
            renderer.renderSelect({
              id: "tp-sort",
              className: "tp-select",
              label: "Röðun",
              options: [
                { value: "claim_count", label: "Fullyrðingar" },
                { value: "evidence_count", label: "Heimildir" },
                { value: "sighting_count", label: "Tilvísanir" },
                { value: "label_is", label: "Nafn" },
              ],
              selectedValue: filters.sort,
            }),
          ],
        }],
      })}

      <div id="tp-active-filters"></div>

      <div id="tp-results">
        ${renderer.renderMessage("Hleð málefnum…", "tp-loading")}
      </div>
    `;
  }

  function renderStats() {
    const stats = queryStats();
    const el = document.getElementById("tp-stats");
    if (!el) return;

    el.innerHTML = renderer.renderStatItems({
      statClass: "tp-stat",
      numClass: "tp-stat-num",
      labelClass: "tp-stat-label",
      items: [
        { value: stats.total, label: "málefni", valueId: "tp-visible-count" },
        { value: stats.claims, label: "fullyrðingar" },
        { value: stats.evidence, label: "heimildir" },
      ],
    });
  }

  function renderResults() {
    const topics = queryTopics();
    const el = document.getElementById("tp-results");
    if (!el) return;
    renderActiveFilters();

    if (topics.length === 0) {
      el.innerHTML = renderer.renderMessage("Engin málefni fundust.", "tp-empty");
      updateVisibleCount(0);
      return;
    }

    updateVisibleCount(topics.length);
    el.innerHTML = renderer.renderCollection({
      items: topics,
      renderItem: renderTopicCard,
      containerClass: "tp-grid",
    });
    restoreReturnTarget(el);
  }

  function updateVisibleCount(count) {
    const el = document.getElementById("tp-visible-count");
    if (el) el.textContent = count;
  }

  function renderVerdictBar(verdictCounts) {
    const total = VERDICT_ORDER.reduce((sum, v) => sum + (verdictCounts[v] || 0), 0);
    if (total === 0) return "";

    const segments = VERDICT_ORDER
      .filter((v) => verdictCounts[v])
      .map((v) => {
        const count = verdictCounts[v];
        const pct = ((count / total) * 100).toFixed(1);
        const cls = v === "partially_supported" ? "partial" : v;
        return `<span class="report-bar-seg verdict-${cls}" style="width:${pct}%" title="${VERDICT_LABELS[v] || v}: ${count}">${pct >= 15 ? Math.round(pct) + "%" : ""}</span>`;
      })
      .join("");

    return `<div class="report-verdict-bar tp-verdict-bar" role="img" aria-label="Dreifing niðurstaðna">${segments}</div>`;
  }

  function renderVerdictPills(verdictCounts) {
    return VERDICT_ORDER
      .filter((v) => verdictCounts[v])
      .map((v) => {
        const cls = v === "partially_supported" ? "partial" : v;
        return `<span class="ct-verdict-pill verdict-${cls}" title="${VERDICT_DESCRIPTIONS[v] || ""}">${VERDICT_LABELS[v] || v}: ${verdictCounts[v]}</span>`;
      })
      .join("");
  }

  function renderTopicCard(topic) {
    const cardId = `tp-topic-${topic.slug}`;
    const detailUrl = withReturnUrl(`/malefni/${topic.slug}/`, buildReturnUrl(cardId));
    const claimCount = topic.published_claim_count || 0;

    const entitiesHtml = (topic.top_entities || []).slice(0, 3)
      .map((e) => `<span class="tp-entity-chip">${escapeHtml(e.name)}</span>`)
      .join("");

    return `
      <div class="tp-card" id="${escapeHtml(cardId)}">
        <h3 class="tp-card-title"><a href="${detailUrl}" class="tp-card-link">${escapeHtml(topic.label_is)}</a></h3>
        <div class="tp-card-stats">
          <span class="tp-card-stat"><strong>${claimCount}</strong> fullyrðing${claimCount !== 1 ? "ar" : ""}</span>
          <span class="tp-card-stat"><strong>${topic.evidence_count || 0}</strong> heimild${(topic.evidence_count || 0) !== 1 ? "ir" : ""}</span>
        </div>
        ${renderVerdictBar(topic.verdict_counts || {})}
        <div class="tp-card-pills">${renderVerdictPills(topic.verdict_counts || {})}</div>
        ${entitiesHtml ? `<div class="tp-card-entities">${entitiesHtml}</div>` : ""}
        <a href="${detailUrl}" class="tp-see-more">Sjá málefni &rarr;</a>
      </div>
    `;
  }

  function getActiveFilterChips() {
    const filters = getFilters();
    const chips = [];

    if (filters.search) {
      chips.push({ key: "search", text: `Leit: ${filters.search}` });
    }

    if (filters.sort && filters.sort !== "claim_count") {
      chips.push({ key: "sort", text: `Röðun: ${SORT_LABELS[filters.sort] || filters.sort}` });
    }

    return chips;
  }

  function renderActiveFilters() {
    renderActiveFilterChips("tp-active-filters", renderer, getActiveFilterChips);
  }

  function clearFilter(key, api) {
    const patch = {};

    if (key === "search") patch.search = "";
    if (key === "sort") {
      patch.sort = "claim_count";
      patch.sortDir = "DESC";
    }

    commitState(patch, "all", api);
  }

  function clearAllFilters(api) {
    commitState(
      { search: "", sort: "claim_count", sortDir: "DESC" },
      "all",
      api
    );
  }

  const commitState = createCommitState(function syncUrl(state) {
    (utils.updateUrlQuery || function () {})({
      q: state.search,
      sort: state.sort === "claim_count" ? "" : state.sort,
    });
  });

  controller.bindInput(
    "#tp-search",
    (value, _target, _event, api) => {
      commitState({ search: value }, "results", api);
    },
    { debounceMs: 200, trim: true }
  );

  controller.bindChange("#tp-sort", (value, _target, _event, api) => {
    commitState(
      {
        sort: value,
        sortDir: value === "label_is" ? "ASC" : "DESC",
      },
      "results",
      api
    );
  });

  controller.bindClick("[data-clear-filter]", (target, _event, api) => {
    clearFilter(target.getAttribute("data-clear-filter"), api);
  });

  controller.bindClick("[data-clear-all-filters]", (_target, _event, api) => {
    clearAllFilters(api);
  });

  controller.start();
})();
