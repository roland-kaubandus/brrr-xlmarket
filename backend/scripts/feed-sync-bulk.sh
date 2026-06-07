#!/bin/bash
# feed-sync-bulk.sh — KIIRE feed-sync Coolify medusa-konteinerile (Scheduled Task).
#
# Erinevus vanast feed-sync.sh-st: EI uuenda tooteid Medusa Admin API kaudu
# (mis käivitaks Meili-subscriber'i → 8s/toode). Selle asemel:
#   1. lae VEVOR xlsx
#   2. BULK price-update otse SQL-iga (sekundid)
#   3. feed-cache rebuild (in_stock allikas)
#   4. ÜKS Meili reindex (mitte per-toode)
#   5. synonyms re-sync (reindex kustutab need)
#
# Uued SKU-d vajavad endiselt täis-importi (import-vevor-feed.mjs) — logitakse,
# aga seda siin EI tehta (aeglane). Käivita käsitsi/harvem.
#
# Cron (Coolify Scheduled Task): 0 */4 * * *  →  bash /app/scripts/feed-sync-bulk.sh
# Env (medusa-konteineris olemas): DATABASE_URL, MEILISEARCH_HOST, MEILISEARCH_KEY

set -uo pipefail
cd /app

FEED_URL="${FEED_URL:-https://ads-feed.s3.us-west-2.amazonaws.com/ads/business/571/vevor-571.xlsx}"
FEED_DIR="/app/data/feeds"
XLSX="$FEED_DIR/vevor-571.xlsx"
LOCK="/tmp/xlmarket-feed-sync.lock"

# Väldi kattuvaid jookse
exec 9>"$LOCK"
if ! flock -n 9; then echo "Teine feed-sync juba jookseb — väljun."; exit 0; fi

ts() { date -u +%H:%M:%S; }
echo "=== FEED-SYNC-BULK algus $(date -u +%Y-%m-%dT%H:%M:%S) ==="
mkdir -p "$FEED_DIR"

echo "[1/5 $(ts)] Lae VEVOR xlsx..."
if ! curl -fsSL --max-time 300 "$FEED_URL" -o "$XLSX.tmp"; then
  echo "VIGA: feed download ebaõnnestus"; exit 1
fi
mv "$XLSX.tmp" "$XLSX"
echo "  laetud: $(du -h "$XLSX" | cut -f1)"

echo "[2/5 $(ts)] Bulk price-update (SQL)..."
node scripts/feed-bulk-price.mjs --execute || { echo "VIGA: bulk-price"; exit 1; }

echo "[3/5 $(ts)] Feed-cache rebuild (in_stock)..."
node scripts/build-vevor-feed-cache.mjs || { echo "VIGA: feed-cache"; exit 1; }

echo "[4/5 $(ts)] Meili reindex (üks kord)..."
node scripts/index-meilisearch.mjs 2>&1 | grep -vE "^  [0-9]+/" | tail -8 || { echo "VIGA: reindex"; exit 1; }

echo "[5/6 $(ts)] Synonyms re-sync..."
node scripts/sync-synonyms.mjs || echo "HOIATUS: synonyms sync ebaõnnestus (mittekriitiline)"

# [6/6] Browse-cache invalidatsioon (samm 2a). Meili on nüüd värske → puhasta Next
# ISR-cache avaleht/listing'ult (toote-detail bounded ISR=3600, hind tuleb värskest
# Meili'st). Gated: ainult kui REVALIDATE_SECRET + STOREFRONT_URL seatud (muidu skip).
# Browse (ProductGrid) loeb Meili'st otse → juba värske ilma selleta.
echo "[6/6 $(ts)] Browse-cache revalidate..."
if [ -n "$REVALIDATE_SECRET" ] && [ -n "$STOREFRONT_URL" ]; then
  curl -fsS --max-time 30 -X POST "$STOREFRONT_URL/api/revalidate" \
    -H "Authorization: Bearer $REVALIDATE_SECRET" -H "Content-Type: application/json" \
    -d '{"all":true}' && echo "  revalidate OK" || echo "  HOIATUS: revalidate ebaõnnestus (mittekriitiline, ISR=3600 fallback)"
else
  echo "  vahele jäetud (REVALIDATE_SECRET/STOREFRONT_URL seadmata) — ISR=3600 bounded"
fi

echo "=== FEED-SYNC-BULK valmis $(date -u +%Y-%m-%dT%H:%M:%S) ==="
