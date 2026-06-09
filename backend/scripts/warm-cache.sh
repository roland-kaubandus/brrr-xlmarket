#!/bin/sh
# NB: POSIX sh (medusa-konteineris POLE bash) — väldi bash-arrayd/[[ ]].
# warm-cache.sh — hoia Next ISR + CF-edge SOE võtmelehtedel, et TRULY-külm SSR
# (revalidate=3600 expiry'l) EI tabaks kasutajat 504-ga (homepage külm-render >30s,
# vt scaling-doc §17 homepage-leid). Juur: külm /et SSR await'ib pub-key-middleware
# query.graph (#11922 ~5s) + Meili-külm → vahel >CF 30s timeout.
#
# Kaks kasutust:
#   1. Coolify Scheduled Task (nt iga 15min: 0/15 * * * *) → pidev soojus (ISR=3600
#      expiry vahel) → leht ei jõua kunagi täis-külmaks.
#   2. feed-sync-bulk.sh lõpus (peale revalidate+purge, mis RE-külmetab) → kohene re-warm.
#
# Sekventsiaalne (EI thundering-herd) — üks päring korraga, et mitte ise koormata.
# Tabab AVALIKKU URL-i (STORE_URL) → soojendab korraga origin-ISR + CF-edge cache.

set -u  # NB: ei 'pipefail' — pole POSIX sh (dash) toetatud
BASE="${STORE_URL:-https://xlmarket.ee}"
LOCALE="${WARM_LOCALE:-et}"
TIMEOUT="${WARM_TIMEOUT:-60}"

ts() { date -u +%H:%M:%S; }
warm() {
  local path="$1"
  local code
  code=$(curl -s -o /dev/null -w '%{http_code}' --max-time "$TIMEOUT" "$BASE$path" 2>/dev/null || echo "000")
  echo "  [$(ts)] $path → $code"
}

echo "=== WARM-CACHE algus $(date -u +%Y-%m-%dT%H:%M:%S) (base=$BASE) ==="

# 1) Avaleht + peamised browse-lehed (kõige tähtsamad — homepage 504-risk)
warm "/$LOCALE"
warm "/$LOCALE/kategooriad"

# 2) Browse-API'd (header-nav + otsing) — kerged, hoiavad SWR-cache sooja
warm "/api/header-categories"

# 3) Top L1-kategooria-lehed (kui antud env-iga WARM_CATEGORIES="haru1,haru2,...")
if [ -n "${WARM_CATEGORIES:-}" ]; then
  OLDIFS="$IFS"; IFS=','
  for c in $WARM_CATEGORIES; do
    warm "/$LOCALE/kategooriad/$c"
  done
  IFS="$OLDIFS"
fi

echo "=== WARM-CACHE valmis $(date -u +%Y-%m-%dT%H:%M:%S) ==="
