#!/usr/bin/env bash
# import-pipeline-cron.sh — CRON-mähis import-pipeline.sh ümber (HOST k33g, 1×/öö ~03:00).
#
# MIKS HOST-CRON (mitte Coolify Scheduled Task, erinevalt refresh-feed-cache.sh-st):
#   import-pipeline.sh sammud [3][4][5][6] vajavad (a) ANTHROPIC_API_KEY — ainult hostil
#   /opt/eumotors-tasks/.env, (b) `docker exec` sibling-konteineritesse (db-k33g + medusa),
#   (c) host-skripte pipeline-classify/reprice/spec — pole image'isse baked. Seega ta EI SAA
#   joosta konteineri-natiivselt. refresh-feed-cache.sh (4h stock/reindeks) JÄÄB Coolify
#   Scheduled Task'iks — see wrapper on AINULT öine täis-import-ahel (mis muu hulgas jooksutab
#   refresh-feed-cache.sh uuesti oma sammuna [1]).
#
# LISAB cron-vajadused import-pipeline.sh peale (mis ise juba fail-loud + Slack + review-digest):
#   - PATH        cron minimaalne env → node/docker vajavad täisteed
#   - flock       kaks jooksu ei kattu, kui eelmine venib
#   - per-jooks logi + `-latest.log` süm-link + masinloetav STATUS-rida (HOMMIKUNE ülevaatus)
#
# HOMMIKUNE ÜLEVAATUS (Tarmo, esimesed ~3 jooksu):
#   cat /var/log/xlm/STATUS                          # result=OK/FAIL · new_skus · review_waiting
#   tail -40 /var/log/xlm/import-pipeline-latest.log  # viimase jooksu täis-väljund
#   node /opt/xlmarket-github/scripts/pipeline-review-digest.mjs   # ELUS review-bucket (klastrid)
set -uo pipefail
export PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="${PIPELINE_ENV_FILE:-/opt/eumotors-tasks/.env}"

# SOURCE-KINDEL võtme-lugemine .env-ist (grep|cut, EI source'i). KRIITILINE: 2026-09-17..19
# suri pipeline 3 ööd VAIKSELT, sest tõrge oli `source .env`-is (Sanctum-toru + `>` prügiread)
# ENNE kui pipeline sai alerti saata. See wrapper PEAB saama alertida ka siis, kui .env source
# katki — seega loeme TELEGRAM-võtmed robustselt (jutumärgid maha), MITTE `source`-iga.
env_get() { grep -E "^$1=" "$ENV_FILE" 2>/dev/null | tail -1 | cut -d= -f2- \
  | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'\$//"; }

# Iseseisev Telegram-alert (ei sõltu import-pipeline.sh sisemisest fail-loud'ist ega source'ist).
tg_alert() {
  local token chat msg payload
  token="$(env_get TELEGRAM_BOT_TOKEN)"; chat="$(env_get TELEGRAM_CHAT_ID)"
  [ -n "$token" ] && [ -n "$chat" ] || { echo "tg_alert: TELEGRAM-võti puudub ($ENV_FILE)" >&2; return 0; }
  msg="$1"
  payload="$(MSG="$msg" CHAT="$chat" node -e 'process.stdout.write(JSON.stringify({chat_id:process.env.CHAT,text:process.env.MSG,disable_web_page_preview:true}))' 2>/dev/null)" || return 0
  wget -qO- --header="content-type: application/json" --post-data="$payload" \
    "https://api.telegram.org/bot${token}/sendMessage" >/dev/null 2>&1 \
    || echo "tg_alert: Telegram saatmine nurjus" >&2
}

LOGDIR="${XLM_PIPELINE_LOGDIR:-/var/log/xlm}"
mkdir -p "$LOGDIR"
TS="$(date +%Y%m%dT%H%M%S)"
LOG="$LOGDIR/import-pipeline-$TS.log"
ln -sfn "$LOG" "$LOGDIR/import-pipeline-latest.log"

# flock — kui eelmine jooks veel käib, jäta VAHELE (ei kattu, ei topelt-impordi)
exec 9>"$LOGDIR/import-pipeline.lock"
if ! flock -n 9; then
  echo "$(date -u +%FT%TZ) SKIP: eelmine import-pipeline jookseb veel" | tee -a "$LOG"
  exit 0
fi

echo "=== CRON import-pipeline START $(date -u +%FT%TZ) (host $(date '+%Z %F %T')) ===" | tee -a "$LOG"
bash "$ROOT/scripts/import-pipeline.sh" --execute >>"$LOG" 2>&1
RC=$?
echo "=== CRON import-pipeline END rc=$RC $(date -u +%FT%TZ) ===" | tee -a "$LOG"

# 🔴 ISESEISEV FAIL-LOUD (wrapper-tasand): saada Telegram rc!=0 puhul SÕLTUMATA sellest,
# kas pipeline jõudis oma sisemise alertini. Katab env-source-aegse tõrke (see, mis vaigistas
# 17.-19. sept). Loeb võtmed grep|cut'iga → katkine .env EI vaigista seda alerti.
if [ "$RC" -ne 0 ]; then
  TAIL="$(grep -vE '^\s*$' "$LOG" | tail -4 | sed 's/[[:cntrl:]]//g')"
  tg_alert "🔴 XLM öine import-pipeline KUKKUS (rc=$RC) $(date -u +%FT%TZ)
Host: $(hostname) · CEST $(date '+%F %T')
Viimased read:
$TAIL
Logi: $LOG"
fi

# Masinloetav STATUS (hommikune ülevaatus ilma logi lehitsemata)
NEW_SKUS="$(grep 'UUSI' "$LOG" | tail -1 | grep -oE '[0-9]+$' || true)"
CREATED_N="$(grep -oE 'CREATED=[0-9]+' "$LOG" | tail -1 | grep -oE '[0-9]+' || true)"   # tegelik loodud (pärast DUP-väravat)
SKIPPED_N="$(grep -oE 'SKIPPED_DUP=[0-9]+' "$LOG" | tail -1 | grep -oE '[0-9]+' || true)" # VEVOR-reformaadid skibitud
REVIEW_N="$(grep 'REVIEW-BUCKET' "$LOG" | grep -oE '— [0-9]+' | grep -oE '[0-9]+' | tail -1 || true)"
{
  echo "last_run_utc=$(date -u +%FT%TZ)"
  echo "rc=$RC"
  echo "result=$([ "$RC" -eq 0 ] && echo OK || echo FAIL)"
  echo "new_candidates=${NEW_SKUS:-?}"   # feed∖DB (dedup-eelne)
  echo "created=${CREATED_N:-?}"          # päris uued draftid loodud
  echo "dup_skipped=${SKIPPED_N:-?}"      # barcode/inventory reformaadid vahele
  echo "review_waiting=${REVIEW_N:-?}"
  echo "log=$LOG"
} >"$LOGDIR/STATUS"

# Logi-pügamine: hoia viimased 30 jooksu
ls -1t "$LOGDIR"/import-pipeline-2*.log 2>/dev/null | tail -n +31 | xargs -r rm -f
exit "$RC"
