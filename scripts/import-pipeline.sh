#!/usr/bin/env bash
# import-pipeline.sh — FEED IMPORT-PIPELINE orchestraator (HOST-run, k33g).
#
# Ahel (committed disain reports/cron-wiring-kaardistus.md):
#   [1] cache-refresh      — download + build-cache + stamp + churn/OOS   (KONTEINER: refresh-feed-cache.sh)
#   [2] (osa [1]-st: stock/churn→OOS + reindeks juba refresh'is)
#   [3] IMPORT-NEW         — AINULT uued SKU-d → draft, KATEGOORIATA        (⚠️ OTSUS — vt allpool)
#   [4] CLASSIFY           — Opus propose-not-create, olemas-L3 auto        (HOST: pipeline-classify.mjs)
#   [5] PRICE              — computeRetail; HIND=ainus SSoT-erand           (HOST: pipeline-reprice.mjs)
#   [6] SPEC               — Haiku spec-ekstrakt L3-mallist                 (HOST: spec-extract-skus.mjs)
#   [7] REINDEX            — Meili (uued tooted + hinnad nähtavaks)         (KONTEINER: index-meilisearch.mjs)
#
# MIKS HOST-run: sammud [4][5][6] vajavad ANTHROPIC_API_KEY (ainult hostil /opt/eumotors-tasks/.env)
# ja kirjutavad DB-sse `docker exec db-k33g psql` kaudu (hostil pole pg-porti). Host jääb elus ka
# post-cutover (kaob ainult vana VPS). Sammud [1][2][7] on konteiner-natiivsed (docker exec medusa).
#
# FAIL-LOUD (nagu refresh-feed-cache.sh): iga samm tõestab tulemust; ükski lünk → exit!=0 + Slack.
# DRY vaikimisi — EI kirjuta. --execute lülitab kirjutuse sisse (KÕIK alam-sammud saavad --execute).
#
# Kasutus:
#   scripts/import-pipeline.sh                 # DRY: mõju-raport, EI kirjuta
#   scripts/import-pipeline.sh --execute       # LIVE: import + klassifikatsioon + hind + spec + reindeks
#   IMPORT_CMD="docker exec …" scripts/import-pipeline.sh --execute   # step [3] plug-in (vt OTSUS)
set -euo pipefail

# ── env ──────────────────────────────────────────────────────────────────────
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="${PIPELINE_ENV_FILE:-/opt/eumotors-tasks/.env}"
[ -f "$ENV_FILE" ] && { set -a; . "$ENV_FILE"; set +a; }   # ANTHROPIC_API_KEY, SLACK_WEBHOOK_URL (väärtust EI logi)

EXECUTE=0; [ "${1:-}" = "--execute" ] && EXECUTE=1
MODE=$([ "$EXECUTE" = "1" ] && echo EXECUTE || echo DRY-RUN)
EXFLAG=$([ "$EXECUTE" = "1" ] && echo "--execute" || echo "--dry")

MEDUSA_NAME="$(docker ps --format '{{.Names}}' | grep '^medusa' | head -1 || true)"
DB_NAME="$(docker ps --format '{{.Names}}' | grep '^db-k33g' | head -1 || true)"
SLACK="${SLACK_WEBHOOK_URL:-}"
RUN_START=$(date -u +%s)

slack() { [ -n "$SLACK" ] && wget -qO- --header="content-type: application/json" \
  --post-data="{\"text\":\"$1\"}" "$SLACK" >/dev/null 2>&1 || true; }
fail() { echo "❌ IMPORT-PIPELINE FAIL [$1]: $2" >&2; slack "❌ XLM import-pipeline FAIL [$1]: $2"; exit "${3:-1}"; }
trap 'rc=$?; [ "$rc" -ne 0 ] && echo "❌ import-pipeline KATKES (rc=$rc) $(date -u +%FT%TZ)" >&2' EXIT

echo "=== IMPORT-PIPELINE START ($MODE) $(date -u +%FT%TZ) ==="
echo "  medusa=$MEDUSA_NAME  db=$DB_NAME  root=$ROOT"
[ -n "$DB_NAME" ] || fail "prep" "db-k33g konteinerit ei leitud (docker ps)"
[ -n "$MEDUSA_NAME" ] || fail "prep" "medusa konteinerit ei leitud (docker ps)"
[ "$EXECUTE" = "1" ] && [ -z "${ANTHROPIC_API_KEY:-}" ] && fail "prep" "ANTHROPIC_API_KEY puudub ($ENV_FILE) — sammud [4][6] ei saa jooksta"

