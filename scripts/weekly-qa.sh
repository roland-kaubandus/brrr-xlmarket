#!/usr/bin/env bash
# weekly-qa.sh — NÄDALANE QA (HOST k33g, 1×/näd). REPORT-ONLY: EI teosta ühtegi
# struktuurimuudatust ega DB-kirjutust (v.a oma baseline-fail + logi). Turvaline
# vaikeväärtus (HARD RULE #6): surfab väravatega kandidaadid Tarmole, ei auto-rakenda.
#
# OSAD:
#   [1] SCATTER-DELTA — family-scatter-detect.mjs --json vs eelmise nädala baseline.
#       Uued/muutunud pere-scatterid = taksonoomia-triiv (uued feed-tooted valesti laiali).
#   [2] OTSINGU-SMOKE — võtme-päringud live Meili vastu (sh KIHT 1 regressioon: soojendi
#       peab leidma diiselsoojendeid). Lävi-põhine PASS/FAIL (fikseeritud numbriteta: suhteline).
#   [3] LEHE-SMOKE — Playwright homepage + otsingu-leht (kui brauser saadaval; muidu SKIP, ei FAIL).
#   [4] A2/A4 SEIS — pending scatter-perede arv (report-only; gated-execute ootab Tarmo OK-d).
#   [5] TELEGRAM kokkuvõte (fail-loud) + STATUS-rida + per-jooks logi.
#
# MUSTER: import-pipeline-cron.sh (PATH, flock, robustne Telegram ilma `source`-ita, STATUS).
# EI VÕTA stack-lukku (read-only; HARD RULE #9 lukk on ainult DB-write/deploy jaoks).
set -uo pipefail
export PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="${PIPELINE_ENV_FILE:-/opt/eumotors-tasks/.env}"
LOGDIR="/var/log/xlm"
BASEDIR="$ROOT/reports/qa-baseline"
STAMP="$(date +%Y%m%dT%H%M%S)"
mkdir -p "$LOGDIR" "$BASEDIR" 2>/dev/null || true
LOG="$LOGDIR/weekly-qa-$STAMP.log"
ln -sf "$LOG" "$LOGDIR/weekly-qa-latest.log" 2>/dev/null || true
exec > >(tee -a "$LOG") 2>&1

echo "=== weekly-qa $STAMP ==="

# --- robustne Telegram (grep|cut, EI source'i — .env toru-tõrge ei tohi alerti tappa) ---
TG_TOKEN="$(grep -E '^TELEGRAM_BOT_TOKEN=' "$ENV_FILE" 2>/dev/null | head -1 | cut -d= -f2- | tr -d '"'"'"' ')"
TG_CHAT="$(grep -E '^TELEGRAM_CHAT_ID=' "$ENV_FILE" 2>/dev/null | head -1 | cut -d= -f2- | tr -d '"'"'"' ')"
tg() {
  [ -n "$TG_TOKEN" ] && [ -n "$TG_CHAT" ] || { echo "  [tg] token/chat puudub — vahele"; return 0; }
  curl -s -m 20 -X POST "https://api.telegram.org/bot$TG_TOKEN/sendMessage" \
    --data-urlencode "chat_id=$TG_CHAT" --data-urlencode "text=$1" -o /dev/null || echo "  [tg] saatmine ebaõnnestus"
}

# --- flock: kaks jooksu ei kattu ---
LOCK="$LOGDIR/weekly-qa.lock"
exec 9>"$LOCK"
if ! flock -n 9; then echo "eelmine weekly-qa veel jookseb — katkestan"; exit 0; fi

FAILS=()
MED="$(docker ps --format '{{.Names}}' | grep -E '^medusa-k33g' | grep -v worker | head -1)"
[ -n "$MED" ] || { echo "❌ medusa-k33g konteiner puudub"; tg "🔴 weekly-qa: medusa konteiner puudub — QA ei jooksnud"; exit 1; }

