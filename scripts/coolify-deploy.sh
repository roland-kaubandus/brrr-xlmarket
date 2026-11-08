#!/usr/bin/env bash
# Coolify redeploy trigger — k33g STAGING (brrr-xlmarket-staging, applicationId=2).
# Token loetakse /opt/eumotors-tasks/.env-ist (COOLIFY_TOKEN=...) — SKRIPT ISE EI SISALDA SALADUST.
# Kust token: Coolify UI → Keys & Tokens → API tokens → Create New. Pane .env-i.
# Kasutus:  bash scripts/coolify-deploy.sh
#           bash scripts/coolify-deploy.sh --force   # sunni rebuild ka kui commit sama
set -euo pipefail

ENV_FILE="/opt/eumotors-tasks/.env"
UUID="k33g510dw19uyjau3ca7dqpi"           # k33g compose-app uuid (= volume/projekti prefiks)
API_BASE="http://localhost:8000/api/v1"
API="$API_BASE/deploy"

[ -f "$ENV_FILE" ] || { echo "❌ $ENV_FILE puudub"; exit 1; }
# Loe token ILMA source-imata: Coolify token algab 'N|' mustriga ('|' = shell toru-operaator),
# `. "$ENV_FILE"` teeks süntaksivea. grep+cut = |-kindel, ei tõlgenda väärtust shellina.
COOLIFY_TOKEN="$(grep -m1 '^COOLIFY_TOKEN=' "$ENV_FILE" | cut -d= -f2- || true)"
# Eemalda ümbritsevad jutumärgid, kui kasutaja lisas need (echo 'COOLIFY_TOKEN="..."')
COOLIFY_TOKEN="${COOLIFY_TOKEN%\"}"; COOLIFY_TOKEN="${COOLIFY_TOKEN#\"}"
COOLIFY_TOKEN="${COOLIFY_TOKEN%\'}"; COOLIFY_TOKEN="${COOLIFY_TOKEN#\'}"
# Eemalda kohatäite-nurksulud, kui kasutaja kopeeris juhise <...> koos sulgudega
COOLIFY_TOKEN="${COOLIFY_TOKEN#<}"; COOLIFY_TOKEN="${COOLIFY_TOKEN%>}"
[ -n "${COOLIFY_TOKEN:-}" ] || { echo "❌ COOLIFY_TOKEN puudub $ENV_FILE-is. Lisa: echo 'COOLIFY_TOKEN=...' >> $ENV_FILE"; exit 1; }

FORCE="false"; [ "${1:-}" = "--force" ] && FORCE="true"

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# Deploy SIHIB STAGING-storefront'i (k33g COOLIFY_FQDN=staging.xlmarket.ee).
# EI tohi olla xlmarket.ee — see on uo28 PROD coming-soon placeholder (külmutatud, 0 <loc>)
# → sitemap-värav testiks vale hosti ja annaks vale-alarmi. Cutoveril muuda XL_SITE_URL-iga.
SITE_URL="${XL_SITE_URL:-https://staging.xlmarket.ee}"

# Telegram-muutujad samamoodi grep'iga (EI source'i — COOLIFY_TOKEN 'N|'-väärtus katkestaks).
# Telegrami token 'digits:hash' → ':' on grep/cut-ohutu (lõikame '=' pealt). Väärtusi EI logita.
TELEGRAM_BOT_TOKEN="$(grep -m1 '^TELEGRAM_BOT_TOKEN=' "$ENV_FILE" | cut -d= -f2- || true)"; export TELEGRAM_BOT_TOKEN
TELEGRAM_CHAT_ID="$(grep -m1 '^TELEGRAM_CHAT_ID=' "$ENV_FILE" | cut -d= -f2- || true)"; export TELEGRAM_CHAT_ID
tg() { "$ROOT/scripts/lib/notify-telegram.sh" "$1" 2>/dev/null || true; }

