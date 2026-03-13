# ESB Vaktin — Vefsíða

Static site for [esbvaktin.is](https://esbvaktin.is), an independent, data-driven civic information platform tracking claims in Iceland's EU referendum debate.

The referendum is scheduled for 29 August 2026.

## What the site shows

| Section | Description |
|---|---|
| **Fullyrðingar** | Claim tracker with five-level verdict scale |
| **Umræðan** | Article-by-article analysis with extracted claims |
| **Raddirnar** | Entities — politicians, parties, institutions — and their claim profiles |
| **Heimildir** | Evidence library backing each verdict |
| **Þingræður** | Alþingi debate coverage |
| **Vikuyfirlit** | Weekly review of what changed |
| **Málefni** | Issue-level overviews across all claims |

## Tech stack

- [Eleventy 3](https://www.11ty.dev/) with Nunjucks templates
- Vanilla CSS with custom properties and dark mode
- Client-side JSON trackers for filtering/sorting
- GitHub Pages via GitHub Actions

## Quick start

```bash
npm install
npm run serve   # Dev server at http://localhost:8080
npm run build   # Build to _site/
```

## How it works

The [analysis pipeline](https://github.com/bgautijonsson/esbvaktin) monitors Icelandic media, extracts claims, matches them against an evidence database, and assigns verdicts. JSON snapshots are exported into `assets/data/` in this repo and consumed by the site — both server-side (homepage) and client-side (tracker pages).

## Deployment

Pushes to `main` trigger a GitHub Actions workflow that builds and deploys to GitHub Pages with a custom domain.

## Licence

Code is licensed under the [GNU Affero General Public License v3.0](LICENSE) (AGPL-3.0). Site content (editorials, analysis text, evidence data) is licensed under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/).

## Related

- [esbvaktin](https://github.com/bgautijonsson/esbvaktin) — analysis pipeline, evidence database, export scripts
