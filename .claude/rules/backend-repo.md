---
paths:
  - "assets/data/**"
  - "_data/**"
  - "_includes/report.njk"
  - "_includes/evidence-detail.njk"
---

# Backend Repo Context

When working with site data (JSON in `assets/data/` or `_data/`), the source of truth is the backend repo at `~/esbvaktin`.

- Read `~/esbvaktin/CLAUDE.md` for full pipeline context, key commands, and conventions
- Export scripts that produce site data: `~/esbvaktin/scripts/export_*.py`, `prepare_site.py`, `prepare_speeches.py`
- DB schema and queries: `~/esbvaktin/.claude/rules/db-schema.md`
- To understand a JSON field, read the export script that writes it
- To re-export data: `cd ~/esbvaktin && ./scripts/run_export.sh --site-dir ~/esbvaktin-site`
- Backend paths: pipeline package `~/esbvaktin/src/esbvaktin/`; Ground Truth DB: PostgreSQL (Docker), accessed via `~/esbvaktin/src/esbvaktin/ground_truth/`; article analyses: `~/esbvaktin/data/analyses/*/` (work dirs with `_report_final.json`); evidence seeds: `~/esbvaktin/data/seeds/*.json`; verdict logic: `~/esbvaktin/src/esbvaktin/pipeline/`; custom agents: `~/esbvaktin/.claude/agents/` (claim-extractor, claim-assessor, etc.)
- Missing/wrong data on site → check DB state and export pipeline

**Data flow:** Backend export scripts write to both `_data/` (11ty build) and `assets/data/` (client-side JS) in this repo. `prepare_site.py` overlays DB verdicts onto report snapshots — reports are immutable, DB is source of truth.