# Resolvi DB-konteiner DÜNAAMILISELT (recreate muudab suffiksit — fikseeritud nimi aeguks).
resolve_db_container() {
  docker ps --format '{{.Names}}' | grep -E '^db-k33g' | head -1
}
resolve_medusa_container() {
  docker ps --format '{{.Names}}' | grep -E '^medusa-k33g' | head -1
}
resolve_worker_container() {
  docker ps --format '{{.Names}}' | grep -E '^medusa-worker-k33g' | head -1
}

# ── HEALTH-WAIT PARANDUS (2026-11-08, cutover-eeltingimus) ──────────────────────────────────
# JUURPÕHJUS: Coolify API on asünkroonne. curl annab 200 kohe (deploy QUEUED); Coolify ehitab
# image'i (npm build ~min) ja ALLES SIIS recreate'ib konteinerid. Vana `xl_wait_stack_healthy`
# luges k33g terveid konteinereid vanu/uusi ERISTAMATA → build'i ajal nägi VANU terveid ja tuli
# vara tagasi → lukk vabanes ENNE recreate'i (HARD RULE #9 race-aken) + "deployed" raporteeriti,
# kuigi uus kood polnud elus. *Tõestatud 2026-11-07: e-maili fix redeploy "healthy" → konteineri
# ajatempel muutumatu, fix-markereid built-koodis polnud; recreate juhtus alles mitu min hiljem.*
#
# PARANDUS: (1) oota Coolify deployment status=finished (build+recreate TÕESTI tehtud) →
# (2) oota UUTE konteinerite tervist (medusa/worker nimi MUUTUNUD vanast + healthy). Lukk hoitakse
# kogu akna vältel. deployment_uuid puudu → graceful fallback vanale (vähemalt ei jää rippuma).

# Oota kuni Coolify deployment lahkub queued/in_progress staatusest (finished/failed/…).
xl_wait_deployment_finished() {
  local dep="$1" wait_s="${2:-900}"
  local deadline=$(($(date +%s) + wait_s)) st
  echo "⏳ ootan Coolify deployment '$dep' lõppu (build+recreate, kuni ${wait_s}s)…"
  while :; do
    st="$(curl -s -H "Authorization: Bearer $COOLIFY_TOKEN" "$API_BASE/deployments/$dep" \
      | python3 -c "import json,sys; print(json.load(sys.stdin).get('status','?'))" 2>/dev/null || echo '?')"
    case "$st" in
      finished) echo "✅ deployment finished"; return 0 ;;
      failed|error|cancelled|cancelled-by-force) echo "❌ deployment staatus=$st" >&2; return 1 ;;
    esac
    if [ "$(date +%s)" -ge "$deadline" ]; then
      echo "⚠️  deployment ei lõppenud ${wait_s}s jooksul (viimane staatus=$st)" >&2; return 1
    fi
    sleep 10
  done
}

# Oota kuni UUED konteinerid (medusa+worker nimi MUUTUNUD vanast) on healthy + kogu stack >=5.
xl_wait_stack_recreated() {
  local old_med="$1" old_wrk="$2" wait_s="${3:-300}"
  local deadline=$(($(date +%s) + wait_s)) now_med now_wrk healthy
  echo "⏳ ootan UUTE konteinerite tervist (vana medusa='$old_med', kuni ${wait_s}s)…"
  while :; do
    now_med="$(resolve_medusa_container)"; now_wrk="$(resolve_worker_container)"
    healthy=$(docker ps --filter health=healthy --format '{{.Names}}' | grep -c '\-k33g' || echo 0)
    if [ -n "$now_med" ] && [ "$now_med" != "$old_med" ] && [ -n "$now_wrk" ] && [ "$now_wrk" != "$old_wrk" ] \
       && docker ps --filter health=healthy --format '{{.Names}}' | grep -q "^${now_med}$" \
       && docker ps --filter health=healthy --format '{{.Names}}' | grep -q "^${now_wrk}$" \
       && [ "$healthy" -ge 5 ]; then
      echo "✅ uus stack healthy (medusa=$now_med, worker=$now_wrk, $healthy healthy)"; return 0
    fi
    if [ "$(date +%s)" -ge "$deadline" ]; then
      echo "⚠️  uued konteinerid ei saanud ${wait_s}s jooksul healthy (medusa=$now_med, $healthy healthy) — vabastan luku, jälgi Coolify UI." >&2
      return 1
    fi
    sleep 5
  done
}

