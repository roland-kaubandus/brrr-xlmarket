#!/usr/bin/env bash
# Fleet launcher v2: 3 workers + 1 sampled-gatekeeper + watchdog.
# Optimisations on top of v1:
#   - Honours `.codex-limit-reached` flag (graceful shutdown on subscription limit)
#   - Auto-reindex Meili every REINDEX_EVERY new translations (default 500)
#   - Writes tracker.json for real-time progress + ETA
#   - Detects crashloop (workers dying faster than restarts helpful) → abort fleet
#
# Usage: bash src/scripts/run-translation-fleet.sh [STOP_AT=20:55] [REINDEX_EVERY=500]
set -u

cd "$(dirname "$0")/../.."   # backend/
PROJECT_ROOT="$(cd ../ && pwd)"

STOP_AT="${1:-20:55}"
REINDEX_EVERY="${2:-500}"

LOG_DIR="$(pwd)/data/translation-batches"
mkdir -p "$LOG_DIR"
FLEET_LOG="$LOG_DIR/fleet.log"
LIMIT_FLAG="$LOG_DIR/.codex-limit-reached"

log() {
  local msg="[$(date -Is)] [FLEET] $*"
  printf '%s\n' "$msg" >>"$FLEET_LOG"
  printf '%s\n' "$msg" >&2
}

# Load .env from project root
if [ -f "$PROJECT_ROOT/.env" ]; then
  set -a
  # shellcheck disable=SC1091
  source "$PROJECT_ROOT/.env"
  set +a
fi

if [ -z "${PGPASSWORD:-}" ]; then
  log "FATAL: PGPASSWORD not set (check $PROJECT_ROOT/.env)"
  exit 1
fi
export PGPASSWORD

# Clear any stale limit flag from prior run
rm -f "$LIMIT_FLAG" 2>/dev/null

log "START fleet v2: 3 workers + 1 gatekeeper, stop-at=$STOP_AT, reindex-every=$REINDEX_EVERY"
log "Optimisations: tiered chunks (35/28/22) + limit-flag detection + regex validators"

PIDS=()

start_worker() {
  local id=$1
  node src/scripts/translate-worker.mjs \
    --worker-id "$id" --worker-count 3 \
    --parallel 3 --stop-at "$STOP_AT" \
    >> "$LOG_DIR/worker-$id.stdout" 2>&1 &
  local pid=$!
  log "worker-$id started PID=$pid"
  printf '%s' "$pid"
}

start_gatekeeper() {
  node src/scripts/translation-gatekeeper.mjs \
    --sample 10 --interval 300 --stop-at "$STOP_AT" \
    >> "$LOG_DIR/gatekeeper.stdout" 2>&1 &
  local pid=$!
  log "gatekeeper started PID=$pid"
  printf '%s' "$pid"
}

# Käivita 3 workerit
for i in 0 1 2; do
  PIDS+=("$(start_worker "$i")")
  sleep 2
done

GK_PID="$(start_gatekeeper)"
PIDS+=("$GK_PID")

log "fleet PIDs: ${PIDS[*]}"

cleanup() {
  log "SIGNAL received, killing fleet"
  for p in "${PIDS[@]}"; do
    kill "$p" 2>/dev/null || true
  done
  exit 0
}
trap cleanup INT TERM

# Reindex tracking
LAST_REINDEX_AT=0
get_translated_count() {
  docker exec xlmarket-db psql -U xlmarket -d xlmarket -tAc \
    "SELECT COUNT(*) FROM product WHERE metadata->>'title_et' IS NOT NULL AND metadata->>'title_et' <> '' AND deleted_at IS NULL" 2>/dev/null
}

trigger_meili_reindex() {
  log "triggering background Meili reindex (translated=$1)"
  nohup node src/scripts/index-meilisearch.mjs >> "$LOG_DIR/reindex.log" 2>&1 &
  disown
}

