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

# ── STACK-LUKK (Tarmo 2026-10-09 item 1): deploy EI tohi recreate'ida konteinereid
# keset DB-kirjutavat tööd. Võta lukk → hoia KUNI stack tagasi healthy → siis vabasta.
# Kui DB-write käib → ootab kuni 20min, siis KEELDUB (ei riku pooleliolevat transaktsiooni). ──
source "$(dirname "$0")/lib/stack-lock.sh"
xl_lock_acquire "coolify-deploy" "${XL_DEPLOY_WAIT_S:-1200}" || exit 1
trap xl_lock_release EXIT

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
echo "✅ Deploy valmis — jälgi Coolify UI-s."