# ── STACK-LUKK (Tarmo 2026-10-09 item 1): deploy EI tohi recreate'ida konteinereid
# keset DB-kirjutavat tööd. Võta lukk → hoia KUNI stack tagasi healthy → siis vabasta.
# Kui DB-write käib → ootab kuni 20min, siis KEELDUB (ei riku pooleliolevat transaktsiooni). ──
source "$(dirname "$0")/lib/stack-lock.sh"
xl_lock_acquire "coolify-deploy" "${XL_DEPLOY_WAIT_S:-1200}" || exit 1
trap xl_lock_release EXIT

# ── REGEN slug-redirects.generated.json (HARD RULE #5: build-JSON genereeritakse AUTOMAATSELT
# deploy'l, MITTE käsitsi). DB loetakse docker exec psql kaudu (parooli-vaba). Kui JSON muutus →
# commit AINULT see üks fail (EKSPLITSIITNE path, EI glob) + push MÕLEMALE harule (HARD RULE #4).
# Lukk on juba käes → DB-töö ei käi → commit/push ohutu (HARD RULE #9). Push EI auto-deploy'i. ──
regen_slug_redirects() {
  local db; db="$(resolve_db_container)"
  if [ -z "$db" ]; then echo "⚠️  db-k33g konteinerit ei leitud — jätan slug-redirect regen'i vahele"; tg "⚠️ deploy: db-konteiner puudu, slug-redirect regen vahele"; return 0; fi
  echo "→ Regen slug-redirects.generated.json (DB=$db)…"
  if ! node "$ROOT/scripts/export-slug-redirects.mjs" --via-docker "$db"; then
    echo "❌ slug-redirect regen kukkus"; tg "❌ deploy: slug-redirect regen KUKKUS (export-slug-redirects.mjs)"; return 0
  fi
  local f="storefront/lib/slug-redirects.generated.json"
  if ! git -C "$ROOT" status --porcelain -- "$f" | grep -q .; then
    echo "  JSON muutumatu — commit pole vajalik."; return 0
  fi
  # `generatedAt`-ajatempel muutub IGAL jooksul → ilma selle filtrita committaks iga deploy (ka öine)
  # müra-commit'i + tarbetu dual-branch cherry-pick'i. Kui AINULT generatedAt-rida muutus (redirect-SISU
  # sama) → revert + skip. git diff -U0 näitab vaid muutunud read; väljenda ++/-- päised + generatedAt.
  if [ -z "$(git -C "$ROOT" diff -U0 -- "$f" | grep '^[+-]' | grep -vE '^(\+\+\+|---)' | grep -v '"generatedAt"')" ]; then
    echo "  Ainult generatedAt-ajatempel muutus (redirect-sisu sama) — revert + EI commiti."
    git -C "$ROOT" checkout -- "$f" 2>/dev/null || true
    return 0
  fi
  local br; br="$(git -C "$ROOT" rev-parse --abbrev-ref HEAD)"
  if [ "$br" != "main" ] && [ "$br" != "taxonomy-v4" ]; then
    echo "⚠️  haru '$br' pole main/taxonomy-v4 — jätan JSON working-tree'sse, EI commiti."; tg "⚠️ deploy: slug-redirect JSON muutus harul '$br' (ei commiti autom.)"; return 0
  fi
  # Commit AINULT see üks fail (git add -- <path>, mitte -A/glob → muud muudatused puutumata).
  git -C "$ROOT" add -- "$f"
  git -C "$ROOT" commit -q -m "chore(deploy): regen slug-redirects.generated.json (auto, deploy-time)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>" || { echo "  commit no-op"; return 0; }
  git -C "$ROOT" push -q origin "$br" && echo "  ✅ push origin $br"
  # Replay teisele harule (HARD RULE #4) worktree'is → working-tree'd EI puututa, cherry-pick -x.
  local other sha wt; sha="$(git -C "$ROOT" rev-parse HEAD)"
  other="main"; [ "$br" = "main" ] && other="taxonomy-v4"
  wt="$(mktemp -d)"
  if git -C "$ROOT" worktree add -q --detach "$wt" "origin/$other" 2>/dev/null \
     && git -C "$wt" cherry-pick -x "$sha" 2>/dev/null \
     && git -C "$wt" push -q origin "HEAD:$other" 2>/dev/null; then
    echo "  ✅ replay origin/$other"
  else
    echo "⚠️  replay harule '$other' kukkus (konflikt?) — kontrolli käsitsi"; tg "⚠️ deploy: slug-redirect commit EI jõudnud harule '$other' (HARD RULE #4 — kontrolli)"
  fi
  git -C "$ROOT" worktree remove --force "$wt" 2>/dev/null || true
}
regen_slug_redirects

