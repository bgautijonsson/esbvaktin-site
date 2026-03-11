/**
 * ESBvaktin Claim Tracker — Client-side claim browser
 *
 * Loads claims from JSON and provides interactive filtering,
 * searching, and sorting entirely in the browser.
 */

(function () {
  "use strict";

  // ── Configuration ────────────────────────────────────────────────
  const DATA_BASE = document.currentScript?.dataset.base || "/assets/data";
  const JSON_URL = `${DATA_BASE}/claims.json`;

  // Icelandic labels
  const VERDICT_LABELS = {
    supported: "Staðfest",
    partially_supported: "Að hluta staðfest",
    unsupported: "Óstutt",
    misleading: "Villandi",
    unverifiable: "Ósannanlegt",
  };

  const CATEGORY_LABELS = {
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

  const VERDICT_CLASSES = {
    supported: "verdict-supported",
    partially_supported: "verdict-partial",
    unsupported: "verdict-unsupported",
    misleading: "verdict-misleading",
    unverifiable: "verdict-unverifiable",
  };

  const SOURCE_TYPE_LABELS = {
    news: "Frétt",
    opinion: "Skoðun",
    althingi: "Alþingi",
    interview: "Viðtal",
    analysis: "Greining",
    other: "Annað",
  };

  // ── State ────────────────────────────────────────────────────────
  let jsonData = null;

  // Current filter state
  let filters = {
    search: "",
    category: "",
    verdict: "",
    sort: "sighting_count",
    sortDir: "DESC",
  };

  // ── DOM references ───────────────────────────────────────────────
  const root = document.getElementById("claim-tracker");
  if (!root) return;

  // ── Initialisation ───────────────────────────────────────────────

  async function init() {
    renderSkeleton();

    const resp = await fetch(JSON_URL);
    if (!resp.ok) throw new Error(`Failed to fetch ${JSON_URL}: ${resp.status}`);
    jsonData = await resp.json();
    console.log(`Claim tracker loaded: ${jsonData.length} claims`);

    renderStats();
    renderResults();
    bindEvents();
  }

  // DuckDB-WASM init — kept for future use when claim count warrants it.
  // Requires self-hosting WASM bundles to avoid cross-origin Worker errors.
  // async function initDuckDB() { ... }

  // ── Query layer ──────────────────────────────────────────────────

  function queryClaims() {
    let results = [...jsonData];

    if (filters.search) {
      const q = filters.search.toLowerCase();
      results = results.filter(
        (c) =>
          c.canonical_text_is?.toLowerCase().includes(q) ||
          c.explanation_is?.toLowerCase().includes(q) ||
          c.missing_context_is?.toLowerCase().includes(q)
      );
    }
    if (filters.category) {
      results = results.filter((c) => c.category === filters.category);
    }
    if (filters.verdict) {
      results = results.filter((c) => c.verdict === filters.verdict);
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
    const data = jsonData || [];
    return {
      total: data.length,
      supported: data.filter((c) => c.verdict === "supported").length,
      partial: data.filter((c) => c.verdict === "partially_supported").length,
      misleading: data.filter((c) => c.verdict === "misleading").length,
      unverifiable: data.filter((c) => c.verdict === "unverifiable").length,
      unsupported: data.filter((c) => c.verdict === "unsupported").length,
      totalSightings: data.reduce((s, c) => s + (c.sighting_count || 0), 0),
    };
  }

  // ── Rendering ────────────────────────────────────────────────────

  function renderSkeleton() {
    root.innerHTML = `
      <div class="ct-header">
        <h2>Fullyrðingavaktin</h2>
        <p class="ct-subtitle">Allar helstu fullyrðingar í ESB-umræðunni — metnar á móti gögnum og heimildum.</p>
      </div>

      <div class="ct-stats" id="ct-stats">
        <div class="ct-stat-loading">Hleð gögnum…</div>
      </div>

      <div class="ct-controls">
        <div class="ct-search-wrap">
          <input type="search" id="ct-search" class="ct-search"
                 placeholder="Leita í fullyrðingum…" autocomplete="off" />
        </div>
        <div class="ct-filter-row">
          <select id="ct-category" class="ct-select">
            <option value="">Allir flokkar</option>
            ${Object.entries(CATEGORY_LABELS)
              .sort((a, b) => a[1].localeCompare(b[1], "is"))
              .map(([k, v]) => `<option value="${k}">${v}</option>`)
              .join("")}
          </select>
          <select id="ct-verdict" class="ct-select">
            <option value="">Allir úrskurðir</option>
            ${Object.entries(VERDICT_LABELS)
              .map(([k, v]) => `<option value="${k}">${v}</option>`)
              .join("")}
          </select>
          <select id="ct-sort" class="ct-select">
            <option value="sighting_count">Tíðni</option>
            <option value="category">Flokkur</option>
            <option value="confidence">Vissustig</option>
            <option value="last_verified">Síðast staðfest</option>
          </select>
        </div>
      </div>

      <div class="ct-results" id="ct-results">
        <div class="ct-loading">Hleð fullyrðingum…</div>
      </div>
    `;
  }

  function renderStats() {
    const stats = queryStats();
    const el = document.getElementById("ct-stats");
    el.innerHTML = `
      <div class="ct-stat">
        <span class="ct-stat-num">${stats.total}</span>
        <span class="ct-stat-label">fullyrðingar</span>
      </div>
      <div class="ct-stat">
        <span class="ct-stat-num">${stats.totalSightings}</span>
        <span class="ct-stat-label">tilvitnanir</span>
      </div>
      <div class="ct-stat ct-stat-supported">
        <span class="ct-stat-num">${stats.supported}</span>
        <span class="ct-stat-label">staðfestar</span>
      </div>
      <div class="ct-stat ct-stat-partial">
        <span class="ct-stat-num">${stats.partial}</span>
        <span class="ct-stat-label">að hluta</span>
      </div>
      <div class="ct-stat ct-stat-misleading">
        <span class="ct-stat-num">${stats.misleading}</span>
        <span class="ct-stat-label">villandi</span>
      </div>
      <div class="ct-stat ct-stat-unverifiable">
        <span class="ct-stat-num">${stats.unverifiable}</span>
        <span class="ct-stat-label">ósannanlegar</span>
      </div>
    `;
  }

  function renderResults() {
    const claims = queryClaims();
    const el = document.getElementById("ct-results");

    if (claims.length === 0) {
      el.innerHTML = `<div class="ct-empty">Engar fullyrðingar fundust.</div>`;
      return;
    }

    el.innerHTML = claims.map(renderClaimCard).join("");

    // Bind expand/collapse
    el.querySelectorAll(".ct-card-header").forEach((header) => {
      header.addEventListener("click", () => {
        header.parentElement.classList.toggle("ct-expanded");
      });
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

    // Evidence references (supporting + contradicting)
    const supEv = claim.supporting_evidence || [];
    const conEv = claim.contradicting_evidence || [];
    if (supEv.length > 0 || conEv.length > 0) {
      const renderEvLinks = (evList) =>
        evList
          .map(
            (ev) =>
              `<a href="/heimildir/${escapeHtml(ev.slug)}/" class="evidence-link" title="${escapeHtml(ev.source_name)}">${escapeHtml(ev.id)}</a>`
          )
          .join(", ");
      let evHtml = '<div class="ct-detail ct-evidence">';
      if (supEv.length > 0) {
        evHtml += `<div class="ct-evidence-group"><strong>Heimildir:</strong> ${renderEvLinks(supEv)}</div>`;
      }
      if (conEv.length > 0) {
        evHtml += `<div class="ct-evidence-group ct-evidence-contra"><strong>Andstæðar heimildir:</strong> ${renderEvLinks(conEv)}</div>`;
      }
      evHtml += "</div>";
      detailsHtml += evHtml;
    }

    if (claim.sightings && claim.sightings.length > 0) {
      const sightingItems = claim.sightings
        .map((s) => {
          const typeLabel = SOURCE_TYPE_LABELS[s.source_type] || s.source_type || "";
          const dateStr = s.source_date || "";
          const title = s.source_title || s.source_url;
          const meta = [typeLabel, dateStr].filter(Boolean).join(" · ");
          return `<li class="ct-sighting-item">
            <a href="${escapeHtml(s.source_url)}" target="_blank" rel="noopener">${escapeHtml(title)}</a>
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

  // ── Events ───────────────────────────────────────────────────────

  let searchTimeout = null;

  function bindEvents() {
    const searchInput = document.getElementById("ct-search");
    const categorySelect = document.getElementById("ct-category");
    const verdictSelect = document.getElementById("ct-verdict");
    const sortSelect = document.getElementById("ct-sort");

    searchInput.addEventListener("input", (e) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        filters.search = e.target.value.trim();
        renderResults();
      }, 200);
    });

    categorySelect.addEventListener("change", (e) => {
      filters.category = e.target.value;
      renderResults();
    });

    verdictSelect.addEventListener("change", (e) => {
      filters.verdict = e.target.value;
      renderResults();
    });

    sortSelect.addEventListener("change", (e) => {
      filters.sort = e.target.value;
      renderResults();
    });
  }

  // ── Utilities ────────────────────────────────────────────────────

  function escapeHtml(str) {
    if (!str) return "";
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  // ── Boot ─────────────────────────────────────────────────────────
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
