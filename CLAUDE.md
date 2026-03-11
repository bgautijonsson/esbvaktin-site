# esbvaktin-site — CLAUDE.md

## Overview

Static site for esbvaktin.is — Iceland's EU referendum civic information platform. Built with 11ty (Eleventy), hosted on GitHub Pages.

## Tech Stack

| Component | Technology |
|---|---|
| Site generator | 11ty (Eleventy) v3 |
| Templates | Nunjucks (.njk) |
| Styling | Vanilla CSS with custom properties, dark mode via `prefers-color-scheme` |
| Data access | Static JSON loaded client-side |
| Hosting | GitHub Pages with custom domain (esbvaktin.is) |
| CI/CD | GitHub Actions (`.github/workflows/deploy.yml`) |

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
assets/             # Passthrough CSS, JS, images, and exported JSON data
  css/              # site styles + tracker styles
  js/               # shared taxonomy/utils + page trackers
  data/             # claims, reports, entities, evidence, debates JSON
umraedan/           # Analysis index + paginated report pages
raddirnar/          # Entity detail pagination
heimildir/          # Evidence detail pagination
thingraedur/        # Debate listing + detail pagination
greiningar/         # Redirect stubs (→ /umraedan/) for old URLs
.github/workflows/  # GitHub Actions deploy
```

## Conventions

- Pages: Markdown (.md) for content, Nunjucks (.njk) for data-driven pages
- Layout: All pages use `layout: base.njk` in frontmatter
- Extra CSS/JS: Set `extra_css` and `extra_js` frontmatter variables
- Icelandic: Use `isSlug` filter for URL-safe slugs, `isDate` for formatted dates
- Shared labels/classes live in `assets/js/site-taxonomy.js`; keep Eleventy filters and trackers aligned there
- Shared tracker helpers live in `assets/js/tracker-utils.js`, `assets/js/tracker-renderer.js`, `assets/js/tracker-controller.js`, and `assets/css/tracker-base.css`
- Assets in `assets/` are passthrough-copied — 11ty never processes them
- Agent docs (`CLAUDE.md`, `AGENTS.md`, `.claude/`) are ignored by Eleventy and must never ship publicly

## Current Architecture

- Tracker pages load shared browser primitives in this order: `site-taxonomy.js`, `tracker-utils.js`, `tracker-renderer.js`, `tracker-controller.js`, then the page-specific tracker script
- `tracker-controller.js` owns the repeated tracker boot flow: async JSON loading, local filter state, delegated events, debounced inputs, and scoped rerenders
- Page scripts now mostly keep only domain logic: query/filter/sort functions and card markup
- The homepage is now server-rendered from `_data/home.js`
- `_data/home.js` intentionally reads from `assets/data/*.json`, not `_data/`, so homepage counts stay aligned with the same exported JSON bundles the client-side trackers use
- `eleventy.config.js` watches `assets/data` because the homepage now depends on those exported JSON snapshots

## Recent Changes

- Added `assets/js/tracker-controller.js` and wired it into `_includes/base.njk`
- Refactored `claim-tracker.js`, `discourse-tracker.js`, `entity-tracker.js`, `evidence-tracker.js`, and `speeches-tracker.js` to use the shared controller
- Replaced the old static homepage hero/feature-card layout with a live dashboard homepage built from `_data/home.js`, `index.njk`, and new home-specific CSS in `assets/css/style.css`
- Homepage sections now include:
  - referendum countdown and last-updated stamp
  - live signal cards for claims/reports/entities/evidence/debates
  - lead analysis card
  - verdict distribution panel
  - debate activity panel
  - recent reports grid
  - featured voices grid
  - timeline/trust block

## Verification

- `node --check` passed for:
  - `assets/js/tracker-controller.js`
  - all five tracker scripts
  - `_data/home.js`
- `npm run build` passed after the controller refactor and homepage redesign
- The generated homepage in `_site/index.html` was sanity-checked to confirm that the rendered counts now match `assets/data`

## Open Follow-up

- Browser-based visual QA was requested but then skipped. The repo changes are build-verified, but the new homepage and tracker pages still need an actual rendered pass in a browser
- A Safari-based screenshot workflow was started against `http://localhost:8080`, but screen-capture permission was interrupted before usable screenshots were collected
- If a future agent resumes visual QA, they should inspect at minimum:
  - homepage desktop width
  - homepage narrow/mobile width
  - `/fullyrdingar/`
  - `/umraedan/`
  - `/raddirnar/`
  - `/heimildir/`
  - `/thingraedur/`
- If another structural refactor is needed after that, the next logical target is shared query/filter helpers across trackers

## Related Repos

- `esbvaktin` (pipeline repo) — analysis pipeline, ground truth DB, export scripts
- Tracker/export assets originate in the pipeline repo
- Export pipeline copies JSON snapshots into `assets/data/`
