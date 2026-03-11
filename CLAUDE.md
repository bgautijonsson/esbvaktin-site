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
vikuyfirlit/        # Weekly overview (empty shell, awaiting pipeline content)
malefni/            # Issue guides (empty shell, awaiting pipeline content)
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

- Stripped Vikuyfirlit and Málefni down to empty shells — removed all Codex-generated content (briefings, issue guides, FAQs, glossary), data loaders, templates, and ~840 lines of dead CSS
- Removed `/spurningar-og-svor/` and `/ordaskyringar/` pages and their data loaders entirely
- Removed `publishedBriefings` and `issueGuides` collections, `resolveContent` filter, and `lib/content-data.js`
- Vikuyfirlit and Málefni now show placeholder text; ready to be populated with pipeline-generated content
- Updated browser tests to match the simplified page set

## Related Repos

- `esbvaktin` (pipeline repo) — analysis pipeline, ground truth DB, export scripts
- Tracker/export assets originate in the pipeline repo
- Export pipeline copies JSON snapshots into `assets/data/`
