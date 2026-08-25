#!/usr/bin/env bash
# import-pipeline.sh — FEED IMPORT-PIPELINE orchestraator (HOST-run, k33g).
#
# Ahel (committed disain reports/cron-wiring-kaardistus.md):
#   [1] cache-refresh      — download + build-cache + stamp + churn/OOS   (KONTEINER: refresh-feed-cache.sh)
#   [2] (osa [1]-st: stock/churn→OOS + reindeks juba refresh'is)
#   [3] IMPORT-NEW         — AINULT uued SKU-d → draft, KATEGOORIATA        (⚠️ OTSUS — vt allpool)
#   [3.5] TITLE-STRIP      — brändi-prefiks maha (delta) ENNE classify      (HOST: pipeline-strip-titles.mjs)
#   [4] CLASSIFY           — Opus propose-not-create, olemas-L3 auto        (HOST: pipeline-classify.mjs)
#   [5] PRICE              — computeRetail; HIND=ainus SSoT-erand           (HOST: pipeline-reprice.mjs)
#   [6] SPEC               — Haiku spec-ekstrakt L3-mallist                 (HOST: spec-extract-skus.mjs)
#   [7] REINDEX            — Meili (uued tooted + hinnad nähtavaks)         (KONTEINER: index-meilisearch.mjs)
#
# MIKS HOST-run: sammud [4][5][6] vajavad ANTHROPIC_API_KEY (ainult hostil /opt/eumotors-tasks/.env)
# ja kirjutavad DB-sse `docker exec db-k33g psql` kaudu (hostil pole pg-porti). Host jääb elus ka
# post-cutover (kaob ainult vana VPS). Sammud [1][2][7] on konteiner-natiivsed (docker exec medusa).
#
# FAIL-LOUD (nagu refresh-feed-cache.sh): iga samm tõestab tulemust; ükski lünk → exit!=0 + Slack.
# DRY vaikimisi — EI kirjuta. --execute lülitab kirjutuse sisse (KÕIK alam-sammud saavad --execute).
#
# Kasutus:
#   scripts/import-pipeline.sh                 # DRY: mõju-raport, EI kirjuta
#   scripts/import-pipeline.sh --execute       # LIVE: import + klassifikatsioon + hind + spec + reindeks
#   IMPORT_CMD="docker exec …" scripts/import-pipeline.sh --execute   # step [3] plug-in (vt OTSUS)
set -euo pipefail

# ── env ──────────────────────────────────────────────────────────────────────
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="${PIPELINE_ENV_FILE:-/opt/eumotors-tasks/.env}"
[ -f "$ENV_FILE" ] && { set -a; . "$ENV_FILE"; set +a; }   # ANTHROPIC_API_KEY, SLACK_WEBHOOK_URL (väärtust EI logi)

EXECUTE=0; [ "${1:-}" = "--execute" ] && EXECUTE=1
MODE=$([ "$EXECUTE" = "1" ] && echo EXECUTE || echo DRY-RUN)
EXFLAG=$([ "$EXECUTE" = "1" ] && echo "--execute" || echo "--dry")

MEDUSA_NAME="$(docker ps --format '{{.Names}}' | grep '^medusa' | head -1 || true)"
DB_NAME="$(docker ps --format '{{.Names}}' | grep '^db-k33g' | head -1 || true)"
SLACK="${SLACK_WEBHOOK_URL:-}"
NOTIFY="$ROOT/scripts/lib/notify-telegram.sh"   # Telegram fail-loud + digest (sama bot/chat = Uptime Kuma)
RUN_START=$(date -u +%s)

