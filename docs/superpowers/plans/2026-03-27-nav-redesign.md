# Nav Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce the nav from 9 items (two rows) to 5 items (one row) based on GoatCounter traffic data, and create a Safnið hub page for the three lower-traffic data trackers.

**Architecture:** Replace the two-group nav structure (primary + utility) with a single flat list of 5 items. Create a new `/safnid/` page that serves as a hub to Raddirnar, Heimildir, and Þingræður. Remove "Um síðuna" from nav (stays in footer). Remove Vikuyfirlit from nav (surfaces in /nytt feed instead).

**Tech Stack:** 11ty/Nunjucks, vanilla CSS, existing `_data/home.js` data

**Spec:** `docs/superpowers/specs/2026-03-27-nav-redesign-design.md`

---

### Task 1: Update navigation data

**Files:**
- Modify: `_data/navigation.js`

- [ ] **Step 1: Replace navigation.js with flat 5-item list**

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

The `utility` key is removed entirely. Only `primary` remains.

- [ ] **Step 2: Commit**

```bash
git add _data/navigation.js
git commit -m "refactor(nav): reduce to 5-item flat list"
```

---

### Task 2: Simplify base.njk nav markup

**Files:**
- Modify: `_includes/base.njk:47-65`

- [ ] **Step 1: Replace the two-group nav structure with a single list**

Replace lines 47-65 of `_includes/base.njk`:

```html
        <div id="site-menu" class="site-menu">
          <div class="site-menu-group">
            <p class="nav-group-label">Gagnasíður</p>
            <ul class="nav-list nav-list--primary">
              {% for item in navigation.primary %}
              {% set isCurrent = page.url | navCurrent(item) %}
              <li><a href="{{ item.href }}"{% if isCurrent %} aria-current="page"{% endif %}>{{ item.label }}</a></li>
              {% endfor %}
            </ul>
          </div>
          <div class="site-menu-group site-menu-group--utility">
            <p class="nav-group-label">Yfirlit og hjálp</p>
            <ul class="nav-list nav-list--utility">
              {% for item in navigation.utility %}
              {% set isCurrent = page.url | navCurrent(item) %}
              <li><a href="{{ item.href }}"{% if isCurrent %} aria-current="page"{% endif %}>{{ item.label }}</a></li>
              {% endfor %}
            </ul>
          </div>
        </div>
```

With this single-list structure:

```html
        <div id="site-menu" class="site-menu">
          <ul class="nav-list">
            {% for item in navigation.primary %}
            {% set isCurrent = page.url | navCurrent(item) %}
            <li><a href="{{ item.href }}"{% if isCurrent %} aria-current="page"{% endif %}>{{ item.label }}</a></li>
            {% endfor %}
          </ul>
        </div>
```

- [ ] **Step 2: Verify build passes**

```bash
npm run build 2>&1 | tail -3
```

Expected: "Wrote XXXX files" with no errors.

- [ ] **Step 3: Commit**

```bash
git add _includes/base.njk
git commit -m "refactor(nav): single flat list, remove two-group structure"
```

---

### Task 3: Clean up nav CSS

**Files:**
- Modify: `assets/css/style.css`

- [ ] **Step 1: Remove the two-group desktop styles**

In `assets/css/style.css`, remove these rules:

**Lines 203-216** — `.site-menu-group`, `.site-menu-group--utility`, `.nav-group-label` base rules:
```css
.site-menu-group {
  display: flex;
  align-items: center;
  min-width: 0;
}

.site-menu-group--utility {
  margin-left: auto;
}

.nav-group-label {
  display: none;
  margin: 0;
}
```

**Lines 226-236** — `.nav-list--primary` and `.nav-list--utility` separate gap/size rules:
```css
.nav-list--primary {
  gap: 1rem;
  font-size: 0.88rem;
  flex-wrap: wrap;
}

.nav-list--utility {
  gap: 0.7rem;
  font-size: 0.78rem;
  flex-wrap: wrap;
}
```

Replace them with a single `.nav-list` size rule (after the existing `.nav-list` base rule at line 218):

```css
.nav-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.88rem;
}
```

(This replaces the existing `.nav-list` block AND the two variant blocks with one unified rule.)

- [ ] **Step 2: Remove the desktop utility separator**

In the `@media (min-width: 961px)` block, remove the `.site-menu-group--utility::before` rule (lines 282-290):

```css
  .site-menu-group--utility::before {
    content: "";
    display: block;
    width: 1px;
    height: 1.2rem;
    background: var(--rule);
    margin-right: 0.5rem;
    flex-shrink: 0;
  }
```

- [ ] **Step 3: Simplify mobile nav styles**

In the `@media (max-width: 960px)` block, remove the group-specific mobile rules (lines 384-404):

```css
  .site-menu-group {
    flex-direction: column;
    align-items: stretch;
    gap: 0.3rem;
  }

  .site-menu-group--utility {
    margin-left: 0;
    padding-top: 0.75rem;
    border-top: 1px solid var(--rule);
  }

  .nav-group-label {
    display: block;
    color: var(--text-muted);
    font-family: var(--font-display);
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
```

