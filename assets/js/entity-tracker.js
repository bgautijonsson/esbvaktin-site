/**
 * ESBvaktin Entity Tracker — Client-side entity browser
 *
 * Loads entity data from JSON and provides interactive filtering,
 * sorting, and collapsible article lists entirely in the browser.
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
  const createSortComparator = utils.createSortComparator;
  const createCommitState = utils.createCommitState;
  const createErrorHandler = utils.createErrorHandler;
  const renderActiveFilterChips = utils.renderActiveFilterChips;
  const DATA_BASE = utils.getDataBase
    ? utils.getDataBase(document.currentScript, "/assets/data")
    : (document.currentScript?.dataset.base || "/assets/data");
  const ENTITIES_URL = `${DATA_BASE}/entities.json`;
  const REPORTS_URL = `${DATA_BASE}/reports.json`;
  const FEATURED_URL = `${DATA_BASE}/featured-entities.json`;
  const TYPE_LABELS = TAXONOMY.entityTypeLabels || {};
  const TYPE_FILTER_LABELS = TAXONOMY.entityTypeFilterLabels || {};
  const STANCE_FILTER_LABELS = TAXONOMY.stanceFilterLabels || {};
  const ATTRIBUTION_LABELS = TAXONOMY.attributionLabels || {};
  const PARTY_CLASSES = TAXONOMY.partyClasses || {};
  const PARTY_SHORT_LABELS = TAXONOMY.partyShortLabels || {};
  const ATTRIBUTION_ORDER = ["quoted", "asserted", "paraphrased", "mentioned"];
  const SORT_LABELS = {
    importance: "Mikilvægi",
    name: "Nafn",
    stance_score: "Afstaða",
    credibility: "Trúverðugleiki",
    mention_count: "Tilvísanir",
  };
  const params = new URLSearchParams(window.location.search);

  const root = document.getElementById("entity-tracker");
  if (!root || !renderer || !createController) return;

  const controller = createController({
    root,
    initialState: {
      search: params.get("q") || "",
      type: params.get("type") || "",
      party: params.get("party") || "",
      stance: params.get("stance") || "",
      sort: params.get("sort") || "importance",
      sortDir: "ASC",
    },
    initialData: {
      entities: [],
      reportsMap: new Map(),
      featuredRanks: new Map(),
    },
    async load(api) {
      const [entities, reports] = await Promise.all([
        api.loadJson(ENTITIES_URL),
        api.loadJson(REPORTS_URL),
      ]);

      const reportsMap = new Map();
      reports.forEach((report) => {
        reportsMap.set(report.slug, report);
      });

      const featuredRanks = new Map();
      try {
        const featured = await api.loadJson(FEATURED_URL);
        featured.forEach((slug, index) => featuredRanks.set(slug, index));
      } catch (_error) {
        // Featured entities are optional for the browser.
      }

      return {
        entities,
        reportsMap,
        featuredRanks,
      };
    },
    renderShell,
    renderStats,
    renderResults,
    initialRender: "stats+results",
    onError: createErrorHandler({
      renderShell,
      renderer,
      statsId: "et-stats",
      resultsId: "et-results",
      resultsMessage: "Engir aðilar fundust.",
    }),
  });

  function getData() {
    return controller.getData() || {};
  }

  function getEntities() {
    return getData().entities || [];
  }

  function getReportsMap() {
    return getData().reportsMap || new Map();
  }

  function getFeaturedRanks() {
    return getData().featuredRanks || new Map();
  }

  function getFilters() {
    return controller.getState();
  }

  function queryEntities() {
    const filters = getFilters();
    const featuredRanks = getFeaturedRanks();
    let results = [...getEntities()];

    if (filters.search) {
      const q = filters.search.toLowerCase();
      results = results.filter(
        (entity) =>
          entity.name?.toLowerCase().includes(q) ||
          entity.role?.toLowerCase().includes(q) ||
          entity.party?.toLowerCase().includes(q) ||
          entity.description?.toLowerCase().includes(q)
      );
    }

    if (filters.type === "politician") {
      results = results.filter((entity) => entity.type === "individual" && entity.subtype === "politician");
    } else if (filters.type) {
      results = results.filter((entity) => entity.type === filters.type);
    }

    if (filters.party) {
      results = results.filter((entity) => entity.party_slug === filters.party);
    }

    if (filters.stance) {
      if (filters.stance === "mixed") {
        results = results.filter((entity) => entity.stance === "mixed" || entity.stance === "neutral");
      } else {
        results = results.filter((entity) => entity.stance === filters.stance);
      }
    }

    if (filters.sort === "importance") {
      const maxRank = featuredRanks.size;
      results.sort((a, b) => {
        const ra = featuredRanks.has(a.slug) ? featuredRanks.get(a.slug) : maxRank;
        const rb = featuredRanks.has(b.slug) ? featuredRanks.get(b.slug) : maxRank;
        if (ra !== rb) return ra - rb;
        return String(a.name ?? "").localeCompare(String(b.name ?? ""), "is");
      });
      return results;
    }

    results.sort(createSortComparator(filters.sort, filters.sortDir || "ASC"));

    return results;
  }

  function queryStats() {
    const entities = getEntities();
    return {
      total: entities.length,
      parties: entities.filter((entity) => entity.type === "party").length,
      politicians: entities.filter((entity) => entity.type === "individual" && entity.subtype === "politician").length,
      institutions: entities.filter((entity) => entity.type === "institution").length,
      individuals: entities.filter((entity) => entity.type === "individual").length,
    };
  }

  function buildPartyOptions() {
    const partyMap = new Map();
    for (const entity of getEntities()) {
      if (entity.party_slug && entity.party) {
        if (!partyMap.has(entity.party_slug)) {
          partyMap.set(entity.party_slug, entity.party);
        }
      }
    }
    return [...partyMap.entries()]
      .map(([slug, name]) => ({
        value: slug,
        label: PARTY_SHORT_LABELS[name] || name,
      }))
      .sort((a, b) => a.label.localeCompare(b.label, "is"));
  }

  function isPartyFilterRelevant() {
    const type = getFilters().type;
    return !type || type === "politician" || type === "individual";
  }

  function renderShell() {
    const filters = getFilters();
    const showParty = isPartyFilterRelevant();

    const filterControls = [
      renderer.renderSelect({
        id: "et-type",
        className: "et-select",
        label: "Tegund",
        placeholder: "Allar tegundir",
        options: Object.entries(TYPE_FILTER_LABELS).map(([value, label]) => ({ value, label })),
        selectedValue: filters.type,
      }),
    ];

    if (showParty) {
      filterControls.push(
        renderer.renderSelect({
          id: "et-party",
          className: "et-select",
          label: "Flokkur",
          placeholder: "Allir flokkar",
          options: buildPartyOptions(),
          selectedValue: filters.party,
        })
      );
    }

    filterControls.push(
      renderer.renderSelect({
        id: "et-stance",
        className: "et-select",
        label: "Afstaða",
        placeholder: "Öll viðhorf",
        options: Object.entries(STANCE_FILTER_LABELS).map(([value, label]) => ({ value, label })),
        selectedValue: filters.stance,
      }),
      renderer.renderSelect({
        id: "et-sort",
        className: "et-select",
        label: "Röðun",
        options: [
          { value: "importance", label: "Mikilvægi" },
          { value: "name", label: "Nafn" },
          { value: "stance_score", label: "Afstaða" },
          { value: "credibility", label: "Trúverðugleiki" },
          { value: "mention_count", label: "Tilvísanir" },
        ],
        selectedValue: filters.sort,
      })
    );

    root.innerHTML = `
      <div class="et-stats" id="et-stats">${renderer.renderMessage("Hleð gögnum…", "et-stat-loading")}</div>

      ${renderer.renderControlBlock({
        wrapperClass: "et-controls",
        search: {
          id: "et-search",
          className: "et-search",
          wrapClass: "et-search-wrap",
          label: "Leita í aðilum",
          placeholder: "Leita í aðilum…",
          value: filters.search,
        },
        rows: [{
          className: "et-filter-row",
          controls: filterControls,
        }],
      })}

      <div id="et-active-filters"></div>

      <div id="et-results">
        ${renderer.renderMessage("Hleð aðilum…", "et-loading")}
      </div>
    `;
  }

  function renderStats() {
    const stats = queryStats();
    const el = document.getElementById("et-stats");
    if (!el) return;

    el.innerHTML = renderer.renderStatItems({
      statClass: "et-stat",
      numClass: "et-stat-num",
      labelClass: "et-stat-label",
      items: [
        { value: stats.total, label: "sýnilegir", valueId: "et-visible-count" },
        { value: stats.parties, label: "flokkar" },
        { value: stats.politicians, label: "stjórnmálafólk" },
        { value: stats.institutions, label: "samtök" },
        { value: stats.individuals, label: "einstaklingar" },
      ],
    });
  }

  function renderResults() {
    const entities = queryEntities();
    const el = document.getElementById("et-results");
    if (!el) return;
    renderActiveFilters();

    if (entities.length === 0) {
      el.innerHTML = renderer.renderMessage("Engir aðilar fundust.", "et-empty");
      updateVisibleCount(0);
      return;
    }

    updateVisibleCount(entities.length);
    el.innerHTML = renderer.renderCollection({
      items: entities,
      renderItem: renderEntityCard,
      containerClass: "et-grid",
    });
    restoreReturnTarget(el);
  }

  function updateVisibleCount(count) {
    const el = document.getElementById("et-visible-count");
    if (el) el.textContent = count;
  }

  function renderEntityCard(entity) {
    const cardId = `et-entity-${entity.slug}`;
    const score = entity.stance_score ?? 0;
    const hue = stanceHue(score);
    const sat = 10 + Math.abs(score) * 60;
    const label = stanceLabel(score);
    const dotLeft = (((score + 1) / 2) * 100).toFixed(1);
    const credPct = entity.credibility != null ? Math.round(entity.credibility * 100) : null;
    const detailUrl = withReturnUrl(`/raddirnar/${entity.slug}/`, buildReturnUrl(cardId));

    const roleHtml = entity.role
      ? `<p class="et-card-role">${escapeHtml(capitalize(entity.role))}${entity.party ? ` (${escapeHtml(entity.party)})` : ""}</p>`
      : "";

    const typeBadge = `<span class="et-type-badge et-type-${entity.type}">${TYPE_LABELS[entity.type] || entity.type}</span>`;

    let partyPillHtml = "";
    if (entity.party_slug && entity.party) {
      const partyClass = PARTY_CLASSES[entity.party] || "party-other";
      const partyLabel = PARTY_SHORT_LABELS[entity.party] || entity.party;
      partyPillHtml = `<a href="/raddirnar/${escapeHtml(entity.party_slug)}/" class="et-party-pill ${partyClass}">${escapeHtml(partyLabel)}</a>`;
    }

    const claimCount = entity.claims?.length || 0;
    const articleCount = entity.articles?.length || 0;
    let statsHtml = '<div class="et-card-stats">';
    if (claimCount) statsHtml += `<span class="et-card-stat">${claimCount} fullyrðing${claimCount > 1 ? "ar" : ""}</span>`;
    if (articleCount) statsHtml += `<span class="et-card-stat">${articleCount} grein${articleCount > 1 ? "ar" : "ing"}</span>`;
    if (entity.althingi_stats) statsHtml += `<span class="et-card-stat et-althingi-badge">${entity.althingi_stats.speech_count} þingræður</span>`;
    statsHtml += "</div>";

    let credHtml = "";
    if (credPct !== null) {
      credHtml = `
        <div class="et-credibility" title="Trúverðugleiki: ${credPct}%">
          <span class="et-credibility-label">Trúverðugleiki</span>
          <div class="et-credibility-bar">
            <div class="et-credibility-fill" style="width: ${credPct}%"></div>
          </div>
          <span class="et-credibility-value">${credPct}%</span>
        </div>`;
    }

    let attrHtml = "";
    const attributionCounts = entity.attribution_counts;
    if (attributionCounts) {
      const total = ATTRIBUTION_ORDER.reduce((sum, key) => sum + (attributionCounts[key] || 0), 0);
      if (total > 0) {
        const segments = ATTRIBUTION_ORDER
          .filter((key) => attributionCounts[key])
          .map((key) => {
            const pct = ((attributionCounts[key] / total) * 100).toFixed(1);
            return `<div class="et-attr-seg et-attr-${key}" style="width:${pct}%" title="${ATTRIBUTION_LABELS[key]}: ${attributionCounts[key]}"></div>`;
          })
          .join("");

        const legend = ATTRIBUTION_ORDER
          .filter((key) => attributionCounts[key])
          .map((key) => `<span class="et-attr-legend-item et-attr-${key}-text">${ATTRIBUTION_LABELS[key]} ${attributionCounts[key]}</span>`)
          .join("");

        attrHtml = `
          <div class="et-attribution">
            <div class="et-attr-bar">${segments}</div>
            <div class="et-attr-legend">${legend}</div>
          </div>`;
      }
    }

    let articlesHtml = "";
    if (articleCount > 0) {
      const articleLinks = entity.articles
        .map((slug) => {
          const report = getReportsMap().get(slug);
          if (!report) return null;
          return `<li><a href="${escapeHtml(withReturnUrl(`/umraedan/${slug}/`, buildReturnUrl(cardId)))}">${escapeHtml(report.article_title)}</a></li>`;
        })
        .filter(Boolean)
        .join("");

      if (articleLinks) {
        articlesHtml = `
          <div class="et-articles-section">
            <button class="et-articles-toggle" aria-expanded="false" type="button">
              <span class="et-articles-label">Birtist í ${articleCount} grein${articleCount > 1 ? "um" : "ing"}</span>
              <span class="et-expand-icon">▸</span>
            </button>
            <div class="et-articles-details">
              <ul class="et-articles-list">${articleLinks}</ul>
            </div>
          </div>`;
      }
    }

    return `
      <div class="et-card" id="${escapeHtml(cardId)}" style="--stance-hue: ${hue}; --stance-sat: ${sat}%; --stance-score: ${score}">
        <div class="et-card-top">
          <h3 class="et-card-name"><a href="${detailUrl}" class="et-card-link">${escapeHtml(entity.name)}</a></h3>
          <div class="et-stance-indicator" title="Afstaða: ${score}">
            <div class="et-stance-track">
              <div class="et-stance-dot" style="left: ${dotLeft}%"></div>
            </div>
            <span class="et-stance-label">${label}</span>
          </div>
        </div>
        ${roleHtml}
        <div class="et-card-badges">${typeBadge}${partyPillHtml}</div>
        ${statsHtml}
        ${attrHtml}
        ${credHtml}
        ${articlesHtml}
        <a href="${detailUrl}" class="et-see-more">Sjá meira &rarr;</a>
      </div>
    `;
  }

  function toggleArticles(toggle) {
    const section = toggle.closest(".et-articles-section");
    if (!section) return;

    const expanded = !section.classList.contains("et-expanded");
    section.classList.toggle("et-expanded", expanded);
    toggle.setAttribute("aria-expanded", expanded);
  }

  function stanceHue(score) {
    return score >= 0 ? 60 + score * 150 : 60 + score * 60;
  }

  function stanceLabel(score) {
    if (score >= 0.5) return "ESB-jákvæð";
    if (score <= -0.5) return "ESB-gagnrýnin";
    if (Math.abs(score) < 0.1) return "Hlutlaus";
    return "Blandað";
  }

  function capitalize(str) {
    if (!str) return "";
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  function getActiveFilterChips() {
    const filters = getFilters();
    const chips = [];

    if (filters.search) {
      chips.push({ key: "search", text: `Leit: ${filters.search}` });
    }

    if (filters.type) {
      chips.push({ key: "type", text: `Tegund: ${TYPE_FILTER_LABELS[filters.type] || filters.type}` });
    }

    if (filters.party) {
      const partyName = getEntities().find((e) => e.party_slug === filters.party)?.party || filters.party;
      chips.push({ key: "party", text: `Flokkur: ${PARTY_SHORT_LABELS[partyName] || partyName}` });
    }

    if (filters.stance) {
      chips.push({ key: "stance", text: `Afstaða: ${STANCE_FILTER_LABELS[filters.stance] || filters.stance}` });
    }

    if (filters.sort && filters.sort !== "importance") {
      chips.push({ key: "sort", text: `Röðun: ${SORT_LABELS[filters.sort] || filters.sort}` });
    }

    return chips;
  }

  function renderActiveFilters() {
    renderActiveFilterChips("et-active-filters", renderer, getActiveFilterChips);
  }

  function clearFilter(key, api) {
    const patch = {};

    if (key === "search") patch.search = "";
    if (key === "type") { patch.type = ""; patch.party = ""; }
    if (key === "party") patch.party = "";
    if (key === "stance") patch.stance = "";
    if (key === "sort") {
      patch.sort = "importance";
      patch.sortDir = "ASC";
    }

    commitState(patch, "all", api);
  }

  function clearAllFilters(api) {
    commitState(
      {
        search: "",
        type: "",
        party: "",
        stance: "",
        sort: "importance",
        sortDir: "ASC",
      },
      "all",
      api
    );
  }

  const commitState = createCommitState(function syncUrl(state) {
    (utils.updateUrlQuery || function () {})({
      q: state.search,
      type: state.type,
      party: state.party,
      stance: state.stance,
      sort: state.sort === "importance" ? "" : state.sort,
    });
  });

  controller.bindInput(
    "#et-search",
    (value, _target, _event, api) => {
      commitState({ search: value }, "results", api);
    },
    { debounceMs: 200, trim: true }
  );

  controller.bindChange("#et-type", (value, _target, _event, api) => {
    // Clear party when switching to a type where party filter is irrelevant
    const clearParty = value && value !== "politician" && value !== "individual";
    commitState({ type: value, ...(clearParty ? { party: "" } : {}) }, "all", api);
  });

  controller.bindChange("#et-party", (value, _target, _event, api) => {
    commitState({ party: value }, "results", api);
  });

  controller.bindChange("#et-stance", (value, _target, _event, api) => {
    commitState({ stance: value }, "results", api);
  });

  controller.bindChange("#et-sort", (value, _target, _event, api) => {
    commitState(
      {
        sort: value,
        sortDir: value === "name" || value === "importance" ? "ASC" : "DESC",
      },
      "results",
      api
    );
  });

  controller.bindClick(".et-articles-toggle", (target) => {
    toggleArticles(target);
  });

  controller.bindClick("[data-clear-filter]", (target, _event, api) => {
    clearFilter(target.getAttribute("data-clear-filter"), api);
  });

  controller.bindClick("[data-clear-all-filters]", (_target, _event, api) => {
    clearAllFilters(api);
  });

  controller.start();
})();