dbq() { docker exec -i "$DB_NAME" psql -U xlmarket -d xlmarket -tA -v ON_ERROR_STOP=1 -c "$1"; }

# ── [1][2] CACHE-REFRESH + churn/OOS (konteiner-natiivne) ────────────────────
# refresh-feed-cache.sh = download+cache+stamp+inventory+reindeks, ise fail-loud.
# EI ole dry-võimeline (kirjutab cache+inventory). DRY-s ainult TÕESTA, et cache värske.
echo "[1/7] cache-refresh (churn/OOS)"
if [ "$EXECUTE" = "1" ]; then
  docker exec "$MEDUSA_NAME" sh /app/scripts/refresh-feed-cache.sh || fail "cache-refresh" "refresh-feed-cache.sh rc!=0"
else
  CACHE_AGE=$(docker exec "$MEDUSA_NAME" sh -c 'echo $(( $(date -u +%s) - $(stat -c %Y /data/vevor-feed-cache.json 2>/dev/null || echo 0) ))' 2>/dev/null || echo 999999)
  echo "  [DRY] cache vanus ${CACHE_AGE}s (live-jooksul refresh uuendaks)"
fi

# ── [3] IMPORT-NEW (propose-not-create): AINULT uued SKU-d → draft, KATEGOORIATA ──
# import-new-drafts.mjs (konteiner-natiivne) loob uued SKU-d status="draft", KATEGOORIATA — EI loo
# kategooriaid ega publitseeri (erinevalt import-feed-v2.mjs-st, mis rikuks SSoT/propose-not-create).
# Kodu määrab [4] classify (draft→published alles paigutusel); autoriteetse hinna [5] reprice.
echo "[3/7] import-new (draft, kategooriata)"
# UUTE SKU-de loend = feed-cache SKU-d MIINUS DB-s olevad vevor_sku-d (comm = orchestraatori tõde).
docker exec "$MEDUSA_NAME" node -e '
  try { const c=require("/data/vevor-feed-cache.json"); console.log(Object.keys(c.bySku||{}).join("\n")); }
  catch(e){ }' 2>/dev/null | sort -u > /tmp/pl-feed-skus.txt || true
dbq "SELECT metadata->>'vevor_sku' FROM product WHERE deleted_at IS NULL AND metadata->>'vevor_sku' IS NOT NULL" 2>/dev/null | sort -u > /tmp/pl-db-skus.txt || true
comm -23 /tmp/pl-feed-skus.txt /tmp/pl-db-skus.txt 2>/dev/null > /tmp/pl-new-skus.txt || true
NEW_N=$(grep -c . /tmp/pl-new-skus.txt || echo 0)
echo "  feed SKU=$(wc -l < /tmp/pl-feed-skus.txt|tr -d ' ') · DB SKU=$(wc -l < /tmp/pl-db-skus.txt|tr -d ' ') · UUSI (feed∖DB)=$NEW_N"
if [ "$EXECUTE" = "1" ]; then
  if [ -n "${IMPORT_CMD:-}" ]; then
    echo "  IMPORT_CMD antud (override) → jooksutan"; eval "$IMPORT_CMD" || fail "import-new" "IMPORT_CMD rc!=0"
  elif [ "$NEW_N" -gt 0 ]; then
    # Anna eel-arvutatud uute-SKU loend konteinerisse (kiire tee — väldib toote-mooduli täisloopi).
    docker cp /tmp/pl-new-skus.txt "$MEDUSA_NAME":/tmp/pl-new-skus.txt || fail "import-new" "docker cp uute-SKU loend nurjus"
    # `medusa exec` = framework-konteiner (workflow'd) ILMA REST-auth'ita. Positsioon: <skus-fail> execute.
    docker exec "$MEDUSA_NAME" sh -c 'cd /app && npx medusa exec scripts/import-new-drafts.mjs /tmp/pl-new-skus.txt execute' \
      || fail "import-new" "import-new-drafts.mjs rc!=0 ($NEW_N uut SKU-d)"
  else
    echo "  0 uut SKU-d → import-samm vahele (steady-state)"
  fi
