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
  const formatIsDate = utils.formatIsDate || ((value) => String(value ?? ""));
  const formatNumber = utils.formatNumber || ((value) => String(value ?? "0"));
  const DATA_BASE = utils.getDataBase
    ? utils.getDataBase(document.currentScript, "/assets/data")
    : (document.currentScript?.dataset.base || "/assets/data");
  const JSON_URL = `${DATA_BASE}/debates.json`;
  const PARTY_CLASSES = TAXONOMY.partyClasses || {};
  const PARTY_SHORT = TAXONOMY.partyShortLabels || {};

  const GROUP_LABELS = {
    "": "Engin flokkun",
    session: "Löggjafarþing",
    year: "Ár",
    party: "Flokkur",
  };

  const root = document.getElementById("speeches-tracker");
  if (!root || !renderer || !createController) return;

  const params = new URLSearchParams(window.location.search);

  const controller = createController({
    root,
    initialState: {
      search: "",
      speaker: params.get("speaker") || "",
      party: "",
      session: "",
      groupBy: "",
      sort: "last_date",
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
    onError() {
      renderShell();
      const stats = document.getElementById("st-stats");
      const results = document.getElementById("st-results");
      if (stats) {
        stats.innerHTML = renderer.renderMessage("Gat ekki hlaðið gögnum.", "ct-stat-loading");
      }
      if (results) {
        results.innerHTML = renderer.renderMessage("Engar umræður fundust.", "ct-empty");
      }
    },
  });

  function getDebates() {
    return controller.getData() || [];
  }

  function getFilters() {
    return controller.getState();
  }

  function queryDebates() {
    const filters = getFilters();
    let results = [...getDebates()];

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

    const sort = filters.sort || "last_date";
    const dir = filters.sortDir === "ASC" ? 1 : -1;
    results.sort((a, b) => {
      const va = a[sort] ?? "";
      const vb = b[sort] ?? "";
      if (typeof va === "number") return (va - vb) * dir;
      return String(va).localeCompare(String(vb), "is") * dir;
    });

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

    const parties = [...new Set(debates.flatMap((debate) => debate.parties || []))]
      .sort((a, b) => a.localeCompare(b, "is"));

    const sessions = [...new Set(debates.map((debate) => debate.session))]
      .sort((a, b) => b - a);

    root.innerHTML = `
      <div class="st-stats" id="st-stats">${renderer.renderMessage("Hleð gögnum…", "ct-stat-loading")}</div>

      ${renderer.renderControlBlock({
        wrapperClass: "ct-controls",
        search: {
          id: "st-search",
          className: "ct-search",
          wrapClass: "ct-search-wrap",
          placeholder: "Leita í umræðum eða ræðumönnum…",
          value: filters.search,
        },
        rows: [{
          className: "ct-filter-row",
          controls: [
            renderer.renderSelect({
              id: "st-party",
              className: "ct-select",
              placeholder: "Allir flokkar",
              options: parties,
              selectedValue: filters.party,
            }),
            renderer.renderSelect({
              id: "st-session",
              className: "ct-select",
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
              options: Object.entries(GROUP_LABELS).map(([value, label]) => ({ value, label })),
              selectedValue: filters.groupBy,
            }),
            renderer.renderSelect({
              id: "st-sort",
              className: "ct-select",
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

      ${filters.speaker ? `
      <div class="st-speaker-filter" id="st-speaker-filter">
        <span>Sýni þingræður <strong>${escapeHtml(filters.speaker)}</strong></span>
        <button class="st-clear-speaker" id="st-clear-speaker" type="button">&times; Hreinsa síu</button>
      </div>` : ""}

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

    if (debates.length === 0) {
      el.innerHTML = renderer.renderMessage("Engar umræður fundust.", "ct-empty");
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
  }

  function renderDebateCard(debate) {
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

    return `
      <div class="st-card">
        <div class="st-card-top">
          ${sessionBadge}
          ${althingiLink}
        </div>
        <h4 class="st-card-title">
          <a href="/thingraedur/${escapeHtml(debate.slug)}/" class="st-card-link">${escapeHtml(debate.issue_title)}</a>
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

  controller.bindInput(
    "#st-search",
    (value, _target, _event, api) => {
      api.setState({ search: value }, "results");
    },
    { debounceMs: 200, trim: true }
  );

  controller.bindChange("#st-party", (value, _target, _event, api) => {
    api.setState({ party: value }, "results");
  });

  controller.bindChange("#st-session", (value, _target, _event, api) => {
    api.setState({ session: value }, "results");
  });

  controller.bindChange("#st-group", (value, _target, _event, api) => {
    api.setState({ groupBy: value }, "results");
  });

  controller.bindChange("#st-sort", (value, _target, _event, api) => {
    api.setState({ sort: value }, "results");
  });

  controller.bindClick("#st-clear-speaker", (_target, _event, api) => {
    window.history.replaceState({}, "", window.location.pathname);
    api.setState({ speaker: "" }, "all");
  });

  controller.start();
})();