echo "→ Coolify redeploy: $UUID (force=$FORCE)"
# Jäädvusta VANAD konteineri-nimed ENNE triggerit — recreated-värav võrdleb nende vastu.
OLD_MED="$(resolve_medusa_container)"; OLD_WRK="$(resolve_worker_container)"
echo "  vana medusa=$OLD_MED  vana worker=$OLD_WRK"
# Coolify API muutus (~2026-11): /api/v1/deploy on nüüd POST (varem GET andis 405
# "This endpoint has changed to a POST request."). uuid/force jäävad query-parameetritesse.
code=$(curl -s -X POST -o /tmp/coolify-deploy-resp.json -w "%{http_code}" \
  -H "Authorization: Bearer $COOLIFY_TOKEN" \
  "$API?uuid=${UUID}&force=${FORCE}")
echo "  HTTP $code"
cat /tmp/coolify-deploy-resp.json 2>/dev/null; echo
[ "$code" = "200" ] || { echo "❌ Ebaõnnestus (401=vale/aegunud token, 404=vale uuid)."; exit 1; }
# Parsi deployment_uuid vastusest (Coolify tagastab deployments[].deployment_uuid).
DEP_UUID="$(python3 -c "import json,sys
try: d=json.load(open('/tmp/coolify-deploy-resp.json'))
except Exception: sys.exit(0)
ds=d.get('deployments') or []
print(ds[0].get('deployment_uuid','') if ds else d.get('deployment_uuid',''))" 2>/dev/null || true)"
echo "✅ Deploy käivitatud (async, deployment_uuid=${DEP_UUID:-?}) — hoian stack-luku kuni UUED konteinerid healthy…"
# Coolify API on asünkroonne: build+recreate juhtub SIIN (mitte curl'i ajal). Lukk hoiab DB-tööd
# eemal kogu akna vältel (stack-lock EXIT-trap vabastab lõpus). PARANDUS 2026-11-08:
# (1) oota deployment status=finished → (2) oota UUTE konteinerite tervist. VANA
# xl_wait_stack_healthy tuli tagasi, niipea kui >=5 k33g-konteinerit (sh VANAD) olid healthy →
# vale "deployed". deployment_uuid puudu → kukutakse tagasi vanale terviku-ootele (≥5 healthy).
if [ -n "$DEP_UUID" ]; then
  xl_wait_deployment_finished "$DEP_UUID" "${XL_DEPLOY_FINISH_WAIT_S:-900}" \
    && xl_wait_stack_recreated "$OLD_MED" "$OLD_WRK" "${XL_DEPLOY_HEALTH_WAIT_S:-300}" \
    || { echo "⚠️  health-wait ei kinnitanud uut stacki — jälgi Coolify UI-s."; tg "⚠️ deploy k33g: health-wait EI kinnitanud uusi konteinereid (deployment=$DEP_UUID) — kontrolli Coolify UI"; }