# notify → Slack (kui webhook seatud) + Telegram (kui bot/chat seatud). Kumbki puudu → vaikselt vahele.
slack() {
  [ -n "$SLACK" ] && wget -qO- --header="content-type: application/json" \
    --post-data="{\"text\":\"$1\"}" "$SLACK" >/dev/null 2>&1 || true
  [ -x "$NOTIFY" ] && "$NOTIFY" "$1" >/dev/null 2>&1 || true
}
fail() { echo "❌ IMPORT-PIPELINE FAIL [$1]: $2" >&2; slack "❌ XLM import-pipeline FAIL [$1]: $2"; exit "${3:-1}"; }
trap 'rc=$?; [ "$rc" -ne 0 ] && echo "❌ import-pipeline KATKES (rc=$rc) $(date -u +%FT%TZ)" >&2' EXIT

echo "=== IMPORT-PIPELINE START ($MODE) $(date -u +%FT%TZ) ==="
echo "  medusa=$MEDUSA_NAME  db=$DB_NAME  root=$ROOT"
[ -n "$DB_NAME" ] || fail "prep" "db-k33g konteinerit ei leitud (docker ps)"
[ -n "$MEDUSA_NAME" ] || fail "prep" "medusa konteinerit ei leitud (docker ps)"
[ "$EXECUTE" = "1" ] && [ -z "${ANTHROPIC_API_KEY:-}" ] && fail "prep" "ANTHROPIC_API_KEY puudub ($ENV_FILE) — sammud [4][6] ei saa jooksta"

dbq() { docker exec -i "$DB_NAME" psql -U xlmarket -d xlmarket -tA -v ON_ERROR_STOP=1 -c "$1"; }

# ── KREDIIT-PROBE (LLM-väravate eeltingimus, pipeline'i alguses) ──────────────
# 1-token proov ENNE [4] → seab CREDIT_OK. Väldib 18k×retry ASJATUT API-katset kui krediit juba maas.
# ERISTUS KRIITILINE ("ära aja segamini", Tarmo): krediit maas → DEGRADE (LLM skip, laoseis JÄTKUB);
#   API maas (timeout/5xx) → süsteemne (LLM skip + laoseis JÄTKUB, aga HOIATUS et API katki, mitte krediit).
# Kummalgi juhul laoseis/hind/reindeks EI blokeeru (Tarmo #1 prioriteet: pood uueneb katkestuse ajal).
CREDIT_OK=1; PROBE_STATUS=ok
if [ -n "${ANTHROPIC_API_KEY:-}" ]; then
  node "$ROOT/scripts/credit-probe.mjs" && PROBE_RC=0 || PROBE_RC=$?
  case "$PROBE_RC" in
    0) echo "  💳 probe: krediit OK — LLM-sammud [4][6][6.5] jooksevad"; CREDIT_OK=1; PROBE_STATUS=ok ;;
    3) echo "  💳 probe: krediit maas — LLM-sammud [4][6][6.5] SKIP (degrade); laoseis/hind/reindeks JÄTKUB"; CREDIT_OK=0; PROBE_STATUS=credit ;;
    *) echo "  ⚠️ probe: API maas (rc=$PROBE_RC, MITTE krediit) — LLM-sammud SKIP, laoseis JÄTKUB (süsteemne)"; CREDIT_OK=0; PROBE_STATUS=api ;;
  esac
else
  echo "  ⚠️ probe: ANTHROPIC_API_KEY puudub → LLM-sammud [4][6][6.5] SKIP (degrade)"; CREDIT_OK=0; PROBE_STATUS=api
fi
# ANTI-SPÄMM digest + taastumis-teade (reports/credit-outage.state): 1 teade/päev, mitte igal jooksul
# (õppetund: 26 identset = müra). Skript otsustab kas teavitada; tühi väljund = vaikus. EXECUTE-only.
if [ "$EXECUTE" = "1" ]; then
  NOTIFY_MSG=$(node "$ROOT/scripts/credit-outage-state.mjs" --status "$PROBE_STATUS" 2>/dev/null || true)
  [ -n "$NOTIFY_MSG" ] && slack "$NOTIFY_MSG"
fi

