# Málefni Page Upgrade — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade topic detail pages with a proportional timeline and an embedded claim tracker.

**Architecture:** Two independent changes to `_includes/topic-detail.njk`: (1) rewrite the timeline section to use proportional time positioning with hierarchical date labels, filtered to 2026; (2) replace the server-rendered claims list with a lazy-loaded client-side claim tracker. The claim tracker reuses existing shared tracker infrastructure via a new glue script and a new shared card-rendering module extracted from `claim-tracker.js`.

**Tech Stack:** Eleventy v3 (Nunjucks), vanilla JS (IIFE + globalThis pattern), vanilla CSS, Playwright browser tests.

**Spec:** `docs/superpowers/specs/2026-03-23-malefni-upgrade-design.md`

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `eleventy.config.js` | Modify | Add `isMonthShort` and `isDayOfMonth` filters |
| `_includes/topic-detail.njk` | Modify | Rewrite timeline section; replace claims section with tracker mount point; update frontmatter |
| `assets/css/topic-detail.css` | Modify | Rewrite `.td-timeline-*` styles for proportional positioning + label rows |
| `_includes/base.njk` | Modify | Support array `extra_css`; add `tracker-claim-card.js` to script chain |
| `assets/js/tracker-claim-card.js` | Create | Shared claim card rendering + interaction handlers |
| `assets/js/claim-tracker.js` | Modify | Refactor to consume `tracker-claim-card.js` |
| `assets/js/topic-claim-tracker.js` | Create | Topic-scoped claim tracker with lazy loading |
| `tests/browser/smoke.spec.js` | Modify | Add topic detail claim tracker smoke test |

---

## Task 1: Add Eleventy date helper filters

**Files:**
- Modify: `eleventy.config.js:49-59` (near existing date filters)

These filters are needed by the timeline template in Task 2.

- [ ] **Step 1: Add `isMonthShort` and `isDayOfMonth` filters**

In `eleventy.config.js`, after the `isDate` filter definition (line 59), add:

```js
  const MONTHS_SHORT = [
    "jan", "feb", "mar", "apr", "maí", "jún",
    "júl", "ágú", "sep", "okt", "nóv", "des",
  ];

  eleventyConfig.addFilter("isMonthShort", (date) => {
    if (!date) return "";
    return MONTHS_SHORT[new Date(date).getUTCMonth()];
  });

  eleventyConfig.addFilter("isDayOfMonth", (date) => {
    if (!date) return "";
    return new Date(date).getUTCDate();
  });

  eleventyConfig.addFilter("isDateToMs", (date) => {
    if (!date) return 0;
    return new Date(date).getTime();
  });

  eleventyConfig.addFilter("isMonth1", (date) => {
    if (!date) return 0;
    return new Date(date).getUTCMonth() + 1;
  });
```

- [ ] **Step 2: Verify build succeeds**

Run: `npm run build`
Expected: Clean build with no errors. Filters are registered but not yet used.

- [ ] **Step 3: Commit**

```bash
git add eleventy.config.js
git commit -m "feat: add date helper Eleventy filters for timeline

isMonthShort (3-char Icelandic months), isDayOfMonth, isDateToMs
(timestamp), isMonth1 (1-based month) for proportional timeline."
```

---

## Task 2: Rewrite timeline to proportional axis with hierarchical labels

**Files:**
- Modify: `_includes/topic-detail.njk:82-100` (timeline section)
- Modify: `assets/css/topic-detail.css:83-128` (timeline styles)

- [ ] **Step 1: Replace the timeline Nunjucks template**

In `_includes/topic-detail.njk`, replace lines 82–100 (the `{# ── Timeline ── #}` section) with:

```njk
  {# ── Timeline ── #}
  {% set timelineItems = [] %}
  {% for w in topic.timeline %}
    {% if w.week >= "2026-01-01" %}
      {% set timelineItems = (timelineItems.push(w), timelineItems) %}
    {% endif %}
  {% endfor %}
  {% if timelineItems | length %}
  <section class="td-timeline">
    <h2>Tímalína</h2>
    {# Compute time range: Jan 1 2026 to latest entry + 1 week buffer #}
    {% set yearStartMs = 1767225600000 %}{# 2026-01-01T00:00:00Z #}
    {% set lastWeekMs = 0 %}
    {% set maxSightings = 0 %}
    {% for w in timelineItems %}
      {% set wMs = w.week | isDateToMs %}
      {% if wMs > lastWeekMs %}{% set lastWeekMs = wMs %}{% endif %}
      {% if w.sightings > maxSightings %}{% set maxSightings = w.sightings %}{% endif %}
    {% endfor %}
    {% set rangeEndMs = lastWeekMs + 604800000 %}{# +7 days buffer #}
    {% set rangeMs = rangeEndMs - yearStartMs %}

    {# Determine label thinning: ≤15 all, 16-30 every other, 30+ month-only #}
    {% set barCount = timelineItems | length %}
    {% set thinMode = "all" %}
    {% if barCount > 30 %}{% set thinMode = "month" %}
    {% elif barCount > 15 %}{% set thinMode = "everyOther" %}{% endif %}

    <div class="td-timeline-chart">
      <div class="td-timeline-bars">
        {% for w in timelineItems %}
          {% set wMs = w.week | isDateToMs %}
          {% set leftPct = ((wMs - yearStartMs) / rangeMs * 100) | round(2) %}
          {% set heightPct = (w.sightings / (maxSightings or 1) * 100) | round %}
          <div class="td-timeline-bar" style="left: {{ leftPct }}%" title="{{ w.week | isDate }}: {{ w.sightings }} tilvísanir, {{ w.new_claims }} nýjar fullyrðingar">
            <div class="td-timeline-fill" style="height: {{ heightPct }}%"></div>
          </div>
        {% endfor %}
      </div>

      {# ── Label rows ── #}
      <div class="td-timeline-labels">
        {# Row 1: Day of month #}
        {% for w in timelineItems %}
          {% set wMs = w.week | isDateToMs %}
          {% set leftPct = ((wMs - yearStartMs) / rangeMs * 100) | round(2) %}
          {% set showDay = true %}
          {% if thinMode == "month" %}
            {% set showDay = false %}
          {% elif thinMode == "everyOther" %}
            {% if loop.index0 % 2 != 0 %}{% set showDay = false %}{% endif %}
          {% endif %}
          {% if showDay %}
          <span class="td-label-day" style="left: {{ leftPct }}%">{{ w.week | isDayOfMonth }}</span>
          {% endif %}
        {% endfor %}
      </div>

      <div class="td-timeline-labels td-timeline-labels--month">
        {# Row 2: Month name — only at first bar of each new month #}
        {% set prevMonth = -1 %}
        {% for w in timelineItems %}
          {% set wMs = w.week | isDateToMs %}
          {% set leftPct = ((wMs - yearStartMs) / rangeMs * 100) | round(2) %}
          {% set curMonth = w.week | isMonth1 %}
          {% if curMonth != prevMonth %}
          <span class="td-label-month" style="left: {{ leftPct }}%">{{ w.week | isMonthShort }}</span>
          {% set prevMonth = curMonth %}
          {% endif %}
        {% endfor %}
      </div>

      <div class="td-timeline-labels td-timeline-labels--year">
        {# Row 3: Year — shown once at left edge (all data is 2026) #}
        <span class="td-label-year" style="left: 0%">2026</span>
      </div>
    </div>
  </section>
  {% endif %}
```

**Key details:**
- `yearStartMs` is the Unix timestamp for 2026-01-01T00:00:00Z (hardcoded — `Date.UTC(2026,0,1)` = `1767225600000`)
- `isDateToMs` filter (added in Task 1) returns ms timestamp; `isMonth1` returns 1-based month number
- `rangeEndMs` adds a 7-day buffer beyond the last data point so the final bar isn't pressed against the right edge
- Thinning: `all` = show every day, `everyOther` = odd-indexed bars hidden, `month` = suppress all days

- [ ] **Step 2: Replace the timeline CSS**

In `assets/css/topic-detail.css`, replace lines 83–128 (`.td-timeline` through `.td-timeline-label`) with:

```css
/* ── Timeline ── */

.td-timeline {
  margin-bottom: 1.5rem;
}

.td-timeline h2 {
  font-size: 1.15rem;
  margin: 0 0 0.75rem;
}

.td-timeline-chart {
  position: relative;
}

.td-timeline-bars {
  position: relative;
  height: 120px;
}

.td-timeline-bar {
  position: absolute;
  bottom: 0;
  width: max(1.5%, 6px);
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  transform: translateX(-50%);
}

.td-timeline-fill {
  width: 100%;
  background: var(--accent);
  border-radius: 3px 3px 0 0;
  min-height: 4px;
  opacity: 0.7;
}

.td-timeline-labels {
  position: relative;
  height: 1.2rem;
  margin-top: 2px;
}

.td-timeline-labels--month {
  height: 1.2rem;
}

.td-timeline-labels--year {
  height: 1.2rem;
}

.td-label-day,
.td-label-month,
.td-label-year {
  position: absolute;
  transform: translateX(-50%);
  white-space: nowrap;
}

.td-label-day {
  font-size: 0.65rem;
  color: var(--text-muted);
}

.td-label-month {
  font-size: 0.65rem;
  color: var(--accent);
  font-weight: 600;
}

.td-label-year {
  font-size: 0.65rem;
  color: var(--text-muted);
  font-weight: 700;
  transform: none;
}
```

- [ ] **Step 3: Build and visually verify**

Run: `npm run serve`

Navigate to `http://localhost:8080/malefni/fisheries/` (fisheries — has bars in 2026).
Verify:
- Only 2026 bars are shown
- Bars are spaced proportionally (March bars are close together, Feb bar is further left)
- Day numbers appear below bars
- Month labels appear only at month transitions
- Year label appears once at the left
- Full date shows on hover tooltip

