#!/bin/sh
# refresh-feed-cache.sh — CONTAINER-NATIVE feed-cache värskendus + churned→OOS reindeks.
# FAIL-LOUD: iga samm tõestab oma tulemuse; ükskõik milline lünk → exit != 0 (Coolify "Failed").
#
# MIKS FAIL-LOUD (2026-07-23): Scheduled Task raporteeris "Success 58s", AGA ei kirjutanud /data-t
# ega reindekseerinud Meili't (xlsx mtime 08:12, cache 12:00, task 09:43, Meili last-index 12:00).
# "Roheline tuli, null tegevust" — sama muster mis feed-sync ("olemas" 3 kuud) ja guard ("töötas").
# Vana skript: set -eu + size-check, aga (a) ei tõestanud, et cache/reindeks päriselt TOIMUS SELLES
# jooksus, (b) ei kaitsnud osalise feedi vastu (5000 SKU → 10000 valelikult churned → mass-OOS).
#
# JÕUSTUS: RUN_START-templi vastu valideeritakse cache mtime + kirjete arv (vs eelmine, ei tohi
# kukkuda) + Meili doc-count + Meili viimane reindeks-task PEAB olema lõppenud PÄRAST RUN_START'i.
# Meili task-aeg on JAGATUD instantsis → ephemeral-konteiner EI SAA seda võltsida "green-no-op'iga".
#
# MIKS container-native: post-cutover host (vana VPS) kaob → host-copy puruneks. Vt reports/churned-oos-juur-2026-07-23.md.
# COOLIFY SCHEDULED TASK: Service=medusa · Command=sh /app/scripts/refresh-feed-cache.sh · Cron=0 */4 * * *
#   ⚠️ Task PEAB jooksma medusa SERVICE-konteineris (mount = päris /data named-volume). Ephemeral
#   one-off konteiner ilma volume-mount'ita → cache-mtime-värav püüab (kirjutaks vale kohta), aga
#   parim on tagada õige mount. Lõpp-Meili-värav kaitseb kasutaja-mõju sõltumata konteinerist.
#
# SKOOP: download → build-cache → stamp → reindeks. Toote-IMPORT (uued tooted) EI ole siin (B-etapp).
set -eu

XLSX="${FEED_XLSX_PATH:-/data/vevor-571.xlsx}"
CACHE="${FEED_CACHE_PATH:-/data/vevor-feed-cache.json}"
URL="${FEED_URL:-https://ads-feed.s3.us-west-2.amazonaws.com/ads/business/571/vevor-571.xlsx}"
SCRIPTS="$(dirname "$0")"
DATADIR="$(dirname "$CACHE")"

# Alammäärad (kaitse osalise/katkise feedi vastu → väldib mass-vale-OOS'i)
MIN_XLSX_BYTES=1000000     # xlsx < 1 MB = katkine download
MIN_CACHE_SKU=10000        # cache < 10k SKU = osaline feed (normaal ~14–15k)
MAX_CACHE_DROP_PCT=20      # uus cache ei tohi kukkuda >20% vs eelmine (osalise feedi lõks)
# Meili doc-count'i EI kontrolli fikseeritud lävega (vana MIN_MEILI_DOCS=15000 lõhenes iga kord kui
# kataloog kahaneb — nt archive 18062→14820 < 15000 → vale-alarm, kuigi reindeks õnnestus).
# ISEKOHANDUV: võrdle Meili doc-count'i index-meilisearch'i väljastatud EXPECTED_DOCS'iga (= elusate
# toodete arv DB-s). Lubatud väike hälve (async reindeks / paralleelne kirjutus jooksu ajal).
MEILI_DOC_TOL_PCT=1        # lubatud hälve Meili doc-count vs oodatud (%, min MEILI_DOC_TOL_ABS)
MEILI_DOC_TOL_ABS=50       # lubatud absoluut-hälve (kumb suurem)

MEILI_HOST="${MEILISEARCH_HOST:-http://meili:7700}"
MEILI_KEY="${MEILISEARCH_KEY:-}"

fail() { echo "❌ REFRESH FAIL [$1]: $2" >&2; exit "${3:-1}"; }
trap 'rc=$?; [ "$rc" -ne 0 ] && echo "❌ refresh-feed-cache KATKES (rc=$rc) $(date -u +%FT%TZ) — Coolify peab näitama Failed" >&2' EXIT

RUN_START=$(date -u +%s)
echo "=== refresh-feed-cache START host=$(hostname) pid=$$ $(date -u +%FT%TZ) (epoch=$RUN_START) ==="
echo "  XLSX=$XLSX  CACHE=$CACHE  MEILI=$MEILI_HOST"

