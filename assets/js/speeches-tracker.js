/**
 * ESBvaktin Speeches Tracker — Client-side debate browser
 *
 * Loads EU debate listing from JSON and provides interactive filtering,
 * grouping, and sorting entirely in the browser.
 */

(function () {
  "use strict";

  // ── Configuration ────────────────────────────────────────────────
  const DATA_BASE = document.currentScript?.dataset.base || "/assets/data";
  const JSON_URL = `${DATA_BASE}/debates.json`;

  // Party short codes for CSS classes
  const PARTY_CLASSES = {
    "Sjálfstæðisflokkur": "party-xd",
    "Samfylkingin": "party-s",
    "Framsóknarflokkur": "party-b",
    "Miðflokkurinn": "party-m",
    "Viðreisn": "party-c",
    "Vinstrihreyfingin - grænt framboð": "party-v",
    "Píratar": "party-p",
    "Flokkur fólksins": "party-f",
    "Hreyfingin": "party-hr",
  };

  // Short party names for pills
  const PARTY_SHORT = {
    "Sjálfstæðisflokkur": "xD",
    "Samfylkingin": "Sam",
    "Framsóknarflokkur": "Fram",
    "Miðflokkurinn": "Miðfl",
    "Viðreisn": "Viðr",
    "Vinstrihreyfingin - grænt framboð": "VG",
    "Píratar": "Pír",
    "Flokkur fólksins": "FF",
    "Hreyfingin": "Hreyfing",
  };

  const GROUP_LABELS = {
    "": "Engin flokkun",
    session: "Löggjafarþing",
    year: "Ár",
    party: "Flokkur",
  };

  // Icelandic month names
  const IS_MONTHS = [
    "", "janúar", "febrúar", "mars", "apríl", "maí", "júní",
    "júlí", "ágúst", "september", "október", "nóvember", "desember",
  ];

  // ── State ────────────────────────────────────────────────────────
  let jsonData = null;

  let filters = {
    search: "",
    speaker: "",  // from URL param — filters against all speaker_names
    party: "",
    session: "",
    groupBy: "",
    sort: "last_date",
    sortDir: "DESC",
  };

  // ── DOM references ───────────────────────────────────────────────
  const root = document.getElementById("speeches-tracker");
  if (!root) return;

  // ── Initialisation ───────────────────────────────────────────────

  async function init() {
    // Read URL params (e.g. ?speaker=Name from entity detail pages)
    const params = new URLSearchParams(window.location.search);
    if (params.get("speaker")) {
      filters.speaker = params.get("speaker");
    }

    renderSkeleton();

    const resp = await fetch(JSON_URL);
    if (!resp.ok) throw new Error(`Failed to fetch ${JSON_URL}: ${resp.status}`);
    jsonData = await resp.json();

    // Re-render skeleton with populated filter options
    renderSkeleton();
    renderStats();
    renderResults();
    bindEvents();
  }

  // ── Query layer ──────────────────────────────────────────────────

  function queryDebates() {
    let results = [...jsonData];

    if (filters.speaker) {
      const sp = filters.speaker.toLowerCase();
      results = results.filter(
        (d) => d.speaker_names?.some((n) => n.toLowerCase().includes(sp))
      );
    }
    if (filters.search) {
      const q = filters.search.toLowerCase();
      results = results.filter(
        (d) =>
          d.issue_title?.toLowerCase().includes(q) ||
          d.speaker_names?.some((n) => n.toLowerCase().includes(q)) ||
          d.top_speakers?.some((s) => s.name?.toLowerCase().includes(q))
      );
    }
    if (filters.party) {
      results = results.filter((d) => d.parties?.includes(filters.party));
    }
    if (filters.session) {
      const sess = parseInt(filters.session, 10);
      results = results.filter((d) => d.session === sess);
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
    const groupBy = filters.groupBy;
    if (!groupBy) return [{ key: "", label: "", debates }];

    const groups = new Map();

    for (const d of debates) {
      let key;
      if (groupBy === "session") {
        key = String(d.session);
      } else if (groupBy === "year") {
        key = d.last_date ? d.last_date.slice(0, 4) : "Óþekkt";
      } else if (groupBy === "party") {
        // One debate can appear in multiple party groups
        const parties = d.parties?.length ? d.parties : ["Óþekkt"];
        for (const p of parties) {
          if (!groups.has(p)) groups.set(p, []);
          groups.get(p).push(d);
        }
        continue;
      } else {
        key = "";
      }

      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(d);
    }

    return Array.from(groups.entries()).map(([key, items]) => {
      let label;
      if (groupBy === "session") {
        label = `${key}. löggjafarþing`;
      } else if (groupBy === "year") {
        label = key;
      } else if (groupBy === "party") {
        label = key;
      } else {
        label = key;
      }
      return { key, label, debates: items };
    });
  }

  function queryStats() {
    const data = jsonData || [];
    const totalSpeeches = data.reduce((s, d) => s + (d.speech_count || 0), 0);
    const totalWords = data.reduce((s, d) => s + (d.total_words || 0), 0);
    const sessions = new Set(data.map((d) => d.session));
    return {
      total: data.length,
      totalSpeeches,
      totalWords,
      sessions: sessions.size,
    };
  }

  // ── Rendering ────────────────────────────────────────────────────

  function renderSkeleton() {
    const parties = jsonData
      ? [...new Set(jsonData.flatMap((d) => d.parties || []))].sort((a, b) =>
          a.localeCompare(b, "is")
        )
      : [];

    const sessions = jsonData
      ? [...new Set(jsonData.map((d) => d.session))].sort((a, b) => b - a)
      : [];

    root.innerHTML = `
      <div class="st-stats" id="st-stats">
        <div class="ct-stat-loading">Hle&eth; g&ouml;gnum&hellip;</div>
      </div>

      <div class="ct-controls">
        <div class="ct-search-wrap">
          <input type="search" id="st-search" class="ct-search"
                 placeholder="Leita í umræðum eða ræðumönnum…" autocomplete="off" />
        </div>
        <div class="ct-filter-row">
          <select id="st-party" class="ct-select">
            <option value="">Allir flokkar</option>
            ${parties.map((p) => `<option value="${escapeHtml(p)}">${escapeHtml(p)}</option>`).join("")}
          </select>
          <select id="st-session" class="ct-select">
            <option value="">Öll löggjafarþing</option>
            ${sessions.map((s) => `<option value="${s}">${s}. löggjafarþing</option>`).join("")}
          </select>
          <select id="st-group" class="ct-select">
            ${Object.entries(GROUP_LABELS)
              .map(([k, v]) => `<option value="${k}">${v}</option>`)
              .join("")}
          </select>
          <select id="st-sort" class="ct-select">
            <option value="last_date">Nýjast</option>
            <option value="speech_count">Flest ræður</option>
            <option value="total_words">Flest orð</option>
            <option value="speaker_count">Flestir þingmenn</option>
          </select>
        </div>
      </div>

      ${filters.speaker ? `
      <div class="st-speaker-filter" id="st-speaker-filter">
        <span>Sýni þingræður <strong>${escapeHtml(filters.speaker)}</strong></span>
        <button class="st-clear-speaker" id="st-clear-speaker" type="button">&times; Hreinsa síu</button>
      </div>` : ""}

      <div class="st-results" id="st-results">
        <div class="ct-loading">Hle&eth; umr&aelig;&eth;um&hellip;</div>
      </div>
    `;
  }

  function renderStats() {
    const stats = queryStats();
    const el = document.getElementById("st-stats");
    el.innerHTML = `
      <div class="ct-stat">
        <span class="ct-stat-num">${fmtNum(stats.total)}</span>
        <span class="ct-stat-label">umræður</span>
      </div>
      <div class="ct-stat">
        <span class="ct-stat-num">${fmtNum(stats.totalSpeeches)}</span>
        <span class="ct-stat-label">ræður</span>
      </div>
      <div class="ct-stat">
        <span class="ct-stat-num">${fmtNum(stats.totalWords)}</span>
        <span class="ct-stat-label">orð</span>
      </div>
      <div class="ct-stat">
        <span class="ct-stat-num">${stats.sessions}</span>
        <span class="ct-stat-label">löggjafarþing</span>
      </div>
    `;
  }

  function renderResults() {
    const debates = queryDebates();
    const el = document.getElementById("st-results");

    if (debates.length === 0) {
      el.innerHTML = `<div class="ct-empty">Engar umræður fundust.</div>`;
      return;
    }

    const groups = groupDebates(debates);

    if (groups.length === 1 && !groups[0].key) {
      el.innerHTML = `<div class="st-grid">${debates.map(renderDebateCard).join("")}</div>`;
    } else {
      el.innerHTML = groups
        .map(
          (g) => `
        <div class="st-group">
          <h3 class="st-group-header">${escapeHtml(g.label)}<span class="st-group-count">${g.debates.length}</span></h3>
          <div class="st-grid">${g.debates.map(renderDebateCard).join("")}</div>
        </div>
      `
        )
        .join("");
    }
  }

  function renderDebateCard(debate) {
    const sessionBadge = `<span class="st-session-badge">${debate.session}. þing</span>`;

    const althingiLink = debate.althingi_url
      ? `<a href="${escapeHtml(debate.althingi_url)}" class="st-althingi-link" target="_blank" rel="noopener">Alþingi.is &#x2197;</a>`
      : "";

    const dateStr = debate.last_date
      ? formatIsDate(debate.last_date)
      : "";

    // Party pills
    const partyPills = (debate.parties || [])
      .map((p) => {
        const cls = PARTY_CLASSES[p] || "party-other";
        const short = PARTY_SHORT[p] || p.slice(0, 4);
        return `<span class="st-party-pill ${cls}" title="${escapeHtml(p)}">${escapeHtml(short)}</span>`;
      })
      .join("");

    // Top speakers
    const speakerHtml = (debate.top_speakers || [])
      .slice(0, 3)
      .map(
        (s) =>
          `<span class="st-speaker-name">${escapeHtml(s.name)}<span class="st-speaker-words"> (${fmtNum(s.words)})</span></span>`
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
          <span class="st-card-stat">${fmtNum(debate.total_words)} orð</span>
        </div>
      </div>
    `;
  }

  // ── Events ───────────────────────────────────────────────────────

  let searchTimeout = null;

  function bindEvents() {
    const searchInput = document.getElementById("st-search");
    const partySelect = document.getElementById("st-party");
    const sessionSelect = document.getElementById("st-session");
    const groupSelect = document.getElementById("st-group");
    const sortSelect = document.getElementById("st-sort");

    searchInput.addEventListener("input", (e) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        filters.search = e.target.value.trim();
        renderResults();
      }, 200);
    });

    partySelect.addEventListener("change", (e) => {
      filters.party = e.target.value;
      renderResults();
    });

    sessionSelect.addEventListener("change", (e) => {
      filters.session = e.target.value;
      renderResults();
    });

    groupSelect.addEventListener("change", (e) => {
      filters.groupBy = e.target.value;
      renderResults();
    });

    sortSelect.addEventListener("change", (e) => {
      filters.sort = e.target.value;
      renderResults();
    });

    const clearSpeaker = document.getElementById("st-clear-speaker");
    if (clearSpeaker) {
      clearSpeaker.addEventListener("click", () => {
        filters.speaker = "";
        window.history.replaceState({}, "", window.location.pathname);
        renderSkeleton();
        renderStats();
        renderResults();
        bindEvents();
      });
    }
  }

  // ── Utilities ────────────────────────────────────────────────────

  function escapeHtml(str) {
    if (!str) return "";
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function formatIsDate(dateStr) {
    if (!dateStr) return "";
    const parts = dateStr.split("-");
    if (parts.length !== 3) return dateStr;
    const day = parseInt(parts[2], 10);
    const month = parseInt(parts[1], 10);
    const monthName = IS_MONTHS[month] || "";
    return `${day}. ${monthName} ${parts[0]}`;
  }

  function fmtNum(n) {
    if (n == null) return "0";
    return Number(n).toLocaleString("is-IS");
  }

  // ── Boot ─────────────────────────────────────────────────────────
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