else
  echo "⚠️  deployment_uuid puudu vastusest — fallback: ootan ainult ≥5 healthy (vana käitumine)."
  xl_wait_stack_healthy "${XL_DEPLOY_HEALTH_WAIT_S:-300}" || true
fi

# ── SITEMAP FAIL-LOUD VÄRAV (Tarmo 2026-10-13): kontrolli, et sitemap EI ole tühi/väike.
# EI fikseeritud numbrit (valideerimis-värava gotcha) — võrdle ELAVA DB toote-arvuga + hälve.
# JUURPÕHJUS mida see püüab: force-static prerenderdas build-ajal 0 tootega → ~30 URL-i. ──
sitemap_gate() {
  local db; db="$(resolve_db_container)"
  if [ -z "$db" ]; then echo "⚠️  sitemap-värav: db-konteiner puudu — jätan vahele"; return 0; fi
  # Tõe-allikas: avaldatud, kustutamata tooted (sitemap /store/products ≈ see). Loeme ELAVALT.
  local expected; expected="$(docker exec "$db" psql -U xlmarket -d xlmarket -tA \
    -c "SELECT count(*) FROM product WHERE deleted_at IS NULL AND status='published'" 2>/dev/null | tr -d '[:space:]')"
  if ! [[ "$expected" =~ ^[0-9]+$ ]] || [ "$expected" -lt 1 ]; then
    echo "⚠️  sitemap-värav: DB toote-arvu ei saanud ('$expected') — jätan värava vahele"; return 0
  fi
  echo "→ Sitemap-värav: tõmban $SITE_URL/sitemap.xml (oodatud ≥ $expected <loc>)…"
  local body loc
  body="$(curl -sk --max-time 90 "$SITE_URL/sitemap.xml" 2>/dev/null || true)"
  # grep -o 0-vastega → exit 1; `set -euo pipefail` all tapaks kogu skripti ENNE fail-loud tg()/exit 3.
  # Mähi grep { … || true; }-sse → 0 vastet = "0", värav teeb korrektse fail-loud'i (mitte vaikse exit 1).
  loc="$(printf '%s' "$body" | { grep -o '<loc>' || true; } | wc -l | tr -d '[:space:]')"
  # FLOOR: vähemalt ÜHE locale jagu tooteid (products). Tühja/katki (nt 30 URL-i) püüab kindlalt;
  # 2 locale + kategooriad teeb tegeliku arvu ~2×, nii et see on helde (isekohanduv) alumine lävi.
  if [ "${loc:-0}" -lt "$expected" ]; then
    echo "❌ SITEMAP KATKI: ainult ${loc:-0} <loc> (floor $expected). Tõenäoliselt tühi/truncated."
    tg "❌ $SITE_URL SITEMAP KATKI pärast deploy'd: ainult ${loc:-0} <loc>-kirjet (oodatud ≥ $expected toodet). Kontrolli sitemap.ts / medusa kättesaadavust."
    SITEMAP_FAIL=1
  else
    echo "✅ Sitemap OK: $loc <loc>-kirjet (floor $expected)."
  fi
}
SITEMAP_FAIL=0
sitemap_gate
echo "✅ Deploy valmis — jälgi Coolify UI-s."
[ "${SITEMAP_FAIL:-0}" = "1" ] && { echo "⚠️  Deploy tehtud, AGA sitemap-värav FAIL (vt Telegram)."; exit 3; }
exit 0
