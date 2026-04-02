#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="/home/brrr/brrr-xlmarket"
STOREFRONT_DIR="$ROOT_DIR/storefront"
FEED_CACHE_SCRIPT="$ROOT_DIR/backend/scripts/build-vevor-feed-cache.mjs"
LOG_DIR="/home/brrr/logs"
LOG_FILE="$LOG_DIR/xlmarket-storefront.log"
PID_FILE="$LOG_DIR/xlmarket-storefront.pid"
BRANCH="${1:-main}"

find_listener_pids() {
  ss -ltnp 2>/dev/null \
    | awk '/:3030 / { if (match($0, /pid=[0-9]+/)) { print substr($0, RSTART + 4, RLENGTH - 4) } }' \
    | sort -u
}

echo "== XL Market storefront host deploy =="
echo "Repo: $ROOT_DIR"
echo "Branch: $BRANCH"

mkdir -p "$LOG_DIR"

cd "$ROOT_DIR"
git fetch origin "$BRANCH"
git checkout "$BRANCH"
git pull --ff-only origin "$BRANCH"

if [[ -f "$FEED_CACHE_SCRIPT" ]]; then
  echo "Refreshing VEVOR feed cache..."
  node "$FEED_CACHE_SCRIPT"
fi

cd "$STOREFRONT_DIR"
echo "Building storefront..."
npm run build

echo "Stopping previous storefront process on port 3030..."
EXISTING_PIDS="$(find_listener_pids || true)"
if [[ -n "$EXISTING_PIDS" ]]; then
  echo "$EXISTING_PIDS" | xargs -r kill || true
  sleep 2
fi

STILL_RUNNING="$(find_listener_pids || true)"
if [[ -n "$STILL_RUNNING" ]]; then
  echo "Force stopping lingering storefront processes: $STILL_RUNNING"
  echo "$STILL_RUNNING" | xargs -r kill -9 || true
  sleep 1
fi

if [[ -f "$PID_FILE" ]]; then
  OLD_PID="$(cat "$PID_FILE" 2>/dev/null || true)"
  if [[ -n "${OLD_PID:-}" ]] && kill -0 "$OLD_PID" 2>/dev/null; then
    kill "$OLD_PID" 2>/dev/null || true
    sleep 1
  fi
fi

echo "Starting storefront..."
nohup ./node_modules/.bin/next start -p 3030 >"$LOG_FILE" 2>&1 < /dev/null &
START_PID=$!
echo "$START_PID" > "$PID_FILE"

sleep 4

if ! kill -0 "$START_PID" 2>/dev/null; then
  echo "Storefront process exited unexpectedly"
  tail -n 60 "$LOG_FILE" || true
  exit 1
fi

if ! ss -ltnp | grep -q ":3030"; then
  echo "Storefront failed to start on port 3030"
  tail -n 60 "$LOG_FILE" || true
  exit 1
fi

HTTP_STATUS="$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3030/et || true)"
if [[ "$HTTP_STATUS" != "200" && "$HTTP_STATUS" != "307" ]]; then
  echo "Health check failed with status: $HTTP_STATUS"
  tail -n 60 "$LOG_FILE" || true
  exit 1
fi

ACTIVE_PID="$(find_listener_pids | head -n 1)"
if [[ -n "$ACTIVE_PID" ]]; then
  echo "$ACTIVE_PID" > "$PID_FILE"
fi

echo "Storefront is live."
echo "PID: ${ACTIVE_PID:-$START_PID}"
echo "HTTP status: $HTTP_STATUS"
