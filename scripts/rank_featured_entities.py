#!/usr/bin/env python3
"""
Rank entities by importance and write the featured-entities.json list.

Reads all _data/entity-details/*.json, scores each entity using a weighted
checklist, and outputs a ranked slug array to assets/data/featured-entities.json.

Usage:
    python scripts/rank_featured_entities.py             # write top 20
    python scripts/rank_featured_entities.py --top 30    # write top 30
    python scripts/rank_featured_entities.py --dry-run   # print table only
"""

import argparse
import json
import re
from datetime import date, datetime
from pathlib import Path

# ── Paths ─────────────────────────────────────────────────────────────

PROJECT_ROOT = Path(__file__).resolve().parent.parent
ENTITY_DIR = PROJECT_ROOT / "_data" / "entity-details"
OUTPUT_PATH = PROJECT_ROOT / "assets" / "data" / "featured-entities.json"

# ── Scoring weights ───────────────────────────────────────────────────
# Each component produces a 0–1 value, multiplied by these weights.
# Total maximum score = sum of weights = 100.

WEIGHTS = {
    "role": 30,
    "claims": 20,
    "parliament": 15,
    "attribution": 10,
    "articles": 10,
    "credibility": 10,
    "recency": 5,
}

# ── Role classification ──────────────────────────────────────────────
# Patterns matched against the lowercase `role` field.
# Order matters — first match wins.

ROLE_PATTERNS = [
    (1.0, [r"forsætisráðherra", r"ráðherra(?!.*fyrrverandi)"]),
    (0.9, [r"formaður\b.*flokk", r"formaður\b.*samtök"]),
    (0.8, [r"\bþingmaður\b", r"\bþingmadur\b"]),
    (0.7, [r"fyrrverandi\s+(forsætisráðherra|ráðherra|forseti)",
           r"þáverandi\s+(forsætisráðherra|ráðherra|forseti)"]),
    (0.6, [r"hagfræðingur", r"prófessor", r"sérfræðingur", r"fræðimaður"]),
    (0.5, [r"varaformaður", r"framkvæmdastjóri"]),
    (0.3, [r"fréttaritari", r"blaðamaður", r"ritstjóri"]),
]

INSTITUTION_ROLE_SCORE = 0.2
DEFAULT_ROLE_SCORE = 0.1

# ── Normalisation caps ───────────────────────────────────────────────
# Values at or above the cap produce a score of 1.0.

CLAIM_CAP = 20
SPEECH_CAP = 50
ARTICLE_CAP = 5
RECENCY_DAYS = 90  # activity within this many days gets full score


def load_entities():
    """Load all entity JSON files from the details directory."""
    entities = []
    for path in sorted(ENTITY_DIR.glob("*.json")):
        with open(path) as f:
            entities.append(json.load(f))
    return entities


def classify_role(entity):
    """Return a 0–1 role importance score based on role keywords."""
    if entity.get("type") == "institution":
        return INSTITUTION_ROLE_SCORE

    role = (entity.get("role") or "").lower()
    desc = (entity.get("description") or "").lower()
    text = f"{role} {desc}"

    for score, patterns in ROLE_PATTERNS:
        for pattern in patterns:
            if re.search(pattern, text):
                return score

    return DEFAULT_ROLE_SCORE


def score_entity(entity, today):
    """Compute a composite importance score for an entity."""
    breakdown = {}

    # 1. Role weight
    breakdown["role"] = classify_role(entity)

    # 2. Claim volume (normalised to cap)
    claim_count = len(entity.get("claims") or [])
    breakdown["claims"] = min(claim_count / CLAIM_CAP, 1.0)

    # 3. Parliamentary activity
    althingi = entity.get("althingi_stats") or {}
    speech_count = althingi.get("speech_count", 0)
    breakdown["parliament"] = min(speech_count / SPEECH_CAP, 1.0)

    # 4. Direct attribution ratio (quoted / total attributions)
    ac = entity.get("attribution_counts") or {}
    total_attr = sum(ac.values())
    quoted = ac.get("quoted", 0)
    breakdown["attribution"] = (quoted / total_attr) if total_attr > 0 else 0.0

    # 5. Article breadth
    article_count = len(entity.get("articles") or [])
    breakdown["articles"] = min(article_count / ARTICLE_CAP, 1.0)

    # 6. Credibility
    cred = entity.get("credibility")
    breakdown["credibility"] = cred if cred is not None else 0.0

    # 7. Recency bonus
    last_dates = []
    for art in entity.get("articles") or []:
        if art.get("date"):
            last_dates.append(art["date"])
    if althingi.get("last_speech"):
        last_dates.append(althingi["last_speech"])

    if last_dates:
        most_recent = max(last_dates)
        try:
            days_ago = (today - datetime.strptime(most_recent, "%Y-%m-%d").date()).days
            breakdown["recency"] = max(0.0, 1.0 - days_ago / RECENCY_DAYS)
        except ValueError:
            breakdown["recency"] = 0.0
    else:
        breakdown["recency"] = 0.0

    # Weighted sum
    total = sum(breakdown[k] * WEIGHTS[k] for k in WEIGHTS)

    return total, breakdown


def main():
    parser = argparse.ArgumentParser(description="Rank entities by importance")
    parser.add_argument("--top", type=int, default=20, help="Number of featured entities (default: 20)")
    parser.add_argument("--dry-run", action="store_true", help="Print ranking without writing file")
    args = parser.parse_args()

    entities = load_entities()
    today = date.today()

    # Score all entities
    scored = []
    for entity in entities:
        total, breakdown = score_entity(entity, today)
        scored.append({
            "slug": entity["slug"],
            "name": entity["name"],
            "type": entity.get("type", "?"),
            "role": (entity.get("role") or "")[:40],
            "total": total,
            "breakdown": breakdown,
        })

    # Sort by score descending
    scored.sort(key=lambda x: x["total"], reverse=True)

    # Print table
    header = f"{'#':>3}  {'Score':>5}  {'Rol':>3} {'Clm':>3} {'Prl':>3} {'Att':>3} {'Art':>3} {'Crd':>3} {'Rec':>3}  {'Type':<4}  {'Name'}"
    print(header)
    print("─" * len(header))

    for i, s in enumerate(scored, 1):
        b = s["breakdown"]
        marker = " ★" if i <= args.top else ""
        print(
            f"{i:>3}  {s['total']:5.1f}  "
            f"{b['role']:3.1f} {b['claims']:3.1f} {b['parliament']:3.1f} "
            f"{b['attribution']:3.1f} {b['articles']:3.1f} {b['credibility']:3.1f} {b['recency']:3.1f}  "
            f"{s['type'][:4]:<4}  {s['name']}{marker}"
        )

    print(f"\nTotal entities: {len(scored)}")
    print(f"Featured (top {args.top}): {', '.join(s['name'] for s in scored[:args.top])}")

    if not args.dry_run:
        slugs = [s["slug"] for s in scored[:args.top]]
        OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
        with open(OUTPUT_PATH, "w") as f:
            json.dump(slugs, f, indent=2, ensure_ascii=False)
            f.write("\n")
        print(f"\nWrote {len(slugs)} slugs to {OUTPUT_PATH.relative_to(PROJECT_ROOT)}")
    else:
        print("\n(dry run — no file written)")


if __name__ == "__main__":
    main()