- [ ] **Step 4: Commit**

```bash
git add _includes/topic-detail.njk assets/css/topic-detail.css
git commit -m "feat: proportional timeline with hierarchical date labels

Filter to 2026 only. Bars positioned by real calendar time.
Labels use label_date_short() pattern: day / month / year rows,
with automatic thinning when density exceeds thresholds."
```

---

## Task 3: Support array `extra_css` in base layout

**Files:**
- Modify: `_includes/base.njk:27-28` (CSS loading block)

- [ ] **Step 1: Update extra_css rendering in base.njk**

In `_includes/base.njk`, replace line 28:

```njk
  {% if extra_css %}<link rel="stylesheet" href="{{ extra_css }}">{% endif %}
```

with:

```njk
  {% if extra_css %}
    {% if extra_css is string %}
      <link rel="stylesheet" href="{{ extra_css }}">
    {% else %}
      {% for css in extra_css %}<link rel="stylesheet" href="{{ css }}">
      {% endfor %}
    {% endif %}
  {% endif %}
```

- [ ] **Step 2: Verify existing pages still work**

Run: `npm run build`
Expected: Clean build. All existing pages that use `extra_css` as a string still render correctly (check `fullyrdingar.njk` which sets `extra_css: /assets/css/claim-tracker.css`).

- [ ] **Step 3: Commit**

```bash
git add _includes/base.njk
git commit -m "feat: support array extra_css in base layout

Allows pages to load multiple CSS files via frontmatter.
Single string values continue to work as before."
```

---

## Task 4: Extract shared claim card module

**Files:**
- Create: `assets/js/tracker-claim-card.js`
- Modify: `assets/js/claim-tracker.js:275-402` (extract functions out)
- Modify: `_includes/base.njk:84` (add to script chain)

This is the critical refactoring step. The `renderClaimCard` function and its interaction handlers move to a shared module so both `/fullyrdingar/` and topic detail pages can use them.

- [ ] **Step 1: Create `assets/js/tracker-claim-card.js`**

