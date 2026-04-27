#!/usr/bin/env python3
"""Validate exported JSON files before the eleventy build.

Catches common export breakage (truncated writes, missing columns, empty
exports, broken topic shards) before they cause cryptic Nunjucks errors
during `npm run build`.

Checks per file:
  - exists
  - parses as JSON
  - top-level shape (list or dict) matches expectation
  - minimum element count is met
  - sample record has the required keys

Exit codes:
  0  all expectations satisfied
  1  one or more hard failures (build should not proceed)

Usage:
  python3 scripts/validate_export.py
  python3 scripts/validate_export.py --strict   # treat warnings as errors
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "assets" / "data"
TOPIC_CLAIMS_DIR = DATA_DIR / "topic-claims"


# Per-file expectations. min_count floors are conservative — set well below
# current counts so they catch catastrophic loss without false-alarming on
# normal churn. Update if the real numbers grow significantly.
EXPECTATIONS: dict[str, dict] = {
    "claims.json": {
        "kind": "list[dict]",
        "min_count": 1500,
        "required_fields": [
            "claim_slug", "canonical_text_is", "category", "verdict",
        ],
    },
    "reports.json": {
        "kind": "list[dict]",
        "min_count": 200,
        "required_fields": [
            "slug", "article_title", "article_url",
        ],
    },
    "entities.json": {
        "kind": "list[dict]",
        "min_count": 500,
        "required_fields": ["slug", "name", "type"],
    },
    "evidence.json": {
        "kind": "list[dict]",
        "min_count": 400,
        "required_fields": [
            "slug", "evidence_id", "domain", "topic", "source_type",
        ],
    },
    "topics.json": {
        "kind": "list[dict]",
        "min_count": 10,
        "required_fields": ["slug", "label_is", "claim_count"],
    },
    "overviews.json": {
        "kind": "list[dict]",
        "min_count": 1,
        "required_fields": ["slug", "period_start", "period_end"],
    },
    "debates.json": {
        "kind": "list[dict]",
        "min_count": 200,
        "required_fields": ["slug"],
    },
    "featured-entities.json": {
        "kind": "list[str]",
        "min_count": 5,
    },
    "sources.json": {
        "kind": "dict",
        "min_count": 100,  # number of keys
    },
}


class Result:
    def __init__(self) -> None:
        self.errors: list[str] = []
        self.warnings: list[str] = []
        self.passed: list[str] = []

    def fail(self, msg: str) -> None:
        self.errors.append(msg)

    def warn(self, msg: str) -> None:
        self.warnings.append(msg)

    def ok(self, msg: str) -> None:
        self.passed.append(msg)


def _validate_file(name: str, expectation: dict, result: Result) -> None:
    path = DATA_DIR / name
    if not path.exists():
        result.fail(f"{name}: missing (expected at {path.relative_to(ROOT)})")
        return

    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as e:
        result.fail(f"{name}: invalid JSON ({e.msg} at line {e.lineno})")
        return

    kind = expectation["kind"]
    min_count = expectation["min_count"]
    required_fields = expectation.get("required_fields", [])

    # Top-level shape
    if kind == "list[dict]":
        if not isinstance(data, list):
            result.fail(f"{name}: expected list, got {type(data).__name__}")
            return
        if data and not isinstance(data[0], dict):
            result.fail(
                f"{name}: expected list[dict], "
                f"first element is {type(data[0]).__name__}"
            )
            return
    elif kind == "list[str]":
        if not isinstance(data, list):
            result.fail(f"{name}: expected list, got {type(data).__name__}")
            return
        if data and not isinstance(data[0], str):
            result.fail(
                f"{name}: expected list[str], "
                f"first element is {type(data[0]).__name__}"
            )
            return
    elif kind == "dict":
        if not isinstance(data, dict):
            result.fail(f"{name}: expected dict, got {type(data).__name__}")
            return

    # Count
    count = len(data)
    if count < min_count:
        result.fail(
            f"{name}: only {count} elements, expected at least {min_count} "
            "(possible truncated export)"
        )
        return

    # Required fields on first record (only relevant for list[dict])
    if kind == "list[dict]" and required_fields and data:
        sample = data[0]
        missing = [f for f in required_fields if f not in sample]
        if missing:
            result.fail(
                f"{name}: first record missing required field(s): "
                f"{', '.join(missing)}"
            )
            return

    result.ok(f"{name}: {count} elements, shape OK")


def _validate_topic_claims(result: Result) -> None:
    if not TOPIC_CLAIMS_DIR.exists():
        result.fail(f"topic-claims/: directory missing")
        return

    shards = sorted(TOPIC_CLAIMS_DIR.glob("*.json"))
    if len(shards) < 5:
        result.fail(
            f"topic-claims/: only {len(shards)} shards, expected at least 5"
        )
        return

    bad_shards: list[str] = []
    for shard in shards:
        try:
            data = json.loads(shard.read_text(encoding="utf-8"))
        except json.JSONDecodeError as e:
            bad_shards.append(f"{shard.name}: {e.msg}")
            continue
        if not isinstance(data, list):
            bad_shards.append(f"{shard.name}: expected list, got {type(data).__name__}")

    if bad_shards:
        for b in bad_shards:
            result.fail(f"topic-claims/{b}")
    else:
        result.ok(f"topic-claims/: {len(shards)} shards, all valid")


def _cross_check(result: Result) -> None:
    """Light cross-file consistency checks. Warnings, not failures."""
    try:
        topics = json.loads((DATA_DIR / "topics.json").read_text(encoding="utf-8"))
        topic_slugs_in_index = {t["slug"] for t in topics}
        shard_slugs = {p.stem for p in TOPIC_CLAIMS_DIR.glob("*.json")}
        missing_shards = topic_slugs_in_index - shard_slugs
        orphaned_shards = shard_slugs - topic_slugs_in_index
        if missing_shards:
            result.warn(
                f"topics in index but no shard: {sorted(missing_shards)}"
            )
        if orphaned_shards:
            result.warn(
                f"shards with no matching topic in index: {sorted(orphaned_shards)}"
            )
    except (FileNotFoundError, json.JSONDecodeError, KeyError):
        # Already reported by per-file checks
        pass


def main() -> int:
    parser = argparse.ArgumentParser(
        description=__doc__,
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument(
        "--strict", action="store_true",
        help="Treat warnings as errors (exit 1 on any warning)",
    )
    args = parser.parse_args()

    result = Result()

    for name, expectation in EXPECTATIONS.items():
        _validate_file(name, expectation, result)

    _validate_topic_claims(result)
    _cross_check(result)

    # Output
    for msg in result.passed:
        print(f"  ok    {msg}")
    for msg in result.warnings:
        print(f"  warn  {msg}", file=sys.stderr)
    for msg in result.errors:
        print(f"  FAIL  {msg}", file=sys.stderr)

    print()
    print(
        f"{len(result.passed)} ok, "
        f"{len(result.warnings)} warning(s), "
        f"{len(result.errors)} error(s)"
    )

    if result.errors:
        return 1
    if args.strict and result.warnings:
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
