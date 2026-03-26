/**
 * ESBvaktin Topic Claim Tracker — Embedded claim browser for topic detail pages.
 *
 * Loads claims.json lazily when the mount point enters the viewport,
 * filters to the topic's category, and renders the full claim card UI.
 *
 * Depends on: ESBvaktinTaxonomy, ESBvaktinTrackerUtils, ESBvaktinTrackerRenderer,
 *             ESBvaktinTrackerController, ESBvaktinClaimCard
 */
(function () {
  "use strict";

  var TAXONOMY = globalThis.ESBvaktinTaxonomy || {};
  var utils = globalThis.ESBvaktinTrackerUtils || {};
  var renderer = globalThis.ESBvaktinTrackerRenderer;
  var controllerLib = globalThis.ESBvaktinTrackerController || {};
  var createController = controllerLib.create;
  var claimCard = globalThis.ESBvaktinClaimCard || {};
  var createReportLookup = utils.createReportLookup || (function () { return { byArticleUrl: new Map(), byTitleDate: new Map() }; });
  var createSortComparator = utils.createSortComparator;
  var createCommitState = utils.createCommitState;
  var createErrorHandler = utils.createErrorHandler;
  var renderActiveFilterChips = utils.renderActiveFilterChips;

  var VERDICT_LABELS = (TAXONOMY.verdictLabels && TAXONOMY.verdictLabels.factual) || {};
  var EPISTEMIC_TYPE_LABELS = TAXONOMY.epistemicTypeLabels || {};

  var root = document.getElementById("topic-claim-tracker");
  if (!root || !renderer || !createController) return;

  var topicCategory = (root.dataset.category || "").replace(/-/g, "_");
  var dataBase = root.dataset.base || "/assets/data";
  var topicSlug = (root.dataset.category || "").toLowerCase();
  var TOPIC_CLAIMS_URL = dataBase + "/topic-claims/" + topicSlug + ".json";
  var CLAIMS_URL = dataBase + "/claims.json";
  var REPORTS_URL = dataBase + "/reports.json";

  var controller = createController({
    root: root,
    trackerName: "topic-claims",
    initialState: {
      search: "",
      verdict: "",
      epistemic_type: "",
      sort: "sighting_count",
      sortDir: "DESC",
    },
    initialData: {
      claims: [],
      reportLookup: createReportLookup([]),
    },
    load: async function (api) {
      var claims;
      try {
        // Try per-topic file first (much smaller than full claims.json)
        claims = await api.loadJson(TOPIC_CLAIMS_URL);
      } catch (_) {
        // Fall back to full claims.json + client-side filter
        var allClaims = await api.loadJson(CLAIMS_URL);
        claims = allClaims.filter(function (c) { return c.category === topicCategory; });
      }
      var reports = [];
      try {
        reports = await api.loadJson(REPORTS_URL);
      } catch (_) {
        reports = [];
      }
      return {
        claims: claims,
        reportLookup: createReportLookup(reports),
      };
    },
    renderShell: renderShell,
    renderStats: renderStats,
    renderResults: renderResults,
    initialRender: "stats+results",
    onError: createErrorHandler({
      renderShell: renderShell,
      renderer: renderer,
      statsId: "tct-stats",
      resultsId: "tct-results",
      resultsMessage: "Gat ekki hlaðið fullyrðingum.",
    }),
  });

  function getClaims() {
    return (controller.getData() && controller.getData().claims) || [];
  }

  function getReportLookup() {
    return (controller.getData() && controller.getData().reportLookup) || createReportLookup([]);
  }

  function getFilters() {
    return controller.getState();
  }

  function queryClaims() {
    var filters = getFilters();
    var results = getClaims().slice();

    if (filters.search) {
      var q = filters.search.toLowerCase();
      results = results.filter(function (claim) {
        return (claim.canonical_text_is && claim.canonical_text_is.toLowerCase().indexOf(q) !== -1) ||
          (claim.explanation_is && claim.explanation_is.toLowerCase().indexOf(q) !== -1) ||
          (claim.missing_context_is && claim.missing_context_is.toLowerCase().indexOf(q) !== -1);
      });
    }

    if (filters.verdict) {
      results = results.filter(function (claim) { return claim.verdict === filters.verdict; });
    }

    if (filters.epistemic_type) {
      results = results.filter(function (claim) { return (claim.epistemic_type || "factual") === filters.epistemic_type; });
    }

    results.sort(createSortComparator(filters.sort || "sighting_count", filters.sortDir || "DESC"));
    return results;
  }

  function queryStats() {
    var claims = getClaims();
    return {
      total: claims.length,
      supported: claims.filter(function (c) { return c.verdict === "supported"; }).length,
      partial: claims.filter(function (c) { return c.verdict === "partially_supported"; }).length,
      unsupported: claims.filter(function (c) { return c.verdict === "unsupported"; }).length,
      misleading: claims.filter(function (c) { return c.verdict === "misleading"; }).length,
      unverifiable: claims.filter(function (c) { return c.verdict === "unverifiable"; }).length,
      totalSightings: claims.reduce(function (sum, c) { return sum + (c.sighting_count || 0); }, 0),
    };
  }

  function renderShell() {
    var filters = getFilters();

    root.innerHTML =
      '<div class="ct-stats" id="tct-stats">' + renderer.renderMessage("Hleð gögnum…", "ct-stat-loading") + '</div>' +

      renderer.renderControlBlock({
        wrapperClass: "ct-controls",
        search: {
          id: "tct-search",
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
              id: "tct-verdict",
              className: "ct-select",
              label: "Úrskurður",
              placeholder: "Allir úrskurðir",
              options: Object.entries(VERDICT_LABELS).map(function (entry) { return { value: entry[0], label: entry[1] }; }),
              selectedValue: filters.verdict,
            }),
            renderer.renderSelect({
              id: "tct-epistemic-type",
              className: "ct-select",
              label: "Tegund fullyrðingar",
              placeholder: "Allar tegundir",
              options: Object.entries(EPISTEMIC_TYPE_LABELS).map(function (entry) { return { value: entry[0], label: entry[1] }; }),
              selectedValue: filters.epistemic_type,
            }),
            renderer.renderSelect({
              id: "tct-sort",
              className: "ct-select",
              label: "Röðun",
              options: [
                { value: "sighting_count", label: "Tíðni" },
                { value: "last_verified", label: "Síðast staðfest" },
                { value: "confidence", label: "Vissustig" },
              ],
              selectedValue: filters.sort,
            }),
          ],
        }],
      }) +

      '<div id="tct-active-filters"></div>' +
      '<p class="ct-results-meta" id="tct-results-meta" aria-live="polite"></p>' +
      '<div class="ct-results" id="tct-results">' + renderer.renderMessage("Hleð fullyrðingum…", "ct-loading") + '</div>';
  }

  function renderStats() {
    var stats = queryStats();
    var el = document.getElementById("tct-stats");
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
    var claims = queryClaims();
    var el = document.getElementById("tct-results");
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
          reportLookup: getReportLookup(),
        });
      },
    });
  }

  function updateResultsMeta(visibleCount, totalCount) {
    var el = document.getElementById("tct-results-meta");
    if (!el) return;
    if (visibleCount === totalCount) {
      el.textContent = "Sýni allar " + totalCount + " fullyrðingar.";
    } else {
      el.textContent = "Sýni " + visibleCount + " af " + totalCount + " fullyrðingum.";
    }
  }

  function getActiveFilterChips() {
    var filters = getFilters();
    var chips = [];
    if (filters.search) {
      chips.push({ key: "search", text: "Leit: " + filters.search });
    }
    if (filters.verdict) {
      chips.push({ key: "verdict", text: "Úrskurður: " + (VERDICT_LABELS[filters.verdict] || filters.verdict) });
    }
    if (filters.epistemic_type) {
      chips.push({ key: "epistemic_type", text: "Tegund: " + (EPISTEMIC_TYPE_LABELS[filters.epistemic_type] || filters.epistemic_type) });
    }
    if (filters.sort && filters.sort !== "sighting_count") {
      var sortLabels = { last_verified: "Síðast staðfest", confidence: "Vissustig" };
      chips.push({ key: "sort", text: "Röðun: " + (sortLabels[filters.sort] || filters.sort) });
    }
    return chips;
  }

  function renderActiveFilters() {
    renderActiveFilterChips("tct-active-filters", renderer, getActiveFilterChips);
  }

  function clearFilter(key, api) {
    var patch = {};
    if (key === "search") patch.search = "";
    if (key === "verdict") patch.verdict = "";
    if (key === "epistemic_type") patch.epistemic_type = "";
    if (key === "sort") patch.sort = "sighting_count";
    api.setState(patch, "all");
  }

  function clearAllFilters(api) {
    api.setState({ search: "", verdict: "", epistemic_type: "", sort: "sighting_count" }, "all");
  }

  // ── Event bindings ──

  controller.bindInput(
    "#tct-search",
    function (value, _target, _event, api) {
      api.setState({ search: value }, "results");
    },
    { debounceMs: 200, trim: true }
  );

  controller.bindChange("#tct-verdict", function (value, _target, _event, api) {
    api.setState({ verdict: value }, "results");
  });

  controller.bindChange("#tct-epistemic-type", function (value, _target, _event, api) {
    api.setState({ epistemic_type: value }, "results");
  });

  controller.bindChange("#tct-sort", function (value, _target, _event, api) {
    api.setState({ sort: value }, "results");
  });

  controller.bindClick("[data-clear-filter]", function (target, _event, api) {
    clearFilter(target.getAttribute("data-clear-filter"), api);
  });

  controller.bindClick("[data-clear-all-filters]", function (_target, _event, api) {
    clearAllFilters(api);
  });

  controller.bindClick(".ct-card-header", function (target) {
    claimCard.toggleClaimCard(target);
  });

  controller.bindKeyActivate(".ct-card-header", function (target) {
    claimCard.toggleClaimCard(target);
  });

  controller.bindClick(".ct-sightings-toggle", function (target) {
    claimCard.toggleSightings(target);
  });

  // ── Lazy loading via IntersectionObserver ──

  if ("IntersectionObserver" in window) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          observer.disconnect();
          controller.start();
        }
      });
    }, { rootMargin: "200px" });
    observer.observe(root);
  } else {
    controller.start();
  }
})();
