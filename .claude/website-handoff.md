# ESBvaktin Website Handoff

Last updated: 2026-03-11

This document is a working handoff for coding agents, especially Claude Code. It describes:

1. what the site looks like now
2. what has already been implemented in the repo
3. what is still planned
4. where the relevant code lives
5. what constraints should be preserved

Use this as the main product/implementation brief when continuing work on the public-facing site.

## 1. Product Positioning

ESBvaktin is no longer just a claim-search or article-analysis site.

The intended product now has three public layers:

1. `Byrja hér`
   For first-time visitors who want a quick overview of what the referendum is about.
2. `Vikuyfirlit`
   For returning visitors who want to know what changed this week.
3. existing deep-dive research surfaces
   `Fullyrðingar`, `Umræðan`, `Raddirnar`, `Heimildir`, and `Þingræður`.

The public goal is:

- help general voters understand the referendum debate quickly
- reduce the need to start in raw search/database interfaces
- keep every summary traceable to underlying claims, reports, evidence, entities, and Alþingi debates

The editorial tone is:

- **curiosity over gotcha** — lead with what's interesting, not who's wrong
- **constructive framing** — when evidence contradicts a claim, show what the evidence says and invite the reader to explore further, rather than just stamping a verdict
- **enable deeper reading** — every surface should make it easy to follow threads into sources
- **no credibility scorekeeping** — show what people said and what evidence says, let readers judge
- the capsule-writer agent's tone ("Þú ert leiðsögn, ekki dómari") is the model for all public copy

This repo now reflects that direction.

## 2. What The Site Looks Like Now

### Navigation

Primary navigation is a flat 5-item row (based on GoatCounter traffic data):

- `Nýtt` — `/nytt/` debate delta feed
- `Fullyrðingar` — `/fullyrdingar/` claim tracker
- `Umræðan` — `/umraedan/` analysis reports
- `Málefni` — `/malefni/` topic deep-dives
- `Safnið` — `/safnid/` hub for Raddirnar, Heimildir, Þingræður

No utility nav group. `Um okkur` and `Aðferðafræði` are footer-only.

**Note (2026-03-11):** The earlier plan proposed Byrja hér / Vikuyfirlit / Málefni as primary nav with the rest as utility. This was revised to the current flat 5-item structure based on traffic patterns.

Relevant file:

- `/Users/brynjolfurjonsson/esbvaktin-site/_data/navigation.js`

### Homepage

The homepage is now public-first and question-led.

Top-to-bottom, it currently does this:

1. leads with a plain-language hero
   Explains that users should start with overview pages before opening the databases.
2. shows the three entry layers
   `Byrja hér`, `Vikuyfirlit`, `Málefni`
3. features the latest published weekly briefing
4. shows top issue guides
5. shows a short-answer support block
   `Spurt og svarað` and `Orðskýringar`
6. keeps the existing signal/data dashboard lower on the page
   counts, lead analysis, verdict distribution, debate activity, latest reports, featured voices, timeline/trust

Important product decision:

- the homepage is no longer supposed to feel like a research dashboard first
- it should feel like a guided public explainer first

Relevant files:

- `/Users/brynjolfurjonsson/esbvaktin-site/index.njk`
- `/Users/brynjolfurjonsson/esbvaktin-site/_data/home.js`
- `/Users/brynjolfurjonsson/esbvaktin-site/assets/css/style.css`

### `Byrja hér`

`/byrja-her/` is the first-stop onboarding page.

It currently includes:

- referendum framing and date
- a short explanation of what “yes” and “no” mean in the site’s framing
- three “answer these first” cards
- links into the issue guides
- a verdict-label explainer
- a reusable “how to use the site” explainer block
- links onward to the latest briefing and the deep-dive surfaces
- links onward to `Spurt og svarað` and `Orðskýringar`

This page is intended to work for a visitor who knows little and wants orientation before touching detailed content.

Relevant file:

- `/Users/brynjolfurjonsson/esbvaktin-site/byrja-her/index.njk`

### `Vikuyfirlit`

