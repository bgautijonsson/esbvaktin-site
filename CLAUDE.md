# esbvaktin-site — CLAUDE.md

> **Status (2026-10-03): FINISHED, static archive.** esbvaktin.is stays online as a static archive for now; the esbvaktin pipeline is finished and exports nothing new. Make only maintenance changes the owner asks for. Vault record: `ESB/ESB Retrospective.md` in the Metill vault.

## Overview

Static site for esbvaktin.is — Iceland's EU referendum civic information platform. Built with 11ty (Eleventy), hosted on GitHub Pages.

## Key Commands

```bash
pnpm run serve    # Dev server with live reload (http://localhost:8080)
pnpm run build    # Build to _site/
pnpm run clean    # Remove _site/
```

Package manager: **pnpm** (not npm).

## Routes

```
nytt/               # "Hvað er nýtt" — debate delta feed (daily freshness page)
safnid/             # "Safnið" — hub page linking to data trackers
vikuyfirlit/        # Weekly overview (briefings with draft/publish workflow)
malefni/            # Topic deep-dives with embedded claim trackers
umraedan/           # Analysis index + paginated report pages
raddirnar/          # Entity detail pagination
heimildir/          # Evidence detail pagination
thingraedur/        # Debate listing + detail pagination
greiningar/         # Redirect stubs (→ /umraedan/) for old URLs
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

## Backend Repo (`~/esbvaktin`)

The pipeline repo at `~/esbvaktin` is the sibling backend for this site. Always check it when working on data-related features or debugging data issues. Export scripts, data flow and backend paths: `.claude/rules/backend-repo.md` (loads with data files; read it directly otherwise).
