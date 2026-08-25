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

# STALE-STATE PUHASTUS (re-run kindlus): iga wrapper-jooks = PUHAS submit.
#   Vana batches.json → resume-loogika re-poll'iks vanu (juba-ended) batche → uued EI esitataks.
#   DB hash-guard on TÕELINE idempotentsus: filterNeedsGen esitab AINULT puuduvad (hash=NULL).
#   Seega kustuta per-jooks checkpoint (batches.json + ndjson); LOG jääb (append, ajalugu).
#   (Mid-run protsessi-surma resume = jooksuta content-gen-run.mjs OTSE, mitte wrapperist.)
rm -f "$ROOT/reports/${LABEL}.batches.json" "$ROOT/reports/${LABEL}.ndjson"
echo "  [stale-clear] batches.json + ndjson kustutatud → puhas submit (hash-guard võtab ainult puuduvad)"

node "$ROOT/scripts/content-gen-run.mjs" --all --batch --write --chunk "$CHUNK" --out "$LABEL" 2>&1 | tee -a "$LOG"
RC=${PIPESTATUS[0]}

# Masin-loetav STATUS-rida runnerist (STATUS=OK|PARTIAL|SYSTEMIC ok=.. errored=.. ratio=..)
STATUS_LINE=$(grep -E '^STATUS=' "$LOG" | tail -1)
SUMMARY=$(grep -E 'Kulu:|DB: applied' "$LOG" | tail -2 | tr '\n' ' ')

# RC on runneri fail-loud lävi: 0=OK (errored==0) · 2=OSALINE (0<err≤50%) · 1=SÜSTEEMNE (err>50%)
# VALMIS-teade AINULT rc=0 (errored==0) — muidu EI väida "valmis".
case "$RC" in
  0)
    echo "=== DONE OK $(date -u +%FT%TZ) ==="
    notify "✅ XLM sisu-backfill VALMIS (kõik tehtud, 0 errored) $(date -u +%FT%TZ) — $STATUS_LINE · $SUMMARY"
    ;;
  2)
    echo "=== PARTIAL rc=2 $(date -u +%FT%TZ) ==="
    notify "⚠️ XLM sisu-backfill OSALINE — MITTE valmis $(date -u +%FT%TZ) — $STATUS_LINE · $SUMMARY · FIX: re-run 'bash scripts/run-content-backfill.sh' (hash-guard võtab AINULT puuduvad)"
    ;;
  *)
    echo "=== SYSTEMIC/FAIL rc=$RC $(date -u +%FT%TZ) ==="
    notify "❌ XLM sisu-backfill SÜSTEEMNE (rc=$RC) $(date -u +%FT%TZ) — ${STATUS_LINE:-'(STATUS-rida puudub — runner kukkus enne lõppu)'} · viimane: $(tail -2 "$LOG" | tr '\n' ' ') · re-run ohutu (hash-guard)"
    ;;
esac
exit "$RC"
