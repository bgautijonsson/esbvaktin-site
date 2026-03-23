# Málefni Page Upgrade — Design Spec

**Date:** 2026-03-23
**Status:** Approved
**Scope:** Topic detail pages (`/malefni/{slug}/`)

## Summary

Two improvements to the topic detail pages:

1. **Timeline: proportional time axis with hierarchical date labels** — replace the current equidistant bar chart (with overlapping full-date labels) with a proportionally-spaced 2026-only timeline using `label_date_short()`-style hierarchical labels
2. **Claims section: embedded claim tracker** — replace the simple server-rendered claims list with a full client-side claim tracker (filtering, search, sort, expandable cards), lazy-loaded from `claims.json`

## Context

The site is receiving significant media attention (Spursmál, Bylgjan, Rás 2). Málefni is the natural entry point for "I want to understand topic X" — upgrading it improves both first impressions and return-visit value.

## Design

### 1. Timeline — Proportional Axis with Hierarchical Labels

#### Current state

- Server-rendered bar chart in `_includes/topic-detail.njk` (lines 82–100)
- CSS in `assets/css/topic-detail.css` (lines 83–128)
- Bars use `display: flex` with equal `flex: 1` sizing — each bar gets equal width regardless of time gap
- Labels show full Icelandic date (`"22. apríl 2024"`) on every bar, positioned absolutely at `bottom: -1.4rem`
- Labels overlap when there are more than ~8 bars

#### New behaviour

**Filter to 2026 only.** The EU debate is heating up this year; earlier data is sparse and not relevant to the current picture. The Nunjucks template filters `topic.timeline` to entries where `w.week >= "2026-01-01"`.

**Proportional time positioning.** Bars are positioned on a real calendar axis. The container switches from `display: flex` to `position: relative`. Each bar gets:
- `left: X%` — computed as `(date - yearStart) / (yearEnd - yearStart) * 100`
- Fixed width: `max(1.5%, 6px)` — ensures visibility even for sparse timelines
- The time range spans from Jan 1 2026 to the latest data point (plus a small buffer)

**Hierarchical labels** in stacked rows below the bar area:
- **Row 1 (day):** day-of-month number, centred under each bar
- **Row 2 (month):** Icelandic month abbreviation (3 chars), shown only at the first bar of each new month
- **Row 3 (year):** `2026` shown once at the left edge (since all data is 2026)

**Label thinning** when bars are dense:
- ≤15 bars: show every day label
- 16–30 bars: show every other day label
- 30+ bars: show only at month boundaries, suppress individual day labels

**Tooltips:** full date on hover (e.g. `"9. mars 2026: 174 tilvísanir, 127 nýjar fullyrðingar"`) — uses existing `isDate` filter, same format as before.

#### Files changed

| File | Change |
|------|--------|
| `_includes/topic-detail.njk` | Rewrite timeline section: filter to 2026, compute proportional positions, render three label rows |
| `assets/css/topic-detail.css` | Rewrite `.td-timeline-*` styles: relative positioning, absolute bars, label row layout |
| `eleventy.config.js` | Optional: add `isMonthShort` filter for 3-char Icelandic month abbreviations |

### 2. Claims Section — Embedded Tracker Instance

#### Current state

- Server-rendered `<details>` list in `_includes/topic-detail.njk` (lines 102–135)
- Each claim shows: verdict pill, canonical text, sighting count, speakers, last seen date
- No search, filtering, sorting, or expandable detail (explanation, confidence, evidence links, sightings list)
- Data comes from `_data/topic-details/*.json` which has a minimal claim subset (no confidence, explanation, sightings, evidence)

#### New behaviour

The `td-claims` section is replaced with a **tracker mount point**:

```html
<section class="td-claims" id="topic-claim-tracker"
         data-category="fisheries"
         data-base="/assets/data">
  <noscript>...</noscript>
</section>
```

A new script (`topic-claim-tracker.js`) creates a `TrackerController` instance that:
1. **Lazy-loads** `claims.json` + `reports.json` when the section enters the viewport (IntersectionObserver)
2. **Filters** claims by `category === topicCategory` (derived from `data-category`)
3. **Renders** the full claim tracker UI: search, verdict filter, sort dropdown, expandable cards with explanation, confidence bar, evidence links, sightings toggle

