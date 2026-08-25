#!/usr/bin/env bash
# run-content-backfill.sh — SISU-GEN TÄIS-JOOKS (backfill, Batch API) taustal + fail-loud Telegram.
#   content-gen-run.mjs --all --batch --write: kogu korpus, osade kaupa (chunk 2000),
#   iga chunk DB-sse KOHE (backup + hash-guard). Katkeb → juba-tehtu püsib, re-run ohutu.
set -uo pipefail
ROOT="/opt/xlmarket-github"
NOTIFY="$ROOT/scripts/lib/notify-telegram.sh"
LABEL="content-backfill-20260825"
LOG="$ROOT/reports/${LABEL}.log"
CHUNK="${CHUNK:-2000}"

set -a; . /opt/eumotors-tasks/.env; set +a   # ANTHROPIC_API_KEY (väärtust EI logi)
[ -z "${ANTHROPIC_API_KEY:-}" ] && { echo "❌ ANTHROPIC_API_KEY puudub"; [ -x "$NOTIFY" ] && "$NOTIFY" "❌ XLM sisu-backfill: ANTHROPIC_API_KEY puudub — EI käivitunud"; exit 1; }

notify() { [ -x "$NOTIFY" ] && "$NOTIFY" "$1" >/dev/null 2>&1 || true; }

notify "🚀 XLM sisu-backfill START (Batch API, ~18.7k toodet, chunk $CHUNK) $(date -u +%FT%TZ)"
echo "=== SISU-BACKFILL START $(date -u +%FT%TZ) ==="

node "$ROOT/scripts/content-gen-run.mjs" --all --batch --write --chunk "$CHUNK" --out "$LABEL" 2>&1 | tee -a "$LOG"
RC=${PIPESTATUS[0]}

SUMMARY=$(grep -E '✅ VALMIS|Kulu:|DB: applied' "$LOG" | tail -3 | tr '\n' ' ')
if [ "$RC" -eq 0 ]; then
  echo "=== DONE OK $(date -u +%FT%TZ) ==="
  notify "✅ XLM sisu-backfill VALMIS $(date -u +%FT%TZ) — $SUMMARY"
else
  echo "=== FAIL rc=$RC $(date -u +%FT%TZ) ==="
  notify "❌ XLM sisu-backfill FAIL (rc=$RC) $(date -u +%FT%TZ) — viimane: $(tail -2 "$LOG" | tr '\n' ' ') · re-run ohutu (hash-guard)"
fi
exit "$RC"
