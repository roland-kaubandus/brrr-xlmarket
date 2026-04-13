#!/bin/bash
# storefront-healthcheck.sh — auto-restart Next.js if it hangs
# Cron: */2 * * * * /home/brrr/brrr-xlmarket/scripts/storefront-healthcheck.sh >> /tmp/xlmarket-healthcheck.log 2>&1

PORT=3030
STOREFRONT_DIR="/home/brrr/brrr-xlmarket/storefront"
LOG="/tmp/xlmarket-storefront.log"
MAX_RETRIES=2

check_health() {
    curl -s -o /dev/null -w "%{http_code}" --max-time 5 "http://localhost:${PORT}/en" 2>/dev/null
}

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Healthcheck starting..."

# Check if port is listening at all
if ! fuser ${PORT}/tcp >/dev/null 2>&1; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Port ${PORT} not listening — starting storefront"
    cd "$STOREFRONT_DIR"
    NODE_ENV=production nohup node node_modules/.bin/next start -p ${PORT} > "$LOG" 2>&1 &
    sleep 5
    STATUS=$(check_health)
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Started, health: HTTP ${STATUS}"
    exit 0
fi

# Port is listening — check if it responds
STATUS=$(check_health)

if [ "$STATUS" = "200" ] || [ "$STATUS" = "307" ] || [ "$STATUS" = "301" ]; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] OK (HTTP ${STATUS})"
    exit 0
fi

echo "[$(date '+%Y-%m-%d %H:%M:%S')] UNHEALTHY (HTTP ${STATUS}) — retrying..."

# Retry before killing
for i in $(seq 1 $MAX_RETRIES); do
    sleep 3
    STATUS=$(check_health)
    if [ "$STATUS" = "200" ] || [ "$STATUS" = "307" ] || [ "$STATUS" = "301" ]; then
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] Retry $i OK (HTTP ${STATUS})"
        exit 0
    fi
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Retry $i failed (HTTP ${STATUS})"
done

# Still unhealthy — restart
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Restarting storefront..."
fuser -k ${PORT}/tcp 2>/dev/null
sleep 2

# Clear stale fetch cache
find "${STOREFRONT_DIR}/.next/cache/fetch-cache" -type f -delete 2>/dev/null

cd "$STOREFRONT_DIR"
NODE_ENV=production nohup node node_modules/.bin/next start -p ${PORT} > "$LOG" 2>&1 &
sleep 5

STATUS=$(check_health)
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Restarted, health: HTTP ${STATUS}"
