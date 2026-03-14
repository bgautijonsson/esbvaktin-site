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
  const escapeHtml = utils.escapeHtml || ((value) => String(value ?? ""));
  const buildReturnUrl = utils.buildReturnUrl || (() => "");
  const findReportForSource = utils.findReportForSource || (() => null);
  const restoreReturnTarget = utils.restoreReturnTarget || (() => false);
  const withReturnUrl = utils.withReturnUrl || ((url) => url);
  const createSortComparator = utils.createSortComparator;
  const createCommitState = utils.createCommitState;
  const createErrorHandler = utils.createErrorHandler;
  const renderActiveFilterChips = utils.renderActiveFilterChips;
  const DATA_BASE = utils.getDataBase
    ? utils.getDataBase(document.currentScript, "/assets/data")
    : (document.currentScript?.dataset.base || "/assets/data");
  const CLAIMS_URL = `${DATA_BASE}/claims.json`;
  const REPORTS_URL = `${DATA_BASE}/reports.json`;

  /** Turn plain evidence IDs (e.g. SOV-PARL-005) into hoverable .evidence-link anchors.
   *  Applied AFTER escapeHtml — IDs only contain [A-Z0-9-] so they survive escaping. */
  const EVIDENCE_ID_RE = /\b([A-Z]+-[A-Z]+-\d+)\b/g;
  function linkifyEvidenceIds(html) {
    return html.replace(
      EVIDENCE_ID_RE,
      (_, id) => `<a href="/heimildir/${id.toLowerCase()}/" class="evidence-link" data-evidence-id="${id}">${id}</a>`
    );
  }
  const VERDICT_LABELS = TAXONOMY.verdictLabels || {};
  const VERDICT_DESCRIPTIONS = TAXONOMY.verdictDescriptions || {};
  const CATEGORY_LABELS = TAXONOMY.categoryLabels || {};
  const VERDICT_CLASSES = TAXONOMY.verdictClasses || {};
  const SOURCE_TYPE_LABELS = TAXONOMY.claimSourceTypeLabels || {};
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
      renderItem: renderClaimCard,
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

  function renderClaimCard(claim) {
    const cardId = `ct-claim-${claim.claim_slug}`;
    const verdictClass = VERDICT_CLASSES[claim.verdict] || "";
    const verdictLabel = VERDICT_LABELS[claim.verdict] || claim.verdict;
    const categoryLabel = CATEGORY_LABELS[claim.category] || claim.category;
    const confidencePct = Math.round((claim.confidence || 0) * 100);
    const isFocused = getFilters().claim === claim.claim_slug;

    let detailsHtml = "";
    if (claim.explanation_is) {
      detailsHtml += `<div class="ct-detail"><strong>Útskýring:</strong> ${linkifyEvidenceIds(escapeHtml(claim.explanation_is))}</div>`;
    }
    if (claim.missing_context_is) {
      detailsHtml += `<div class="ct-detail"><strong>Samhengi sem vantar:</strong> ${linkifyEvidenceIds(escapeHtml(claim.missing_context_is))}</div>`;
    }
    if (claim.canonical_text_en) {
      detailsHtml += `<div class="ct-detail ct-english"><strong>English:</strong> ${escapeHtml(claim.canonical_text_en)}</div>`;
    }

    const supportingEvidence = claim.supporting_evidence || [];
    const contradictingEvidence = claim.contradicting_evidence || [];
    if (supportingEvidence.length > 0 || contradictingEvidence.length > 0) {
      const renderEvidenceLinks = (evidenceList) =>
        evidenceList
          .map(
            (evidence) =>
              `<a href="${escapeHtml(withReturnUrl(`/heimildir/${evidence.slug}/`, buildReturnUrl(cardId)))}" class="evidence-link" data-evidence-id="${escapeHtml(evidence.id)}" data-evidence-source="${escapeHtml(evidence.source_name)}">${escapeHtml(evidence.id)}</a>`
          )
          .join(", ");

      let evidenceHtml = '<div class="ct-detail ct-evidence">';
      if (supportingEvidence.length > 0) {
        evidenceHtml += `<div class="ct-evidence-group"><strong>Heimildir:</strong> ${renderEvidenceLinks(supportingEvidence)}</div>`;
      }
      if (contradictingEvidence.length > 0) {
        evidenceHtml += `<div class="ct-evidence-group ct-evidence-contra"><strong>Andstæðar heimildir:</strong> ${renderEvidenceLinks(contradictingEvidence)}</div>`;
      }
      evidenceHtml += "</div>";
      detailsHtml += evidenceHtml;
    }

    if (claim.sightings?.length) {
      const reportLookup = getReportLookup();
      const sightingCount = claim.sightings.length;
      const sightingItems = claim.sightings
        .map((sighting) => {
          const typeLabel = SOURCE_TYPE_LABELS[sighting.source_type] || sighting.source_type || "";
          const dateStr = sighting.source_date || "";
          const title = sighting.source_title || sighting.source_url;
          const meta = [typeLabel, dateStr].filter(Boolean).join(" · ");
          const matchedReport = findReportForSource(sighting, reportLookup);
          const internalHref = matchedReport?.slug
            ? withReturnUrl(`/umraedan/${matchedReport.slug}/`, buildReturnUrl(cardId))
            : "";
          const href = internalHref || sighting.source_url || "";
          const externalAttrs = internalHref ? "" : ' target="_blank" rel="noopener"';
          const linkClass = internalHref
            ? "ct-sighting-link"
            : "ct-sighting-link ct-sighting-link--external";

          const titleHtml = href
            ? `<a href="${escapeHtml(href)}" class="${linkClass}"${externalAttrs}>${escapeHtml(title)}</a>`
            : `<span class="${linkClass}">${escapeHtml(title)}</span>`;

          return `<li class="ct-sighting-item">
            ${titleHtml}
            ${meta ? `<span class="ct-sighting-meta">${escapeHtml(meta)}</span>` : ""}
          </li>`;
        })
        .join("");

      detailsHtml += `<div class="ct-sightings-section">
        <button class="ct-sightings-toggle" aria-expanded="false" type="button">
          <span class="ct-sightings-label">Birtist í ${sightingCount} umræðu${sightingCount > 1 ? "m" : ""}</span>
          <span class="ct-sightings-expand-icon">▸</span>
        </button>
        <div class="ct-sightings-details">
          <ul class="ct-sighting-list">${sightingItems}</ul>
        </div>
      </div>`;
    }

    const sightingBadge =
      claim.sighting_count > 0
        ? `<span class="ct-sighting-count" title="Fjöldi tilvitana">${claim.sighting_count}×</span>`
        : "";

    return `
      <div class="ct-card${isFocused ? " ct-card--focused" : ""}" id="${escapeHtml(cardId)}" data-slug="${escapeHtml(claim.claim_slug)}">
        <div class="ct-card-header" role="button" tabindex="0" aria-expanded="false">
          <div class="ct-card-main">
            <span class="ct-verdict-pill ${verdictClass}" title="${VERDICT_DESCRIPTIONS[claim.verdict] || ""}">${verdictLabel}</span>
            <span class="ct-category-tag">${categoryLabel}</span>
            ${sightingBadge}
          </div>
          <p class="ct-claim-text">${escapeHtml(claim.canonical_text_is)}</p>
          <div class="ct-card-meta">
            <span class="ct-confidence" title="Vissustig">
              <span class="ct-confidence-bar" style="width: ${confidencePct}%"></span>
              ${confidencePct}%
            </span>
            <span class="ct-expand-icon">▸</span>
          </div>
        </div>
        <div class="ct-card-details">
          ${detailsHtml}
        </div>
      </div>
    `;
  }

  function toggleSightings(toggle) {
    const section = toggle.closest(".ct-sightings-section");
    if (!section) return;

    const expanded = !section.classList.contains("ct-sightings-expanded");
    section.classList.toggle("ct-sightings-expanded", expanded);
    toggle.setAttribute("aria-expanded", expanded);
  }

  function toggleClaimCard(header) {
    const card = header.closest(".ct-card");
    if (!card) return;

    const expanded = !card.classList.contains("ct-expanded");
    card.classList.toggle("ct-expanded", expanded);
    header.setAttribute("aria-expanded", expanded);
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
    toggleClaimCard(target);
  });

  controller.bindKeyActivate(".ct-card-header", (target) => {
    toggleClaimCard(target);
  });

  controller.bindClick(".ct-sightings-toggle", (target) => {
    toggleSightings(target);
  });

  controller.start();
})();