```js
/**
 * ESBvaktin Shared Claim Card — Rendering and interaction for claim cards.
 *
 * Used by both claim-tracker.js (full page) and topic-claim-tracker.js (embedded).
 * Depends on: ESBvaktinTaxonomy, ESBvaktinTrackerUtils
 */
(function (root, factory) {
  var claimCard = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = claimCard;
  }
  root.ESBvaktinClaimCard = claimCard;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var TAXONOMY = (typeof globalThis !== "undefined" && globalThis.ESBvaktinTaxonomy) || {};
  var utils = (typeof globalThis !== "undefined" && globalThis.ESBvaktinTrackerUtils) || {};

  var VERDICT_LABELS = TAXONOMY.verdictLabels || {};
  var VERDICT_DESCRIPTIONS = TAXONOMY.verdictDescriptions || {};
  var VERDICT_CLASSES = TAXONOMY.verdictClasses || {};
  var CATEGORY_LABELS = TAXONOMY.categoryLabels || {};
  var SOURCE_TYPE_LABELS = TAXONOMY.claimSourceTypeLabels || {};

  var escapeHtml = utils.escapeHtml || function (v) { return String(v ?? ""); };
  var findReportForSource = utils.findReportForSource || function () { return null; };
  var buildReturnUrl = utils.buildReturnUrl || function () { return ""; };
  var withReturnUrl = utils.withReturnUrl || function (url) { return url; };

  var EVIDENCE_ID_RE = /\b([A-Z]+-[A-Z]+-\d+)\b/g;
  function linkifyEvidenceIds(html) {
    return html.replace(
      EVIDENCE_ID_RE,
      function (_, id) {
        return '<a href="/heimildir/' + id.toLowerCase() + '/" class="evidence-link" data-evidence-id="' + id + '">' + id + '</a>';
      }
    );
  }

  /**
   * Render a claim card.
   * @param {Object} claim - The claim data object
   * @param {Object} opts - Options bag
   * @param {string} [opts.focusedSlug] - Slug of the focused claim (for highlight)
   * @param {Object} [opts.reportLookup] - Report lookup for sighting→report matching
   * @returns {string} HTML string
   */
  function renderClaimCard(claim, opts) {
    opts = opts || {};
    var cardId = "ct-claim-" + claim.claim_slug;
    var verdictClass = VERDICT_CLASSES[claim.verdict] || "";
    var verdictLabel = VERDICT_LABELS[claim.verdict] || claim.verdict;
    var categoryLabel = CATEGORY_LABELS[claim.category] || claim.category;
    var confidencePct = Math.round((claim.confidence || 0) * 100);
    var isFocused = opts.focusedSlug === claim.claim_slug;
    var reportLookup = opts.reportLookup;

    var detailsHtml = "";
    if (claim.explanation_is) {
      detailsHtml += '<div class="ct-detail"><strong>Útskýring:</strong> ' + linkifyEvidenceIds(escapeHtml(claim.explanation_is)) + '</div>';
    }
    if (claim.missing_context_is) {
      detailsHtml += '<div class="ct-detail"><strong>Samhengi sem vantar:</strong> ' + linkifyEvidenceIds(escapeHtml(claim.missing_context_is)) + '</div>';
    }
    if (claim.canonical_text_en) {
      detailsHtml += '<div class="ct-detail ct-english"><strong>English:</strong> ' + escapeHtml(claim.canonical_text_en) + '</div>';
    }

    var supportingEvidence = claim.supporting_evidence || [];
    var contradictingEvidence = claim.contradicting_evidence || [];
    if (supportingEvidence.length > 0 || contradictingEvidence.length > 0) {
      var renderEvidenceLinks = function (evidenceList) {
        return evidenceList
          .map(function (evidence) {
            return '<a href="' + escapeHtml(withReturnUrl("/heimildir/" + evidence.slug + "/", buildReturnUrl(cardId))) + '" class="evidence-link" data-evidence-id="' + escapeHtml(evidence.id) + '" data-evidence-source="' + escapeHtml(evidence.source_name) + '">' + escapeHtml(evidence.id) + '</a>';
          })
          .join(", ");
      };

      var evidenceHtml = '<div class="ct-detail ct-evidence">';
      if (supportingEvidence.length > 0) {
        evidenceHtml += '<div class="ct-evidence-group"><strong>Heimildir:</strong> ' + renderEvidenceLinks(supportingEvidence) + '</div>';
      }
      if (contradictingEvidence.length > 0) {
        evidenceHtml += '<div class="ct-evidence-group ct-evidence-contra"><strong>Andstæðar heimildir:</strong> ' + renderEvidenceLinks(contradictingEvidence) + '</div>';
      }
      evidenceHtml += "</div>";
      detailsHtml += evidenceHtml;
    }

    if (claim.sightings && claim.sightings.length) {
      var sightingCount = claim.sightings.length;
      var sightingItems = claim.sightings
        .map(function (sighting) {
          var typeLabel = SOURCE_TYPE_LABELS[sighting.source_type] || sighting.source_type || "";
          var dateStr = sighting.source_date || "";
          var title = sighting.source_title || sighting.source_url;
          var meta = [typeLabel, dateStr].filter(Boolean).join(" · ");
          var matchedReport = reportLookup ? findReportForSource(sighting, reportLookup) : null;
          var internalHref = matchedReport && matchedReport.slug
            ? withReturnUrl("/umraedan/" + matchedReport.slug + "/", buildReturnUrl(cardId))
            : "";
          var href = internalHref || sighting.source_url || "";
          var externalAttrs = internalHref ? "" : ' target="_blank" rel="noopener"';
          var linkClass = internalHref
            ? "ct-sighting-link"
            : "ct-sighting-link ct-sighting-link--external";

          var titleHtml = href
            ? '<a href="' + escapeHtml(href) + '" class="' + linkClass + '"' + externalAttrs + '>' + escapeHtml(title) + '</a>'
            : '<span class="' + linkClass + '">' + escapeHtml(title) + '</span>';

          return '<li class="ct-sighting-item">' +
            titleHtml +
            (meta ? '<span class="ct-sighting-meta">' + escapeHtml(meta) + '</span>' : "") +
            '</li>';
        })
        .join("");

      detailsHtml += '<div class="ct-sightings-section">' +
        '<button class="ct-sightings-toggle" aria-expanded="false" type="button">' +
          '<span class="ct-sightings-label">Birtist í ' + sightingCount + ' umræðu' + (sightingCount > 1 ? 'm' : '') + '</span>' +
          '<span class="ct-sightings-expand-icon">▸</span>' +
        '</button>' +
        '<div class="ct-sightings-details">' +
          '<ul class="ct-sighting-list">' + sightingItems + '</ul>' +
        '</div>' +
      '</div>';
    }

    var sightingBadge =
      claim.sighting_count > 0
        ? '<span class="ct-sighting-count" title="Fjöldi tilvitana">' + claim.sighting_count + '×</span>'
        : "";

    return '<div class="ct-card' + (isFocused ? " ct-card--focused" : "") + '" id="' + escapeHtml(cardId) + '" data-slug="' + escapeHtml(claim.claim_slug) + '">' +
      '<div class="ct-card-header" role="button" tabindex="0" aria-expanded="false">' +
        '<div class="ct-card-main">' +
          '<span class="ct-verdict-pill ' + verdictClass + '" title="' + (VERDICT_DESCRIPTIONS[claim.verdict] || "") + '">' + verdictLabel + '</span>' +
          '<span class="ct-category-tag">' + categoryLabel + '</span>' +
          sightingBadge +
        '</div>' +
        '<p class="ct-claim-text">' + escapeHtml(claim.canonical_text_is) + '</p>' +
        '<div class="ct-card-meta">' +
          '<span class="ct-confidence" title="Vissustig">' +
            '<span class="ct-confidence-bar" style="width: ' + confidencePct + '%"></span>' +
            confidencePct + '%' +
          '</span>' +
          '<span class="ct-expand-icon">▸</span>' +
        '</div>' +
      '</div>' +
      '<div class="ct-card-details">' + detailsHtml + '</div>' +
    '</div>';
  }

  function toggleClaimCard(header) {
    var card = header.closest(".ct-card");
    if (!card) return;
    var expanded = !card.classList.contains("ct-expanded");
    card.classList.toggle("ct-expanded", expanded);
    header.setAttribute("aria-expanded", expanded);
  }

  function toggleSightings(toggle) {
    var section = toggle.closest(".ct-sightings-section");
    if (!section) return;
    var expanded = !section.classList.contains("ct-sightings-expanded");
    section.classList.toggle("ct-sightings-expanded", expanded);
    toggle.setAttribute("aria-expanded", expanded);
  }

  return {
    renderClaimCard: renderClaimCard,
    toggleClaimCard: toggleClaimCard,
    toggleSightings: toggleSightings,
    linkifyEvidenceIds: linkifyEvidenceIds,
  };
});
```