`/vikuyfirlit/` is the weekly briefing hub.

It currently includes:

- a brief explanation of what the section is
- a trust note that drafts may be machine-assisted but only reviewed briefings publish
- the shared overview-note block
- the latest published briefing as the lead feature
- an archive grid of all published briefings

Published briefings render to their own detail pages and include:

- headline
- date range
- summary deck
- 3 to 5 key takeaways
- weekly snapshots:
  - what changed
  - claims snapshot
  - Alþingi snapshot
  - entities snapshot
- optional body content
- linked reports
- linked claims
- linked entities
- linked evidence
- linked debates
- method note

Draft briefings do not publish and do not appear in collections.

Relevant files:

- `/Users/brynjolfurjonsson/esbvaktin-site/vikuyfirlit/index.njk`
- `/Users/brynjolfurjonsson/esbvaktin-site/_includes/briefing.njk`
- `/Users/brynjolfurjonsson/esbvaktin-site/vikuyfirlit/vikuyfirlit.11tydata.js`
- `/Users/brynjolfurjonsson/esbvaktin-site/vikuyfirlit/README.md`
- `/Users/brynjolfurjonsson/esbvaktin-site/vikuyfirlit/9-15-mars-2026.md`
- `/Users/brynjolfurjonsson/esbvaktin-site/vikuyfirlit/16-22-mars-2026-draft.md`

### `Málefni`

`/malefni/` is the evergreen issue-guide layer.

It currently has six issue guides:

1. `Aðildarferlið og hvað er kosið um`
2. `Fullveldi og lýðræði`
3. `Sjávarútvegur`
4. `Landbúnaður`
5. `EES og ESB-löggjöf`
6. `Fordæmi annarra ríkja`

Each guide currently includes:

- headline and framing question
- short answer
- “why this matters”
- supporters’ view
- critics’ view
- editorial synthesis
- shared overview-note block
- linked examples from:
  - reports
  - claims
  - entities
  - evidence
  - debates

These pages are meant to be short, opinionated in structure, and traceable in evidence.

Relevant files:

- `/Users/brynjolfurjonsson/esbvaktin-site/malefni/index.njk`
- `/Users/brynjolfurjonsson/esbvaktin-site/malefni/guides.njk`
- `/Users/brynjolfurjonsson/esbvaktin-site/_includes/issue-guide.njk`
- `/Users/brynjolfurjonsson/esbvaktin-site/_data/issues.js`

### `Spurt og svarað`

`/spurningar-og-svor/` is a short-answer page for public users who want the basics with as little friction as possible.

It currently includes:

- a short intro
- the shared overview-note block
- an FAQ list based on collapsible `details`
- links from answers into `Byrja hér`, `Málefni`, `Vikuyfirlit`, and deep-dive pages
- a final block pointing people into `Orðskýringar` and `Málefni`

Relevant files:

- `/Users/brynjolfurjonsson/esbvaktin-site/spurningar-og-svor/index.njk`
- `/Users/brynjolfurjonsson/esbvaktin-site/_data/faqs.js`

### `Orðskýringar`

`/ordaskyringar/` is the plain-language glossary.

It currently organizes terms into three sections:

1. `Ferlið og atkvæðið`
2. `Hvernig ESBvaktin vinnur`
3. `Orð sem koma oft fyrir í umræðunni`

Each term includes:

- the term
- a short meaning
- a “why this matters” explanation

Relevant files:

- `/Users/brynjolfurjonsson/esbvaktin-site/ordaskyringar/index.njk`
- `/Users/brynjolfurjonsson/esbvaktin-site/_data/glossary.js`

### Deep-Dive Research Surfaces

The deep-dive pages still exist and remain important:

- `/fullyrdingar/`
- `/umraedan/`
- `/raddirnar/`
- `/heimildir/`
- `/thingraedur/`

However, they are no longer supposed to be the primary first-visit experience.

They should now behave as research tools underneath the overview/editorial layers.

Already implemented:

- new onboarding copy nudges users toward overview pages first
- claims can now be deep-linked with `?claim=<slug>`
  This supports direct links from issue guides and briefings into the claim tracker.

Relevant file for claim deep linking:

- `/Users/brynjolfurjonsson/esbvaktin-site/assets/js/claim-tracker.js`

## 3. What Has Been Implemented Technically

### New Collections and Filters

`eleventy.config.js` now contains:

- `publishedBriefings`
  filters out `draft: true` from `weekly-briefing`
- `issueGuides`
  sorted by `order`
- `isDateRange`
  formats weekly briefing date ranges
- `resolveContent`
  resolves linked reports/claims/entities/evidence/debates into card data

Relevant file:

- `/Users/brynjolfurjonsson/esbvaktin-site/eleventy.config.js`

### Shared Content Resolver

There is now a shared server-side resolver for overview/editorial pages:

- loads `claims.json`, `reports.json`, `entities.json`, `evidence.json`, `debates.json`
- builds lookup maps
- builds consistent card data for reports, claims, entities, evidence, and debates
- centralizes claim deep-link generation

Relevant file:

- `/Users/brynjolfurjonsson/esbvaktin-site/lib/content-data.js`

This file matters because:

- issue guides depend on it
- briefing pages depend on it
- future editorial surfaces should reuse it instead of duplicating mapping logic

### Shared Overview UI

There is a shared overview explainer partial:

- `/Users/brynjolfurjonsson/esbvaktin-site/_includes/overview-note.njk`

It is currently reused on:

- `Byrja hér`
- `Vikuyfirlit`
- issue guides
- `Spurt og svarað`

It contains the trust explanation that:

- machine assistance may be used in drafting
- publication requires human review
- summaries link back to underlying records

### Briefing Validation

Weekly briefings now have validation logic in:

- `/Users/brynjolfurjonsson/esbvaktin-site/vikuyfirlit/vikuyfirlit.11tydata.js`

This currently checks:

- required text fields
- required date/date-like fields
- `key_takeaways` length
- valid chronological order
- existence of linked report slugs
- existence of linked claim slugs
- existence of linked entity slugs
- existence of linked evidence IDs
- existence of linked debate slugs

If a published or draft briefing is malformed, the build should fail.

### Styling

The overview/editorial layer is mostly styled in:

- `/Users/brynjolfurjonsson/esbvaktin-site/assets/css/style.css`

This now contains styling for:

- homepage overview sections
- overview hero shells
- issue cards and issue guides
- briefing index and briefing detail pages
- support pages
  - FAQ
  - glossary
- shared content cards
- responsive behavior for desktop and mobile
- dark mode variants

## 4. Current Editorial/Data Model

### Weekly Briefings

The weekly briefing contract is Markdown plus front matter.

Required front matter:

- `title`
- `date`
- `week_start`
- `week_end`
- `slug`
- `draft`
- `summary_deck`
- `key_takeaways`
- `what_changed`
- `claims_snapshot`
- `entities_snapshot`
- `althingi_snapshot`
- `linked_reports`
- `linked_claims`
- `linked_entities`
- `linked_evidence`
- `linked_debates`
- `method_note`

Assumed workflow:

1. external pipeline writes a weekly Markdown draft
2. draft lands in `vikuyfirlit/`
3. draft is reviewed by a human
4. `draft` flips from `true` to `false`
5. briefing appears on:
   - `/vikuyfirlit/`
   - homepage
   - its own detail page

Important constraint:

- published prose must always be traceable through linked records

### Issue Guides

Issue guides are currently stored as structured editorial objects in:

- `/Users/brynjolfurjonsson/esbvaktin-site/_data/issues.js`

Each issue includes:

- `order`
- `slug`
- `title`
- `question`
- `short_answer`
- `why_it_matters`
- `supporters_view`
- `critics_view`
- `editorial_synthesis`
- `related_categories`
- linked report/claim/entity/evidence/debate IDs or slugs

Then the file enriches each issue with:

- stats
- resolved card links

Current issue-guide content is hand-maintained.

### FAQ and Glossary

