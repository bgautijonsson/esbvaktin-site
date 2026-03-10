# esbvaktin-site — CLAUDE.md

## Overview

Static site for esbvaktin.is — Iceland's EU referendum civic information platform. Built with 11ty (Eleventy), hosted on GitHub Pages.

## Tech Stack

| Component | Technology |
|---|---|
| Site generator | 11ty (Eleventy) v3 |
| Templates | Nunjucks (.njk) |
| Styling | Vanilla CSS with custom properties, dark mode via `prefers-color-scheme` |
| Claim tracker | DuckDB-WASM + Parquet (client-side, loaded from CDN) |
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
_includes/          # Nunjucks layouts (base.njk, report.njk)
_data/              # Global data (site.json, reports/, entities.json)
assets/             # Static assets (CSS, JS, data) — passthrough copied
  css/              # style.css + claim-tracker.css
  js/               # claim-tracker.js, theme-toggle.js, mobile-nav.js
  data/             # claims.parquet + claims.json (from pipeline export)
umraedan/           # Discussion/analysis pages (index + paginated reports)
raddirnar.njk       # Voices page — entities by party/individual
greiningar/         # Redirect stubs (→ /umraedan/) for old URLs
.github/workflows/  # GitHub Actions deploy
```

## Conventions

- Pages: Markdown (.md) for content, Nunjucks (.njk) for data-driven pages
- Layout: All pages use `layout: base.njk` in frontmatter
- Extra CSS/JS: Set `extra_css` and `extra_js` frontmatter variables
- Icelandic: Use `isSlug` filter for URL-safe slugs, `isDate` for formatted dates
- Verdict/category labels: Use `verdictLabel` and `categoryLabel` filters
- Assets in `assets/` are passthrough-copied — 11ty never processes them

## Related Repos

- `esbvaktin` (pipeline repo) — analysis pipeline, ground truth DB, export scripts
- Claim tracker assets originate in `esbvaktin/src/esbvaktin/claim_tracker/`
- Export: `uv run python scripts/export_claims.py` in pipeline repo → copy Parquet/JSON to `assets/data/`