- [ ] **Step 2: Add `tracker-claim-card.js` to the script chain in `base.njk`**

In `_includes/base.njk`, after line 84 (`tracker-controller.js`), add:

```njk
  {% if extra_js %}<script src="/assets/js/tracker-claim-card.js" defer></script>{% endif %}
```

The line order should be:
```
{% if extra_js %}<script src="/assets/js/tracker-controller.js" defer></script>{% endif %}
{% if extra_js %}<script src="/assets/js/tracker-claim-card.js" defer></script>{% endif %}
{% if return_link_support %}<script src="/assets/js/detail-return-link.js" defer></script>{% endif %}
```

- [ ] **Step 3: Refactor `claim-tracker.js` to use shared module**

In `assets/js/claim-tracker.js`, make these changes:

**a)** After the existing constant declarations at the top (around line 20), add:

```js
  const claimCard = globalThis.ESBvaktinClaimCard || {};
```

**b)** Remove the inline `EVIDENCE_ID_RE`, `linkifyEvidenceIds` (lines 34-40), `renderClaimCard` (lines 275-384), `toggleSightings` (lines 386-393), and `toggleClaimCard` (lines 395-402) functions entirely.

**c)** Replace their usages:
- `renderClaimCard(claim)` → `claimCard.renderClaimCard(claim, { focusedSlug: getFilters().claim, reportLookup: getReportLookup() })`
- `toggleSightings(target)` → `claimCard.toggleSightings(target)`
- `toggleClaimCard(target)` → `claimCard.toggleClaimCard(target)`

The `renderItem` in `renderResults` (line 251) becomes:

```js
renderItem: function (claim) {
  return claimCard.renderClaimCard(claim, {
    focusedSlug: getFilters().claim,
    reportLookup: getReportLookup(),
  });
},
```

The `bindClick` handlers (lines 532-540) become:

```js
controller.bindClick(".ct-card-header", (target) => {
  claimCard.toggleClaimCard(target);
});

controller.bindKeyActivate(".ct-card-header", (target) => {
  claimCard.toggleClaimCard(target);
});

controller.bindClick(".ct-sightings-toggle", (target) => {
  claimCard.toggleSightings(target);
});
```

- [ ] **Step 4: Run existing smoke tests to verify no regression**

Run: `npm run browser:smoke`
Expected: All tests pass. The `/fullyrdingar/` page still renders claim cards, sightings expand/collapse, evidence links work.

- [ ] **Step 5: Commit**

```bash
git add assets/js/tracker-claim-card.js assets/js/claim-tracker.js _includes/base.njk
git commit -m "refactor: extract shared claim card module

Move renderClaimCard, toggleClaimCard, toggleSightings into
tracker-claim-card.js. claim-tracker.js now delegates to the
shared module. Prepares for topic-embedded claim tracker."
```

---

## Task 5: Create the topic claim tracker script

**Files:**
- Create: `assets/js/topic-claim-tracker.js`

- [ ] **Step 1: Create `assets/js/topic-claim-tracker.js`**

