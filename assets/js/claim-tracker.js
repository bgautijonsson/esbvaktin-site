/**
 * ESBvaktin Claim Tracker — Client-side claim browser
 *
 * Loads claims from JSON and provides interactive filtering,
 * searching, and sorting entirely in the browser.
 */

(function () {
  "use strict";

  const TAXONOMY = globalThis.ESBvaktinTaxonomy || {};
  const utils = globalThis.ESBvaktinTrackerUtils || {};
  const renderer = globalThis.ESBvaktinTrackerRenderer;
  const controllerLib = globalThis.ESBvaktinTrackerController || {};
  const createController = controllerLib.create;
  const createReportLookup = utils.createReportLookup || (() => ({ byArticleUrl: new Map(), byTitleDate: new Map() }));
  const restoreReturnTarget = utils.restoreReturnTarget || (() => false);
  const createSortComparator = utils.createSortComparator;
  const createCommitState = utils.createCommitState;
  const createErrorHandler = utils.createErrorHandler;
  const renderActiveFilterChips = utils.renderActiveFilterChips;
  const DATA_BASE = utils.getDataBase
    ? utils.getDataBase(document.currentScript, "/assets/data")
    : (document.currentScript?.dataset.base || "/assets/data");
  const CLAIMS_URL = `${DATA_BASE}/claims.json`;
  const REPORTS_URL = `${DATA_BASE}/reports.json`;

  const claimCard = globalThis.ESBvaktinClaimCard || {};

  const VERDICT_LABELS = (TAXONOMY.verdictLabels && TAXONOMY.verdictLabels.factual) || {};
  const CATEGORY_LABELS = TAXONOMY.categoryLabels || {};
  const SORT_LABELS = {
    last_verified: "Síðast staðfest",
    sighting_count: "Tíðni",
    category: "Flokkur",
    confidence: "Vissustig",
  };
  const params = new URLSearchParams(window.location.search);

  const root = document.getElementById("claim-tracker");
  if (!root || !renderer || !createController) return;

  const controller = createController({
    root,
    trackerName: "claims",
    initialState: {
      claim: params.get("claim") || "",
      search: params.get("q") || "",
      category: params.get("category") || "",
      verdict: params.get("verdict") || "",
      sort: params.get("sort") || "last_verified",
      sortDir: "DESC",
    },
    initialData: {
      claims: [],
      reportLookup: createReportLookup([]),
    },
    async load(api) {
      const claims = await api.loadJson(CLAIMS_URL);
      let reports = [];

      try {
        reports = await api.loadJson(REPORTS_URL);
      } catch (_error) {
        reports = [];
      }

      return {
        claims,
        reportLookup: createReportLookup(reports),
      };
    },
    renderShell,
    renderStats,
    renderResults,
    initialRender: "stats+results",
    onError: createErrorHandler({
      renderShell,
      renderer,
      statsId: "ct-stats",
      resultsId: "ct-results",
      resultsMessage: "Gat ekki hlaðið fullyrðingum.",
    }),
  });

  function getClaims() {
    return controller.getData()?.claims || [];
  }

  function getReportLookup() {
    return controller.getData()?.reportLookup || createReportLookup([]);
  }

  function getFilters() {
    return controller.getState();
  }

  function queryClaims() {
    const filters = getFilters();
    let results = [...getClaims()];

    if (filters.claim) {
      return results.filter((claim) => claim.claim_slug === filters.claim);
    }

    if (filters.search) {
      const q = filters.search.toLowerCase();
      results = results.filter(
        (claim) =>
          claim.canonical_text_is?.toLowerCase().includes(q) ||
          claim.explanation_is?.toLowerCase().includes(q) ||
          claim.missing_context_is?.toLowerCase().includes(q)
      );
    }

    if (filters.category) {
      results = results.filter((claim) => claim.category === filters.category);
    }

    if (filters.verdict) {
      results = results.filter((claim) => claim.verdict === filters.verdict);
    }

    results.sort(createSortComparator(filters.sort || "sighting_count", filters.sortDir || "DESC"));

    return results;
  }

  function queryStats() {
    const claims = getClaims();
    return {
      total: claims.length,
      supported: claims.filter((claim) => claim.verdict === "supported").length,
      partial: claims.filter((claim) => claim.verdict === "partially_supported").length,
      unsupported: claims.filter((claim) => claim.verdict === "unsupported").length,
      misleading: claims.filter((claim) => claim.verdict === "misleading").length,
      unverifiable: claims.filter((claim) => claim.verdict === "unverifiable").length,
      totalSightings: claims.reduce((sum, claim) => sum + (claim.sighting_count || 0), 0),
    };
  }

  function renderShell() {
    const filters = getFilters();

    root.innerHTML = `
      <div class="ct-stats" id="ct-stats">${renderer.renderMessage("Hleð gögnum…", "ct-stat-loading")}</div>

      ${renderer.renderControlBlock({
        wrapperClass: "ct-controls",
        search: {
          id: "ct-search",
          className: "ct-search",
          wrapClass: "ct-search-wrap",
          label: "Leita í fullyrðingum",
          placeholder: "Leita í fullyrðingum…",
          value: filters.search,
        },
        rows: [{
          className: "ct-filter-row",
          controls: [
            renderer.renderSelect({
              id: "ct-category",
              className: "ct-select",
              label: "Efnisflokkur",
              placeholder: "Allir flokkar",
              options: Object.entries(CATEGORY_LABELS)
                .sort((a, b) => a[1].localeCompare(b[1], "is"))
                .map(([value, label]) => ({ value, label })),
              selectedValue: filters.category,
            }),
            renderer.renderSelect({
              id: "ct-verdict",
              className: "ct-select",
              label: "Úrskurður",
              placeholder: "Allir úrskurðir",
              options: Object.entries(VERDICT_LABELS).map(([value, label]) => ({ value, label })),
              selectedValue: filters.verdict,
            }),
            renderer.renderSelect({
              id: "ct-sort",
              className: "ct-select",
              label: "Röðun",
              options: [
                { value: "last_verified", label: "Síðast staðfest" },
                { value: "sighting_count", label: "Tíðni" },
                { value: "category", label: "Flokkur" },
                { value: "confidence", label: "Vissustig" },
              ],
              selectedValue: filters.sort,
            }),
          ],
        }],
      })}

      <div id="ct-active-filters"></div>

      <p class="ct-results-meta" id="ct-results-meta" aria-live="polite"></p>

      <div class="ct-results" id="ct-results">
        ${renderer.renderMessage("Hleð fullyrðingum…", "ct-loading")}
      </div>
    `;
  }

  function renderStats() {
    const stats = queryStats();
    const el = document.getElementById("ct-stats");
    if (!el) return;

    el.innerHTML = renderer.renderStatItems({
      items: [
        { value: stats.total, label: "fullyrðingar" },
        { value: stats.totalSightings, label: "tilvitnanir" },
        { value: stats.supported, label: "staðfestar", className: "ct-stat-supported" },
        { value: stats.partial, label: "að hluta", className: "ct-stat-partial" },
        { value: stats.unsupported, label: "óstutt", className: "ct-stat-unsupported" },
        { value: stats.misleading, label: "samhengi vantar", className: "ct-stat-misleading" },
        { value: stats.unverifiable, label: "heimildir vantar", className: "ct-stat-unverifiable" },
      ],
    });
  }

  function renderResults() {
    const claims = queryClaims();
    const el = document.getElementById("ct-results");
    if (!el) return;
    renderActiveFilters();
    updateResultsMeta(claims.length, getClaims().length);

    if (claims.length === 0) {
      el.innerHTML = renderer.renderMessage("Engar fullyrðingar fundust.", "ct-empty");
      return;
    }

    el.innerHTML = renderer.renderCollection({
      items: claims,
      renderItem: function (claim) {
        return claimCard.renderClaimCard(claim, {
          focusedSlug: getFilters().claim,
          reportLookup: getReportLookup(),
        });
      },
    });
    expandFocusedClaim();
    expandReturnClaimTarget();
    restoreReturnTarget(el);
  }

  function updateResultsMeta(visibleCount, totalCount) {
    const el = document.getElementById("ct-results-meta");
    if (!el) return;

    if (getFilters().claim) {
      el.textContent = visibleCount ? "Sýni valda fullyrðingu." : "Valin fullyrðing fannst ekki.";
      return;
    }

    if (visibleCount === totalCount) {
      el.textContent = `Sýni allar ${totalCount} fullyrðingar.`;
      return;
    }

    el.textContent = `Sýni ${visibleCount} af ${totalCount} fullyrðingum.`;
  }

  function expandReturnClaimTarget() {
    if (typeof window === "undefined" || !window.location || !window.location.hash) return;

    const cardId = decodeURIComponent(window.location.hash.slice(1));
    if (!cardId) return;

    const card = document.getElementById(cardId);
    if (!card || !card.classList.contains("ct-card")) return;

    card.classList.add("ct-expanded");
    const header = card.querySelector(".ct-card-header");
    if (header) {
      header.setAttribute("aria-expanded", "true");
    }
  }

  function expandFocusedClaim() {
    const claimSlug = getFilters().claim;
    if (!claimSlug) return;

    const card = root.querySelector(`.ct-card[data-slug="${claimSlug}"]`);
    if (!card) return;

    card.classList.add("ct-expanded");
    const header = card.querySelector(".ct-card-header");
    if (header) {
      header.setAttribute("aria-expanded", "true");
    }
  }

  function getActiveFilterChips() {
    const filters = getFilters();
    const chips = [];

    if (filters.search) {
      chips.push({ key: "search", text: `Leit: ${filters.search}` });
    }

    if (filters.claim) {
      const claim = getClaims().find((item) => item.claim_slug === filters.claim);
      const label = claim?.canonical_text_is || filters.claim;
      const shortened = label.length > 72 ? `${label.slice(0, 71).trimEnd()}…` : label;
      chips.push({ key: "claim", text: `Fullyrðing: ${shortened}` });
    }

    if (filters.category) {
      chips.push({ key: "category", text: `Efnisflokkur: ${CATEGORY_LABELS[filters.category] || filters.category}` });
    }

    if (filters.verdict) {
      chips.push({ key: "verdict", text: `Úrskurður: ${VERDICT_LABELS[filters.verdict] || filters.verdict}` });
    }

    if (filters.sort && filters.sort !== "last_verified") {
      chips.push({ key: "sort", text: `Röðun: ${SORT_LABELS[filters.sort] || filters.sort}` });
    }

    return chips;
  }

  function renderActiveFilters() {
    renderActiveFilterChips("ct-active-filters", renderer, getActiveFilterChips);
  }

  function clearFilter(key, api) {
    const patch = {};

    if (key === "search") patch.search = "";
    if (key === "claim") patch.claim = "";
    if (key === "category") patch.category = "";
    if (key === "verdict") patch.verdict = "";
    if (key === "sort") patch.sort = "last_verified";

    commitState(patch, "all", api);
  }

  function clearAllFilters(api) {
    commitState(
      {
        search: "",
        claim: "",
        category: "",
        verdict: "",
        sort: "last_verified",
      },
      "all",
      api
    );
  }

  const commitState = createCommitState(function syncUrl(state) {
    (utils.updateUrlQuery || function () {})(({
      q: state.search,
      claim: state.claim,
      category: state.category,
      verdict: state.verdict,
      sort: state.sort === "last_verified" ? "" : state.sort,
    }));
  });

  controller.bindInput(
    "#ct-search",
    (value, _target, _event, api) => {
      commitState({ search: value, claim: "" }, "results", api);
    },
    { debounceMs: 200, trim: true }
  );

  controller.bindChange("#ct-category", (value, _target, _event, api) => {
    commitState({ category: value, claim: "" }, "results", api);
  });

  controller.bindChange("#ct-verdict", (value, _target, _event, api) => {
    commitState({ verdict: value, claim: "" }, "results", api);
  });

  controller.bindChange("#ct-sort", (value, _target, _event, api) => {
    commitState({ sort: value }, "results", api);
  });

  controller.bindClick("[data-clear-filter]", (target, _event, api) => {
    clearFilter(target.getAttribute("data-clear-filter"), api);
  });

  controller.bindClick("[data-clear-all-filters]", (_target, _event, api) => {
    clearAllFilters(api);
  });

  controller.bindClick(".ct-card-header", (target) => {
    claimCard.toggleClaimCard(target);
  });

  controller.bindKeyActivate(".ct-card-header", (target) => {
    claimCard.toggleClaimCard(target);
  });

  controller.bindClick(".ct-sightings-toggle", (target) => {
    claimCard.toggleSightings(target);
  });

  controller.start();
})();
