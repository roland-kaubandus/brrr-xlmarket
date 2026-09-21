#!/usr/bin/env bash
# run-synonym-backfill.sh — SÜNONÜÜMI TÄIS-JOOKS (backfill, Batch API) taustal + fail-loud Telegram.
#   synonym-gen-run.mjs --all --batch --write: kogu korpus, Batch API (−50%). Kirjutab AINULT DB
#   (product_synonym + synonym_review). Meili sync toimub öise [7.5] sync-synonyms kaudu PÄRAST reindeksit
#   (VÕI käsitsi: docker exec $MEDUSA node scripts/sync-synonyms.mjs). Re-run ohutu (per-product replace).
#
#   NB: jooksuta ALLES PÄRAST pilot-kinnitust (Tarmo). Enne: node scripts/synonym-gen-run.mjs --pilot 500 --write
set -uo pipefail
ROOT="/opt/xlmarket-github"
NOTIFY="$ROOT/scripts/lib/notify-telegram.sh"
LABEL="synonym-backfill-$(date -u +%Y%m%d)"
LOG="$ROOT/reports/${LABEL}.log"
CHUNK="${CHUNK:-10}"

set -a; . /opt/eumotors-tasks/.env; set +a   # ANTHROPIC_API_KEY (väärtust EI logi)
[ -z "${ANTHROPIC_API_KEY:-}" ] && { echo "❌ ANTHROPIC_API_KEY puudub"; [ -x "$NOTIFY" ] && "$NOTIFY" "❌ XLM sünonüümi-backfill: ANTHROPIC_API_KEY puudub — EI käivitunud"; exit 1; }

notify() { [ -x "$NOTIFY" ] && "$NOTIFY" "$1" >/dev/null 2>&1 || true; }

notify "🚀 XLM sünonüümi-backfill START (Batch API, ~18.7k toodet, chunk $CHUNK) $(date -u +%FT%TZ)"
echo "=== SÜNONÜÜMI-BACKFILL START $(date -u +%FT%TZ) ==="

node "$ROOT/scripts/synonym-gen-run.mjs" --all --batch --write --chunk "$CHUNK" --out "$ROOT/reports/${LABEL}.json" 2>&1 | tee -a "$LOG"
RC=${PIPESTATUS[0]}

STATUS_LINE=$(grep -E '^STATUS=' "$LOG" | tail -1)
SUMMARY=$(grep -E 'DB: auto=|LLM tulemusi' "$LOG" | tail -2 | tr '\n' ' ')

case "$RC" in
  0)
    echo "=== DONE OK $(date -u +%FT%TZ) ==="
    notify "✅ XLM sünonüümi-backfill VALMIS (0 errored) $(date -u +%FT%TZ) — $STATUS_LINE · $SUMMARY · JÄRGMINE: Meili sync toimub öise [7.5] kaudu (või käsitsi docker exec \$MEDUSA node scripts/sync-synonyms.mjs)" ;;
  2)
    echo "=== PARTIAL rc=2 $(date -u +%FT%TZ) ==="
    notify "⚠️ XLM sünonüümi-backfill OSALINE — MITTE valmis $(date -u +%FT%TZ) — $STATUS_LINE · $SUMMARY · FIX: re-run 'bash scripts/run-synonym-backfill.sh' (per-product replace, ohutu)" ;;
  *)
    echo "=== SYSTEMIC/FAIL rc=$RC $(date -u +%FT%TZ) ==="
    notify "❌ XLM sünonüümi-backfill SÜSTEEMNE (rc=$RC) $(date -u +%FT%TZ) — ${STATUS_LINE:-'(STATUS-rida puudub)'} · viimane: $(tail -2 "$LOG" | tr '\n' ' ') · re-run ohutu" ;;
esac
exit "$RC"
