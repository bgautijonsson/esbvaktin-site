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