# ── [1][2] CACHE-REFRESH + churn/OOS (konteiner-natiivne) ────────────────────
# refresh-feed-cache.sh = download+cache+stamp+inventory+reindeks, ise fail-loud.
# EI ole dry-võimeline (kirjutab cache+inventory). DRY-s ainult TÕESTA, et cache värske.
echo "[1/7] cache-refresh (churn/OOS)"
if [ "$EXECUTE" = "1" ]; then
  docker exec "$MEDUSA_NAME" sh /app/scripts/refresh-feed-cache.sh || fail "cache-refresh" "refresh-feed-cache.sh rc!=0"
else
  CACHE_AGE=$(docker exec "$MEDUSA_NAME" sh -c 'echo $(( $(date -u +%s) - $(stat -c %Y /data/vevor-feed-cache.json 2>/dev/null || echo 0) ))' 2>/dev/null || echo 999999)
  echo "  [DRY] cache vanus ${CACHE_AGE}s (live-jooksul refresh uuendaks)"
fi

# ── [3] IMPORT-NEW (propose-not-create): AINULT uued SKU-d → draft, KATEGOORIATA ──
# import-new-drafts.mjs (konteiner-natiivne) loob uued SKU-d status="draft", KATEGOORIATA — EI loo
# kategooriaid ega publitseeri (erinevalt import-feed-v2.mjs-st, mis rikuks SSoT/propose-not-create).
# Kodu määrab [4] classify (draft→published alles paigutusel); autoriteetse hinna [5] reprice.
echo "[3/7] import-new (draft, kategooriata)"
# UUTE SKU-de loend = feed-cache SKU-d MIINUS DB-s olevad vevor_sku-d (comm = orchestraatori tõde).
docker exec "$MEDUSA_NAME" node -e '
  try { const c=require("/data/vevor-feed-cache.json"); console.log(Object.keys(c.bySku||{}).join("\n")); }
  catch(e){ }' 2>/dev/null | sort -u > /tmp/pl-feed-skus.txt || true
dbq "SELECT metadata->>'vevor_sku' FROM product WHERE deleted_at IS NULL AND metadata->>'vevor_sku' IS NOT NULL" 2>/dev/null | sort -u > /tmp/pl-db-skus.txt || true
comm -23 /tmp/pl-feed-skus.txt /tmp/pl-db-skus.txt 2>/dev/null > /tmp/pl-new-skus.txt || true
NEW_N=$(grep -c . /tmp/pl-new-skus.txt || echo 0)
CREATED_N=0; SKIPPED_N=0   # tegelik loodud / dup-skip (import-new-drafts väljundist; digest kasutab neid)
echo "  feed SKU=$(wc -l < /tmp/pl-feed-skus.txt|tr -d ' ') · DB SKU=$(wc -l < /tmp/pl-db-skus.txt|tr -d ' ') · UUSI (feed∖DB)=$NEW_N"
if [ "$EXECUTE" = "1" ]; then
  if [ -n "${IMPORT_CMD:-}" ]; then
    echo "  IMPORT_CMD antud (override) → jooksutan"; eval "$IMPORT_CMD" || fail "import-new" "IMPORT_CMD rc!=0"
  elif [ "$NEW_N" -gt 0 ]; then
    # Anna eel-arvutatud uute-SKU loend konteinerisse (kiire tee — väldib toote-mooduli täisloopi).
    docker cp /tmp/pl-new-skus.txt "$MEDUSA_NAME":/tmp/pl-new-skus.txt || fail "import-new" "docker cp uute-SKU loend nurjus"
    # `medusa exec` = framework-konteiner (workflow'd) ILMA REST-auth'ita. Positsioon: <skus-fail> execute.
    IMPORT_OUT=$(docker exec "$MEDUSA_NAME" sh -c 'cd /app && npx medusa exec scripts/import-new-drafts.mjs /tmp/pl-new-skus.txt execute' 2>&1) \
      || { echo "$IMPORT_OUT"; fail "import-new" "import-new-drafts.mjs rc!=0 ($NEW_N uut SKU-d)"; }
    echo "$IMPORT_OUT"
    # DUP-värav skibib VEVOR-reformaadid → digest raporteerib TEGELIKU CREATED + skip, mitte pre-dedup NEW_N.
    CREATED_N=$(printf '%s' "$IMPORT_OUT" | grep -oE 'CREATED=[0-9]+' | tail -1 | grep -oE '[0-9]+' || echo 0)
    SKIPPED_N=$(printf '%s' "$IMPORT_OUT" | grep -oE 'SKIPPED_DUP=[0-9]+' | tail -1 | grep -oE '[0-9]+' || echo 0)
  else
    echo "  0 uut SKU-d → import-samm vahele (steady-state)"
  fi
