/**
 * ESBvaktin Entity Tracker — Client-side entity browser
 *
 * Loads entity data from JSON and provides interactive filtering
 * and sorting entirely in the browser.
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
  const TYPE_LABELS = TAXONOMY.entityTypeLabels || {};
  const TYPE_FILTER_LABELS = TAXONOMY.entityTypeFilterLabels || {};
  const STANCE_FILTER_LABELS = TAXONOMY.stanceFilterLabels || {};
  const VERDICT_LABELS = TAXONOMY.verdictLabels || {};
  const VERDICT_CLASSES = TAXONOMY.verdictClasses || {};
  const PARTY_CLASSES = TAXONOMY.partyClasses || {};

  const VERDICT_ORDER = ["supported", "partially_supported", "unverifiable", "unsupported", "misleading"];
  const SORT_LABELS = {
    mention_count: "Tilvísanir",
    name: "Nafn",
    stance_score: "Afstaða",
  };
  const params = new URLSearchParams(window.location.search);

  const root = document.getElementById("entity-tracker");
  if (!root || !renderer || !createController) return;

  const controller = createController({
    root,
    trackerName: "entities",
    initialState: {
      search: params.get("q") || "",
      type: params.get("type") || "",
      party: params.get("party") || "",
      stance: params.get("stance") || "",
      sort: params.get("sort") || "mention_count",
      sortDir: "DESC",
    },
    initialData: {
      entities: [],
    },
    async load(api) {
      const entities = await api.loadJson(ENTITIES_URL);
      return { entities };
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

  function getFilters() {
    return controller.getState();
  }

  function queryEntities() {
    const filters = getFilters();
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
    } else if (filters.type === "media") {
      results = results.filter((entity) => entity.type === "institution" && entity.subtype === "media");
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

    results.sort(createSortComparator(filters.sort, filters.sortDir || "DESC"));

    return results;
  }

  function queryStats() {
    const entities = getEntities();
    return {
      total: entities.length,
      parties: entities.filter((entity) => entity.type === "party").length,
      politicians: entities.filter((entity) => entity.type === "individual" && entity.subtype === "politician").length,
      media: entities.filter((entity) => entity.type === "institution" && entity.subtype === "media").length,
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
        label: name,
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
          { value: "mention_count", label: "Tilvísanir" },
          { value: "name", label: "Nafn" },
          { value: "stance_score", label: "Afstaða" },
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
        { value: stats.media, label: "fjölmiðlar" },
        { value: stats.institutions, label: "samtök" },
        { value: stats.individuals, label: "einstaklingar" },
      ],
    });
  }

  const PAGE_SIZE = 9;
  const pages = { individuals: 1, other: 1 };

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

    const individuals = entities.filter((e) => e.type === "individual");
    const other = entities.filter((e) => e.type !== "individual");

    // Clamp pages to valid range after filter changes
    const maxIndivPage = Math.max(1, Math.ceil(individuals.length / PAGE_SIZE));
    const maxOtherPage = Math.max(1, Math.ceil(other.length / PAGE_SIZE));
    pages.individuals = Math.min(pages.individuals, maxIndivPage);
    pages.other = Math.min(pages.other, maxOtherPage);

    updateVisibleCount(entities.length);

    const sections = [];
    if (individuals.length > 0) {
      sections.push(renderSection("individuals", "Einstaklingar", individuals, pages.individuals));
    }
    if (other.length > 0) {
      sections.push(renderSection("other", "Flokkar, samtök og stofnanir", other, pages.other));
    }

    el.innerHTML = sections.join("");
    restoreReturnTarget(el);
  }

  function renderSection(key, heading, items, page) {
    const totalPages = Math.ceil(items.length / PAGE_SIZE);
    const start = (page - 1) * PAGE_SIZE;
    const pageItems = items.slice(start, start + PAGE_SIZE);

    const cardsHtml = renderer.renderCollection({
      items: pageItems,
      renderItem: renderEntityCard,
      containerClass: "et-grid",
    });

    const pagerHtml = totalPages > 1 ? renderPager(key, page, totalPages, items.length) : "";

    return `
      <section class="et-section" data-section="${key}">
        <h2 class="et-section-heading">${heading} <span class="et-section-count">(${items.length})</span></h2>
        ${cardsHtml}
        ${pagerHtml}
      </section>
    `;
  }

  function renderPager(key, page, totalPages, totalItems) {
    const prevDisabled = page <= 1 ? ' disabled' : '';
    const nextDisabled = page >= totalPages ? ' disabled' : '';
    const start = (page - 1) * PAGE_SIZE + 1;
    const end = Math.min(page * PAGE_SIZE, totalItems);

    return `
      <nav class="et-pager" aria-label="Síður">
        <button class="et-pager-btn" data-page-section="${key}" data-page-dir="prev"${prevDisabled} type="button">&lsaquo; Til baka</button>
        <span class="et-pager-info">${start}&ndash;${end} af ${totalItems}</span>
        <button class="et-pager-btn" data-page-section="${key}" data-page-dir="next"${nextDisabled} type="button">Áfram &rsaquo;</button>
      </nav>
    `;
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
    const detailUrl = withReturnUrl(`/raddirnar/${entity.slug}/`, buildReturnUrl(cardId));

    const typeBadge = `<span class="et-type-badge et-type-${entity.type}">${TYPE_LABELS[entity.type] || entity.type}</span>`;

    let partyPillHtml = "";
    if (entity.party_slug && entity.party) {
      const partyClass = PARTY_CLASSES[entity.party] || "party-other";
      const partyLabel = entity.party;
      partyPillHtml = `<a href="/raddirnar/${escapeHtml(entity.party_slug)}/" class="et-party-pill ${partyClass}">${escapeHtml(partyLabel)}</a>`;
    }

    const stancePillHtml = `<span class="et-stance-pill" style="--sh: ${hue}; --ss: ${sat}%">${label}</span>`;

    const roleHtml = entity.role
      ? `<p class="et-card-role">${escapeHtml(capitalize(entity.role))}</p>`
      : "";

    const verdictBarHtml = renderEntityVerdictBar(entity);

    const claimCount = entity.claims?.length || 0;
    let statsHtml = '<div class="et-card-stats">';
    if (claimCount) statsHtml += `<span class="et-card-stat">${claimCount} fullyrðing${claimCount > 1 ? "ar" : ""}</span>`;
    if (entity.althingi_stats) statsHtml += `<span class="et-card-stat et-althingi-badge">${entity.althingi_stats.speech_count} þingræður</span>`;
    statsHtml += "</div>";

    return `
      <div class="et-card" id="${escapeHtml(cardId)}" style="--stance-hue: ${hue}; --stance-sat: ${sat}%">
        <div class="et-badge-row">${typeBadge}${partyPillHtml}<span class="et-badge-spacer"></span>${stancePillHtml}</div>
        <h3 class="et-card-name"><a href="${detailUrl}" class="et-card-link">${escapeHtml(entity.name)}</a></h3>
        ${roleHtml}
        ${verdictBarHtml}
        ${statsHtml}
      </div>
    `;
  }

  function renderEntityVerdictBar(entity) {
    const scorecard = entity.scorecard || {};
    const total = VERDICT_ORDER.reduce((sum, v) => sum + (scorecard[v] || 0), 0);
    if (total === 0) return "";

    const segments = VERDICT_ORDER
      .filter((v) => scorecard[v])
      .map((v) => {
        const count = scorecard[v];
        const pct = ((count / total) * 100).toFixed(1);
        const cls = VERDICT_CLASSES[v] || v;
        const labelText = VERDICT_LABELS[v] || v;
        return `<span class="report-bar-seg ${cls}" style="width:${pct}%" title="${labelText}: ${count}">${pct >= 15 ? Math.round(pct) + "%" : ""}</span>`;
      })
      .join("");

    return `<div class="report-verdict-bar et-verdict-bar" role="img" aria-label="Dreifing niðurstaðna">${segments}</div>`;
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
      chips.push({ key: "party", text: `Flokkur: ${partyName}` });
    }

    if (filters.stance) {
      chips.push({ key: "stance", text: `Afstaða: ${STANCE_FILTER_LABELS[filters.stance] || filters.stance}` });
    }

    if (filters.sort && filters.sort !== "mention_count") {
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
      patch.sort = "mention_count";
      patch.sortDir = "DESC";
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
        sort: "mention_count",
        sortDir: "DESC",
      },
      "all",
      api
    );
  }

  const commitState = createCommitState(function syncUrl(state) {
    pages.individuals = 1;
    pages.other = 1;
    (utils.updateUrlQuery || function () {})({
      q: state.search,
      type: state.type,
      party: state.party,
      stance: state.stance,
      sort: state.sort === "mention_count" ? "" : state.sort,
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
        sortDir: value === "name" ? "ASC" : "DESC",
      },
      "results",
      api
    );
  });

  controller.bindClick("[data-page-section]", (target, _event, api) => {
    const section = target.getAttribute("data-page-section");
    const dir = target.getAttribute("data-page-dir");
    if (dir === "next") pages[section]++;
    if (dir === "prev") pages[section]--;
    api.rerender("results");
    // Scroll the section heading into view
    const heading = root.querySelector(`[data-section="${section}"] .et-section-heading`);
    if (heading) heading.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  controller.bindClick("[data-clear-filter]", (target, _event, api) => {
    clearFilter(target.getAttribute("data-clear-filter"), api);
  });

  controller.bindClick("[data-clear-all-filters]", (_target, _event, api) => {
    clearAllFilters(api);
  });

  controller.start();
})();
