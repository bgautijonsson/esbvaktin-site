# esbvaktin-site — CLAUDE.md

## Overview

Static site for esbvaktin.is — Iceland's EU referendum civic information platform. Built with 11ty (Eleventy), hosted on GitHub Pages.

## Tech Stack

| Component      | Technology                                                               |
| -------------- | ------------------------------------------------------------------------ |
| Site generator | 11ty (Eleventy) v3                                                       |
| Templates      | Nunjucks (.njk)                                                          |
| Styling        | Vanilla CSS with custom properties, dark mode via `prefers-color-scheme` |
| Data access    | Static JSON loaded client-side                                           |
| Hosting        | GitHub Pages with custom domain (esbvaktin.is)                           |
| CI/CD          | GitHub Actions (`.github/workflows/deploy.yml`)                          |

## Key Commands

```bash
npm run serve    # Dev server with live reload (http://localhost:8080)
npm run build    # Build to _site/
npm run clean    # Remove _site/
```

## Structure

```
_includes/          # Shared layouts and detail templates
_data/              # Global data loaders + JSON detail collections
  home.js           # Homepage data (signal stats, weekly review, top entities)
  nytt.js           # /nytt feed data (debate deltas, spiking topics)
  navigation.js     # Nav items (flat 5-item list)
assets/             # Passthrough CSS, JS, images, and exported JSON data
  css/              # site styles + tracker styles + page styles (nytt.css, safnid.css)
  js/               # shared taxonomy/utils + page trackers
  data/             # claims, reports, entities, evidence, debates JSON
nytt/               # "Hvað er nýtt" — debate delta feed (daily freshness page)
safnid/             # "Safnið" — hub page linking to data trackers
vikuyfirlit/        # Weekly overview (briefings with draft/publish workflow)
malefni/            # Topic deep-dives with embedded claim trackers
umraedan/           # Analysis index + paginated report pages
raddirnar/          # Entity detail pagination
heimildir/          # Evidence detail pagination
thingraedur/        # Debate listing + detail pagination
greiningar/         # Redirect stubs (→ /umraedan/) for old URLs
.github/workflows/  # GitHub Actions deploy
```

## Editorial Philosophy

ESBvaktin nurtures curiosity — it does not play gotcha. The goal is to help readers understand the EU debate more deeply, not to score points or expose who is "wrong".

**Guiding principles:**

- **Curiosity over judgement.** Lead with what's interesting and verifiable, not with who made a mistake. "Vissuð þið að..." over "Greinin sleppir því að..."
- **Constructive framing.** When a claim is unsupported or misleading, show the reader what the evidence actually says and invite them to explore further — don't just stamp a red label on it.
- **Enable deeper reading.** Every surface should make it easy for the reader to follow the thread into primary sources, evidence, and related topics. The site is a guide, not a verdict machine.
- **No credibility scorekeeping.** Avoid framing entities as trustworthy/untrustworthy. Show what people have said and what the evidence says — let readers form their own view.
- **The capsule-writer tone is the model.** Constructive, curious, accessible. "Þú ert leiðsögn, ekki dómari."

This philosophy applies to all templates, labels, copy, and visual design decisions on the site.

## Conventions

- Pages: Markdown (.md) for content, Nunjucks (.njk) for data-driven pages
- Layout: All pages use `layout: base.njk` in frontmatter
- Extra CSS/JS: Set `extra_css` and `extra_js` frontmatter variables
- Icelandic: Use `isSlug` filter for URL-safe slugs, `isDate` for formatted dates
- Shared labels/classes live in `assets/js/site-taxonomy.js`; keep Eleventy filters and trackers aligned there
- Shared tracker helpers live in `assets/js/tracker-utils.js`, `assets/js/tracker-renderer.js`, `assets/js/tracker-controller.js`, and `assets/css/tracker-base.css`
- Assets in `assets/` are passthrough-copied — 11ty never processes them
- Agent docs (`CLAUDE.md`, `AGENTS.md`, `.claude/`) are ignored by Eleventy and must never ship publicly
- **Privacy-first**: No localStorage, cookies, or visit tracking for personalisation. Use fixed time windows (e.g. "last 7 days") not "since your last visit". Analytics via GoatCounter only (privacy-friendly, no cookies).