else
  if [ "$NEW_N" -gt 0 ]; then
    docker cp /tmp/pl-new-skus.txt "$MEDUSA_NAME":/tmp/pl-new-skus.txt 2>/dev/null || true
    docker exec "$MEDUSA_NAME" sh -c 'cd /app && npx medusa exec scripts/import-new-drafts.mjs /tmp/pl-new-skus.txt dry 2>&1' | grep -E 'NEW_DRAFTS=|DRY|·|puudub' | sed 's/^/  /' || true
  else
    echo "  [DRY] 0 uut SKU-d → import vahele"
  fi
fi

# ── [4] CLASSIFY (host, propose-not-create) ──────────────────────────────────
echo "[4/7] classify (Opus propose-not-create)"
# source=unhomed: kata VÄRSKED draftid [3] + olemas-backlog (kõik kategooriata, draft VÕI published).
node "$ROOT/scripts/pipeline-classify.mjs" --source unhomed $EXFLAG --out /tmp/pipeline-classify-results.json \
  || fail "classify" "pipeline-classify.mjs rc!=0"

# ── FEED-SNAPSHOT ÜHTLUSTUS (gap-fix 2026-07-25) ─────────────────────────────
# [3] import loeb /data/vevor-feed-cache.json; [5] reprice loeb xlsx-i. MÕLEMAD peavad
# tulema SAMAST allikast — /data/vevor-571.xlsx, mille [1] refresh laadis JA millest cache
# ehitati. Reprice vaikefeed oli repo-koopia backend/data/feeds/vevor-571.xlsx, mida refresh
# (konteiner /data) EI puutu → aegus (nähtud: repo 3 päeva vana, /data värske) → import ja
# hind töötasid LAHKNEVATE feedide peal. Kopeeri konteineri värske xlsx hostile → sama snapshot.
FEED_XLSX_HOST=/tmp/pl-feed.xlsx
if docker cp "$MEDUSA_NAME":/data/vevor-571.xlsx "$FEED_XLSX_HOST" 2>/dev/null; then
  echo "  feed-snapshot ühtlustatud: /data/vevor-571.xlsx → $FEED_XLSX_HOST (import-cache + reprice = SAMA allikas)"
else
  FEED_XLSX_HOST=""
  echo "  ⚠️ /data/vevor-571.xlsx puudub konteineris → reprice kasutab repo-vaikefeed'i (VÕIB lahkneda import-cache'ist!)"
fi

# ── [5] PRICE (host; HIND=ainus SSoT-erand) ──────────────────────────────────
echo "[5/7] price (computeRetail + Omnibus + marginaali-alarm)"
node "$ROOT/scripts/pipeline-reprice.mjs" $EXFLAG ${FEED_XLSX_HOST:+--feed "$FEED_XLSX_HOST"} || fail "price" "pipeline-reprice.mjs rc!=0"

# ── [6] SPEC (host) ──────────────────────────────────────────────────────────
echo "[6/7] spec-extract (specita tooted)"
if [ -s /tmp/classify-skus.txt ]; then
  node "$ROOT/scripts/spec-extract-skus.mjs" --skus /tmp/classify-skus.txt $([ "$EXECUTE" = "1" ] || echo --dry) \
    || fail "spec" "spec-extract-skus.mjs rc!=0"
else
  echo "  klassifitseeritud SKU-loend puudub → spec vahele"
fi

# ── [7] REINDEX (konteiner) — ainult EXECUTE (uued tooted + hinnad nähtavaks) ─
echo "[7/7] reindeks Meili"
if [ "$EXECUTE" = "1" ]; then
  docker exec "$MEDUSA_NAME" node scripts/index-meilisearch.mjs || fail "reindex" "index-meilisearch.mjs rc!=0"
else
  echo "  [DRY] reindeks vahele (kirjutust polnud)"
fi

# ── review-bucket nähtavus (alati — ka DRY) ──────────────────────────────────
echo ""
node "$ROOT/scripts/pipeline-review-digest.mjs" \
  $([ "$EXECUTE" = "1" ] && echo "" || echo "--from-json /tmp/pipeline-classify-results.json") \
  $([ -n "$SLACK" ] && [ "$EXECUTE" = "1" ] && echo "--slack" || echo "") || true

echo ""
echo "=== IMPORT-PIPELINE DONE ($MODE) $(date -u +%FT%TZ) — kestus $(( $(date -u +%s) - RUN_START ))s ==="
[ "$EXECUTE" = "1" ] && slack "✅ XLM import-pipeline OK ($(( $(date -u +%s) - RUN_START ))s)"
trap - EXIT
