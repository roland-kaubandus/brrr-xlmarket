#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="/home/brrr/brrr-xlmarket"
STOREFRONT_DIR="$ROOT_DIR/storefront"
LOG_DIR="/home/brrr/logs"
LOG_FILE="$LOG_DIR/xlmarket-storefront.log"
PID_FILE="$LOG_DIR/xlmarket-storefront.pid"
BRANCH="${1:-main}"

echo "== XL Market storefront host deploy =="
echo "Repo: $ROOT_DIR"
echo "Branch: $BRANCH"

mkdir -p "$LOG_DIR"

cd "$ROOT_DIR"
git fetch origin "$BRANCH"
git checkout "$BRANCH"
git pull --ff-only origin "$BRANCH"

cd "$STOREFRONT_DIR"
echo "Building storefront..."
npm run build

echo "Stopping previous storefront process on port 3030..."
pkill -f "next start -p 3030" 2>/dev/null || true
pkill -f "next-server .*3030" 2>/dev/null || true
pkill -f "npm exec next start -p 3030" 2>/dev/null || true
sleep 2

echo "Starting storefront..."
nohup npm run start >"$LOG_FILE" 2>&1 < /dev/null &
START_PID=$!
echo "$START_PID" > "$PID_FILE"

sleep 4

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

echo "Storefront is live."
echo "PID: $START_PID"
echo "HTTP status: $HTTP_STATUS"
