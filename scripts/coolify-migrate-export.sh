#!/usr/bin/env bash
# Export production data from the old VPS for Coolify migration.
#
# Run this ON THE OLD VPS (65.109.86.254 / 100.93.186.17), from inside
# /home/brrr/brrr-xlmarket. Produces a single tarball you upload to the
# new Coolify host.
#
# Usage:
#   bash scripts/coolify-migrate-export.sh
#
# Output:
#   /tmp/xlmarket-coolify-migration-<timestamp>.tar.gz

set -euo pipefail

cd "$(dirname "$0")/.."

TS="$(date +%Y%m%d-%H%M%S)"
WORK="/tmp/xlmarket-migration-$TS"
ARCHIVE="/tmp/xlmarket-coolify-migration-$TS.tar.gz"

mkdir -p "$WORK"

echo "[1/4] Dumping Postgres (xlmarket)..."
docker exec xlmarket-db pg_dump -U xlmarket -Fc xlmarket > "$WORK/xlmarket.dump"
echo "      -> $(du -h "$WORK/xlmarket.dump" | cut -f1)"

echo "[2/4] Triggering Meili dump..."
if [ -z "${MEILISEARCH_API_KEY:-}" ]; then
  set -a; source .env; set +a
fi

DUMP_TASK=$(curl -fsS -X POST -H "Authorization: Bearer ${MEILISEARCH_API_KEY}" \
  http://127.0.0.1:7700/dumps | python3 -c "import json,sys;print(json.load(sys.stdin)['taskUid'])")

echo "      task uid: $DUMP_TASK — waiting up to 5 min for completion..."
for i in $(seq 1 60); do
  STATUS=$(curl -fsS -H "Authorization: Bearer ${MEILISEARCH_API_KEY}" \
    "http://127.0.0.1:7700/tasks/$DUMP_TASK" | python3 -c "import json,sys;print(json.load(sys.stdin)['status'])")
  if [ "$STATUS" = "succeeded" ]; then
    echo "      Meili dump succeeded"
    break
  fi
  if [ "$STATUS" = "failed" ]; then
    echo "      Meili dump FAILED — check Meili logs"
    exit 1
  fi
  sleep 5
done

# Find the latest dump file Meili produced
MEILI_DUMP_DIR="${MEILI_DUMP_DIR:-$(docker volume inspect xlmarket-data --format '{{.Mountpoint}}' 2>/dev/null || echo '/var/lib/meilisearch')/dumps}"
LATEST_DUMP=$(ls -t "$MEILI_DUMP_DIR"/*.dump 2>/dev/null | head -n1 || true)
if [ -z "$LATEST_DUMP" ]; then
  echo "      WARN: could not auto-locate Meili dump file. Set MEILI_DUMP_DIR env var and rerun."
  echo "      Looked in: $MEILI_DUMP_DIR"
else
  cp "$LATEST_DUMP" "$WORK/meili.dump"
  echo "      -> $(du -h "$WORK/meili.dump" | cut -f1)"
fi

echo "[3/4] Copying uploaded media (if any)..."
if [ -d "backend/uploads" ]; then
  cp -r backend/uploads "$WORK/uploads"
  echo "      -> $(du -sh "$WORK/uploads" | cut -f1)"
else
  echo "      no backend/uploads — skip"
fi

if [ -d "backend/static" ]; then
  cp -r backend/static "$WORK/backend-static"
  echo "      -> $(du -sh "$WORK/backend-static" | cut -f1)"
fi

echo "[4/4] Creating archive..."
tar czf "$ARCHIVE" -C "$WORK" .
rm -rf "$WORK"
echo
echo "Done."
echo "  Archive: $ARCHIVE"
echo "  Size:    $(du -h "$ARCHIVE" | cut -f1)"
echo
echo "Next steps:"
echo "  1) scp $ARCHIVE to your local machine, or directly to the new Coolify host"
echo "  2) On the new host, follow scripts/coolify-migrate-import.sh"