# ============ [1] SCATTER-DELTA ============
echo "--- [1] scatter-delta ---"
SC_NOW="$BASEDIR/scatter-$STAMP.json"
SC_BASE="$BASEDIR/scatter-baseline.json"
SCATTER_MSG="scatter: ?"
if node "$ROOT/scripts/family-scatter-detect.mjs" --json > "$SC_NOW" 2>>"$LOG"; then
  N_NOW=$(node -e "try{const d=require('$SC_NOW');console.log((d.scatters||[]).length)}catch(e){console.log('ERR')}")
  if [ -f "$SC_BASE" ]; then
    DELTA=$(node -e "
      const a=require('$SC_BASE').scatters||[], b=require('$SC_NOW').scatters||[];
      const key=s=>(s.family||s.key||JSON.stringify(s.members||s));
      const A=new Set(a.map(key)), B=new Set(b.map(key));
      const added=[...B].filter(x=>!A.has(x)), removed=[...A].filter(x=>!B.has(x));
      console.log(JSON.stringify({added:added.length,removed:removed.length,addedKeys:added.slice(0,8)}));
    " 2>>"$LOG" || echo '{\"added\":\"ERR\"}')
    echo "  baseline vs nüüd: $DELTA"
    SCATTER_MSG="scatter: $N_NOW peret (delta $DELTA)"
    ADDED=$(node -e "console.log(JSON.parse(process.argv[1]).added)" "$DELTA" 2>/dev/null || echo 0)
    [ "$ADDED" != "0" ] && [ "$ADDED" != "ERR" ] && FAILS+=("UUS scatter: $ADDED peret (vt log)")
  else
    echo "  esimene jooks — loon baseline"
    SCATTER_MSG="scatter: $N_NOW peret (baseline loodud)"
  fi
  cp "$SC_NOW" "$SC_BASE"
else
  echo "  ❌ family-scatter-detect kukkus"; FAILS+=("scatter-detect kukkus"); SCATTER_MSG="scatter: KUKKUS"
fi

# ============ [2] OTSINGU-SMOKE (KIHT 1 regressioon) ============
echo "--- [2] otsingu-smoke ---"
SMOKE=$(docker exec "$MED" node -e '
const H=process.env.MEILISEARCH_HOST||"http://127.0.0.1:7700", K=process.env.MEILISEARCH_KEY;
// {q, minHits}: suhteline lävi (peab leidma VÄHEMALT nii palju) — fikseeritud ülempiiri pole.
const checks=[["soojendi",50],["tool",100],["pump",200],["ahi",50],["diiselsoojendid",40]];
(async()=>{
 let fail=[];
 for(const [q,min] of checks){
   const r=await fetch(H+"/indexes/products/search",{method:"POST",headers:{Authorization:"Bearer "+K,"Content-Type":"application/json"},body:JSON.stringify({q,limit:0})});
   const j=await r.json(); const n=j.estimatedTotalHits||0;
   if(n<min) fail.push(`${q}=${n}<${min}`);
 }
 console.log(fail.length? "FAIL "+fail.join(", ") : "OK");
})().catch(e=>console.log("ERR "+e.message));' 2>>"$LOG")
echo "  smoke: $SMOKE"
[ "${SMOKE:0:2}" = "OK" ] || FAILS+=("otsingu-smoke: $SMOKE")

# ============ [3] LEHE-SMOKE (Playwright, staging.xlmarket.ee, valikuline) ============
# NB: käib staging.xlmarket.ee (k33g PÄRIS pood) pihta, MITTE xlmarket.ee (PROD uo28
# coming-soon). Oma config — homepage.spec.ts (cutover-smoke) jääb puutumata.
echo "--- [3] lehe-smoke (Playwright → staging) ---"
PAGE_MSG="lehe-smoke: SKIP"
SMOKE_CFG="$ROOT/storefront/playwright.staging-smoke.config.ts"
if [ -f "$SMOKE_CFG" ] && (cd "$ROOT/storefront" && npx --no-install playwright --version >/dev/null 2>&1); then
  if (cd "$ROOT/storefront" && timeout 300 npx --no-install playwright test --config=playwright.staging-smoke.config.ts --reporter=line >>"$LOG" 2>&1); then
    PAGE_MSG="lehe-smoke: OK"
  else
    PAGE_MSG="lehe-smoke: FAIL"; FAILS+=("Playwright staging-smoke FAIL")
  fi
  echo "  $PAGE_MSG"
else
  echo "  Playwright/config puudub → SKIP (ei FAIL)"
fi

# ============ [4] A2/A4 SEIS (report-only) ============
# AUS: family-scatter-detect --json annab TOORED kandidaadid (verdict/confidence=null;
# neid täidab alles LLM-sõel). Seega see arv = tooraine, MITTE teostatavad. Gated-execute
# (LLM-sõel + Tarmo per-rea OK, nagu A1-tabel) enne ükskõik mida. REPORT-ONLY.
echo "--- [4] A2/A4 seis (report-only) ---"
A_MSG="A2/A4: $([ -f "$SC_NOW" ] && node -e "try{console.log((require('$SC_NOW').scatters||[]).length+' toorest scatter-peret (LLM-sõel+Tarmo OK enne teostust)')}catch(e){console.log('?')}" || echo '?')"
echo "  $A_MSG"

# ============ [5] KOKKUVÕTE ============
echo "--- [5] kokkuvõte ---"
if [ ${#FAILS[@]} -eq 0 ]; then
  RESULT=OK
  tg "🟢 Nädalane QA OK
$SCATTER_MSG
$SMOKE
$PAGE_MSG
$A_MSG"
else
  RESULT=FAIL
  printf -v FJOIN '• %s\n' "${FAILS[@]}"
  tg "🔴 Nädalane QA — $(( ${#FAILS[@]} )) probleemi
$FJOIN
$SCATTER_MSG
log: $LOG"
fi
echo "result=$RESULT fails=${#FAILS[@]} ts=$STAMP" | tee "$LOGDIR/weekly-qa-STATUS"
# prune: hoia viimased ~8 ajatempliga scatter-snapshot'i + logi (baseline jääb alles)
ls -1t "$BASEDIR"/scatter-2*.json 2>/dev/null | tail -n +9 | xargs -r rm -f
ls -1t "$LOGDIR"/weekly-qa-2*.log 2>/dev/null | tail -n +9 | xargs -r rm -f
echo "=== weekly-qa valmis: $RESULT ==="
[ "$RESULT" = OK ]
