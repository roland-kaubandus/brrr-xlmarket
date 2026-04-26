#!/usr/bin/env bash
# Claude CLI fleet — runs IN PARALLEL with Codex fleet. Separate quota pool.
#
# Default: 2 workers × 3 parallel = 6 concurrent `claude -p` spawns.
# (Lower than Codex's 3×3=9 because `claude -p` CLI spawn cost is a bit higher
# and we want to leave room for interactive Claude usage.)
#
# Usage: bash src/scripts/run-claude-fleet.sh [STOP_AT=20:00] [MODEL=sonnet] [WORKER_COUNT=2]
set -u

cd "$(dirname "$0")/../.."
PROJECT_ROOT="$(cd ../ && pwd)"

STOP_AT="${1:-20:00}"
MODEL="${2:-sonnet}"
WORKER_COUNT="${3:-2}"
PARALLEL_PER_WORKER="${4:-3}"

LOG_DIR="$(pwd)/data/translation-batches"
mkdir -p "$LOG_DIR"
FLEET_LOG="$LOG_DIR/claude-fleet.log"
CLAUDE_LIMIT_FLAG="$LOG_DIR/.claude-limit-reached"

log() {
  local msg="[$(date -Is)] [CLAUDE-FLEET] $*"
  printf '%s\n' "$msg" >>"$FLEET_LOG"
  printf '%s\n' "$msg" >&2
}

if [ -f "$PROJECT_ROOT/.env" ]; then
  set -a
  # shellcheck disable=SC1091
  source "$PROJECT_ROOT/.env"
  set +a
fi

if [ -z "${PGPASSWORD:-}" ]; then
  log "FATAL: PGPASSWORD not set"
  exit 1
fi
export PGPASSWORD

rm -f "$CLAUDE_LIMIT_FLAG" 2>/dev/null

log "START claude-fleet: $WORKER_COUNT workers model=$MODEL fallback=haiku stop-at=$STOP_AT"
log "Uses Claude Max subscription (separate quota from Codex). Runs in parallel with Codex fleet."

PIDS=()

start_worker() {
  local id=$1
  node src/scripts/translate-worker-claude.mjs \
    --worker-id "$id" --worker-count "$WORKER_COUNT" \
    --parallel "$PARALLEL_PER_WORKER" --model "$MODEL" --fallback-model haiku \
    --stop-at "$STOP_AT" \
    >> "$LOG_DIR/worker-claude-$id.stdout" 2>&1 &
  local pid=$!
  log "claude-worker-$id started PID=$pid"
  printf '%s' "$pid"
}

for ((i=0; i<WORKER_COUNT; i++)); do
  PIDS+=("$(start_worker "$i")")
  sleep 2
done

log "fleet PIDs: ${PIDS[*]}"

cleanup() {
  log "SIGNAL received, killing fleet"
  for p in "${PIDS[@]}"; do kill "$p" 2>/dev/null || true; done
  exit 0
}
trap cleanup INT TERM

FLEET_START_EPOCH=$(date +%s)
FLEET_START_TRANSLATED=$(docker exec xlmarket-db psql -U xlmarket -d xlmarket -tAc \
  "SELECT COUNT(*) FROM product WHERE metadata->>'title_et' IS NOT NULL AND metadata->>'title_et' <> '' AND deleted_at IS NULL" 2>/dev/null)
log "baseline translated=$FLEET_START_TRANSLATED"

while true; do
  NOW_HM=$(date +%H:%M)
  if [[ "$NOW_HM" > "$STOP_AT" ]]; then
    log "time $NOW_HM > $STOP_AT, shutting down"
    break
  fi

  if [ -f "$CLAUDE_LIMIT_FLAG" ]; then
    log "claude limit flag detected — waiting 90s for workers to exit"
    sleep 90
    for p in "${PIDS[@]}"; do kill "$p" 2>/dev/null || true; done
    break
  fi

  ALIVE=0
  for ((i=0; i<WORKER_COUNT; i++)); do
    PID="${PIDS[$i]}"
    if kill -0 "$PID" 2>/dev/null; then
      ALIVE=$((ALIVE + 1))
    else
      if [ ! -f "$CLAUDE_LIMIT_FLAG" ]; then
        log "claude-worker-$i PID=$PID died, restarting"
        PIDS[$i]="$(start_worker "$i")"
        ALIVE=$((ALIVE + 1))
      fi
    fi
  done

  COUNT=$(docker exec xlmarket-db psql -U xlmarket -d xlmarket -tAc \
    "SELECT COUNT(*) FROM product WHERE metadata->>'title_et' IS NOT NULL AND metadata->>'title_et' <> '' AND deleted_at IS NULL" 2>/dev/null)
  log "watchdog alive-workers=$ALIVE translated=$COUNT delta=$((COUNT - FLEET_START_TRANSLATED))"
  sleep 60
done

cleanup
