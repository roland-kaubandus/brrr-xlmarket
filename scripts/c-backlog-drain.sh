#!/usr/bin/env bash
# c-backlog-drain.sh — ÜHEKORDNE backlogi-dreen (240+ kodutut drafti).
# Jooksutab import-pipeline.sh sammud [4]-[7] OLEMAS-backlogi peal, ILMA [1][2][3]
# (cache-refresh/churn/import) side-effektita. Propose-not-create: klass auto-paigutab
# ainult olemas-L3-desse (conf≥0.85), muu → review-bucket. Pre-C backup + offsite tehtud 2026-08-24.
set -uo pipefail
export PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
ROOT="/opt/xlmarket-github"
cd "$ROOT"
set -a; . /opt/eumotors-tasks/.env; set +a

MEDUSA_NAME="$(docker ps --format '{{.Names}}' | grep '^medusa-k33g' | head -1)"
DBK="$(docker ps --format '{{.Names}}' | grep '^db-k33g' | head -1)"
echo "=== C-DREEN START $(date -u +%FT%TZ) — medusa=$MEDUSA_NAME db=$DBK ==="
[ -n "$ANTHROPIC_API_KEY" ] || { echo "FATAL: ANTHROPIC_API_KEY puudub"; exit 2; }

BASE_DRAFT=$(docker exec "$DBK" psql -U xlmarket -d xlmarket -tAc "select count(*) from product where status='draft';")
echo "algseis: draftid=$BASE_DRAFT"

# ── [4] CLASSIFY (Opus propose-not-create) ──
echo "[4/7] classify --source unhomed --execute $(date -u +%T)"
node "$ROOT/scripts/pipeline-classify.mjs" --source unhomed --execute --out /tmp/c-classify-results.json \
  || { echo "FAIL: classify rc=$?"; exit 1; }

# ── [5] PRICE (feed-snapshot ühtlustus konteinerist) ──
FEED_XLSX_HOST=/tmp/c-feed.xlsx
docker cp "$MEDUSA_NAME":/data/vevor-571.xlsx "$FEED_XLSX_HOST" 2>/dev/null \
  && echo "  feed-snapshot: /data/vevor-571.xlsx → $FEED_XLSX_HOST" \
  || { FEED_XLSX_HOST=""; echo "  ⚠️ feed xlsx puudub → reprice vaikefeed"; }
echo "[5/7] price $(date -u +%T)"
node "$ROOT/scripts/pipeline-reprice.mjs" --execute ${FEED_XLSX_HOST:+--feed "$FEED_XLSX_HOST"} \
  || { echo "FAIL: price rc=$?"; exit 1; }

# ── [6] SPEC (klassifitseeritud SKU-de peal) ──
echo "[6/7] spec-extract $(date -u +%T)"
if [ -s /tmp/classify-skus.txt ]; then
  node "$ROOT/scripts/spec-extract-skus.mjs" --skus /tmp/classify-skus.txt \
    || { echo "FAIL: spec rc=$?"; exit 1; }
else
  echo "  /tmp/classify-skus.txt puudub → spec vahele"
fi

# ── [7] REINDEX Meili ──
echo "[7/7] reindeks Meili $(date -u +%T)"
docker exec "$MEDUSA_NAME" node scripts/index-meilisearch.mjs \
  || { echo "FAIL: reindex rc=$?"; exit 1; }

# ── kokkuvõte ──
END_DRAFT=$(docker exec "$DBK" psql -U xlmarket -d xlmarket -tAc "select count(*) from product where status='draft';")
REVIEW_N=$(docker exec "$DBK" psql -U xlmarket -d xlmarket -tAc "select count(*) from classification_review where status='pending';" 2>/dev/null || echo "?")
echo "=== C-DREEN DONE $(date -u +%FT%TZ) ==="
echo "draftid: $BASE_DRAFT → $END_DRAFT  ·  review-bucket pending: $REVIEW_N"
