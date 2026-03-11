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
  const escapeHtml = utils.escapeHtml || ((value) => String(value ?? ""));
  const DATA_BASE = utils.getDataBase
    ? utils.getDataBase(document.currentScript, "/assets/data")
    : (document.currentScript?.dataset.base || "/assets/data");
  const JSON_URL = `${DATA_BASE}/claims.json`;
  const VERDICT_LABELS = TAXONOMY.verdictLabels || {};
  const CATEGORY_LABELS = TAXONOMY.categoryLabels || {};
  const VERDICT_CLASSES = TAXONOMY.verdictClasses || {};
  const SOURCE_TYPE_LABELS = TAXONOMY.claimSourceTypeLabels || {};

  const root = document.getElementById("claim-tracker");
  if (!root || !renderer || !createController) return;

  const controller = createController({
    root,
    initialState: {
      search: "",
      category: "",
      verdict: "",
      sort: "sighting_count",
      sortDir: "DESC",
    },
    initialData: [],
    async load(api) {
      return api.loadJson(JSON_URL);
    },
    renderShell,
    renderStats,
    renderResults,
    initialRender: "stats+results",
    onError() {
      renderShell();
      const results = document.getElementById("ct-results");
      const stats = document.getElementById("ct-stats");
      if (stats) {
        stats.innerHTML = renderer.renderMessage("Gat ekki hlaðið gögnum.", "ct-stat-loading");
      }
      if (results) {
        results.innerHTML = renderer.renderMessage("Gat ekki hlaðið fullyrðingum.", "ct-empty");
      }
    },
  });

  function getClaims() {
    return controller.getData() || [];
  }

  function getFilters() {
    return controller.getState();
  }

  function queryClaims() {
    const filters = getFilters();
    let results = [...getClaims()];

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

    const sort = filters.sort || "sighting_count";
    const dir = filters.sortDir === "ASC" ? 1 : -1;
    results.sort((a, b) => {
      const va = a[sort] ?? "";
      const vb = b[sort] ?? "";
      if (typeof va === "number") return (va - vb) * dir;
      return String(va).localeCompare(String(vb), "is") * dir;
    });

    return results;
  }

  function queryStats() {
    const claims = getClaims();
    return {
      total: claims.length,
      supported: claims.filter((claim) => claim.verdict === "supported").length,
      partial: claims.filter((claim) => claim.verdict === "partially_supported").length,
      misleading: claims.filter((claim) => claim.verdict === "misleading").length,
      unverifiable: claims.filter((claim) => claim.verdict === "unverifiable").length,
      totalSightings: claims.reduce((sum, claim) => sum + (claim.sighting_count || 0), 0),
    };
  }

  function renderShell() {
    const filters = getFilters();

    root.innerHTML = `
      <div class="ct-header">
        <h2>Fullyrðingavaktin</h2>
        <p class="ct-subtitle">Allar helstu fullyrðingar í ESB-umræðunni — metnar á móti gögnum og heimildum.</p>
      </div>

      <div class="ct-stats" id="ct-stats">${renderer.renderMessage("Hleð gögnum…", "ct-stat-loading")}</div>

      ${renderer.renderControlBlock({
        wrapperClass: "ct-controls",
        search: {
          id: "ct-search",
          className: "ct-search",
          wrapClass: "ct-search-wrap",
          placeholder: "Leita í fullyrðingum…",
          value: filters.search,
        },
        rows: [{
          className: "ct-filter-row",
          controls: [
            renderer.renderSelect({
              id: "ct-category",
              className: "ct-select",
              placeholder: "Allir flokkar",
              options: Object.entries(CATEGORY_LABELS)
                .sort((a, b) => a[1].localeCompare(b[1], "is"))
                .map(([value, label]) => ({ value, label })),
              selectedValue: filters.category,
            }),
            renderer.renderSelect({
              id: "ct-verdict",
              className: "ct-select",
              placeholder: "Allir úrskurðir",
              options: Object.entries(VERDICT_LABELS).map(([value, label]) => ({ value, label })),
              selectedValue: filters.verdict,
            }),
            renderer.renderSelect({
              id: "ct-sort",
              className: "ct-select",
              options: [
                { value: "sighting_count", label: "Tíðni" },
                { value: "category", label: "Flokkur" },
                { value: "confidence", label: "Vissustig" },
                { value: "last_verified", label: "Síðast staðfest" },
              ],
              selectedValue: filters.sort,
            }),
          ],
        }],
      })}

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
        { value: stats.misleading, label: "villandi", className: "ct-stat-misleading" },
        { value: stats.unverifiable, label: "ósannanlegar", className: "ct-stat-unverifiable" },
      ],
    });
  }

  function renderResults() {
    const claims = queryClaims();
    const el = document.getElementById("ct-results");
    if (!el) return;

    if (claims.length === 0) {
      el.innerHTML = renderer.renderMessage("Engar fullyrðingar fundust.", "ct-empty");
      return;
    }

    el.innerHTML = renderer.renderCollection({
      items: claims,
      renderItem: renderClaimCard,
    });
  }

  function renderClaimCard(claim) {
    const verdictClass = VERDICT_CLASSES[claim.verdict] || "";
    const verdictLabel = VERDICT_LABELS[claim.verdict] || claim.verdict;
    const categoryLabel = CATEGORY_LABELS[claim.category] || claim.category;
    const confidencePct = Math.round((claim.confidence || 0) * 100);

    let detailsHtml = "";
    if (claim.explanation_is) {
      detailsHtml += `<div class="ct-detail"><strong>Útskýring:</strong> ${escapeHtml(claim.explanation_is)}</div>`;
    }
    if (claim.missing_context_is) {
      detailsHtml += `<div class="ct-detail"><strong>Samhengi sem vantar:</strong> ${escapeHtml(claim.missing_context_is)}</div>`;
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
              `<a href="/heimildir/${escapeHtml(evidence.slug)}/" class="evidence-link" title="${escapeHtml(evidence.source_name)}">${escapeHtml(evidence.id)}</a>`
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
      const sightingItems = claim.sightings
        .map((sighting) => {
          const typeLabel = SOURCE_TYPE_LABELS[sighting.source_type] || sighting.source_type || "";
          const dateStr = sighting.source_date || "";
          const title = sighting.source_title || sighting.source_url;
          const meta = [typeLabel, dateStr].filter(Boolean).join(" · ");
          return `<li class="ct-sighting-item">
            <a href="${escapeHtml(sighting.source_url)}" target="_blank" rel="noopener">${escapeHtml(title)}</a>
            ${meta ? `<span class="ct-sighting-meta">${escapeHtml(meta)}</span>` : ""}
          </li>`;
        })
        .join("");

      detailsHtml += `<div class="ct-detail ct-sightings">
        <strong>Umræðan:</strong>
        <ul class="ct-sighting-list">${sightingItems}</ul>
      </div>`;
    }

    const sightingBadge =
      claim.sighting_count > 0
        ? `<span class="ct-sighting-count" title="Fjöldi tilvitana">${claim.sighting_count}×</span>`
        : "";

    return `
      <div class="ct-card" data-slug="${escapeHtml(claim.claim_slug)}">
        <div class="ct-card-header" role="button" tabindex="0" aria-expanded="false">
          <div class="ct-card-main">
            <span class="ct-verdict-pill ${verdictClass}">${verdictLabel}</span>
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

  function toggleClaimCard(header) {
    const card = header.closest(".ct-card");
    if (!card) return;

    const expanded = !card.classList.contains("ct-expanded");
    card.classList.toggle("ct-expanded", expanded);
    header.setAttribute("aria-expanded", expanded);
  }

  controller.bindInput(
    "#ct-search",
    (value, _target, _event, api) => {
      api.setState({ search: value }, "results");
    },
    { debounceMs: 200, trim: true }
  );

  controller.bindChange("#ct-category", (value, _target, _event, api) => {
    api.setState({ category: value }, "results");
  });

  controller.bindChange("#ct-verdict", (value, _target, _event, api) => {
    api.setState({ verdict: value }, "results");
  });

  controller.bindChange("#ct-sort", (value, _target, _event, api) => {
    api.setState({ sort: value }, "results");
  });

  controller.bindClick(".ct-card-header", (target) => {
    toggleClaimCard(target);
  });

  controller.bindKeyActivate(".ct-card-header", (target) => {
    toggleClaimCard(target);
  });

  controller.start();
})();
