#!/usr/bin/env bash
# Export each cms_page row to storefront/lib/cms-fallback/<key>.json
# Used as storefront build-time fallback if Medusa is unavailable at render.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
set +u
for env_candidate in "${SCRIPT_DIR}/../.env" "${SCRIPT_DIR}/../../../.env" "/home/brrr/brrr-xlmarket/.env"; do
  [[ -f "$env_candidate" ]] && source "$env_candidate" && break
done
set -u

export PGPASSWORD="${PGPASSWORD:-}"
PG_ARGS="-h ${PGHOST:-localhost} -p ${PGPORT:-5435} -U ${PGUSER:-xlmarket} -d ${PGDATABASE:-xlmarket} -At"

# Find storefront fallback dir — try worktree then main repo
OUT_DIR=""
for candidate in "${SCRIPT_DIR}/../storefront/lib/cms-fallback" "/home/brrr/brrr-xlmarket/storefront/lib/cms-fallback"; do
  [[ -d "$(dirname "$candidate")" ]] && OUT_DIR="$candidate" && break
done
mkdir -p "$OUT_DIR"

echo "Exporting CMS fallback → $OUT_DIR"
for key in $(psql $PG_ARGS -c "SELECT page_key FROM cms_page ORDER BY page_key"); do
  psql $PG_ARGS -c "SELECT content::text FROM cms_page WHERE page_key = '$key'" > "${OUT_DIR}/${key}.json"
  echo "  ✓ ${key}.json"
done

echo "✓ Fallback snapshots written."
