#!/bin/bash
# Post-build minification for CSS and JS assets in _site/
# Minifies files in-place — run after `eleventy` builds to _site/

set -euo pipefail

SITE_DIR="${1:-_site}"
CSS_DIR="$SITE_DIR/assets/css"
JS_DIR="$SITE_DIR/assets/js"

echo "Minifying CSS..."
for f in "$CSS_DIR"/*.css; do
  [ -f "$f" ] || continue
  npx cleancss -O1 --inline none -o "$f" "$f"
done

echo "Minifying JS..."
for f in "$JS_DIR"/*.js; do
  [ -f "$f" ] || continue
  npx terser "$f" --compress --mangle -o "$f"
done

# Report savings
CSS_SIZE=$(du -sh "$CSS_DIR" 2>/dev/null | cut -f1)
JS_SIZE=$(du -sh "$JS_DIR" 2>/dev/null | cut -f1)
echo "Done. CSS: $CSS_SIZE, JS: $JS_SIZE"