These are hand-maintained structured content files:

- `/Users/brynjolfurjonsson/esbvaktin-site/_data/faqs.js`
- `/Users/brynjolfurjonsson/esbvaktin-site/_data/glossary.js`

These are intended to stay lightweight and editorial, not pipeline-generated.

## 5. Verification That Already Exists

Build verification currently passes with:

- `npm run build`

Browser verification currently passes with:

- `npm run browser:smoke`
- `npm run browser:screens`

Browser coverage currently checks:

- homepage
- `Byrja hér`
- `Vikuyfirlit`
- `Málefni`
- `Spurt og svarað`
- `Orðskýringar`
- the deep-dive trackers
- nav behavior
- latest briefing rendering
- draft briefing exclusion behavior
- issue-guide and briefing detail navigation

Relevant files:

- `/Users/brynjolfurjonsson/esbvaktin-site/tests/browser/smoke.spec.js`
- `/Users/brynjolfurjonsson/esbvaktin-site/tests/browser/screenshots.spec.js`

## 6. Important Product Decisions To Preserve

These are intentional and should not be casually reverted.

### The site now starts with explanation, not search

Do not move the site back toward a “database-first” homepage.

### Weekly briefings are additive, not a replacement for evergreen guides

`Vikuyfirlit` handles recency.
`Byrja hér`, `Málefni`, `Spurt og svarað`, and `Orðskýringar` handle orientation.

### Drafts must stay private

- `draft: true` content should not surface in collections
- direct URLs for draft briefings should not publish pages

### Summaries must be traceable

Every briefing or issue guide should link directly into underlying claims, evidence, debates, reports, or entities.

### Deep-dive pages remain valuable

The research surfaces should not be removed.
They should be framed as deeper layers under the public guide, not displaced entirely.

### The tone is curiosity, not gotcha

The site nurtures readers' curiosity and enables them to read deeper — it does not play gotcha or emphasise who is wrong. Verdicts, labels, and visual treatments should invite exploration, not deliver judgement. When a claim is unsupported or misleading, show what the evidence actually says. See the Editorial Philosophy section in CLAUDE.md.

## 7. What Is Still Planned

The current repo has the public-first skeleton in place, but it is not “finished”.

### Planned next step: external pipeline integration

The biggest remaining product step is to adapt the external editorial pipeline so it can write valid weekly briefing drafts directly into:

- `/Users/brynjolfurjonsson/esbvaktin-site/vikuyfirlit/`

That integration is not implemented in this repo.

What is already ready for it:

- the folder
- the content contract
- validation
- rendering
- archive/index behavior
- homepage feature behavior
- draft/publish workflow

### Planned content expansion

The site currently has:

- 6 issue guides
- 1 published weekly briefing sample
- 1 draft weekly briefing sample
- 1 FAQ page
- 1 glossary page

Expected next content work:

- more real weekly briefings
- editorial refinement of the six issue guides
- additional FAQs as new confusion points appear
- glossary expansion if site language becomes more specialized

### Planned UX refinement

Likely next UX improvements:

- add stronger cross-linking between weekly briefings and specific issue guides
- add “popular question” or “entry chip” surfaces on deep-dive pages
- further simplify jargon on top-level pages
- continue mobile-first tuning of long overview pages

These are not fully implemented yet.

### Planned trust/transparency refinement

The site already explains that AI may help with drafting and that humans review before publication.

Possible next improvements:

- clearer public language around where automation starts and ends
- visible review metadata on published briefings if desired
- better explanation of what verdict labels do and do not mean

## 8. Gaps / Things Not Yet Done

These are the main gaps between the current repo and the larger product vision.

### The pipeline is not wired

There is no automated connection in this repo that generates weekly briefings from the external project.

### The overview layer is partly editorial sample content

The architecture is real, but some copy is still initial editorial scaffolding and should be treated as editable product content.

### FAQ and glossary are not in global nav

They are linked from homepage and onboarding pages, but they are not top-level nav items.
This is currently intentional to avoid nav bloat, but it remains a product choice rather than a hard technical constraint.