```js
/**
 * ESBvaktin Topic Claim Tracker — Embedded claim browser for topic detail pages.
 *
 * Loads claims.json lazily when the mount point enters the viewport,
 * filters to the topic's category, and renders the full claim card UI.
 *
 * Depends on: ESBvaktinTaxonomy, ESBvaktinTrackerUtils, ESBvaktinTrackerRenderer,
 *             ESBvaktinTrackerController, ESBvaktinClaimCard
 */
(function () {
  "use strict";

  var TAXONOMY = globalThis.ESBvaktinTaxonomy || {};
  var utils = globalThis.ESBvaktinTrackerUtils || {};
  var renderer = globalThis.ESBvaktinTrackerRenderer;
  var controllerLib = globalThis.ESBvaktinTrackerController || {};
  var createController = controllerLib.create;
  var claimCard = globalThis.ESBvaktinClaimCard || {};
  var createReportLookup = utils.createReportLookup || (function () { return { byArticleUrl: new Map(), byTitleDate: new Map() }; });
  var createSortComparator = utils.createSortComparator;
  var createCommitState = utils.createCommitState;
  var createErrorHandler = utils.createErrorHandler;
  var renderActiveFilterChips = utils.renderActiveFilterChips;

  var VERDICT_LABELS = TAXONOMY.verdictLabels || {};

  var root = document.getElementById("topic-claim-tracker");
  if (!root || !renderer || !createController) return;

  var topicCategory = (root.dataset.category || "").replace(/-/g, "_");
  var dataBase = root.dataset.base || "/assets/data";
  var CLAIMS_URL = dataBase + "/claims.json";
  var REPORTS_URL = dataBase + "/reports.json";

  var controller = createController({
    root: root,
    trackerName: "topic-claims",
    initialState: {
      search: "",
      verdict: "",
      sort: "sighting_count",
      sortDir: "DESC",
    },
    initialData: {
      claims: [],
      reportLookup: createReportLookup([]),
    },
    load: async function (api) {
      var allClaims = await api.loadJson(CLAIMS_URL);
      var claims = allClaims.filter(function (c) { return c.category === topicCategory; });
      var reports = [];
      try {
        reports = await api.loadJson(REPORTS_URL);
      } catch (_) {
        reports = [];
      }
      return {
        claims: claims,
        reportLookup: createReportLookup(reports),
      };
    },
    renderShell: renderShell,
    renderStats: renderStats,
    renderResults: renderResults,
    initialRender: "stats+results",
    onError: createErrorHandler({
      renderShell: renderShell,
      renderer: renderer,
      statsId: "tct-stats",
      resultsId: "tct-results",
      resultsMessage: "Gat ekki hlaðið fullyrðingum.",
    }),
  });

  function getClaims() {
    return (controller.getData() && controller.getData().claims) || [];
  }

  function getReportLookup() {
    return (controller.getData() && controller.getData().reportLookup) || createReportLookup([]);
  }

  function getFilters() {
    return controller.getState();
  }

  function queryClaims() {
    var filters = getFilters();
    var results = getClaims().slice();

    if (filters.search) {
      var q = filters.search.toLowerCase();
      results = results.filter(function (claim) {
        return (claim.canonical_text_is && claim.canonical_text_is.toLowerCase().indexOf(q) !== -1) ||
          (claim.explanation_is && claim.explanation_is.toLowerCase().indexOf(q) !== -1) ||
          (claim.missing_context_is && claim.missing_context_is.toLowerCase().indexOf(q) !== -1);
      });
    }

    if (filters.verdict) {
      results = results.filter(function (claim) { return claim.verdict === filters.verdict; });
    }

    results.sort(createSortComparator(filters.sort || "sighting_count", filters.sortDir || "DESC"));
    return results;
  }

  function queryStats() {
    var claims = getClaims();
    return {
      total: claims.length,
      supported: claims.filter(function (c) { return c.verdict === "supported"; }).length,
      partial: claims.filter(function (c) { return c.verdict === "partially_supported"; }).length,
      unsupported: claims.filter(function (c) { return c.verdict === "unsupported"; }).length,
      misleading: claims.filter(function (c) { return c.verdict === "misleading"; }).length,
      unverifiable: claims.filter(function (c) { return c.verdict === "unverifiable"; }).length,
      totalSightings: claims.reduce(function (sum, c) { return sum + (c.sighting_count || 0); }, 0),
    };
  }

  function renderShell() {
    var filters = getFilters();

    root.innerHTML =
      '<div class="ct-stats" id="tct-stats">' + renderer.renderMessage("Hleð gögnum…", "ct-stat-loading") + '</div>' +

      renderer.renderControlBlock({
        wrapperClass: "ct-controls",
        search: {
          id: "tct-search",
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
              id: "tct-verdict",
              className: "ct-select",
              label: "Úrskurður",
              placeholder: "Allir úrskurðir",
              options: Object.entries(VERDICT_LABELS).map(function (entry) { return { value: entry[0], label: entry[1] }; }),
              selectedValue: filters.verdict,
            }),
            renderer.renderSelect({
              id: "tct-sort",
              className: "ct-select",
              label: "Röðun",
              options: [
                { value: "sighting_count", label: "Tíðni" },
                { value: "last_verified", label: "Síðast staðfest" },
                { value: "confidence", label: "Vissustig" },
              ],
              selectedValue: filters.sort,
            }),
          ],
        }],
      }) +

      '<div id="tct-active-filters"></div>' +
      '<p class="ct-results-meta" id="tct-results-meta" aria-live="polite"></p>' +
      '<div class="ct-results" id="tct-results">' + renderer.renderMessage("Hleð fullyrðingum…", "ct-loading") + '</div>';
  }

  function renderStats() {
    var stats = queryStats();
    var el = document.getElementById("tct-stats");
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
    var claims = queryClaims();
    var el = document.getElementById("tct-results");
    if (!el) return;
    renderActiveFilters();
    updateResultsMeta(claims.length, getClaims().length);

    if (claims.length === 0) {
      el.innerHTML = renderer.renderMessage("Engar fullyrðingar fundust.", "ct-empty");
      return;
    }

    el.innerHTML = renderer.renderCollection({
      items: claims,
      renderItem: function (claim) {
        return claimCard.renderClaimCard(claim, {
          reportLookup: getReportLookup(),
        });
      },
    });
  }

  function updateResultsMeta(visibleCount, totalCount) {
    var el = document.getElementById("tct-results-meta");
    if (!el) return;
    if (visibleCount === totalCount) {
      el.textContent = "Sýni allar " + totalCount + " fullyrðingar.";
    } else {
      el.textContent = "Sýni " + visibleCount + " af " + totalCount + " fullyrðingum.";
    }
  }

  function getActiveFilterChips() {
    var filters = getFilters();
    var chips = [];
    if (filters.search) {
      chips.push({ key: "search", text: "Leit: " + filters.search });
    }
    if (filters.verdict) {
      chips.push({ key: "verdict", text: "Úrskurður: " + (VERDICT_LABELS[filters.verdict] || filters.verdict) });
    }
    if (filters.sort && filters.sort !== "sighting_count") {
      var sortLabels = { last_verified: "Síðast staðfest", confidence: "Vissustig" };
      chips.push({ key: "sort", text: "Röðun: " + (sortLabels[filters.sort] || filters.sort) });
    }
    return chips;
  }

  function renderActiveFilters() {
    renderActiveFilterChips("tct-active-filters", renderer, getActiveFilterChips);
  }

  function clearFilter(key, api) {
    var patch = {};
    if (key === "search") patch.search = "";
    if (key === "verdict") patch.verdict = "";
    if (key === "sort") patch.sort = "sighting_count";
    api.setState(patch, "all");
  }

  function clearAllFilters(api) {
    api.setState({ search: "", verdict: "", sort: "sighting_count" }, "all");
  }

  // ── Event bindings ──

  controller.bindInput(
    "#tct-search",
    function (value, _target, _event, api) {
      api.setState({ search: value }, "results");
    },
    { debounceMs: 200, trim: true }
  );

  controller.bindChange("#tct-verdict", function (value, _target, _event, api) {
    api.setState({ verdict: value }, "results");
  });

  controller.bindChange("#tct-sort", function (value, _target, _event, api) {
    api.setState({ sort: value }, "results");
  });

  controller.bindClick("[data-clear-filter]", function (target, _event, api) {
    clearFilter(target.getAttribute("data-clear-filter"), api);
  });

  controller.bindClick("[data-clear-all-filters]", function (_target, _event, api) {
    clearAllFilters(api);
  });

  controller.bindClick(".ct-card-header", function (target) {
    claimCard.toggleClaimCard(target);
  });

  controller.bindKeyActivate(".ct-card-header", function (target) {
    claimCard.toggleClaimCard(target);
  });

  controller.bindClick(".ct-sightings-toggle", function (target) {
    claimCard.toggleSightings(target);
  });

  // ── Lazy loading via IntersectionObserver ──

  if ("IntersectionObserver" in window) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          observer.disconnect();
          controller.start();
        }
      });
    }, { rootMargin: "200px" });
    observer.observe(root);
  } else {
    controller.start();
  }
})();
```