# ---- 0. /data peab olema kirjutatav (vale-volume / õiguste-lõks nähtavaks) --------------------
[ -d "$DATADIR" ] || fail "prep" "andmekaust puudub: $DATADIR (vale volume-mount?)"
( touch "$DATADIR/.refresh-write-test" && rm -f "$DATADIR/.refresh-write-test" ) 2>/dev/null \
  || fail "prep" "$DATADIR EI ole kirjutatav (vale volume või õigused — vt /data chown medusa:nogroup)"

# Eelmise cache'i kirjete arv (regressiooni-kaitse). Puudub → 0 (esmakäivitus).
PREV_SKU=0
if [ -f "$CACHE" ]; then
  PREV_SKU=$(C="$CACHE" node -e 'try{const c=require(process.env.C);console.log(Object.keys(c.bySku||{}).length)}catch(e){console.log(0)}' 2>/dev/null || echo 0)
fi
echo "  eelmine cache: $PREV_SKU SKU-d"

# ---- 1. DOWNLOAD — exit + suurus + zip-magic + edukas mv ---------------------------------------
echo "[1/4] download → $XLSX"
rm -f "$XLSX.new"
wget -q -O "$XLSX.new" "$URL" || fail "download" "wget rc!=0 ($URL)"
[ -f "$XLSX.new" ] || fail "download" "wget lõppes 0-ga aga faili pole ($XLSX.new)"
SIZE=$(wc -c < "$XLSX.new")
[ "$SIZE" -ge "$MIN_XLSX_BYTES" ] || fail "download" "xlsx kahtlaselt väike ($SIZE B < $MIN_XLSX_BYTES) — osaline download"
# xlsx = zip → algab "PK"
case "$(head -c 2 "$XLSX.new" 2>/dev/null)" in
  PK*) : ;;
  *) fail "download" "pole valiidne xlsx/zip (magic ≠ PK) — HTML vealeht S3-lt?" ;;
esac
mv "$XLSX.new" "$XLSX"
echo "  OK $SIZE baiti"

# ---- 2. BUILD-CACHE — exit + fail tekkis + mtime > RUN_START + kirjete arv + regressioon --------
echo "[2/4] build-cache → $CACHE"
FEED_XLSX_PATH="$XLSX" FEED_CACHE_PATH="$CACHE" node "$SCRIPTS/build-vevor-feed-cache.mjs" \
  || fail "build-cache" "build-vevor-feed-cache.mjs rc!=0"
[ -f "$CACHE" ] || fail "build-cache" "cache-faili ei tekkinud: $CACHE"
CACHE_MTIME=$(stat -c %Y "$CACHE" 2>/dev/null || echo 0)
[ "$CACHE_MTIME" -ge "$RUN_START" ] || fail "build-cache" "cache mtime ($CACHE_MTIME) < run-start ($RUN_START) — EI kirjutatud sellel jooksul (vana fail?)"
NEW_SKU=$(C="$CACHE" node -e 'try{const c=require(process.env.C);const n=Object.keys(c.bySku||{}).length;console.log(n)}catch(e){console.log(0)}' 2>/dev/null || echo 0)
[ "$NEW_SKU" -ge "$MIN_CACHE_SKU" ] || fail "build-cache" "cache ainult $NEW_SKU SKU (< $MIN_CACHE_SKU) — osaline feed, mass-vale-OOS oht"
# Regressioon: uus ei tohi kukkuda >MAX_CACHE_DROP_PCT% vs eelmine (kui eelmine oli mõistlik)
if [ "$PREV_SKU" -ge "$MIN_CACHE_SKU" ]; then
  FLOOR=$(( PREV_SKU * (100 - MAX_CACHE_DROP_PCT) / 100 ))
  [ "$NEW_SKU" -ge "$FLOOR" ] || fail "build-cache" "cache kukkus $PREV_SKU → $NEW_SKU (<$FLOOR, >${MAX_CACHE_DROP_PCT}% drop) — kahtlane osaline feed"
fi
echo "  OK $NEW_SKU SKU-d (eelmine $PREV_SKU), mtime=$CACHE_MTIME"

# ---- 3. STAMP feed_status + last_seen_in_feed (EI delist'i) ------------------------------------
echo "[3/5] stamp feed_status + last_seen_in_feed"
FEED_CACHE_PATH="$CACHE" node "$SCRIPTS/feed-status-stamp.mjs" || fail "stamp" "feed-status-stamp.mjs rc!=0"

# ---- 4. SYNC MEDUSA INVENTORY — churned/OOS → stocked_quantity=0 (serveripoole ostu-blokk) ------
# Sama isOosFromFeed otsus mis Meili-indeks (lib/feed-stock.mjs) → tooteleht/ostukorv/checkout
# näevad SAMA tõde mis kategooria-kaart. Ilma selleta: Medusa dummy inventory=100 → churned ostetav.
echo "[4/5] sync Medusa inventory (churned/OOS → 0, tagasitulek → restore)"
FEED_CACHE_PATH="$CACHE" node "$SCRIPTS/sync-medusa-inventory.mjs" || fail "inventory" "sync-medusa-inventory.mjs rc!=0"

