/**
 * ESBvaktin Entity Tracker — Client-side entity browser
 *
 * Loads entity data from JSON and provides interactive filtering,
 * sorting, and collapsible article lists entirely in the browser.
 */

(function () {
  "use strict";

  // ── Configuration ────────────────────────────────────────────────
  const DATA_BASE = document.currentScript?.dataset.base || "/assets/data";
  const ENTITIES_URL = `${DATA_BASE}/entities.json`;
  const REPORTS_URL = `${DATA_BASE}/reports.json`;

  // Icelandic labels
  const TYPE_LABELS = {
    party: "Stjórnmálaflokkur",
    institution: "Samtök/stofnun",
    individual: "Einstaklingur",
  };

  const TYPE_FILTER_LABELS = {
    party: "Stjórnmálaflokkar",
    institution: "Samtök og stofnanir",
    individual: "Einstaklingar",
  };

  const STANCE_FILTER_LABELS = {
    pro_eu: "ESB-jákvæð",
    anti_eu: "ESB-gagnrýnin",
    mixed: "Blandað/hlutlaus",
  };

  const ATTRIBUTION_LABELS = {
    quoted: "Tilvitnað",
    asserted: "Fullyrt",
    paraphrased: "Umorðað",
    mentioned: "Nefnt",
  };

  const ATTRIBUTION_ORDER = ["quoted", "asserted", "paraphrased", "mentioned"];

  // ── State ──────────────────────────────────────────────────────
  let entitiesData = null;
  let reportsMap = null; // slug → { article_title, slug, … }

  let filters = {
    search: "",
    type: "",     // "" | "party" | "institution" | "individual"
    stance: "",   // "" | "pro_eu" | "anti_eu" | "mixed"
    sort: "name",
    sortDir: "ASC",
  };

  // ── DOM reference ──────────────────────────────────────────────
  const root = document.getElementById("entity-tracker");
  if (!root) return;

  // ── Initialisation ─────────────────────────────────────────────

  async function init() {
    renderSkeleton();

    const [entResp, repResp] = await Promise.all([
      fetch(ENTITIES_URL),
      fetch(REPORTS_URL),
    ]);

    if (!entResp.ok) throw new Error(`Failed to fetch ${ENTITIES_URL}: ${entResp.status}`);
    if (!repResp.ok) throw new Error(`Failed to fetch ${REPORTS_URL}: ${repResp.status}`);

    entitiesData = await entResp.json();
    const reportsArr = await repResp.json();

    // Build slug → report lookup for article title resolution
    reportsMap = new Map();
    for (const r of reportsArr) {
      reportsMap.set(r.slug, r);
    }

    renderStats();
    renderResults();
    bindEvents();
  }

  // ── Query layer ────────────────────────────────────────────────

  function queryEntities() {
    let results = [...entitiesData];

    if (filters.search) {
      const q = filters.search.toLowerCase();
      results = results.filter(
        (e) =>
          e.name?.toLowerCase().includes(q) ||
          e.role?.toLowerCase().includes(q) ||
          e.party?.toLowerCase().includes(q) ||
          e.description?.toLowerCase().includes(q)
      );
    }

    if (filters.type) {
      results = results.filter((e) => e.type === filters.type);
    }

    if (filters.stance) {
      if (filters.stance === "mixed") {
        // "Blandað/hlutlaus" matches both mixed and neutral
        results = results.filter((e) => e.stance === "mixed" || e.stance === "neutral");
      } else {
        results = results.filter((e) => e.stance === filters.stance);
      }
    }

    const sort = filters.sort || "name";
    const dir = filters.sortDir === "DESC" ? -1 : 1;
    results.sort((a, b) => {
      const va = a[sort] ?? "";
      const vb = b[sort] ?? "";
      if (typeof va === "number" && typeof vb === "number") return (va - vb) * dir;
      return String(va).localeCompare(String(vb), "is") * dir;
    });

    return results;
  }

  function queryStats() {
    const data = entitiesData || [];
    return {
      total: data.length,
      parties: data.filter((e) => e.type === "party").length,
      institutions: data.filter((e) => e.type === "institution").length,
      individuals: data.filter((e) => e.type === "individual").length,
    };
  }

  // ── Rendering ──────────────────────────────────────────────────

  function renderSkeleton() {
    root.innerHTML = `
      <div class="et-stats" id="et-stats">
        <div class="et-stat-loading">Hle&eth; g&ouml;gnum&hellip;</div>
      </div>

      <div class="et-controls">
        <div class="et-search-wrap">
          <input type="search" id="et-search" class="et-search"
                 placeholder="Leita í aðilum…" autocomplete="off" />
        </div>
        <div class="et-filter-row">
          <select id="et-type" class="et-select">
            <option value="">Allar tegundir</option>
            ${Object.entries(TYPE_FILTER_LABELS)
              .map(([k, v]) => `<option value="${k}">${v}</option>`)
              .join("")}
          </select>
          <select id="et-stance" class="et-select">
            <option value="">Öll viðhorf</option>
            ${Object.entries(STANCE_FILTER_LABELS)
              .map(([k, v]) => `<option value="${k}">${v}</option>`)
              .join("")}
          </select>
          <select id="et-sort" class="et-select">
            <option value="name">Nafn</option>
            <option value="stance_score">Afstaða</option>
            <option value="credibility">Trúverðugleiki</option>
            <option value="mention_count">Tilvísanir</option>
          </select>
        </div>
      </div>

      <div id="et-results">
        <div class="et-loading">Hle&eth; a&eth;ilum&hellip;</div>
      </div>
    `;
  }

  function renderStats() {
    const stats = queryStats();
    const el = document.getElementById("et-stats");
    el.innerHTML = `
      <div class="et-stat">
        <span class="et-stat-num" id="et-visible-count">${stats.total}</span>
        <span class="et-stat-label">aðilar</span>
      </div>
      <div class="et-stat">
        <span class="et-stat-num">${stats.parties}</span>
        <span class="et-stat-label">flokkar</span>
      </div>
      <div class="et-stat">
        <span class="et-stat-num">${stats.institutions}</span>
        <span class="et-stat-label">samtök</span>
      </div>
      <div class="et-stat">
        <span class="et-stat-num">${stats.individuals}</span>
        <span class="et-stat-label">einstaklingar</span>
      </div>
    `;
  }

  function renderResults() {
    const entities = queryEntities();
    const el = document.getElementById("et-results");

    if (entities.length === 0) {
      el.innerHTML = `<div class="et-empty">Engir aðilar fundust.</div>`;
      updateVisibleCount(0);
      return;
    }

    updateVisibleCount(entities.length);

    el.innerHTML = `<div class="et-grid">${entities.map(renderEntityCard).join("")}</div>`;

    // Bind expand/collapse for article sections
    el.querySelectorAll(".et-articles-toggle").forEach((toggle) => {
      toggle.addEventListener("click", () => {
        const section = toggle.closest(".et-articles-section");
        section.classList.toggle("et-expanded");
        const expanded = section.classList.contains("et-expanded");
        toggle.setAttribute("aria-expanded", expanded);
      });
      toggle.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          toggle.click();
        }
      });
    });
  }

  function updateVisibleCount(count) {
    const el = document.getElementById("et-visible-count");
    if (el) el.textContent = count;
  }

  function renderEntityCard(entity) {
    const score = entity.stance_score ?? 0;
    const hue = stanceHue(score);
    const sat = 10 + Math.abs(score) * 60;
    const label = stanceLabel(score);
    const dotLeft = ((score + 1) / 2 * 100).toFixed(1);
    const credPct = entity.credibility != null ? Math.round(entity.credibility * 100) : null;

    // Role line
    const roleHtml = entity.role
      ? `<p class="et-card-role">${escapeHtml(capitalize(entity.role))}${entity.party ? ` (${escapeHtml(entity.party)})` : ""}</p>`
      : "";

    // Type badge
    const typeBadge = `<span class="et-type-badge et-type-${entity.type}">${TYPE_LABELS[entity.type] || entity.type}</span>`;

    // Stats row
    const claimCount = entity.claims?.length || 0;
    const articleCount = entity.articles?.length || 0;
    let statsHtml = '<div class="et-card-stats">';
    if (claimCount) statsHtml += `<span class="et-card-stat">${claimCount} fullyrðing${claimCount > 1 ? "ar" : ""}</span>`;
    if (articleCount) statsHtml += `<span class="et-card-stat">${articleCount} grein${articleCount > 1 ? "ar" : "ing"}</span>`;
    if (entity.althingi_stats) statsHtml += `<span class="et-card-stat et-althingi-badge">${entity.althingi_stats.speech_count} þingræður</span>`;
    statsHtml += "</div>";

    // Credibility bar
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

    // Attribution breakdown bar
    let attrHtml = "";
    const ac = entity.attribution_counts;
    if (ac) {
      const total = ATTRIBUTION_ORDER.reduce((s, k) => s + (ac[k] || 0), 0);
      if (total > 0) {
        const segments = ATTRIBUTION_ORDER
          .filter((k) => ac[k])
          .map((k) => {
            const pct = ((ac[k] / total) * 100).toFixed(1);
            return `<div class="et-attr-seg et-attr-${k}" style="width:${pct}%" title="${ATTRIBUTION_LABELS[k]}: ${ac[k]}"></div>`;
          })
          .join("");
        const legend = ATTRIBUTION_ORDER
          .filter((k) => ac[k])
          .map((k) => `<span class="et-attr-legend-item et-attr-${k}-text">${ATTRIBUTION_LABELS[k]} ${ac[k]}</span>`)
          .join("");
        attrHtml = `
          <div class="et-attribution">
            <div class="et-attr-bar">${segments}</div>
            <div class="et-attr-legend">${legend}</div>
          </div>`;
      }
    }

    // Collapsible articles section
    let articlesHtml = "";
    if (articleCount > 0) {
      const articleLinks = entity.articles
        .map((slug) => {
          const report = reportsMap.get(slug);
          if (!report) return null;
          return `<li><a href="/umraedan/${escapeHtml(slug)}/">${escapeHtml(report.article_title)}</a></li>`;
        })
        .filter(Boolean)
        .join("");

      if (articleLinks) {
        articlesHtml = `
          <div class="et-articles-section">
            <button class="et-articles-toggle" aria-expanded="false">
              <span class="et-articles-label">Birtist í ${articleCount} grein${articleCount > 1 ? "um" : "ing"}</span>
              <span class="et-expand-icon">▸</span>
            </button>
            <div class="et-articles-details">
              <ul class="et-articles-list">${articleLinks}</ul>
            </div>
          </div>`;
      }
    }

    const detailUrl = `/raddirnar/${escapeHtml(entity.slug)}/`;

    return `
      <div class="et-card" style="--stance-hue: ${hue}; --stance-sat: ${sat}%; --stance-score: ${score}">
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
        ${typeBadge}
        ${statsHtml}
        ${attrHtml}
        ${credHtml}
        ${articlesHtml}
        <a href="${detailUrl}" class="et-see-more">Sjá meira &rarr;</a>
      </div>
    `;
  }

  // ── Events ─────────────────────────────────────────────────────

  let searchTimeout = null;

  function bindEvents() {
    const searchInput = document.getElementById("et-search");
    const typeSelect = document.getElementById("et-type");
    const stanceSelect = document.getElementById("et-stance");
    const sortSelect = document.getElementById("et-sort");

    searchInput.addEventListener("input", (e) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        filters.search = e.target.value.trim();
        renderResults();
      }, 200);
    });

    typeSelect.addEventListener("change", (e) => {
      filters.type = e.target.value;
      renderResults();
    });

    stanceSelect.addEventListener("change", (e) => {
      filters.stance = e.target.value;
      renderResults();
    });

    sortSelect.addEventListener("change", (e) => {
      filters.sort = e.target.value;
      // Default direction: ASC for name, DESC for numeric fields
      filters.sortDir = e.target.value === "name" ? "ASC" : "DESC";
      renderResults();
    });
  }

  // ── Utilities ──────────────────────────────────────────────────

  function escapeHtml(str) {
    if (!str) return "";
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
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

  // ── Boot ───────────────────────────────────────────────────────
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
