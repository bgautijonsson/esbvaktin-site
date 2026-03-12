/**
 * ESBvaktin Speeches Tracker — Client-side debate browser
 *
 * Loads EU debate listing from JSON and provides interactive filtering,
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
  const formatNumber = utils.formatNumber || ((value) => String(value ?? "0"));
  const restoreReturnTarget = utils.restoreReturnTarget || (() => false);
  const withReturnUrl = utils.withReturnUrl || ((url) => url);
  const createSortComparator = utils.createSortComparator;
  const createCommitState = utils.createCommitState;
  const createErrorHandler = utils.createErrorHandler;
  const renderActiveFilterChips = utils.renderActiveFilterChips;
  const DATA_BASE = utils.getDataBase
    ? utils.getDataBase(document.currentScript, "/assets/data")
    : (document.currentScript?.dataset.base || "/assets/data");
  const JSON_URL = `${DATA_BASE}/debates.json`;
  const PARTY_CLASSES = TAXONOMY.partyClasses || {};
  const PARTY_SHORT = TAXONOMY.partyShortLabels || {};
  const RECENT_START_YEAR = 2025;

  const GROUP_LABELS = {
    "": "Engin flokkun",
    session: "Löggjafarþing",
    year: "Ár",
    party: "Flokkur",
  };

  const SORT_LABELS = {
    last_date: "Nýjast",
    speech_count: "Flest ræður",
    total_words: "Flest orð",
    speaker_count: "Flestir þingmenn",
  };

  const root = document.getElementById("speeches-tracker");
  if (!root || !renderer || !createController) return;

  const params = new URLSearchParams(window.location.search);
  const initialPeriod = params.get("period") || getDefaultPeriod({
    search: params.get("q") || "",
    speaker: params.get("speaker") || "",
    party: params.get("party") || "",
    session: params.get("session") || "",
  });

  const controller = createController({
    root,
    trackerName: "speeches",
    initialState: {
      search: params.get("q") || "",
      speaker: params.get("speaker") || "",
      party: params.get("party") || "",
      session: params.get("session") || "",
      period: initialPeriod,
      groupBy: params.get("group") || "",
      sort: params.get("sort") || "last_date",
      sortDir: "DESC",
    },
    initialData: [],
    async load(api) {
      return api.loadJson(JSON_URL);
    },
    renderShell,
    renderStats,
    renderResults,
    initialRender: "all",
    onError: createErrorHandler({
      renderShell,
      renderer,
      statsId: "st-stats",
      resultsId: "st-results",
      resultsMessage: "Engar umræður fundust.",
    }),
  });

  function getDebates() {
    return controller.getData() || [];
  }

  function getFilters() {
    return controller.getState();
  }

  function getDefaultPeriod(state) {
    return state.search || state.speaker || state.party || state.session ? "all" : "recent";
  }

  function getDebateYear(debate) {
    const year = parseInt((debate.last_date || "").slice(0, 4), 10);
    return Number.isNaN(year) ? 0 : year;
  }

  function getLatestDebateYear(debates) {
    return debates.reduce((latest, debate) => {
      const year = getDebateYear(debate);
      return year > latest ? year : latest;
    }, RECENT_START_YEAR);
  }

  function getRecentPeriodLabel(debates) {
    const latestYear = getLatestDebateYear(debates);
    return latestYear > RECENT_START_YEAR ? `${RECENT_START_YEAR}–${latestYear}` : String(RECENT_START_YEAR);
  }

  function filterByPeriod(debates, period) {
    if (period === "all") return [...debates];

    return debates.filter((debate) => {
      const year = getDebateYear(debate);
      if (!year) return false;
      return period === "archive" ? year < RECENT_START_YEAR : year >= RECENT_START_YEAR;
    });
  }

  function getPeriodCounts(debates) {
    return {
      all: debates.length,
      recent: filterByPeriod(debates, "recent").length,
      archive: filterByPeriod(debates, "archive").length,
      recentLabel: getRecentPeriodLabel(debates),
      archiveLabel: `Fyrir ${RECENT_START_YEAR}`,
    };
  }

  function renderPeriodButton(value, label, count, selectedValue) {
    const activeClass = value === selectedValue ? " is-active" : "";
    const pressed = value === selectedValue ? "true" : "false";

    return `
      <button class="st-period-button${activeClass}" type="button" data-period-value="${escapeHtml(value)}" aria-pressed="${pressed}">
        <span class="st-period-button-label">${escapeHtml(label)}</span>
        <span class="st-period-button-count">${formatNumber(count)} mál</span>
      </button>
    `;
  }

  function queryDebates() {
    const filters = getFilters();
    let results = filterByPeriod(getDebates(), filters.period || "recent");

    if (filters.speaker) {
      const speaker = filters.speaker.toLowerCase();
      results = results.filter((debate) => debate.speaker_names?.some((name) => name.toLowerCase().includes(speaker)));
    }

    if (filters.search) {
      const q = filters.search.toLowerCase();
      results = results.filter(
        (debate) =>
          debate.issue_title?.toLowerCase().includes(q) ||
          debate.speaker_names?.some((name) => name.toLowerCase().includes(q)) ||
          debate.top_speakers?.some((speaker) => speaker.name?.toLowerCase().includes(q))
      );
    }

    if (filters.party) {
      results = results.filter((debate) => debate.parties?.includes(filters.party));
    }

    if (filters.session) {
      const session = parseInt(filters.session, 10);
      results = results.filter((debate) => debate.session === session);
    }

    results.sort(createSortComparator(filters.sort || "last_date", filters.sortDir || "DESC"));

    return results;
  }

  function groupDebates(debates) {
    const groupBy = getFilters().groupBy;
    if (!groupBy) return [{ key: "", label: "", debates }];

    const groups = new Map();

    for (const debate of debates) {
      let key;
      if (groupBy === "session") {
        key = String(debate.session);
      } else if (groupBy === "year") {
        key = debate.last_date ? debate.last_date.slice(0, 4) : "Óþekkt";
      } else if (groupBy === "party") {
        const parties = debate.parties?.length ? debate.parties : ["Óþekkt"];
        for (const party of parties) {
          if (!groups.has(party)) groups.set(party, []);
          groups.get(party).push(debate);
        }
        continue;
      } else {
        key = "";
      }

      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(debate);
    }

    return Array.from(groups.entries()).map(([key, items]) => {
      let label;
      if (groupBy === "session") {
        label = `${key}. löggjafarþing`;
      } else if (groupBy === "year" || groupBy === "party") {
        label = key;
      } else {
        label = key;
      }

      return { key, label, debates: items };
    });
  }

  function queryStats() {
    const debates = getDebates();
    const sessions = new Set(debates.map((debate) => debate.session));
    return {
      total: debates.length,
      totalSpeeches: debates.reduce((sum, debate) => sum + (debate.speech_count || 0), 0),
      totalWords: debates.reduce((sum, debate) => sum + (debate.total_words || 0), 0),
      sessions: sessions.size,
    };
  }

  function renderShell() {
    const filters = getFilters();
    const debates = getDebates();
    const periodCounts = getPeriodCounts(debates);

    const parties = [...new Set(debates.flatMap((debate) => debate.parties || []))]
      .sort((a, b) => a.localeCompare(b, "is"));

    const sessions = [...new Set(debates.map((debate) => debate.session))]
      .sort((a, b) => b - a);

    root.innerHTML = `
      <div class="st-stats" id="st-stats">${renderer.renderMessage("Hleð gögnum…", "ct-stat-loading")}</div>

      <section class="st-period-focus" aria-label="Tímabil umræðna">
        <div class="st-period-copy">
          <p class="st-period-eyebrow">Tímabil</p>
          <h2 class="st-period-title">Nýjustu umræðurnar fyrst</h2>
          <p class="st-period-note">Sjálfgefið eru sýnd þingmál frá ${escapeHtml(periodCounts.recentLabel)}. Eldri umræður eru áfram aðgengilegar í safninu þegar þú vilt kafa dýpra.</p>
        </div>
        <div class="st-period-actions">
          ${renderPeriodButton("recent", periodCounts.recentLabel, periodCounts.recent, filters.period)}
          ${renderPeriodButton("archive", periodCounts.archiveLabel, periodCounts.archive, filters.period)}
          ${renderPeriodButton("all", "Allt safnið", periodCounts.all, filters.period)}
        </div>
      </section>

      ${renderer.renderControlBlock({
        wrapperClass: "ct-controls",
        search: {
          id: "st-search",
          className: "ct-search",
          wrapClass: "ct-search-wrap",
          label: "Leita í þingræðum",
          placeholder: "Leita í umræðum eða ræðumönnum…",
          value: filters.search,
        },
        rows: [{
          className: "ct-filter-row",
          controls: [
            renderer.renderSelect({
              id: "st-party",
              className: "ct-select",
              label: "Flokkur",
              placeholder: "Allir flokkar",
              options: parties,
              selectedValue: filters.party,
            }),
            renderer.renderSelect({
              id: "st-session",
              className: "ct-select",
              label: "Löggjafarþing",
              placeholder: "Öll löggjafarþing",
              options: sessions.map((value) => ({
                value,
                label: `${value}. löggjafarþing`,
              })),
              selectedValue: filters.session,
            }),
            renderer.renderSelect({
              id: "st-group",
              className: "ct-select",
              label: "Flokka eftir",
              options: Object.entries(GROUP_LABELS).map(([value, label]) => ({ value, label })),
              selectedValue: filters.groupBy,
            }),
            renderer.renderSelect({
              id: "st-sort",
              className: "ct-select",
              label: "Röðun",
              options: [
                { value: "last_date", label: "Nýjast" },
                { value: "speech_count", label: "Flest ræður" },
                { value: "total_words", label: "Flest orð" },
                { value: "speaker_count", label: "Flestir þingmenn" },
              ],
              selectedValue: filters.sort,
            }),
          ],
        }],
      })}

      <div id="st-active-filters"></div>

      <p class="ct-results-meta" id="st-results-meta" aria-live="polite"></p>

      <div class="st-results" id="st-results">
        ${renderer.renderMessage("Hleð umræðum…", "ct-loading")}
      </div>
    `;
  }

  function renderStats() {
    const stats = queryStats();
    const el = document.getElementById("st-stats");
    if (!el) return;

    el.innerHTML = renderer.renderStatItems({
      items: [
        { value: formatNumber(stats.total), label: "umræður", valueHtml: formatNumber(stats.total) },
        { value: formatNumber(stats.totalSpeeches), label: "ræður", valueHtml: formatNumber(stats.totalSpeeches) },
        { value: formatNumber(stats.totalWords), label: "orð", valueHtml: formatNumber(stats.totalWords) },
        { value: stats.sessions, label: "löggjafarþing" },
      ],
    });
  }

  function renderResults() {
    const debates = queryDebates();
    const el = document.getElementById("st-results");
    if (!el) return;
    renderActiveFilters();
    updateResultsMeta(debates.length, getFilters().period || "recent");

    if (debates.length === 0) {
      const emptyMessage = (getFilters().period || "recent") === "all"
        ? renderer.renderMessage("Engar umræður fundust.", "ct-empty")
        : renderer.renderMessage("Engar umræður fundust á þessu tímabili.", "ct-empty");
      const expandButton = (getFilters().period || "recent") === "all"
        ? ""
        : '<div class="st-empty-action"><button class="st-expand-scope" id="st-expand-scope" type="button">Skoða allt safnið</button></div>';
      el.innerHTML = emptyMessage + expandButton;
      return;
    }

    const groups = groupDebates(debates);
    el.innerHTML = renderer.renderGroupedCollection({
      groups,
      getKey: (group) => group.key,
      getItems: (group) => group.debates,
      renderItem: renderDebateCard,
      gridClass: "st-grid",
      groupClass: "st-group",
      renderHeader: (group, count) =>
        `<h3 class="st-group-header">${escapeHtml(group.label)}<span class="st-group-count">${count}</span></h3>`,
    });
    restoreReturnTarget(el);
  }

  function updateResultsMeta(visibleCount, period) {
    const el = document.getElementById("st-results-meta");
    if (!el) return;

    const debates = getDebates();
    const periodCounts = getPeriodCounts(debates);
    const totalCount = Object.prototype.hasOwnProperty.call(periodCounts, period)
      ? periodCounts[period]
      : periodCounts.recent;
    const noun = period === "archive" ? "eldri þingmál" : "þingmál";
    let suffix = "í safninu";

    if (period === "recent") {
      suffix = `frá ${periodCounts.recentLabel}`;
    } else if (period === "archive") {
      suffix = `fyrir ${RECENT_START_YEAR}`;
    }

    if (visibleCount === totalCount) {
      el.textContent = `Sýni öll ${formatNumber(totalCount)} ${noun} ${suffix}.`;
      return;
    }

    el.textContent = `Sýni ${formatNumber(visibleCount)} af ${formatNumber(totalCount)} ${period === "archive" ? "eldri þingmálum" : "þingmálum"} ${suffix}.`;
  }

  function renderDebateCard(debate) {
    const cardId = `st-debate-${debate.slug}`;
    const sessionBadge = `<span class="st-session-badge">${debate.session}. þing</span>`;
    const althingiLink = debate.althingi_url
      ? `<a href="${escapeHtml(debate.althingi_url)}" class="st-althingi-link" target="_blank" rel="noopener">Alþingi.is &#x2197;</a>`
      : "";
    const dateStr = debate.last_date ? formatIsDate(debate.last_date) : "";

    const partyPills = (debate.parties || [])
      .map((party) => {
        const cls = PARTY_CLASSES[party] || "party-other";
        const short = PARTY_SHORT[party] || party.slice(0, 4);
        return `<span class="st-party-pill ${cls}" title="${escapeHtml(party)}">${escapeHtml(short)}</span>`;
      })
      .join("");

    const speakerHtml = (debate.top_speakers || [])
      .slice(0, 3)
      .map(
        (speaker) =>
          `<span class="st-speaker-name">${escapeHtml(speaker.name)}<span class="st-speaker-words"> (${formatNumber(speaker.words)})</span></span>`
      )
      .join(", ");

    const detailUrl = withReturnUrl(`/thingraedur/${debate.slug}/`, buildReturnUrl(cardId));

    return `
      <div class="st-card" id="${escapeHtml(cardId)}">
        <div class="st-card-top">
          ${sessionBadge}
          ${althingiLink}
        </div>
        <h4 class="st-card-title">
          <a href="${escapeHtml(detailUrl)}" class="st-card-link">${escapeHtml(debate.issue_title)}</a>
        </h4>
        <div class="st-card-meta">
          ${dateStr ? `<time>${dateStr}</time>` : ""}
          <span>Mál nr. ${escapeHtml(debate.issue_nr)}</span>
        </div>
        ${partyPills ? `<div class="st-parties">${partyPills}</div>` : ""}
        ${speakerHtml ? `<div class="st-speakers">${speakerHtml}</div>` : ""}
        <div class="st-card-footer">
          <span class="st-card-stat">${debate.speech_count} ræður</span>
          <span class="st-card-stat">${debate.speaker_count} þingmenn</span>
          <span class="st-card-stat">${formatNumber(debate.total_words)} orð</span>
        </div>
      </div>
    `;
  }

  function getPeriodChipLabel(filters) {
    const periodCounts = getPeriodCounts(getDebates());

    if (filters.period === "archive") {
      return `Tímabil: ${periodCounts.archiveLabel}`;
    }

    if (filters.period === "all") {
      return "Tímabil: Allt safnið";
    }

    return `Tímabil: ${periodCounts.recentLabel}`;
  }

  function getActiveFilterChips() {
    const filters = getFilters();
    const chips = [];
    const defaultPeriod = getDefaultPeriod(filters);

    if (filters.search) {
      chips.push({ key: "search", text: `Leit: ${filters.search}` });
    }

    if (filters.speaker) {
      chips.push({ key: "speaker", text: `Ræðumaður: ${filters.speaker}` });
    }

    if (filters.party) {
      chips.push({ key: "party", text: `Flokkur: ${filters.party}` });
    }

    if (filters.session) {
      chips.push({ key: "session", text: `Löggjafarþing: ${filters.session}. löggjafarþing` });
    }

    if (filters.period && filters.period !== defaultPeriod) {
      chips.push({ key: "period", text: getPeriodChipLabel(filters) });
    }

    if (filters.groupBy) {
      chips.push({ key: "group", text: `Flokkun: ${GROUP_LABELS[filters.groupBy] || filters.groupBy}` });
    }

    if (filters.sort && filters.sort !== "last_date") {
      chips.push({ key: "sort", text: `Röðun: ${SORT_LABELS[filters.sort] || filters.sort}` });
    }

    return chips;
  }

  function renderActiveFilters() {
    renderActiveFilterChips("st-active-filters", renderer, getActiveFilterChips);
  }

  const commitState = createCommitState(function syncUrl(state) {
    const defaultPeriod = getDefaultPeriod(state);
    (utils.updateUrlQuery || function () {})({
      q: state.search,
      speaker: state.speaker,
      party: state.party,
      session: state.session,
      period: state.period === defaultPeriod ? "" : state.period,
      group: state.groupBy,
      sort: state.sort === "last_date" ? "" : state.sort,
    });
  });

  function clearFilter(key, api) {
    const filters = getFilters();
    const patch = {};

    if (key === "search") patch.search = "";
    if (key === "speaker") patch.speaker = "";
    if (key === "party") patch.party = "";
    if (key === "session") patch.session = "";
    if (key === "period") patch.period = getDefaultPeriod(filters);
    if (key === "group") patch.groupBy = "";
    if (key === "sort") patch.sort = "last_date";

    commitState(patch, "all", api);
  }

  function clearAllFilters(api) {
    commitState(
      {
        search: "",
        speaker: "",
        party: "",
        session: "",
        period: getDefaultPeriod({ search: "", speaker: "", party: "", session: "" }),
        groupBy: "",
        sort: "last_date",
      },
      "all",
      api
    );
  }

  controller.bindInput(
    "#st-search",
    (value, _target, _event, api) => {
      commitState({ search: value }, "results", api);
    },
    { debounceMs: 200, trim: true }
  );

  controller.bindChange("#st-party", (value, _target, _event, api) => {
    commitState({ party: value }, "results", api);
  });

  controller.bindChange("#st-session", (value, _target, _event, api) => {
    commitState({ session: value }, "results", api);
  });

  controller.bindClick("[data-period-value]", (target, _event, api) => {
    commitState({ period: target.getAttribute("data-period-value") || "recent" }, "all", api);
  });

  controller.bindChange("#st-group", (value, _target, _event, api) => {
    commitState({ groupBy: value }, "results", api);
  });

  controller.bindChange("#st-sort", (value, _target, _event, api) => {
    commitState({ sort: value }, "results", api);
  });

  controller.bindClick("#st-expand-scope", (_target, _event, api) => {
    commitState({ period: "all" }, "all", api);
  });

  controller.bindClick("[data-clear-filter]", (target, _event, api) => {
    clearFilter(target.getAttribute("data-clear-filter"), api);
  });

  controller.bindClick("[data-clear-all-filters]", (_target, _event, api) => {
    clearAllFilters(api);
  });

  controller.start();
})();
