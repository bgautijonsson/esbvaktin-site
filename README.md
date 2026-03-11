# ESBvaktin Site

Static site for [esbvaktin.is](https://esbvaktin.is), an Icelandic civic information platform focused on the EU referendum debate.

This repository contains the website only. It does not contain the upstream analysis pipeline or source-of-truth database. The site is built with Eleventy and publishes a static bundle to GitHub Pages.

## What The Site Does

The site organizes referendum-related material into a few public surfaces:

- `Vikuyfirlit` — weekly briefings about what changed most recently
- `Málefni` — evergreen issue guides for the biggest recurring questions
- `Spurt og svarað` — short answers for first-time visitors who want the basics quickly
- `Orðskýringar` — plain-language glossary for recurring referendum and site terms
- `Fullyrðingar` — claim tracker and claim-level verdicts
- `Umræðan` — article/report analysis
- `Raddirnar` — entities, parties, institutions, and speakers in the discourse
- `Heimildir` — evidence library
- `Þingræður` — Alþingi debate coverage
- `Aðferðafræði` — public methodology and transparency notes

## Tech Stack

- Eleventy 3
- Nunjucks templates
- Vanilla CSS
- Client-side JSON data loading for trackers
- GitHub Pages deployment via GitHub Actions

## Current Data Model

The live site currently uses static JSON exports in `assets/data/`.

Important:

- DuckDB/Parquet is not part of the current website runtime
- Any DuckDB-based querying is aspirational/future work
- The homepage and the browser-side trackers are intentionally aligned to the same `assets/data/*.json` exports

## Quick Start

Requirements:

- Node.js
- npm

Install dependencies:

```bash
npm install
```

Run the local dev server:

```bash
npm run serve
```

This starts Eleventy with live reload, typically at [http://localhost:8080](http://localhost:8080).

Build the production site:

```bash
npm run build
```

Clean the output directory:

```bash
npm run clean
```

## Project Structure

```text
_includes/          Shared layouts and detail templates
_data/              Eleventy data loaders and detail collections
assets/
  css/              Global styles, tracker styles, shared tracker CSS
  js/               Shared browser helpers and page-level tracker scripts
  data/             Exported JSON consumed by the site
malefni/            Evergreen issue guides
spurningar-og-svor/ Plain-language FAQ
ordaskyringar/      Plain-language glossary
vikuyfirlit/        Weekly briefing index and Markdown briefing entries
umraedan/           Report listing and report detail generation
raddirnar/          Entity listing and entity detail generation
heimildir/          Evidence listing and evidence detail generation
thingraedur/        Debate listing and debate detail generation
greiningar/         Legacy redirect stubs
.github/workflows/  Deploy pipeline
```

## Tracker Architecture

The interactive listing pages share a common front-end layer:

- `assets/js/site-taxonomy.js`
  Shared labels, classes, and taxonomy mappings
- `assets/js/tracker-utils.js`
  Small browser utilities such as escaping, number/date formatting, and debounce
- `assets/js/tracker-renderer.js`
  Shared HTML rendering helpers for controls, stats, and grouped collections
- `assets/js/tracker-controller.js`
  Shared state, async loading, delegated events, debounced input handling, and rerender flow
- `assets/css/tracker-base.css`
  Shared tracker primitives such as stats, filters, chips, and empty states

Page-specific tracker scripts keep only domain logic such as filtering, sorting, grouping, and card markup.

## Homepage Architecture

The homepage is server-rendered from `_data/home.js`.

That data file reads from `assets/data/*.json` so the front page reflects the same exported datasets used by the client-side trackers. It currently drives:

- homepage status metadata
- support links to `Vikuyfirlit`, `Málefni`, `Spurt og svarað`, and `Orðskýringar`
- latest published weekly briefing
- latest analysis card
- verdict distribution
- featured voices
- debate activity
- timeline/trust blocks

## Weekly Briefings

Published weekly briefings live under [`vikuyfirlit/`](/Users/brynjolfurjonsson/esbvaktin-site/vikuyfirlit).

The intended workflow is:

1. an external pipeline writes a Markdown file with front matter into `vikuyfirlit/`
2. the file stays private while `draft: true`
3. after review, flipping `draft` to `false` publishes it automatically

The output contract for those files is documented in [`vikuyfirlit/README.md`](/Users/brynjolfurjonsson/esbvaktin-site/vikuyfirlit/README.md).

## Deployment

Deploys run through [`.github/workflows/deploy.yml`](/Users/brynjolfurjonsson/esbvaktin-site/.github/workflows/deploy.yml).

On pushes to `main`, the workflow:

1. installs dependencies with `npm ci`
2. builds the site with `npm run build`
3. uploads `_site/`
4. deploys to GitHub Pages

## Related Repository

The upstream analysis/export pipeline lives in a separate repository:

- `esbvaktin`

That pipeline is responsible for generating the JSON snapshots copied into `assets/data/`.

## Working On The Site

A few repo-specific rules matter:

- `assets/` is passthrough copied by Eleventy
- root docs like `README.md`, `CLAUDE.md`, and `AGENTS.md` should not be published as site pages
- public-facing claims about the architecture should stay aligned with the actual runtime
- if you change exported data shapes, update both the homepage data loader and the relevant tracker script

## Agent Docs

There are separate agent-facing docs in:

- `CLAUDE.md`
- `AGENTS.md`

Those are for coding agents and workflow handoff. This `README.md` is the human-facing entry point.