**Category mapping:** Topic slugs use hyphens (`eea-eu-law`), claim categories use underscores (`eea_eu_law`). The script converts with `.replace(/-/g, '_')`.

#### Differences from `/fullyrdingar/` tracker

| Aspect | `/fullyrdingar/` | Topic embedded |
|--------|-------------------|----------------|
| Category filter | Dropdown (all categories) | Pre-filtered, no dropdown |
| URL query sync | Yes (pushes to `?q=&verdict=`) | No (embedded section, don't pollute topic URL) |
| Data loading | Eager (on page load) | Lazy (IntersectionObserver on mount point) |
| Stats row | Full site-wide stats | Topic-scoped stats (count, sightings, verdict breakdown) |

#### Shared card rendering

The `renderClaimCard()` function (~110 lines) is currently inline in `claim-tracker.js`. To avoid duplication, extract it into a new shared module:

**New file: `assets/js/tracker-claim-card.js`**
- Exports `renderClaimCard(claim, options)` — the card HTML generator
- Exports `toggleClaimCard(header)` and `toggleSightings(toggle)` — interaction handlers
- Both `claim-tracker.js` and `topic-claim-tracker.js` consume it

#### Script loading

The `base.njk` template currently supports a single `extra_css` and `extra_js` string. The topic detail page needs:
- CSS: `topic-detail.css` + `claim-tracker.css`
- JS: `topic-claim-tracker.js`

**Change `extra_css` to support arrays.** In `base.njk`, update the CSS block:

```njk
{# Before: #}
{% if extra_css %}<link rel="stylesheet" href="{{ extra_css }}">{% endif %}

{# After: #}
{% if extra_css %}
  {% if extra_css is string %}
    <link rel="stylesheet" href="{{ extra_css }}">
  {% else %}
    {% for css in extra_css %}<link rel="stylesheet" href="{{ css }}">
    {% endfor %}
  {% endif %}
{% endif %}
```

Then `topic-detail.njk` frontmatter becomes:
```yaml
extra_css:
  - /assets/css/topic-detail.css
  - /assets/css/claim-tracker.css
extra_js: /assets/js/topic-claim-tracker.js
```

#### New file: `assets/js/topic-claim-tracker.js` (~150 lines)

Glue script that:
- Reads `data-category` and `data-base` from the mount element
- Sets up IntersectionObserver to trigger `controller.start()` on viewport entry
- Creates a TrackerController with:
  - `load()`: fetches claims.json + reports.json, filters to category
  - `renderShell()`: search input, verdict filter, sort dropdown (no category dropdown)
  - `renderStats()`: topic-scoped verdict breakdown
  - `renderResults()`: delegates to shared `renderClaimCard()`
- Binds search (debounced), verdict change, sort change, card expand/collapse, sightings toggle

#### Files changed

| File | Change |
|------|--------|
| `_includes/topic-detail.njk` | Replace `td-claims` section with tracker mount point; update frontmatter for array `extra_css` and `extra_js` |
| `_includes/base.njk` | Support array `extra_css` |
| `assets/js/tracker-claim-card.js` | **New** — extracted shared card rendering + interaction handlers |
| `assets/js/claim-tracker.js` | Refactor to import from `tracker-claim-card.js` |
| `assets/js/topic-claim-tracker.js` | **New** — topic-scoped claim tracker glue |

## Data scalability note

Current data: 1,319 claims, 2.5 MB raw / ~608 KB gzipped. Client-side approach is sound up to ~3,000–5,000 claims. If growth exceeds that, consider virtual scrolling or per-category JSON splits. Not needed now.

## Out of scope

- Topic index page (`/malefni/`) — no changes
- Evidence, entity, source sections on topic detail pages — unchanged
- Homepage, Fullyrðingar page — unchanged (aside from claim-tracker.js refactor to use shared card module)
- Stickiness features, first-impression polish — future brainstorm topics