else
  if [ "$NEW_N" -gt 0 ]; then
    docker cp /tmp/pl-new-skus.txt "$MEDUSA_NAME":/tmp/pl-new-skus.txt 2>/dev/null || true
    docker exec "$MEDUSA_NAME" sh -c 'cd /app && npx medusa exec scripts/import-new-drafts.mjs /tmp/pl-new-skus.txt dry 2>&1' | grep -E 'NEW_DRAFTS=|DRY|·|puudub' | sed 's/^/  /' || true
  else
    echo "  [DRY] 0 uut SKU-d → import vahele"
  fi
fi

# ── [3.5] TITLE-STRIP (HARD RULE #5 hook): brändi-prefiks maha ENNE classify ──
# Uus draft [3] tuleb feed'ist toore "VEVOR …" title'iga; classify [4] LOEB title'it → strip ENNE.
# BRÄND-TEADLIK (deriveBrandSlug SSoT, mitte VEVOR-hardcode). Töötab AINULT delta (/tmp/pl-new-skus.txt,
# variant.sku järgi), idempotentne (topelt-strip võimatu), handle EI muutu. FAIL-LOUD: süsteemne→exit!=0;
# üksik katkine title (E1) → skip+logi, EI peata. Backfill = sama skript --all (scripts/pipeline-strip-titles.mjs).
echo "[3.5/7] title-strip (brändi-prefiks, delta) — KÕIK title-keeled (HARD RULE #5)"
STRIP_SKIP_N=0
if [ "$NEW_N" -gt 0 ] && [ -s /tmp/pl-new-skus.txt ]; then
  # Strip katab KÕIK title-väljad: EN product.title + title_et (+capitalize). title_et delta = täna
  # no-op (uue toote title_et tühi kuni generaator jookseb) — hoitakse ohutusvõrguks (tulevane title_et-kirjutaja).
  # Uue keele lisamine → uus väli siia loendisse (sama transform, eri --field).
  for FLD in title title_et; do
    STRIP_OUT=$(node "$ROOT/scripts/pipeline-strip-titles.mjs" --skus /tmp/pl-new-skus.txt --field "$FLD" $([ "$EXECUTE" = "1" ] && echo --execute || echo --dry) 2>&1) \
      || { echo "$STRIP_OUT"; fail "title-strip" "pipeline-strip-titles.mjs --field $FLD rc!=0 (SÜSTEEMNE)"; }
    echo "$STRIP_OUT" | sed "s/^/  [$FLD] /"
    FLD_SKIP=$(printf '%s' "$STRIP_OUT" | grep -oE 'SKIPPED=[0-9]+' | tail -1 | grep -oE '[0-9]+' || echo 0)
    STRIP_SKIP_N=$((STRIP_SKIP_N + FLD_SKIP))
  done
  # E1-tüüpi skip (katkine tootenimi) = nähtav käsitsi-parandusse, EI peata pipeline'i (HARD RULE #5).
  [ "$EXECUTE" = "1" ] && [ "${STRIP_SKIP_N:-0}" -gt 0 ] \
    && slack "⚠️ XLM import: ${STRIP_SKIP_N} title strip-skip (katkine tootenimi) → reports/title-parandus-nimekiri.md"
