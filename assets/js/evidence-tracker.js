/**
 * ESBvaktin Evidence Tracker — Client-Side Listing
 *
 * IIFE that renders evidence cards with search, filter, group, and sort.
 * Loaded on /heimildir/ with data-base="/assets/data".
 */
;(function () {
  "use strict";

  const root = document.getElementById("evidence-tracker");
  if (!root) return;

  const base = document.querySelector("[data-base]")?.getAttribute("data-base") || "/assets/data";

  // ── Icelandic label maps ──────────────────────────────────────────

  const TOPIC_LABELS = {
    fisheries: "Sjávarútvegur",
    trade: "Viðskipti",
    sovereignty: "Fullveldi",
    agriculture: "Landbúnaður",
    labour: "Vinnumarkaður",
    currency: "Gjaldmiðill",
    precedents: "Fordæmi",
    eea_eu_law: "EES/ESB-löggjöf",
    housing: "Húsnæðismál",
    polling: "Kannanir",
    party_positions: "Flokkastefnur",
    org_positions: "Samtakastefnur",
    energy: "Orkumál",
  };

  const SOURCE_TYPE_LABELS = {
    official_statistics: "Opinber tölfræði",
    legal_text: "Lagalegur texti",
    academic_paper: "Fræðigrein",
    expert_analysis: "Sérfræðigreining",
    international_org: "Alþjóðastofnun",
    parliamentary_record: "Þingskjal",
  };

  const DOMAIN_LABELS = {
    legal: "Lögfræðilegt",
    economic: "Efnahagslegt",
    political: "Stjórnmálalegt",
    precedent: "Fordæmi",
  };

  const CONFIDENCE_LABELS = {
    high: "Há",
    medium: "Miðlungs",
    low: "Lág",
  };

  // ── State ─────────────────────────────────────────────────────────

  let allEvidence = [];
  let currentSearch = "";
  let currentTopic = "";
  let currentSourceType = "";
  let currentDomain = "";
  let currentConfidence = "";
  let currentGroupBy = "";
  let currentSort = "evidence_id";

  // ── Data loading ──────────────────────────────────────────────────

  async function loadData() {
    try {
      const resp = await fetch(`${base}/evidence.json`);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      allEvidence = await resp.json();
      render();
    } catch (err) {
      root.innerHTML = '<p class="ev-empty">Gat ekki hlaðið gögnum.</p>';
      console.error("Evidence tracker: failed to load data", err);
    }
  }

  // ── Filtering ─────────────────────────────────────────────────────

  function filterEvidence() {
    let filtered = allEvidence;

    if (currentSearch) {
      const q = currentSearch.toLowerCase();
      filtered = filtered.filter(
        (e) =>
          e.evidence_id.toLowerCase().includes(q) ||
          e.statement.toLowerCase().includes(q) ||
          e.source_name.toLowerCase().includes(q) ||
          (TOPIC_LABELS[e.topic] || "").toLowerCase().includes(q)
      );
    }

    if (currentTopic) {
      filtered = filtered.filter((e) => e.topic === currentTopic);
    }

    if (currentSourceType) {
      filtered = filtered.filter((e) => e.source_type === currentSourceType);
    }

    if (currentDomain) {
      filtered = filtered.filter((e) => e.domain === currentDomain);
    }

    if (currentConfidence) {
      filtered = filtered.filter((e) => e.confidence === currentConfidence);
    }

    return filtered;
  }

  // ── Sorting ───────────────────────────────────────────────────────

  function sortEvidence(list) {
    const sorted = [...list];

    switch (currentSort) {
      case "evidence_id":
        sorted.sort((a, b) => a.evidence_id.localeCompare(b.evidence_id));
        break;
      case "source_date":
        sorted.sort((a, b) => {
          const da = a.source_date || "";
          const db = b.source_date || "";
          return db.localeCompare(da); // newest first
        });
        break;
      case "related_count":
        sorted.sort((a, b) => (b.related_count || 0) - (a.related_count || 0));
        break;
      case "topic":
        sorted.sort((a, b) =>
          (TOPIC_LABELS[a.topic] || a.topic).localeCompare(
            TOPIC_LABELS[b.topic] || b.topic,
            "is"
          )
        );
        break;
    }

    return sorted;
  }

  // ── Grouping ──────────────────────────────────────────────────────

  function groupEvidence(list) {
    if (!currentGroupBy) return [{ label: null, items: list }];

    const groups = new Map();

    for (const e of list) {
      let key, label;

      switch (currentGroupBy) {
        case "topic":
          key = e.topic;
          label = TOPIC_LABELS[e.topic] || e.topic;
          break;
        case "source_type":
          key = e.source_type;
          label = SOURCE_TYPE_LABELS[e.source_type] || e.source_type;
          break;
        case "domain":
          key = e.domain;
          label = DOMAIN_LABELS[e.domain] || e.domain;
          break;
        case "confidence":
          key = e.confidence;
          label = CONFIDENCE_LABELS[e.confidence] || e.confidence;
          break;
        default:
          key = "";
          label = "";
      }

      if (!groups.has(key)) {
        groups.set(key, { label, items: [] });
      }
      groups.get(key).items.push(e);
    }

    // Sort groups alphabetically by label
    return Array.from(groups.values()).sort((a, b) =>
      a.label.localeCompare(b.label, "is")
    );
  }

  // ── Card rendering ────────────────────────────────────────────────

  function renderCard(e) {
    const topicLabel = TOPIC_LABELS[e.topic] || e.topic;
    const stLabel = SOURCE_TYPE_LABELS[e.source_type] || e.source_type;
    const confLabel = CONFIDENCE_LABELS[e.confidence] || e.confidence;

    const datePart = e.source_date
      ? `<time datetime="${esc(e.source_date)}">${formatIsDate(e.source_date)}</time>`
      : "";

    const relatedBadge =
      e.related_count > 0
        ? `<span>${e.related_count} tengd${e.related_count > 1 ? "ar" : ""}</span>`
        : "";

    return `
      <a href="/heimildir/${esc(e.slug)}/" class="ev-card">
        <div class="ev-card-top">
          <span class="ev-card-id">${esc(e.evidence_id)}</span>
          <span class="ev-source-type-badge ev-st-${e.source_type}">${esc(stLabel)}</span>
          <span class="ev-confidence-badge ev-conf-${e.confidence}">${esc(confLabel)}</span>
        </div>
        <p class="ev-card-statement">${esc(e.statement)}</p>
        <div class="ev-card-meta">
          <span class="ev-card-source">${esc(e.source_name)}</span>
          ${datePart}
        </div>
        <div class="ev-card-stats">
          <span class="ev-topic-tag">${esc(topicLabel)}</span>
          ${relatedBadge}
        </div>
      </a>`;
  }

  // ── Full render ───────────────────────────────────────────────────

  function render() {
    const filtered = filterEvidence();
    const sorted = sortEvidence(filtered);
    const groups = groupEvidence(sorted);

    // Collect unique values for filter dropdowns
    const topics = [...new Set(allEvidence.map((e) => e.topic))].sort((a, b) =>
      (TOPIC_LABELS[a] || a).localeCompare(TOPIC_LABELS[b] || b, "is")
    );
    const sourceTypes = [...new Set(allEvidence.map((e) => e.source_type))].sort(
      (a, b) =>
        (SOURCE_TYPE_LABELS[a] || a).localeCompare(
          SOURCE_TYPE_LABELS[b] || b,
          "is"
        )
    );
    const domains = [...new Set(allEvidence.map((e) => e.domain))].sort((a, b) =>
      (DOMAIN_LABELS[a] || a).localeCompare(DOMAIN_LABELS[b] || b, "is")
    );

    let html = "";

    // Stats
    html += `<div class="ev-stats">
      <span><strong>${allEvidence.length}</strong> heimildir</span>
      <span><strong>${topics.length}</strong> efnisflokkar</span>
      <span><strong>${sourceTypes.length}</strong> heimildagerðir</span>
    </div>`;

    // Controls
    html += `<div class="ev-controls">
      <input type="search" class="ev-search" placeholder="Leita eftir heimildum..." value="${esc(currentSearch)}">
      <div class="ev-filter-row">
        <select class="ev-filter-topic">
          <option value="">Allir flokkar</option>
          ${topics.map((t) => `<option value="${t}"${t === currentTopic ? " selected" : ""}>${esc(TOPIC_LABELS[t] || t)}</option>`).join("")}
        </select>
        <select class="ev-filter-source-type">
          <option value="">Allar gerðir</option>
          ${sourceTypes.map((s) => `<option value="${s}"${s === currentSourceType ? " selected" : ""}>${esc(SOURCE_TYPE_LABELS[s] || s)}</option>`).join("")}
        </select>
        <select class="ev-filter-domain">
          <option value="">Öll svið</option>
          ${domains.map((d) => `<option value="${d}"${d === currentDomain ? " selected" : ""}>${esc(DOMAIN_LABELS[d] || d)}</option>`).join("")}
        </select>
        <select class="ev-filter-confidence">
          <option value="">Öll áreiðanleikastig</option>
          <option value="high"${"high" === currentConfidence ? " selected" : ""}>Há</option>
          <option value="medium"${"medium" === currentConfidence ? " selected" : ""}>Miðlungs</option>
          <option value="low"${"low" === currentConfidence ? " selected" : ""}>Lág</option>
        </select>
      </div>
      <div class="ev-filter-row">
        <select class="ev-group-by">
          <option value="">Engin flokkun</option>
          <option value="topic"${"topic" === currentGroupBy ? " selected" : ""}>Efnisflokkur</option>
          <option value="source_type"${"source_type" === currentGroupBy ? " selected" : ""}>Heimildagerð</option>
          <option value="domain"${"domain" === currentGroupBy ? " selected" : ""}>Svið</option>
          <option value="confidence"${"confidence" === currentGroupBy ? " selected" : ""}>Áreiðanleiki</option>
        </select>
        <select class="ev-sort-by">
          <option value="evidence_id"${"evidence_id" === currentSort ? " selected" : ""}>Auðkenni</option>
          <option value="source_date"${"source_date" === currentSort ? " selected" : ""}>Dagsetning</option>
          <option value="related_count"${"related_count" === currentSort ? " selected" : ""}>Tengdar heimildir</option>
          <option value="topic"${"topic" === currentSort ? " selected" : ""}>Efnisflokkur</option>
        </select>
      </div>
    </div>`;

    // Results count
    if (filtered.length !== allEvidence.length) {
      html += `<p class="ev-stats"><strong>${filtered.length}</strong> af ${allEvidence.length} heimild${allEvidence.length !== 1 ? "um" : ""}</p>`;
    }

    // Groups + cards
    if (filtered.length === 0) {
      html += '<p class="ev-empty">Engar heimildir fundust.</p>';
    } else {
      for (const group of groups) {
        if (group.label) {
          html += `<h2 class="ev-group-heading">${esc(group.label)} <span style="font-weight:400;font-size:0.8em;color:var(--text-secondary)">(${group.items.length})</span></h2>`;
        }
        html += '<div class="ev-grid">';
        for (const e of group.items) {
          html += renderCard(e);
        }
        html += "</div>";
      }
    }

    root.innerHTML = html;
    bindEvents();
  }

  // ── Event binding ─────────────────────────────────────────────────

  function bindEvents() {
    const search = root.querySelector(".ev-search");
    if (search) {
      let debounce;
      search.addEventListener("input", (e) => {
        clearTimeout(debounce);
        debounce = setTimeout(() => {
          currentSearch = e.target.value;
          render();
          // Re-focus search after render
          const s = root.querySelector(".ev-search");
          if (s) {
            s.focus();
            s.setSelectionRange(s.value.length, s.value.length);
          }
        }, 200);
      });
    }

    const filterTopic = root.querySelector(".ev-filter-topic");
    if (filterTopic) {
      filterTopic.addEventListener("change", (e) => {
        currentTopic = e.target.value;
        render();
      });
    }

    const filterST = root.querySelector(".ev-filter-source-type");
    if (filterST) {
      filterST.addEventListener("change", (e) => {
        currentSourceType = e.target.value;
        render();
      });
    }

    const filterDomain = root.querySelector(".ev-filter-domain");
    if (filterDomain) {
      filterDomain.addEventListener("change", (e) => {
        currentDomain = e.target.value;
        render();
      });
    }

    const filterConf = root.querySelector(".ev-filter-confidence");
    if (filterConf) {
      filterConf.addEventListener("change", (e) => {
        currentConfidence = e.target.value;
        render();
      });
    }

    const groupBy = root.querySelector(".ev-group-by");
    if (groupBy) {
      groupBy.addEventListener("change", (e) => {
        currentGroupBy = e.target.value;
        render();
      });
    }

    const sortBy = root.querySelector(".ev-sort-by");
    if (sortBy) {
      sortBy.addEventListener("change", (e) => {
        currentSort = e.target.value;
        render();
      });
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────

  function esc(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  const IS_MONTHS = [
    "janúar", "febrúar", "mars", "apríl", "maí", "júní",
    "júlí", "ágúst", "september", "október", "nóvember", "desember",
  ];

  function formatIsDate(dateStr) {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    if (isNaN(d)) return dateStr;
    return `${d.getUTCDate()}. ${IS_MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
  }

  // ── URL params ────────────────────────────────────────────────────

  function readUrlParams() {
    const params = new URLSearchParams(window.location.search);
    if (params.has("topic")) currentTopic = params.get("topic");
    if (params.has("source_type")) currentSourceType = params.get("source_type");
    if (params.has("domain")) currentDomain = params.get("domain");
    if (params.has("q")) currentSearch = params.get("q");
  }

  // ── Init ──────────────────────────────────────────────────────────

  readUrlParams();
  loadData();
})();
