#!/usr/bin/env bash
# Coolify redeploy trigger — k33g STAGING (brrr-xlmarket-staging, applicationId=2).
# Token loetakse /opt/eumotors-tasks/.env-ist (COOLIFY_TOKEN=...) — SKRIPT ISE EI SISALDA SALADUST.
# Kust token: Coolify UI → Keys & Tokens → API tokens → Create New. Pane .env-i.
# Kasutus:  bash scripts/coolify-deploy.sh
#           bash scripts/coolify-deploy.sh --force   # sunni rebuild ka kui commit sama
set -euo pipefail

ENV_FILE="/opt/eumotors-tasks/.env"
UUID="k33g510dw19uyjau3ca7dqpi"           # k33g compose-app uuid (= volume/projekti prefiks)
API="http://localhost:8000/api/v1/deploy"

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
SITE_URL="${XL_SITE_URL:-https://xlmarket.ee}"

# Telegram-muutujad samamoodi grep'iga (EI source'i — COOLIFY_TOKEN 'N|'-väärtus katkestaks).
# Telegrami token 'digits:hash' → ':' on grep/cut-ohutu (lõikame '=' pealt). Väärtusi EI logita.
TELEGRAM_BOT_TOKEN="$(grep -m1 '^TELEGRAM_BOT_TOKEN=' "$ENV_FILE" | cut -d= -f2- || true)"; export TELEGRAM_BOT_TOKEN
TELEGRAM_CHAT_ID="$(grep -m1 '^TELEGRAM_CHAT_ID=' "$ENV_FILE" | cut -d= -f2- || true)"; export TELEGRAM_CHAT_ID
tg() { "$ROOT/scripts/lib/notify-telegram.sh" "$1" 2>/dev/null || true; }

# Resolvi DB-konteiner DÜNAAMILISELT (recreate muudab suffiksit — fikseeritud nimi aeguks).
resolve_db_container() {
  docker ps --format '{{.Names}}' | grep -E '^db-k33g' | head -1
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
code=$(curl -s -o /tmp/coolify-deploy-resp.json -w "%{http_code}" \
  -H "Authorization: Bearer $COOLIFY_TOKEN" \
  "$API?uuid=${UUID}&force=${FORCE}")
echo "  HTTP $code"
cat /tmp/coolify-deploy-resp.json 2>/dev/null; echo
[ "$code" = "200" ] || { echo "❌ Ebaõnnestus (401=vale/aegunud token, 404=vale uuid)."; exit 1; }
echo "✅ Deploy käivitatud (async) — hoian stack-luku kuni konteinerid tagasi healthy…"
# Coolify API on asünkroonne: recreate juhtub SIIN, mitte curl'i ajal. Lukk hoiab DB-tööd eemal
# kogu recreate-akna vältel (vt stack-lock EXIT-trap vabastab lõpus).
xl_wait_stack_healthy "${XL_DEPLOY_HEALTH_WAIT_S:-300}" || true

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
  loc="$(printf '%s' "$body" | grep -o '<loc>' | wc -l | tr -d '[:space:]')"
  # FLOOR: vähemalt ÜHE locale jagu tooteid (products). Tühja/katki (nt 30 URL-i) püüab kindlalt;
  # 2 locale + kategooriad teeb tegeliku arvu ~2×, nii et see on helde (isekohanduv) alumine lävi.
  if [ "${loc:-0}" -lt "$expected" ]; then
    echo "❌ SITEMAP KATKI: ainult ${loc:-0} <loc> (floor $expected). Tõenäoliselt tühi/truncated."
    tg "❌ xlmarket.ee SITEMAP KATKI pärast deploy'd: ainult ${loc:-0} <loc>-kirjet (oodatud ≥ $expected toodet). Kontrolli sitemap.ts / medusa kättesaadavust."
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
