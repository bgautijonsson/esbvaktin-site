# Vikuyfirlit

Þessi mappa er hugsuð sem útleið fyrir vikulegar Markdown-samantektir sem eru framleiddar utan þessa repos og síðan yfirfarnar hér áður en þær fara í loftið.

Hver færsla þarf að innihalda að lágmarki:

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

Birtingarregla:

- `draft: true` heldur færslu úr birtingu og úr söfnum.
- `draft: false` birtir færslu á `/vikuyfirlit/{slug}/` og gerir hana sýnilega á forsíðu og í safni vikuyfirlita.

Lykiltengingar:

- `linked_reports` notar slugs úr `assets/data/reports.json`
- `linked_claims` notar `claim_slug` úr `assets/data/claims.json`
- `linked_entities` notar slugs úr `assets/data/entities.json`
- `linked_evidence` notar `evidence_id` úr `assets/data/evidence.json`
- `linked_debates` notar slugs úr `assets/data/debates.json`