else
  echo "  0 uut SKU-d → strip vahele"
fi

# ── [4] CLASSIFY (host, propose-not-create) ──────────────────────────────────
echo "[4/7] classify (Opus propose-not-create)"
# source=unhomed: kata VÄRSKED draftid [3] + olemas-backlog (kõik kategooriata, draft VÕI published).
# KREDIIT-DEGRADE: probe maas → SKIP + tühjenda classify-skus (kaskaad [6]/[6.5] skip); mid-run krediit (rc=3)
#   → degrade HOIATUS, laoseis/hind/reindeks JÄTKUB. Muu rc → süsteemne fail.
if [ "$CREDIT_OK" = "1" ]; then
  CL_OUT=$(node "$ROOT/scripts/pipeline-classify.mjs" --source unhomed $EXFLAG --out /tmp/pipeline-classify-results.json 2>&1) && CL_RC=0 || CL_RC=$?
  echo "$CL_OUT" | sed 's/^/  /'
  CL_PENDING=$( { echo "$CL_OUT" | grep -oE 'CREDIT_PENDING=[0-9]+' | tail -1 | cut -d= -f2; } || true); CL_PENDING=${CL_PENDING:-0}
  case "$CL_RC" in
    0) : ;;  # OK
    3) echo "  ⚠️ [4] KREDIIT-DEGRADE — klass vahele, laoseis/hind/reindeks JÄTKUB (${CL_PENDING} ootab kodu)"
       CREDIT_OK=0                    # kaskaad: [6]/[6.5] skibivad automaatselt
       : > /tmp/classify-skus.txt     # tühja loend → [6]/[6.5] gate `-s` false → skip
       slack "⚠️ XLM classify [4] KREDIIT-DEGRADE (HOIATUS, mitte FAIL): ${CL_PENDING} toodet ootab klassifikatsiooni (krediit maas jooksu ajal). Laoseis+hind+reindeks JÄTKUB — pood uueneb." ;;
    *) fail "classify" "pipeline-classify.mjs rc=$CL_RC (süsteemne — API/DB maas?)" ;;
  esac
else
  echo "  💳 krediit/API maas (probe) → classify SKIP; kodutud draftid ootavad (degrade)"
  : > /tmp/classify-skus.txt          # tagab [6]/[6.5] skip (vana loend ei tohi lekkida)
fi

# ── FEED-SNAPSHOT ÜHTLUSTUS (gap-fix 2026-07-25) ─────────────────────────────
# [3] import loeb /data/vevor-feed-cache.json; [5] reprice loeb xlsx-i. MÕLEMAD peavad
# tulema SAMAST allikast — /data/vevor-571.xlsx, mille [1] refresh laadis JA millest cache
# ehitati. Reprice vaikefeed oli repo-koopia backend/data/feeds/vevor-571.xlsx, mida refresh
# (konteiner /data) EI puutu → aegus (nähtud: repo 3 päeva vana, /data värske) → import ja
# hind töötasid LAHKNEVATE feedide peal. Kopeeri konteineri värske xlsx hostile → sama snapshot.
FEED_XLSX_HOST=/tmp/pl-feed.xlsx
if docker cp "$MEDUSA_NAME":/data/vevor-571.xlsx "$FEED_XLSX_HOST" 2>/dev/null; then
  echo "  feed-snapshot ühtlustatud: /data/vevor-571.xlsx → $FEED_XLSX_HOST (import-cache + reprice = SAMA allikas)"
else
  FEED_XLSX_HOST=""
  echo "  ⚠️ /data/vevor-571.xlsx puudub konteineris → reprice kasutab repo-vaikefeed'i (VÕIB lahkneda import-cache'ist!)"
fi

