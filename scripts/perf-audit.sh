#!/usr/bin/env bash
# Run Lighthouse on key XLMarket pages. Saves JSON + summary.
set -euo pipefail

OUT="/home/brrr/brrr-xlmarket/reports/overnight-2026-04-22/lighthouse"
mkdir -p "$OUT"

CHROME="/home/brrr/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome"
BASE="https://xlmarket.store"

URLS=(
  "/en"
  "/en/kategooriad"
  "/en/alustajale"
  "/en/arikliendile"
  "/en/hooldus"
  "/en/meist"
  "/en/kontakt"
  "/en/tingimused"
  "/en/privaatsus"
  "/en/tarne"
  "/en/tagastamine"
  "/en/kategooriad/renewable-energy"
  "/en/kategooriad/horeca-food-service"
  "/en/kategooriad/automotive-workshop"
  "/en/kategooriad/hand-power-tools"
  "/en/kategooriad/welding-metalworking"
)

SUMMARY="$OUT/SUMMARY.md"
echo "# Lighthouse Performance Audit — $(date -Iseconds)" > "$SUMMARY"
echo "" >> "$SUMMARY"
echo "| Page | Perf | LCP (s) | TBT (ms) | CLS | Size (KB) |" >> "$SUMMARY"
echo "|------|------|---------|----------|-----|-----------|" >> "$SUMMARY"

for url in "${URLS[@]}"; do
  fn=$(echo "$url" | tr '/' '_' | sed 's/^_//')
  [[ -z "$fn" ]] && fn="home"
  echo "→ $BASE$url"
  npx --yes lighthouse "$BASE$url" \
    --quiet \
    --chrome-path="$CHROME" \
    --chrome-flags="--headless --no-sandbox --disable-dev-shm-usage" \
    --output=json --output=html \
    --output-path="$OUT/$fn" \
    --only-categories=performance \
    --preset=desktop \
    --max-wait-for-load=60000 \
    2>/dev/null || { echo "  FAILED"; continue; }

  # Extract KPIs
  JSON="$OUT/$fn.report.json"
  if [[ -f "$JSON" ]]; then
    python3 -c "
import json
d = json.load(open('$JSON'))
cat = d.get('categories', {}).get('performance', {})
audits = d.get('audits', {})
score = int((cat.get('score') or 0) * 100)
lcp = audits.get('largest-contentful-paint', {}).get('numericValue', 0) / 1000
tbt = audits.get('total-blocking-time', {}).get('numericValue', 0)
cls = audits.get('cumulative-layout-shift', {}).get('numericValue', 0)
size = audits.get('total-byte-weight', {}).get('numericValue', 0) / 1024
print(f'| $url | {score} | {lcp:.1f} | {tbt:.0f} | {cls:.2f} | {size:.0f} |')
" >> "$SUMMARY"
  fi
done

echo "" >> "$SUMMARY"
echo "JSON + HTML reports in: $OUT/" >> "$SUMMARY"
echo "Done. Summary: $SUMMARY"