- [ ] **Step 2: Verify the file is syntactically correct**

Run: `node -c assets/js/topic-claim-tracker.js`
Expected: No syntax errors.

- [ ] **Step 3: Commit**

```bash
git add assets/js/topic-claim-tracker.js
git commit -m "feat: add topic-scoped claim tracker script

Lazy-loaded embedded claim tracker for topic detail pages.
Filters claims.json by topic category, provides search, verdict
filter, sort. Uses shared tracker-claim-card for card rendering."
```

---

## Task 6: Wire up the topic detail template

**Files:**
- Modify: `_includes/topic-detail.njk:1-5` (frontmatter)
- Modify: `_includes/topic-detail.njk:102-135` (claims section)

- [ ] **Step 1: Update frontmatter**

In `_includes/topic-detail.njk`, replace lines 1–5:

```njk
---
layout: base.njk
extra_css: /assets/css/topic-detail.css
return_link_support: true
---
```

with:

```njk
---
layout: base.njk
extra_css:
  - /assets/css/topic-detail.css
  - /assets/css/claim-tracker.css
extra_js: /assets/js/topic-claim-tracker.js
return_link_support: true
---
```

- [ ] **Step 2: Replace the claims section with tracker mount point**

In `_includes/topic-detail.njk`, replace the `{# ── Claims ── #}` section (lines 102–135) with:

```njk
  {# ── Claims (embedded tracker) ── #}
  <section class="td-claims" id="topic-claim-tracker"
           data-category="{{ topic.slug }}"
           data-base="/assets/data">
    <h2>Fullyrðingar ({{ topic.claims | length }})</h2>
    <noscript>
      <p>Kveiktu á JavaScript til að skoða fullyrðingar.</p>
    </noscript>
  </section>
```

Note: `topic.slug` uses hyphens (e.g. `eea-eu-law`); the JS converts to underscores for the category filter.

- [ ] **Step 3: Build and visually verify**

Run: `npm run serve`

Navigate to `http://localhost:8080/malefni/fisheries/`
Verify:
- Claim tracker loads when you scroll to the claims section
- Cards show verdict pills, confidence bars, sighting counts
- Search works within the topic's claims
- Verdict filter narrows results
- Sort changes the order
- Expanding a card shows explanation, sightings
- Sightings toggle works
- Stats row shows topic-scoped counts

Also verify `http://localhost:8080/fullyrdingar/` still works identically (no regression from Task 4 refactor).

- [ ] **Step 4: Commit**

```bash
git add _includes/topic-detail.njk
git commit -m "feat: embed claim tracker in topic detail pages

Replace simple server-rendered claims list with the full
client-side tracker filtered to the topic's category.
Lazy-loads claims.json on scroll via IntersectionObserver."
```

---

## Task 7: Add browser smoke tests for the upgraded topic page

**Files:**
- Modify: `tests/browser/smoke.spec.js`

- [ ] **Step 1: Add topic detail claim tracker test**

Append to `tests/browser/smoke.spec.js`:

```js
test("topic detail page loads embedded claim tracker", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await gotoAndWait(page, "/malefni/", ".tp-card-link");
  await page.locator(".tp-card-link").first().click();
  await expect(page.locator(".td-back")).toBeVisible();

  // Scroll to trigger lazy load of the claim tracker
  await page.locator("#topic-claim-tracker").scrollIntoViewIfNeeded();
  await page.locator("#topic-claim-tracker .ct-card").first().waitFor({ state: "visible", timeout: 10000 });

  // Verify claim cards rendered
  const cardCount = await page.locator("#topic-claim-tracker .ct-card").count();
  expect(cardCount).toBeGreaterThan(0);

  // Verify controls exist
  await expect(page.locator("#tct-search")).toBeVisible();
  await expect(page.locator("#tct-verdict")).toBeVisible();
  await expect(page.locator("#tct-sort")).toBeVisible();

  // Verify expand/collapse works
  const firstCard = page.locator("#topic-claim-tracker .ct-card").first();
  await firstCard.locator(".ct-card-header").click();
  await expect(firstCard).toHaveClass(/ct-expanded/);
});

test("topic detail timeline shows proportional 2026 bars", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await gotoAndWait(page, "/malefni/", ".tp-card-link");
  await page.locator(".tp-card-link").first().click();
  await expect(page.locator(".td-back")).toBeVisible();

  // Verify timeline structure
  const bars = page.locator(".td-timeline-bar");
  const barCount = await bars.count();

  if (barCount > 0) {
    // Bars should have left-positioned style (proportional)
    const firstBarStyle = await bars.first().getAttribute("style");
    expect(firstBarStyle).toContain("left:");

    // Day labels should exist
    await expect(page.locator(".td-label-day").first()).toBeVisible();

    // Month labels should exist
    await expect(page.locator(".td-label-month").first()).toBeVisible();
  }
});
```

- [ ] **Step 2: Run the full smoke test suite**

Run: `npm run browser:smoke`
Expected: All tests pass including the two new ones.

- [ ] **Step 3: Commit**

```bash
git add tests/browser/smoke.spec.js
git commit -m "test: add browser tests for topic claim tracker and timeline

Verify embedded claim tracker loads, shows cards, supports
expand/collapse. Verify proportional timeline has positioned
bars and hierarchical labels."
```

---

## Task 8: Final verification and cleanup

- [ ] **Step 1: Full build**

Run: `npm run build`
Expected: Clean build, no errors, no warnings.

- [ ] **Step 2: Run all browser tests**

Run: `npm run browser:test`
Expected: All tests pass.

- [ ] **Step 3: Spot-check multiple topic pages**

With `npm run serve` running, manually visit:
- `/malefni/fisheries/` (fisheries — many claims)
- `/malefni/sovereignty/` (sovereignty — heaviest topic)
- `/malefni/agriculture/` (agriculture — check smaller topic)
- `/malefni/currency/` (currency — verify category mapping with no hyphens)
- `/malefni/eea-eu-law/` (eea-eu-law — verify hyphen→underscore mapping)

For each, verify:
- Timeline shows 2026 data only, bars proportionally spaced
- Claim tracker loads and shows correct number of claims
- Search, filter, sort work

