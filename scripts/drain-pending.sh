#!/usr/bin/env bash
# drain-pending.sh — MANUAALNE kiirendus: tühjenda KOGU rikastus-backlog ([4]→[6]→[6.5]).
#
# Erinevalt öisest import-pipeline.sh-st (delta ~100 SKU) töötleb see KOGU backlogi ÜHE käsuga.
# Kasuta kui krediit tagasi + tahad KOHE järele jõuda (muidu öine cron teeb delta-kaupa, aeglaselt).
#
# ÕHUKE WRAPPER olemas-skriptidele (EI dubleeri loogikat, HARD RULE #5 "üks transform"):
#   [4] pipeline-classify.mjs --source unhomed  (kogu kodutu, mitte delta)
#   [6] spec-extract-skus.mjs --skus <kõik null-spec>
#   [6.5] content-gen-run.mjs --all --write     (kogu korpus, hash-guard → ainult null-hash)
#   [7] index-meilisearch.mjs                    (teeb nähtavaks)
#
# KREDIIT-PROBE alguses — ära raiska kui krediit maas (sama värav kui import-pipeline.sh).
# Iga LLM-samm rc=3 (mid-run krediit) → peata puhtalt (juba-tehtu salvestatud, re-run jätkab).
#
# Kasutus:  bash scripts/drain-pending.sh            # DRY (raport, EI kirjuta)
#           bash scripts/drain-pending.sh --execute  # LIVE (kirjutab + reindeks)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="${PIPELINE_ENV_FILE:-/opt/eumotors-tasks/.env}"
[ -f "$ENV_FILE" ] && { set -a; . "$ENV_FILE"; set +a; }   # ANTHROPIC_API_KEY (väärtust EI logi)
DB_NAME="$(docker ps --format '{{.Names}}' | grep '^db-k33g' | head -1 || true)"
MEDUSA_NAME="$(docker ps --format '{{.Names}}' | grep '^medusa' | head -1 || true)"
[ -n "$DB_NAME" ] || { echo "❌ db-k33g konteinerit ei leitud (docker ps)"; exit 1; }

DRY=1; [ "${1:-}" = "--execute" ] && DRY=0
EXFLAG=$([ "$DRY" = "0" ] && echo --execute || echo --dry)
MODE=$([ "$DRY" = "0" ] && echo EXECUTE || echo DRY)
echo "=== DRAIN-PENDING ($MODE) $(date -u +%FT%TZ) — db=$DB_NAME ==="

# ── KREDIIT-PROBE (ära raiska kui krediit maas) ──────────────────────────────
if [ -n "${ANTHROPIC_API_KEY:-}" ]; then
  node "$ROOT/scripts/credit-probe.mjs" && PRC=0 || PRC=$?
  case "$PRC" in
    0) echo "  💳 krediit OK → drain jätkub" ;;
    3) echo "  💳 krediit maas → drain KATKESTATUD (proovi kui makse korras)"; exit 3 ;;
    *) echo "  ⚠️ API maas (rc=$PRC — timeout/5xx) → drain KATKESTATUD"; exit 2 ;;
  esac
else
  echo "  ❌ ANTHROPIC_API_KEY puudub ($ENV_FILE)"; exit 1
fi

degrade_or_fail() { # rc samm-nimi → rc=3 peatab puhtalt (degrade), muu = fail
  local rc="$1" step="$2"
  if [ "$rc" = "3" ]; then echo "  💳 krediit sai otsa [$step] — peatan (juba-tehtu salvestatud, re-run jätkab)"; exit 3; fi
  echo "❌ drain FAIL [$step] rc=$rc"; exit 1
}

# ── [4] CLASSIFY — kogu kodutu backlog (mitte delta) ─────────────────────────
echo "[4] classify (--source unhomed, kogu backlog)"
node "$ROOT/scripts/pipeline-classify.mjs" --source unhomed $EXFLAG --out /tmp/drain-classify.json \
  || degrade_or_fail $? classify

# ── [6] SPEC — KÕIK published null-spec tooted (mitte ainult delta) ──────────
echo "[6] spec-extract (kõik null-spec)"
docker exec -i "$DB_NAME" psql -U xlmarket -d xlmarket -tA -c \
  "SELECT metadata->>'vevor_sku' FROM product WHERE deleted_at IS NULL AND status='published' AND metadata->'specs' IS NULL AND metadata->>'vevor_sku' IS NOT NULL" \
  > /tmp/drain-spec-skus.txt || true
SPEC_N=$(grep -c . /tmp/drain-spec-skus.txt || echo 0)
echo "  null-spec tooteid: $SPEC_N"
if [ "$SPEC_N" -gt 0 ]; then
  node "$ROOT/scripts/spec-extract-skus.mjs" --skus /tmp/drain-spec-skus.txt $([ "$DRY" = "0" ] || echo --dry) \
    || degrade_or_fail $? spec
else
  echo "  0 null-spec → spec vahele"
fi

# ── [6.5] SISU — kogu korpus (content-gen-run --all, hash-guard idempotent) ──
echo "[6.5] sisu-gen (content-gen-run --all, hash-guard → ainult null-hash)"
node "$ROOT/scripts/content-gen-run.mjs" --all $([ "$DRY" = "0" ] && echo --write || echo "") \
  || degrade_or_fail $? content-gen

# ── [7] REINDEX — teeb nähtavaks (ainult EXECUTE) ───────────────────────────
if [ "$DRY" = "0" ] && [ -n "$MEDUSA_NAME" ]; then
  echo "[7] reindeks Meili"
  docker exec "$MEDUSA_NAME" node scripts/index-meilisearch.mjs || echo "  ⚠️ reindeks rc!=0 — käivita käsitsi"
else
  echo "  [DRY] reindeks vahele (kirjutust polnud)"
fi
echo "=== DRAIN-PENDING DONE ($MODE) $(date -u +%FT%TZ) ==="