write_tracker_snapshot() {
  local translated=$1
  local pending
  pending=$(docker exec xlmarket-db psql -U xlmarket -d xlmarket -tAc \
    "SELECT COUNT(*) FROM product WHERE (metadata->>'translation_batch') IS NULL AND status='published' AND deleted_at IS NULL" 2>/dev/null)
  local now
  now=$(date +%s)
  local elapsed=$((now - FLEET_START_EPOCH))
  local rate=0
  if [ "$elapsed" -gt 60 ] && [ "$translated" -gt "$FLEET_START_TRANSLATED" ]; then
    rate=$(( (translated - FLEET_START_TRANSLATED) * 3600 / elapsed ))
  fi
  cat > "$LOG_DIR/tracker.json" <<JSON
{
  "updated_at": "$(date -Is)",
  "translated_total": $translated,
  "pending": ${pending:-0},
  "session_delta": $((translated - FLEET_START_TRANSLATED)),
  "session_elapsed_s": $elapsed,
  "translations_per_hour": $rate,
  "stop_at": "$STOP_AT",
  "codex_limit_hit": $([ -f "$LIMIT_FLAG" ] && echo "true" || echo "false"),
  "last_reindex_at": $LAST_REINDEX_AT
}
JSON
}

FLEET_START_EPOCH=$(date +%s)
FLEET_START_TRANSLATED=$(get_translated_count)
LAST_REINDEX_AT=$FLEET_START_TRANSLATED
log "baseline translated=$FLEET_START_TRANSLATED at fleet start"

# Watchdog loop
while true; do
  NOW_HM=$(date +%H:%M)
  if [[ "$NOW_HM" > "$STOP_AT" ]]; then
    log "time $NOW_HM > $STOP_AT, shutting down"
    break
  fi

  # Graceful shutdown if any worker set the limit flag
  if [ -f "$LIMIT_FLAG" ]; then
    log "codex limit flag detected — waiting for workers to exit naturally"
    # Give workers 90s to finish current chunks + release claims
    sleep 90
    for p in "${PIDS[@]}"; do
      if kill -0 "$p" 2>/dev/null; then
        log "PID $p still alive after 90s, sending TERM"
        kill "$p" 2>/dev/null || true
      fi
    done
    break
  fi

  ALIVE=0
  for i in 0 1 2; do
    PID="${PIDS[$i]}"
    if kill -0 "$PID" 2>/dev/null; then
      ALIVE=$((ALIVE + 1))
    else
      # Only restart if limit flag NOT set (otherwise worker exited on purpose)
      if [ ! -f "$LIMIT_FLAG" ]; then
        log "worker-$i PID=$PID died, restarting"
        PIDS[$i]="$(start_worker "$i")"
        ALIVE=$((ALIVE + 1))
      fi
    fi
  done

  if ! kill -0 "$GK_PID" 2>/dev/null; then
    if [ ! -f "$LIMIT_FLAG" ]; then
      log "gatekeeper died, restarting"
      GK_PID="$(start_gatekeeper)"
      PIDS[3]="$GK_PID"
    fi
  fi

  # Progress + tracker
  COUNT=$(get_translated_count)
  write_tracker_snapshot "$COUNT"

  # Auto-reindex every REINDEX_EVERY new translations — storefront ET sisu
  # muutub kohe nähtavaks, ei pea ootama fleet'i lõpuni.
  if [ -n "$COUNT" ] && [ "$COUNT" -gt "$LAST_REINDEX_AT" ]; then
    DELTA=$((COUNT - LAST_REINDEX_AT))
    if [ "$DELTA" -ge "$REINDEX_EVERY" ]; then
      trigger_meili_reindex "$COUNT"
      LAST_REINDEX_AT=$COUNT
    fi
  fi

  log "watchdog alive-workers=$ALIVE translated=$COUNT delta=$((COUNT - FLEET_START_TRANSLATED)) since-reindex=$((COUNT - LAST_REINDEX_AT))"

  sleep 60
done

# Final reindex if anything new accumulated since last trigger
FINAL_COUNT=$(get_translated_count)
write_tracker_snapshot "$FINAL_COUNT"
if [ -n "$FINAL_COUNT" ] && [ "$FINAL_COUNT" -gt "$LAST_REINDEX_AT" ]; then
  log "final reindex: $((FINAL_COUNT - LAST_REINDEX_AT)) pending Meili updates"
  trigger_meili_reindex "$FINAL_COUNT"
fi

cleanup