# ---- 5. REINDEKS — exit + Meili doc-count vs elusate arv + viimane reindeks-task PÄRAST RUN_START'i
echo "[5/5] reindeks Meili (churned→OOS + archived vahele)"
# Capture väljund → EXPECTED_DOCS (elusate toodete arv, index-meilisearch arvutab keepIds.size'ist).
MEILI_OUT=$(FEED_CACHE_PATH="$CACHE" node "$SCRIPTS/index-meilisearch.mjs" 2>&1) \
  || { printf '%s\n' "$MEILI_OUT"; fail "reindeks" "index-meilisearch.mjs rc!=0"; }
printf '%s\n' "$MEILI_OUT" | tail -5
EXPECTED_DOCS=$(printf '%s\n' "$MEILI_OUT" | grep '^EXPECTED_DOCS=' | tail -1 | cut -d= -f2)
[ -n "$EXPECTED_DOCS" ] || fail "verify" "index-meilisearch ei väljastanud EXPECTED_DOCS — ei saa isekohanduvat väravat rakendada (vana script image'is? redeploy vajalik)"

# Lõpp-värav: KÜSI jagatud Meili't — see on ainus allikas, mida ephemeral-konteiner ei võltsi.
[ -n "$MEILI_KEY" ] || fail "verify" "MEILISEARCH_KEY puudub — ei saa reindeksit valideerida"
STATS_JSON=$(wget -qO- --header="Authorization: Bearer $MEILI_KEY" "$MEILI_HOST/indexes/products/stats" 2>/dev/null || echo "")
TASK_JSON=$(wget -qO- --header="Authorization: Bearer $MEILI_KEY" "$MEILI_HOST/tasks?indexUids=products&types=documentAdditionOrUpdate&statuses=succeeded&limit=1" 2>/dev/null || echo "")
VERDICT=$(RS="$RUN_START" EXP="$EXPECTED_DOCS" TP="$MEILI_DOC_TOL_PCT" TA="$MEILI_DOC_TOL_ABS" node -e '
  let stats="", tasks=""
  const [s, t] = [process.argv[1], process.argv[2]]
  try { stats = JSON.parse(s) } catch(e){ console.log("FAIL stats-parse"); process.exit(0) }
  try { tasks = JSON.parse(t) } catch(e){ console.log("FAIL tasks-parse"); process.exit(0) }
  const docs = stats.numberOfDocuments || 0
  const exp = Number(process.env.EXP)
  if (!exp || exp <= 0) { console.log("FAIL oodatud-arv-puudub (EXPECTED_DOCS="+process.env.EXP+")"); process.exit(0) }
  // ISEKOHANDUV: Meili doc-count PEAB langema kokku elusate toodete arvuga (exp). Lubatud väike
  // hälve (async / paralleelne kirjutus). Fikseeritud läve EI ole → ei lõhene kataloogi muutudes.
  const tol = Math.max(Number(process.env.TA), Math.floor(exp * Number(process.env.TP) / 100))
  const dev = Math.abs(docs - exp)
  if (dev > tol) { console.log("FAIL docs="+docs+" vs elus="+exp+" (halve "+dev+" > lubatud "+tol+") — indeks lahkneb DB-st"); process.exit(0) }
  const last = (tasks.results||[])[0]
  if (!last || !last.finishedAt) { console.log("FAIL no-reindeks-task"); process.exit(0) }
  const finEpoch = Math.floor(new Date(last.finishedAt).getTime()/1000)
  if (finEpoch < Number(process.env.RS)) { console.log("FAIL viimane-reindeks "+last.finishedAt+" < run-start"); process.exit(0) }
  console.log("OK docs="+docs+" elus="+exp+" (halve "+dev+" <= "+tol+") reindeks="+last.finishedAt)
' "$STATS_JSON" "$TASK_JSON" 2>/dev/null || echo "FAIL verify-crash")
case "$VERDICT" in
  OK\ *) echo "  ✅ $VERDICT" ;;
  *) fail "verify" "Meili-valideerimine: $VERDICT (reindeks EI jõudnud jagatud Meili'sse sellel jooksul)" ;;
esac

# ---- Lõpp-tõestus: cache mtime PEAB olema värskem kui jooksu algus -----------------------------
FINAL_MTIME=$(stat -c %Y "$CACHE" 2>/dev/null || echo 0)
[ "$FINAL_MTIME" -ge "$RUN_START" ] || fail "verify" "LÕPP: cache mtime ($FINAL_MTIME) < run-start ($RUN_START) — töö ei püsinud"

echo "=== DONE $(date -u +%FT%TZ) — cache $NEW_SKU SKU, Meili reindekseeritud, kõik väravad läbitud ==="
trap - EXIT