## Current Architecture

- **Navigation**: 5-item flat nav (Nýtt, Fullyrðingar, Umræðan, Málefni, Safnið) defined in `_data/navigation.js`. Single `<ul>` in `base.njk`, no groups. Traffic-data-driven (GoatCounter).
- **Server-rendered pages**: Homepage (`_data/home.js`), /nytt (`_data/nytt.js`), and /safnid all render at build time from `assets/data/*.json`. No client-side JS on these pages.
- **Tracker pages** load shared browser primitives in this order: `site-taxonomy.js`, `tracker-utils.js`, `tracker-renderer.js`, `tracker-controller.js`, then the page-specific tracker script
- `tracker-controller.js` owns the repeated tracker boot flow: async JSON loading, local filter state, delegated events, debounced inputs, and scoped rerenders
- Page scripts now mostly keep only domain logic: query/filter/sort functions and card markup
- `_data/home.js` and `_data/nytt.js` intentionally read from `assets/data/*.json`, not `_data/`, so counts stay aligned with the same exported JSON bundles the client-side trackers use
- `eleventy.config.js` watches `assets/data` because server-rendered pages depend on those exported JSON snapshots
- **Design system**: DESIGN.md lives in `~/esbvaktin/DESIGN.md`. Warm cream theme (#F5F0E8), deep teal accent (#0D6A63), editorial serif fonts (Fraunces + Source Serif 4). All CSS tokens in `:root` of `style.css`.

## gstack

Use the `/browse` skill from gstack for all web browsing. Never use `mcp__claude-in-chrome__*` tools.

**Available skills:**
`/office-hours` `/plan-ceo-review` `/plan-eng-review` `/plan-design-review` `/design-consultation` `/review` `/ship` `/land-and-deploy` `/canary` `/benchmark` `/browse` `/qa` `/qa-only` `/design-review` `/setup-browser-cookies` `/setup-deploy` `/retro` `/investigate` `/document-release` `/codex` `/cso` `/autoplan` `/careful` `/freeze` `/guard` `/unfreeze` `/gstack-upgrade`

## Backend Repo (`~/esbvaktin`)

The pipeline repo at `~/esbvaktin` is the sibling backend for this site. Always check it when working on data-related features or debugging data issues.

| What              | Where (in `~/esbvaktin`)                                                        |
| ----------------- | ------------------------------------------------------------------------------- |
| Export scripts    | `scripts/export_*.py`, `scripts/prepare_site.py`, `scripts/prepare_speeches.py` |
| Export runner     | `scripts/run_export.sh --site-dir ~/esbvaktin-site`                             |
| Pipeline package  | `src/esbvaktin/`                                                                |
| Ground Truth DB   | PostgreSQL (Docker), accessed via `src/esbvaktin/ground_truth/`                 |
| Article analyses  | `data/analyses/*/` (work dirs with `_report_final.json`)                        |
| Evidence seeds    | `data/seeds/*.json`                                                             |
| Custom agents     | `.claude/agents/` (claim-extractor, claim-assessor, etc.)                       |
| Backend CLAUDE.md | `~/esbvaktin/CLAUDE.md` (full project context, key commands, conventions)       |

**Data flow:** Backend export scripts write to both `_data/` (11ty build) and `assets/data/` (client-side JS) in this repo. `prepare_site.py` overlays DB verdicts onto report snapshots — reports are immutable, DB is source of truth.

**When to look at the backend:**

- Data format questions → check the export script that writes the JSON
- Missing/wrong data on site → check DB state and export pipeline
- Adding a new data field to templates → check what the export script provides
- Understanding verdict logic → `src/esbvaktin/pipeline/`
