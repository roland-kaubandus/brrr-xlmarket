#!/bin/sh
# refresh-feed-cache.sh — CONTAINER-NATIVE feed-cache värskendus + churned→OOS reindeks.
#
# MIKS (2026-07-23): k33g Coolify konteineris on FEED_CACHE_PATH=/data/vevor-feed-cache.json
# (püsiv named-volume), aga miski EI täitnud seda → reindeks jooksis tühja cache'iga →
# safety-guard OOS'is MITTE ühtki → KÕIK in_stock=true (6420 OOS → 0 revert, 2026-07-22).
# Host-skript feed-sync.sh on bare-metal (REPO=/home/brrr/..., 127.0.0.1 pordid) — ei jookse siin.
#
# SEE skript jookseb KONTEINERI SEES (Coolify Scheduled Task) ja kirjutab cache OTSE /data-sse.
# Post-cutover kindel: elab tervenisti Coolify-stackis, ei sõltu host bare-metal'ist ega
# docker-volume-siseelunditest. Vt CLAUDE.md "cron-wiring" + reports/churned-oos-juur-2026-07-23.md.
#
# COOLIFY SCHEDULED TASK:
#   Service: medusa · Command: sh /app/scripts/refresh-feed-cache.sh · Cron: 0 */4 * * *
#
# SKOOP: download → build-cache → reindeks (churned→OOS). Toote-IMPORT (uued tooted) EI ole siin —
# see on eraldi (auto-klassifikaator B-etapp). See skript hoiab cache värske + laoseisu õige.
set -eu

XLSX="${FEED_XLSX_PATH:-/data/vevor-571.xlsx}"
CACHE="${FEED_CACHE_PATH:-/data/vevor-feed-cache.json}"
URL="${FEED_URL:-https://ads-feed.s3.us-west-2.amazonaws.com/ads/business/571/vevor-571.xlsx}"
SCRIPTS="$(dirname "$0")"

echo "=== refresh-feed-cache $(date -u +%Y-%m-%dT%H:%M:%SZ) ==="

echo "[1/3] Laen feedi → $XLSX"
wget -q -O "$XLSX.new" "$URL"
# minimaalne terviklikkuse-kontroll: xlsx algab PK (zip-magic) ja on >1MB
SIZE=$(wc -c < "$XLSX.new")
if [ "$SIZE" -lt 1000000 ]; then
  echo "  ❌ Allalaadimine kahtlaselt väike ($SIZE baiti) — katkestan, jätan vana cache'i puutumata."
  rm -f "$XLSX.new"
  exit 1
fi
mv "$XLSX.new" "$XLSX"
echo "  OK ($SIZE baiti)"

echo "[2/4] Ehitan cache → $CACHE"
FEED_XLSX_PATH="$XLSX" FEED_CACHE_PATH="$CACHE" node "$SCRIPTS/build-vevor-feed-cache.mjs"

echo "[3/4] Stamp feed_status + last_seen_in_feed (churn-jälg arhiveerimiseks; EI delist'i)"
FEED_CACHE_PATH="$CACHE" node "$SCRIPTS/feed-status-stamp.mjs"

echo "[4/4] Reindeks Meili (churned→OOS aktiivne + archived jäetakse vahele; guard nõuab mitte-tühja cache'i)"
FEED_CACHE_PATH="$CACHE" node "$SCRIPTS/index-meilisearch.mjs"

echo "=== DONE $(date -u +%Y-%m-%dT%H:%M:%SZ) ==="