### No new analytics or user feedback loop exists yet

There is no in-repo measurement layer for whether public users actually find the new overview flow easier.

## 9. If Claude Code Continues From Here

If you are giving Claude Code a follow-up task, steer it toward one of these buckets:

### A. Pipeline integration

Best prompt shape:

“Wire the external weekly editorial pipeline into the `vikuyfirlit/` Markdown contract used by this repo. Preserve draft/private behavior and existing validation.”

### B. Content system refinement

Best prompt shape:

“Improve the issue-guide and weekly-briefing authoring workflow without changing the public information architecture.”

### C. UX polish

Best prompt shape:

“Refine the public-first overview pages for readability and accessibility while preserving the three-layer product structure.”

### D. Deeper cross-linking

Best prompt shape:

“Increase the number and quality of entry points from overview pages into relevant claims, reports, entities, evidence, and debates.”

## 10. File Map For Likely Future Edits

### Public IA / page copy

- `/Users/brynjolfurjonsson/esbvaktin-site/index.njk`
- `/Users/brynjolfurjonsson/esbvaktin-site/byrja-her/index.njk`
- `/Users/brynjolfurjonsson/esbvaktin-site/vikuyfirlit/index.njk`
- `/Users/brynjolfurjonsson/esbvaktin-site/malefni/index.njk`
- `/Users/brynjolfurjonsson/esbvaktin-site/spurningar-og-svor/index.njk`
- `/Users/brynjolfurjonsson/esbvaktin-site/ordaskyringar/index.njk`

### Shared templates

- `/Users/brynjolfurjonsson/esbvaktin-site/_includes/overview-note.njk`
- `/Users/brynjolfurjonsson/esbvaktin-site/_includes/briefing.njk`
- `/Users/brynjolfurjonsson/esbvaktin-site/_includes/issue-guide.njk`

### Structured editorial data

- `/Users/brynjolfurjonsson/esbvaktin-site/_data/issues.js`
- `/Users/brynjolfurjonsson/esbvaktin-site/_data/faqs.js`
- `/Users/brynjolfurjonsson/esbvaktin-site/_data/glossary.js`

### Content/data resolution

- `/Users/brynjolfurjonsson/esbvaktin-site/lib/content-data.js`
- `/Users/brynjolfurjonsson/esbvaktin-site/eleventy.config.js`

### Weekly briefing workflow

- `/Users/brynjolfurjonsson/esbvaktin-site/vikuyfirlit/README.md`
- `/Users/brynjolfurjonsson/esbvaktin-site/vikuyfirlit/vikuyfirlit.11tydata.js`
- `/Users/brynjolfurjonsson/esbvaktin-site/vikuyfirlit/*.md`

### Deep-dive integration

- `/Users/brynjolfurjonsson/esbvaktin-site/assets/js/claim-tracker.js`
- `/Users/brynjolfurjonsson/esbvaktin-site/fullyrdingar.njk`
- `/Users/brynjolfurjonsson/esbvaktin-site/umraedan/index.njk`
- `/Users/brynjolfurjonsson/esbvaktin-site/raddirnar.njk`
- `/Users/brynjolfurjonsson/esbvaktin-site/heimildir.njk`
- `/Users/brynjolfurjonsson/esbvaktin-site/thingraedur/index.njk`

### Verification

- `/Users/brynjolfurjonsson/esbvaktin-site/tests/browser/smoke.spec.js`
- `/Users/brynjolfurjonsson/esbvaktin-site/tests/browser/screenshots.spec.js`

## 11. Short Summary

As of 2026-03-11, the repo has already been reshaped into a public-first civic information site with:

- a guided homepage
- a first-stop explainer
- a weekly briefing system with draft/private behavior
- evergreen issue guides
- a short-answer FAQ
- a glossary
- preserved deep-dive research pages underneath

The main unfinished work is not the site shell.
The main unfinished work is:

- hooking up the external editorial pipeline
- expanding and refining real editorial content
- improving cross-linking and usability over time
