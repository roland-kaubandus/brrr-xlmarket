#!/usr/bin/env bash
# Import production data into the Coolify-deployed xlmarket stack.
#
# Run AFTER the Coolify project has booted and all 5 services are
# healthy (db, redis, meili, medusa, storefront). Run this from the
# Coolify host shell (or open Coolify -> Terminal on the medusa service
# and adapt paths).
#
# Usage:
#   bash scripts/coolify-migrate-import.sh /path/to/xlmarket-coolify-migration-*.tar.gz
#
# Required env (export before running, or read from Coolify env):
#   COOLIFY_DB_CONTAINER     name of the Postgres container in Coolify
#   COOLIFY_MEILI_VOLUME     host path of the Meili volume mount
#   MEILI_MASTER_KEY         master key set in Coolify env
#   COOLIFY_MEDUSA_CONTAINER name of the Medusa container in Coolify

set -euo pipefail

ARCHIVE="${1:-}"
if [ -z "$ARCHIVE" ] || [ ! -f "$ARCHIVE" ]; then
  echo "Usage: $0 <archive.tar.gz>"
  exit 1
fi

: "${COOLIFY_DB_CONTAINER:?must set COOLIFY_DB_CONTAINER}"
: "${COOLIFY_MEILI_VOLUME:?must set COOLIFY_MEILI_VOLUME (host path of Meili volume)}"
: "${MEILI_MASTER_KEY:?must set MEILI_MASTER_KEY}"
: "${COOLIFY_MEDUSA_CONTAINER:?must set COOLIFY_MEDUSA_CONTAINER}"

WORK=$(mktemp -d)
trap "rm -rf $WORK" EXIT

echo "[1/4] Extracting archive..."
tar xzf "$ARCHIVE" -C "$WORK"

echo "[2/4] Restoring Postgres dump..."
docker exec -i "$COOLIFY_DB_CONTAINER" psql -U xlmarket -d xlmarket -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
docker exec -i "$COOLIFY_DB_CONTAINER" pg_restore -U xlmarket -d xlmarket --no-owner --no-acl < "$WORK/xlmarket.dump"
echo "      Postgres restored."

echo "[3/4] Restoring Meili dump..."
if [ -f "$WORK/meili.dump" ]; then
  # Stop Meili container, drop dump into the data dir, restart
  MEILI_CONTAINER=$(docker ps --filter "ancestor=getmeili/meilisearch:v1.41" --format '{{.Names}}' | head -n1)
  if [ -z "$MEILI_CONTAINER" ]; then
    echo "      WARN: could not auto-detect Meili container; restart it manually with --import-dump"
  else
    cp "$WORK/meili.dump" "$COOLIFY_MEILI_VOLUME/dumps/imported.dump"
    docker stop "$MEILI_CONTAINER"
    # Coolify will restart Meili; pass MEILI_IMPORT_DUMP=/meili_data/dumps/imported.dump as env var,
    # OR re-run via: docker run ... getmeili/meilisearch:v1.41 meilisearch --import-dump /meili_data/dumps/imported.dump
    echo "      Meili dump placed at $COOLIFY_MEILI_VOLUME/dumps/imported.dump"
    echo "      ACTION: in Coolify, set MEILI_IMPORT_DUMP=/meili_data/dumps/imported.dump on meili service, redeploy."
    echo "      After Meili boots and imports, remove the env var to avoid re-importing on every restart."
  fi
else
  echo "      No Meili dump in archive — will need to rebuild index via:"
  echo "        docker exec $COOLIFY_MEDUSA_CONTAINER node ../scripts/index-meilisearch.mjs"
fi

echo "[4/4] Restoring uploaded media (if any)..."
if [ -d "$WORK/uploads" ]; then
  docker cp "$WORK/uploads/." "$COOLIFY_MEDUSA_CONTAINER:/app/uploads/"
  echo "      uploads -> $COOLIFY_MEDUSA_CONTAINER:/app/uploads"
fi
if [ -d "$WORK/backend-static" ]; then
  docker cp "$WORK/backend-static/." "$COOLIFY_MEDUSA_CONTAINER:/app/static/"
  echo "      backend-static -> $COOLIFY_MEDUSA_CONTAINER:/app/static"
fi

echo
echo "Done."
echo
echo "Verify:"
echo "  docker exec $COOLIFY_DB_CONTAINER psql -U xlmarket -d xlmarket -c 'SELECT count(*) FROM product;'"
echo "  curl -s -H \"Authorization: Bearer \$MEILI_MASTER_KEY\" https://meili.xlmarket.eu/indexes/products/stats | python3 -m json.tool"
