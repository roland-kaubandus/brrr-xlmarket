#!/usr/bin/env bash
# notify-telegram.sh — saada teade Telegram'i (fail-loud + digest push).
#
# Kasutab SAMA botti/chatti mis Uptime Kuma dead-man's-switch backup-monitor:
#   TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID /opt/eumotors-tasks/.env (source'itakse enne).
#   Väärtusi EI logita. Kui võtmed puuduvad → vaikselt vahele (exit 0), EI kukuta kutsujat.
#
# Kasutus:  notify-telegram.sh "sõnum"        (või stdin: echo "..." | notify-telegram.sh)
set -uo pipefail
: "${TELEGRAM_BOT_TOKEN:=}"
: "${TELEGRAM_CHAT_ID:=}"
if [ -z "$TELEGRAM_BOT_TOKEN" ] || [ -z "$TELEGRAM_CHAT_ID" ]; then
  echo "notify-telegram: TELEGRAM_BOT_TOKEN/CHAT_ID puudub — teade vahele" >&2
  exit 0
fi
MSG="${1:-$(cat)}"
# JSON-payload node'iga (escapib reavahetused/jutumärgid ohutult)
PAYLOAD="$(MSG="$MSG" node -e 'process.stdout.write(JSON.stringify({chat_id:process.env.TELEGRAM_CHAT_ID,text:process.env.MSG,disable_web_page_preview:true}))')"
wget -qO- --header="content-type: application/json" --post-data="$PAYLOAD" \
  "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" >/dev/null 2>&1 \
  || { echo "notify-telegram: saatmine nurjus" >&2; exit 1; }
