#!/bin/bash
# Post-build minification for CSS and JS assets in _site/
# Minifies files in-place — run after `eleventy` builds to _site/

set -euo pipefail

SITE_DIR="${1:-_site}"
CSS_DIR="$SITE_DIR/assets/css"
JS_DIR="$SITE_DIR/assets/js"

# ── Prune dev-only deck artifacts ──────────────────────────────────────
# The Quarto decks (althjodastofnun/, althjodamalastofnun/) are passthrough-
# copied with reveal.js sourcemaps, legacy .ttf/.eot font fallbacks, and PDF
# figure exports that never ship to a browser (.woff covers every font; the
# slides render from HTML, not the PDFs). Strip them from the build output
# only — source dirs are untouched, so the next Quarto re-export is unaffected.
echo "Pruning dev-only deck artifacts..."
for deck in althjodastofnun althjodamalastofnun; do
  deck_dir="$SITE_DIR/$deck"
  [ -d "$deck_dir" ] || continue
  find "$deck_dir" -type f \( \
    -name '*.pdf' -o -name '*.map' -o -name '*.ttf' -o -name '*.eot' \
  \) -delete
done

echo "Minifying CSS..."
for f in "$CSS_DIR"/*.css; do
  [ -f "$f" ] || continue
  pnpm exec cleancss -O1 --inline none -o "$f" "$f"
done

echo "Minifying JS..."
for f in "$JS_DIR"/*.js; do
  [ -f "$f" ] || continue
  pnpm exec terser "$f" --compress --mangle -o "$f"
done

# Report savings
CSS_SIZE=$(du -sh "$CSS_DIR" 2>/dev/null | cut -f1)
JS_SIZE=$(du -sh "$JS_DIR" 2>/dev/null | cut -f1)
echo "Done. CSS: $CSS_SIZE, JS: $JS_SIZE"
