# Nav Redesign: 9 → 5 Items

## Problem

The desktop nav wraps to two rows because 9 items (6 primary + 3 utility) plus the logo and donate button don't fit in one line. The two-group split ("Gagnasíður" vs "Yfirlit og hjálp") adds visual complexity without helping users find what they need.

## Decision: Data-driven single row

GoatCounter traffic data (late March 2026, ~5,500 pageviews) shows clear tiers:

| Page | Traffic | Nav decision |
|------|---------|--------------|
| /fullyrdingar | 12% | **Keep top-level** |
| /malefni/* | ~9% combined | **Keep top-level** |
| /umraedan | 7% | **Keep top-level** |
| /raddirnar | 3% | Move to Safnið hub |
| /heimildir | 3% | Move to Safnið hub |
| /um-okkur | 2% | Move to footer only |
| /thingraedur | <2% | Move to Safnið hub |
| /vikuyfirlit | <2% (spiky) | Remove from nav; surface in /nytt feed |

## New nav structure

```
ESB Vaktin    Nýtt  Fullyrðingar  Umræðan  Málefni  Safnið    [Styrkja]
```

5 items, one row, no groups, no wrapping.

### Items kept top-level
- **Nýtt** — the daily hook, "what's new" feed
- **Fullyrðingar** — the core product (12% of traffic)
- **Umræðan** — article analyses (7%)
- **Málefni** — topic deep-dives (~9% combined across topic pages)

### Items moved to Safnið hub (`/safnid/`)
- **Raddirnar** — entity/speaker tracker (3%)
- **Heimildir** — evidence database (3%)
- **Þingræður** — parliamentary debate tracker (<2%)

### Items removed from nav entirely
- **Vikuyfirlit** — weekly editorial appears in /nytt feed when published; no permanent nav slot needed
- **Um síðuna** — stays in footer (2% traffic doesn't justify a nav slot)

## Safnið hub page (`/safnid/`)

A lightweight wayfinding page with live counts. Reuses data already computed in `_data/home.js`.

**Layout:** Single column (no `wide_layout`), max-width 720px.

**Content:**
- Heading: "Safnið" in Fraunces Display
- Deck: one sentence explaining this is the data collection behind ESBvaktin
- Three link cards, each showing:
  - Name (e.g. "Raddirnar")
  - Count from home data (e.g. "506 aðilar")
  - One-line description (e.g. "Einstaklingar, flokkar og stofnanir í umræðunni")
  - Link to the tracker page
- Cards use `--bg-surface` background, `--rule` border-bottom separator, no shadows. Editorial style consistent with /nytt anchor slab.

**Data source:** Reads from `_data/home.js` signal_stats (already computes counts for fullyrðingar, greiningar, raddir, heimildir, þingræður).

### Accessibility
- `<main aria-label="Gagnasöfn">`
- Cards are `<a>` elements with descriptive text
- 44px min touch targets

## Navigation changes

### `_data/navigation.js`

```js
module.exports = {
  primary: [
    { label: "Nýtt", href: "/nytt/", match: "prefix" },
    { label: "Fullyrðingar", href: "/fullyrdingar/", match: "prefix" },
    { label: "Umræðan", href: "/umraedan/", match: "prefix" },
    { label: "Málefni", href: "/malefni/", match: "prefix" },
    { label: "Safnið", href: "/safnid/", match: "prefix" },
  ],
};
```

The `utility` group is removed entirely. One flat list.

### `_includes/base.njk`

Remove the two-group structure (`site-menu-group`, `site-menu-group--utility`, `nav-group-label`). Replace with a single `<ul>` of primary items.

### CSS cleanup

Remove `.site-menu-group`, `.site-menu-group--utility`, `.nav-group-label`, `.nav-list--utility`. Simplify `.site-menu` to a single flex row. The `.nav-list--primary` gap can increase slightly since there are fewer items.

### Footer

Add "Um síðuna" to the footer links (already there). No other footer changes needed.

### Mobile nav

The hamburger menu keeps all 5 items in a single list. No group labels needed. Simpler than before.

## Files to create/modify

| File | Action |
|------|--------|
| `safnid/index.njk` | **Create** — Safnið hub page |
| `_data/navigation.js` | **Modify** — replace with 5-item flat list |
| `_includes/base.njk` | **Modify** — remove two-group nav structure |
| `assets/css/style.css` | **Modify** — remove utility nav CSS, simplify menu |
| `assets/js/mobile-nav.js` | **Check** — may need adjustment for single-group |

## Out of scope

- No changes to the tracker pages themselves
- No changes to /nytt or homepage content
- No changes to footer beyond what's already there
- Vikuyfirlit integration into /nytt feed is a separate task