# ── [5] PRICE (host; HIND=ainus SSoT-erand) ──────────────────────────────────
echo "[5/7] price (computeRetail + Omnibus + marginaali-alarm)"
node "$ROOT/scripts/pipeline-reprice.mjs" $EXFLAG ${FEED_XLSX_HOST:+--feed "$FEED_XLSX_HOST"} || fail "price" "pipeline-reprice.mjs rc!=0"

# ── [6] SPEC (host) ──────────────────────────────────────────────────────────
echo "[6/7] spec-extract (specita tooted)"
# KREDIIT-DEGRADE: CREDIT_OK=0 (probe/[4]) → skip; mid-run krediit (rc=3) → degrade HOIATUS + [7] JÄTKUB.
if [ "$CREDIT_OK" = "1" ] && [ -s /tmp/classify-skus.txt ]; then
  SP_OUT=$(node "$ROOT/scripts/spec-extract-skus.mjs" --skus /tmp/classify-skus.txt $([ "$EXECUTE" = "1" ] || echo --dry) 2>&1) && SP_RC=0 || SP_RC=$?
  echo "$SP_OUT" | sed 's/^/  /'
  SP_PENDING=$( { echo "$SP_OUT" | grep -oE 'CREDIT_PENDING=[0-9]+' | tail -1 | cut -d= -f2; } || true); SP_PENDING=${SP_PENDING:-0}
  case "$SP_RC" in
    0) : ;;
    3) echo "  ⚠️ [6] KREDIIT-DEGRADE — spec vahele, [7] reindeks JÄTKUB (${SP_PENDING} ootab spec)"
       CREDIT_OK=0                    # kaskaad: [6.5] skip
       slack "⚠️ XLM spec [6] KREDIIT-DEGRADE (HOIATUS, mitte FAIL): ${SP_PENDING} toodet ootab spec-ekstraktsiooni (krediit maas). Laoseis+hind+reindeks JÄTKUB." ;;
    *) fail "spec" "spec-extract-skus.mjs rc=$SP_RC (süsteemne — API/DB maas?)" ;;
  esac
else
  [ "$CREDIT_OK" = "1" ] && echo "  klassifitseeritud SKU-loend puudub → spec vahele" || echo "  krediit/API maas → spec SKIP (degrade)"
fi

