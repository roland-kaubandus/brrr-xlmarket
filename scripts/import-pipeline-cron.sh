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