These are no longer needed since the menu is a single `<ul>`.

- [ ] **Step 4: Verify build and visual check**

```bash
npm run build 2>&1 | tail -3
```

Then visually verify the nav renders as a single row at desktop width and collapses properly on mobile via the dev server.

- [ ] **Step 5: Commit**

```bash
git add assets/css/style.css
git commit -m "style(nav): remove two-group CSS, single flat nav list"
```

---

### Task 4: Create Safnið hub page

**Files:**
- Create: `safnid/index.njk`

- [ ] **Step 1: Create the safnid directory**

```bash
mkdir -p safnid
```

- [ ] **Step 2: Create the hub page template**

Create `safnid/index.njk`:

```njk
---
layout: base.njk
title: Safnið
description: Gagnasöfn ESB Vaktinar — raddir í umræðunni, heimildir og þingræður.
extra_css: /assets/css/safnid.css
---

<section class="safnid-hero">
  <h1 class="safnid-heading">Safnið</h1>
  <p class="safnid-deck">Gagnasöfn ESB Vaktinar. Hér er hægt að skoða alla aðila í umræðunni, heimildir sem fullyrðingar byggja á og þingræður um ESB-málið.</p>
</section>

<div class="safnid-cards">
  {% for stat in home.signal_stats %}
  {% if stat.href == "/raddirnar/" or stat.href == "/heimildir/" or stat.href == "/thingraedur/" %}
  <a href="{{ stat.href }}" class="safnid-card">
    <span class="safnid-card-count">{{ stat.value | localeString }}</span>
    <span class="safnid-card-label">{{ stat.label }}</span>
    <span class="safnid-card-note">{{ stat.note }}</span>
  </a>
  {% endif %}
  {% endfor %}
</div>
```

- [ ] **Step 3: Create safnid CSS**

Create `assets/css/safnid.css`:

```css
/* ── /safnid — Collection hub ── */

.safnid-hero {
  padding: var(--sp-xl) 0 var(--sp-lg);
}

.safnid-heading {
  font-family: var(--font-display);
  font-size: clamp(2rem, 4vw, 3rem);
  font-weight: 500;
  line-height: 1.12;
  margin: 0;
}

.safnid-deck {
  max-width: 56ch;
  margin: var(--sp-sm) 0 0;
  font-size: 1.05rem;
  line-height: 1.55;
  color: var(--text-muted);
}

.safnid-cards {
  display: grid;
  gap: 0;
}

.safnid-card {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: var(--sp-xs) var(--sp-md);
  padding: var(--sp-lg) 0;
  border-bottom: 1px solid var(--rule);
  text-decoration: none;
  color: var(--text);
  transition: background var(--transition);
}

.safnid-card:first-child {
  border-top: 3px solid var(--rule-strong);
}

.safnid-card:hover {
  background: var(--bg-surface);
  padding-left: var(--sp-md);
  padding-right: var(--sp-md);
  margin-left: calc(-1 * var(--sp-md));
  margin-right: calc(-1 * var(--sp-md));
}

.safnid-card-count {
  font-family: var(--font-data);
  font-size: 1.5rem;
  font-weight: 500;
  color: var(--accent);
}

.safnid-card-label {
  font-family: var(--font-display);
  font-size: 1.25rem;
  font-weight: 600;
}

.safnid-card-note {
  flex-basis: 100%;
  font-family: var(--font-ui);
  font-size: 0.875rem;
  color: var(--text-muted);
}

/* Touch targets */
.safnid-card {
  min-height: 44px;
}
```

- [ ] **Step 4: Verify build**

```bash
npm run build 2>&1 | tail -3
```

Expected: builds cleanly, `/safnid/index.html` is generated.

- [ ] **Step 5: Verify the page renders**

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/safnid/
```

Expected: 200

- [ ] **Step 6: Commit**

```bash
git add safnid/index.njk assets/css/safnid.css
git commit -m "feat: add Safnið hub page for data collection trackers"
```

---

### Task 5: Verify end-to-end

- [ ] **Step 1: Full build**

```bash
npm run build 2>&1 | tail -5
```

Expected: no errors, page count similar to before.

- [ ] **Step 2: Desktop nav check**

Visually verify at 1280px width:
- Nav is one row: ESB Vaktin | Nýtt | Fullyrðingar | Umræðan | Málefni | Safnið | [Styrkja]
- No wrapping, no second row
- Active state (aria-current) works on each page

- [ ] **Step 3: Mobile nav check**

At 375px width:
- Hamburger menu shows all 5 items in a single flat list
- No group labels or dividers
- Menu opens/closes correctly

- [ ] **Step 4: Safnið page check**

Navigate to /safnid/:
- Shows 3 cards: Raddir, Heimildir, Þingræður
- Each shows a live count and description
- Links navigate to the correct tracker pages

- [ ] **Step 5: Footer check**

Verify "Um síðuna" is still in the footer and links correctly.

- [ ] **Step 6: Commit any fixes and push**

```bash
git push
```