# ── [6.5] SISU-GEN (host) — HARD RULE #5 HOOK (ET-sisu uutele, ENNE reindeks) ─
# SAMA transform+write kui backfill (content-gen-run.mjs --all). DELTA-peal (classify-skus.txt,
# sama kui [6] spec). Multi-feed: content-gen loeb toote OMA EN-allikat (bränd-agnostiline).
# FAIL-LOUD: süsteemne (API maas / >50% kukub) → fail()/Telegram; üksik toode → skip+count.
echo "[6.5/7] sisu-gen (ET-sisu uutele — title_et/description_et/selling_points/rich_et)"
# KREDIIT-DEGRADE: CREDIT_OK=0 (probe/[4]/[6]) → skip KOHE (ei proovi ühtki API-katset).
if [ "$CREDIT_OK" = "1" ] && [ -s /tmp/classify-skus.txt ]; then
  # RC-püüdmine set -e all: && RC=0 || RC=$? (muidu set -e katkestaks enne haru-valikut).
  CG_OUT=$(node "$ROOT/scripts/pipeline-content-gen.mjs" --skus /tmp/classify-skus.txt \
    $([ "$EXECUTE" = "1" ] && echo --execute || echo --dry) 2>&1) && CG_RC=0 || CG_RC=$?
  echo "$CG_OUT" | sed 's/^/  /'
  # || true: grep no-match (exit 1) + pipefail muidu katkestaks set -e all enne :-0 default'it.
  CG_SKIPPED=$( { echo "$CG_OUT" | grep -oE 'SKIPPED=[0-9]+' | tail -1 | cut -d= -f2; } || true); CG_SKIPPED=${CG_SKIPPED:-0}
  CG_PENDING=$( { echo "$CG_OUT" | grep -oE 'CREDIT_PENDING=[0-9]+' | tail -1 | cut -d= -f2; } || true); CG_PENDING=${CG_PENDING:-0}
  case "$CG_RC" in
    0)
      # OK — üksik-skipid on review (mitte krediit); Telegram HOIATUS kui skippe oli.
      [ "$CG_SKIPPED" -gt 0 ] && slack "⚠️ XLM sisu-gen [6.5]: $CG_SKIPPED toodet skipiti (review) — ET-sisu puudu, vaata üle"
      ;;
    3)
      # KREDIIT-DEGRADE (rc=3): sisu OOTAB, AGA laoseis/hind/spec + [7] reindeks JÄTKUB.
      #   Krediidi-tõrge (mitte sisu-viga) EI TOHI laoseisu-uuendust blokeerida (Tarmo 2026-08-25).
      #   Sama muster kui B-fix: mitte-kriitiline tõrge ei peata kogu pipeline'i. Sisu → re-run/järgmine öö.
      echo "  ⚠️ [6.5] KREDIIT-DEGRADE — sisu vahele, [7] reindeks JÄTKUB (${CG_PENDING} toodet ootab sisu)"
      slack "⚠️ XLM sisu-gen [6.5] KREDIIT-DEGRADE (HOIATUS, mitte FAIL): ${CG_PENDING} toodet ootab ET-sisu (krediit maas). Laoseis+hind+spec+reindeks JÄTKUS — pood uueneb. Sisu täidab: Console makse korda → 'bash scripts/run-content-backfill.sh' (või järgmine öö kui krediit tagasi)."
      ;;
    *)
      # MUU süsteemne (API täiesti maas / DB kaos) → PEATA (Telegram punane).
      fail "content-gen" "pipeline-content-gen.mjs rc=$CG_RC (süsteemne — API/DB maas?)"
      ;;
  esac
else
  [ "$CREDIT_OK" = "1" ] && echo "  klassifitseeritud SKU-loend puudub → sisu-gen vahele" || echo "  krediit/API maas → sisu-gen SKIP (degrade)"
fi

# ── [7] REINDEX (konteiner) — ainult EXECUTE (uued tooted + hinnad nähtavaks) ─
echo "[7/7] reindeks Meili"
if [ "$EXECUTE" = "1" ]; then
  docker exec "$MEDUSA_NAME" node scripts/index-meilisearch.mjs || fail "reindex" "index-meilisearch.mjs rc!=0"
else
  echo "  [DRY] reindeks vahele (kirjutust polnud)"
fi

# ── review-bucket nähtavus (alati — ka DRY) ──────────────────────────────────
# Telegram-push ainult EXECUTE'l JA kui midagi ootab (digest ise gate'ib items>0 → ei spämmi).
echo ""
node "$ROOT/scripts/pipeline-review-digest.mjs" \
  $([ "$EXECUTE" = "1" ] && echo "" || echo "--from-json /tmp/pipeline-classify-results.json") \
  $([ "$EXECUTE" = "1" ] && echo "--telegram" || echo "") \
  $([ -n "$SLACK" ] && [ "$EXECUTE" = "1" ] && echo "--slack" || echo "") || true

echo ""
echo "=== IMPORT-PIPELINE DONE ($MODE) $(date -u +%FT%TZ) — kestus $(( $(date -u +%s) - RUN_START ))s ==="
if [ "$EXECUTE" = "1" ]; then
  REVIEW_N=$(dbq "SELECT count(*) FROM classification_review WHERE status='pending'" 2>/dev/null || echo "?")
  DUR=$(( $(date -u +%s) - RUN_START ))
  slack "$(printf '✅ XLM import-pipeline OK (%ss)\nUusi tooteid: %s · dup-skip: %s · Review-bucketis ootab: %s' "$DUR" "${CREATED_N:-0}" "${SKIPPED_N:-0}" "$REVIEW_N")"
fi
trap - EXIT
