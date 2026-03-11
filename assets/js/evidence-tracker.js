/**
 * ESBvaktin Evidence Tracker — Client-side listing
 *
 * Renders evidence cards with search, filter, group, and sort.
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
  const restoreReturnTarget = utils.restoreReturnTarget || (() => false);
  const withReturnUrl = utils.withReturnUrl || ((url) => url);
  const DATA_BASE = utils.getDataBase
    ? utils.getDataBase(document.currentScript, "/assets/data")
    : (document.querySelector("[data-base]")?.getAttribute("data-base") || "/assets/data");
  const JSON_URL = `${DATA_BASE}/evidence.json`;
  const TOPIC_LABELS = TAXONOMY.categoryLabels || {};
  const SOURCE_TYPE_LABELS = TAXONOMY.evidenceSourceTypeLabels || {};
  const DOMAIN_LABELS = TAXONOMY.domainLabels || {};
  const CONFIDENCE_LABELS = TAXONOMY.confidenceLabels || {};
  const GROUP_LABELS = {
    topic: "Efnisflokkur",
    source_type: "Heimildagerð",
    domain: "Svið",
    confidence: "Áreiðanleiki",
  };
  const SORT_LABELS = {
    evidence_id: "Auðkenni",
    source_date: "Dagsetning",
    related_count: "Tengdar heimildir",
    topic: "Efnisflokkur",
  };

  const root = document.getElementById("evidence-tracker");
  if (!root || !renderer || !createController) return;

  const params = new URLSearchParams(window.location.search);

  const controller = createController({
    root,
    initialState: {
      search: params.get("q") || "",
      topic: params.get("topic") || "",
      sourceType: params.get("source_type") || "",
      domain: params.get("domain") || "",
      confidence: params.get("confidence") || "",
      groupBy: params.get("group") || "topic",
      sort: params.get("sort") || "source_date",
    },
    initialData: [],
    async load(api) {
      return api.loadJson(JSON_URL);
    },
    renderShell() {
      root.innerHTML = renderer.renderMessage("Hleð gögnum…", "ev-empty");
    },
    renderResults: renderAll,
    initialRender: "results",
    onError(error) {
      root.innerHTML = renderer.renderMessage("Gat ekki hlaðið gögnum.", "ev-empty");
      console.error("Evidence tracker: failed to load data", error);
    },
  });

  function getEvidence() {
    return controller.getData() || [];
  }

  function getState() {
    return controller.getState();
  }

  function filterEvidence() {
    const state = getState();
    let filtered = getEvidence();

    if (state.search) {
      const q = state.search.toLowerCase();
      filtered = filtered.filter(
        (evidence) =>
          evidence.evidence_id.toLowerCase().includes(q) ||
          evidence.statement.toLowerCase().includes(q) ||
          evidence.source_name.toLowerCase().includes(q) ||
          (TOPIC_LABELS[evidence.topic] || "").toLowerCase().includes(q)
      );
    }

    if (state.topic) {
      filtered = filtered.filter((evidence) => evidence.topic === state.topic);
    }

    if (state.sourceType) {
      filtered = filtered.filter((evidence) => evidence.source_type === state.sourceType);
    }

    if (state.domain) {
      filtered = filtered.filter((evidence) => evidence.domain === state.domain);
    }

    if (state.confidence) {
      filtered = filtered.filter((evidence) => evidence.confidence === state.confidence);
    }

    return filtered;
  }

  function sortEvidence(list) {
    const state = getState();
    const sorted = [...list];

    switch (state.sort) {
      case "source_date":
        sorted.sort((a, b) => (b.source_date || "").localeCompare(a.source_date || ""));
        break;
      case "related_count":
        sorted.sort((a, b) => (b.related_count || 0) - (a.related_count || 0));
        break;
      case "topic":
        sorted.sort((a, b) =>
          (TOPIC_LABELS[a.topic] || a.topic).localeCompare(TOPIC_LABELS[b.topic] || b.topic, "is")
        );
        break;
      case "evidence_id":
      default:
        sorted.sort((a, b) => a.evidence_id.localeCompare(b.evidence_id));
        break;
    }

    return sorted;
  }

  function groupEvidence(list) {
    const state = getState();
    if (!state.groupBy) return [{ label: null, items: list }];

    const groups = new Map();

    for (const evidence of list) {
      let key;
      let label;

      switch (state.groupBy) {
        case "topic":
          key = evidence.topic;
          label = TOPIC_LABELS[evidence.topic] || evidence.topic;
          break;
        case "source_type":
          key = evidence.source_type;
          label = SOURCE_TYPE_LABELS[evidence.source_type] || evidence.source_type;
          break;
        case "domain":
          key = evidence.domain;
          label = DOMAIN_LABELS[evidence.domain] || evidence.domain;
          break;
        case "confidence":
          key = evidence.confidence;
          label = CONFIDENCE_LABELS[evidence.confidence] || evidence.confidence;
          break;
        default:
          key = "";
          label = "";
      }

      if (!groups.has(key)) {
        groups.set(key, { label, items: [] });
      }
      groups.get(key).items.push(evidence);
    }

    return Array.from(groups.values()).sort((a, b) => a.label.localeCompare(b.label, "is"));
  }

  function renderCard(evidence) {
    const cardId = `ev-evidence-${evidence.slug}`;
    const topicLabel = TOPIC_LABELS[evidence.topic] || evidence.topic;
    const sourceTypeLabel = SOURCE_TYPE_LABELS[evidence.source_type] || evidence.source_type;
    const confidenceLabel = CONFIDENCE_LABELS[evidence.confidence] || evidence.confidence;
    const datePart = evidence.source_date
      ? `<time datetime="${escapeHtml(evidence.source_date)}">${formatIsDate(evidence.source_date)}</time>`
      : "";
    const relatedBadge =
      evidence.related_count > 0
        ? `<span>${evidence.related_count} tengd${evidence.related_count > 1 ? "ar" : ""}</span>`
        : "";

    return `
      <a href="${escapeHtml(withReturnUrl(`/heimildir/${evidence.slug}/`, buildReturnUrl(cardId)))}" class="ev-card" id="${escapeHtml(cardId)}">
        <div class="ev-card-top">
          <span class="ev-card-id">${escapeHtml(evidence.evidence_id)}</span>
          <span class="ev-source-type-badge ev-st-${evidence.source_type}">${escapeHtml(sourceTypeLabel)}</span>
          <span class="ev-confidence-badge ev-conf-${evidence.confidence}">${escapeHtml(confidenceLabel)}</span>
        </div>
        <p class="ev-card-statement">${escapeHtml(evidence.statement)}</p>
        <div class="ev-card-meta">
          <span class="ev-card-source">${escapeHtml(evidence.source_name)}</span>
          ${datePart}
        </div>
        <div class="ev-card-stats">
          <span class="ev-topic-tag">${escapeHtml(topicLabel)}</span>
          ${relatedBadge}
        </div>
      </a>`;
  }

  function renderAll() {
    const allEvidence = getEvidence();
    const state = getState();
    const filtered = filterEvidence();
    const sorted = sortEvidence(filtered);
    const groups = groupEvidence(sorted);

    const topics = [...new Set(allEvidence.map((evidence) => evidence.topic))]
      .sort((a, b) => (TOPIC_LABELS[a] || a).localeCompare(TOPIC_LABELS[b] || b, "is"));
    const sourceTypes = [...new Set(allEvidence.map((evidence) => evidence.source_type))]
      .sort((a, b) => (SOURCE_TYPE_LABELS[a] || a).localeCompare(SOURCE_TYPE_LABELS[b] || b, "is"));
    const domains = [...new Set(allEvidence.map((evidence) => evidence.domain))]
      .sort((a, b) => (DOMAIN_LABELS[a] || a).localeCompare(DOMAIN_LABELS[b] || b, "is"));

    let html = "";

    html += `<div class="ev-stats">
      <span><strong>${allEvidence.length}</strong> heimildir</span>
      <span><strong>${topics.length}</strong> efnisflokkar</span>
      <span><strong>${sourceTypes.length}</strong> heimildagerðir</span>
    </div>`;

    html += renderer.renderControlBlock({
      wrapperClass: "ev-controls",
      search: {
        className: "ev-search",
        wrapClass: "tracker-search-wrap",
        label: "Leita í heimildum",
        placeholder: "Leita eftir heimildum...",
        value: state.search,
      },
      rows: [
        {
          className: "ev-filter-row",
          controls: [
            renderer.renderSelect({
              className: "ev-filter-topic",
              label: "Efnisflokkur",
              placeholder: "Allir flokkar",
              options: topics.map((value) => ({
                value,
                label: TOPIC_LABELS[value] || value,
              })),
              selectedValue: state.topic,
            }),
            renderer.renderSelect({
              className: "ev-filter-source-type",
              label: "Heimildagerð",
              placeholder: "Allar gerðir",
              options: sourceTypes.map((value) => ({
                value,
                label: SOURCE_TYPE_LABELS[value] || value,
              })),
              selectedValue: state.sourceType,
            }),
            renderer.renderSelect({
              className: "ev-filter-domain",
              label: "Svið",
              placeholder: "Öll svið",
              options: domains.map((value) => ({
                value,
                label: DOMAIN_LABELS[value] || value,
              })),
              selectedValue: state.domain,
            }),
            renderer.renderSelect({
              className: "ev-filter-confidence",
              label: "Áreiðanleiki",
              placeholder: "Öll áreiðanleikastig",
              options: Object.entries(CONFIDENCE_LABELS).map(([value, label]) => ({ value, label })),
              selectedValue: state.confidence,
            }),
          ],
        },
        {
          className: "ev-filter-row",
          controls: [
            renderer.renderSelect({
              className: "ev-group-by",
              label: "Flokka eftir",
              placeholder: "Engin flokkun",
              options: [
                { value: "topic", label: "Efnisflokkur" },
                { value: "source_type", label: "Heimildagerð" },
                { value: "domain", label: "Svið" },
                { value: "confidence", label: "Áreiðanleiki" },
              ],
              selectedValue: state.groupBy,
            }),
            renderer.renderSelect({
              className: "ev-sort-by",
              label: "Röðun",
              options: [
                { value: "evidence_id", label: "Auðkenni" },
                { value: "source_date", label: "Dagsetning" },
                { value: "related_count", label: "Tengdar heimildir" },
                { value: "topic", label: "Efnisflokkur" },
              ],
              selectedValue: state.sort,
            }),
          ],
        },
      ],
    });

    if (typeof renderer.renderFilterChips === "function") {
      html += renderer.renderFilterChips({
        items: getActiveFilterChips(state),
        clearAllLabel: "Hreinsa allt",
      });
    }

    if (filtered.length !== allEvidence.length) {
      html += `<p class="ev-stats"><strong>${filtered.length}</strong> af ${allEvidence.length} heimild${allEvidence.length !== 1 ? "um" : ""}</p>`;
    }

    if (filtered.length === 0) {
      html += renderer.renderMessage("Engar heimildir fundust.", "ev-empty");
    } else {
      html += renderer.renderGroupedCollection({
        groups,
        getItems: (group) => group.items,
        renderItem: renderCard,
        gridClass: "ev-grid",
        renderHeader: (group, count) => {
          if (!group.label) return "";
          return `<h2 class="ev-group-heading">${escapeHtml(group.label)} <span style="font-weight:400;font-size:0.8em;color:var(--text-secondary)">(${count})</span></h2>`;
        },
      });
    }

    root.innerHTML = html;
    restoreReturnTarget(root);
  }

  function getActiveFilterChips(state) {
    const chips = [];

    if (state.search) {
      chips.push({ key: "search", text: `Leit: ${state.search}` });
    }

    if (state.topic) {
      chips.push({ key: "topic", text: `Efnisflokkur: ${TOPIC_LABELS[state.topic] || state.topic}` });
    }

    if (state.sourceType) {
      chips.push({ key: "source_type", text: `Heimildagerð: ${SOURCE_TYPE_LABELS[state.sourceType] || state.sourceType}` });
    }

    if (state.domain) {
      chips.push({ key: "domain", text: `Svið: ${DOMAIN_LABELS[state.domain] || state.domain}` });
    }

    if (state.confidence) {
      chips.push({ key: "confidence", text: `Áreiðanleiki: ${CONFIDENCE_LABELS[state.confidence] || state.confidence}` });
    }

    if (state.groupBy && state.groupBy !== "topic") {
      chips.push({ key: "group", text: `Flokkun: ${GROUP_LABELS[state.groupBy] || state.groupBy}` });
    }

    if (state.sort && state.sort !== "source_date") {
      chips.push({ key: "sort", text: `Röðun: ${SORT_LABELS[state.sort] || state.sort}` });
    }

    return chips;
  }

  function syncUrl(state) {
    (utils.updateUrlQuery || function () {})({
      q: state.search,
      topic: state.topic,
      source_type: state.sourceType,
      domain: state.domain,
      confidence: state.confidence,
      group: state.groupBy === "topic" ? "" : state.groupBy,
      sort: state.sort === "source_date" ? "" : state.sort,
    });
  }

  function commitState(patch, api, options) {
    const nextState = Object.assign({}, api.getState(), patch || {});
    syncUrl(nextState);
    api.setState(patch, options || "results");
    return nextState;
  }

  function clearFilter(key, api) {
    const patch = {};

    if (key === "search") patch.search = "";
    if (key === "topic") patch.topic = "";
    if (key === "source_type") patch.sourceType = "";
    if (key === "domain") patch.domain = "";
    if (key === "confidence") patch.confidence = "";
    if (key === "group") patch.groupBy = "topic";
    if (key === "sort") patch.sort = "source_date";

    commitState(patch, api);
  }

  function clearAllFilters(api) {
    commitState(
      {
        search: "",
        topic: "",
        sourceType: "",
        domain: "",
        confidence: "",
        groupBy: "topic",
        sort: "source_date",
      },
      api
    );
  }

  controller.bindInput(
    ".ev-search",
    (value, _target, _event, api) => {
      commitState({ search: value }, api, { render: "results", focusSelector: ".ev-search" });
    },
    { debounceMs: 200 }
  );

  controller.bindChange(".ev-filter-topic", (value, _target, _event, api) => {
    commitState({ topic: value }, api);
  });

  controller.bindChange(".ev-filter-source-type", (value, _target, _event, api) => {
    commitState({ sourceType: value }, api);
  });

  controller.bindChange(".ev-filter-domain", (value, _target, _event, api) => {
    commitState({ domain: value }, api);
  });

  controller.bindChange(".ev-filter-confidence", (value, _target, _event, api) => {
    commitState({ confidence: value }, api);
  });

  controller.bindChange(".ev-group-by", (value, _target, _event, api) => {
    commitState({ groupBy: value }, api);
  });

  controller.bindChange(".ev-sort-by", (value, _target, _event, api) => {
    commitState({ sort: value }, api);
  });

  controller.bindClick("[data-clear-filter]", (target, _event, api) => {
    clearFilter(target.getAttribute("data-clear-filter"), api);
  });

  controller.bindClick("[data-clear-all-filters]", (_target, _event, api) => {
    clearAllFilters(api);
  });

  controller.start();
})();
