# esbvaktin-site — AGENTS.md

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

## Current Architecture

- **Navigation**: 5-item flat nav (Nýtt, Fullyrðingar, Umræðan, Málefni, Safnið) defined in `_data/navigation.js`
- **Server-rendered pages**: Homepage (`_data/home.js`), /nytt (`_data/nytt.js`), and /safnid render at build time from `assets/data/*.json`
- **Tracker pages** load shared browser primitives: `site-taxonomy.js`, `tracker-utils.js`, `tracker-renderer.js`, `tracker-controller.js`, then page-specific tracker script
- `tracker-controller.js` owns the repeated tracker boot flow: async JSON loading, local filter state, delegated events, debounced inputs, scoped rerenders
- `_data/home.js` and `_data/nytt.js` read from `assets/data/*.json` so counts stay aligned with exported JSON bundles
- **Design system**: DESIGN.md lives in `~/esbvaktin/DESIGN.md`. Warm cream theme (#F5F0E8), deep teal accent (#0D6A63), editorial serif fonts (Fraunces + Source Serif 4)

## Conventions

- Pages: Markdown (.md) for content, Nunjucks (.njk) for data-driven pages
- Layout: All pages use `layout: base.njk` in frontmatter
- Extra CSS/JS: Set `extra_css` and `extra_js` frontmatter variables
- Icelandic: Use `isSlug` filter for URL-safe slugs, `isDate` for formatted dates
- Shared labels/classes live in `assets/js/site-taxonomy.js`; keep Eleventy filters and trackers aligned there
- Shared tracker helpers live in `assets/js/tracker-utils.js`, `tracker-renderer.js`, `tracker-controller.js`, and `assets/css/tracker-base.css`
- Assets in `assets/` are passthrough-copied — 11ty never processes them
- Agent docs (`CLAUDE.md`, `AGENTS.md`, `.claude/`) are ignored by Eleventy and must never ship publicly
- **Privacy-first**: No localStorage, cookies, or visit tracking for personalisation. Analytics via GoatCounter only.

## Related Repos

- `esbvaktin` (pipeline repo at `~/esbvaktin`) — analysis pipeline, ground truth DB, export scripts
- Export scripts: `~/esbvaktin/scripts/export_*.py`, `prepare_site.py`, `prepare_speeches.py`
- Export runner: `~/esbvaktin/scripts/run_export.sh --site-dir ~/esbvaktin-site`
- Data flow: backend exports write to both `_data/` (11ty build) and `assets/data/` (client-side JS)
