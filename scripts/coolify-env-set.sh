#!/usr/bin/env bash
# coolify-env-set.sh — SET k33g STAGING app-env muutuja(d) Coolify API kaudu (WRITE).
#
# Token loetakse /opt/eumotors-tasks/.env-ist (COOLIFY_TOKEN=...) — SKRIPT ISE EI SISALDA SALADUST.
# Sama token-kapseldus kui coolify-deploy.sh (grep+cut, |-kindel, EI source'i).
#
# 🛑 HARD RULE #12: AINULT staging k33g. uo28 (prod) → KÕVA KEELD. Iga write → logi + Telegram.
# 🛑 HARD RULE #11: muutuja VÄÄRTUST ei prindita KUNAGI. Boolean-lipud (true/false/tühi) kuvatakse
#    literaalina (lubatud, nagu EMAIL_DISABLED); muu väärtus → ainult sha12 + pikkus.
#
# Muutujate ALLOWLIST (ainult need tohib seada): NEWSLETTER_COLLECTION_ENABLED,
#   NEXT_PUBLIC_NEWSLETTER_ENABLED, EMAIL_DISABLED, EMAIL_ALLOWLIST.
#
# Kasutus:
#   bash scripts/coolify-env-set.sh NEWSLETTER_COLLECTION_ENABLED=true NEXT_PUBLIC_NEWSLETTER_ENABLED=true
#   bash scripts/coolify-env-set.sh EMAIL_ALLOWLIST=@/path/fail      # väärtus failist (väldib ps/history-leket)
#   bash scripts/coolify-env-set.sh EMAIL_DISABLED=true --dry-run    # näita plaan, ÄRA kirjuta
#   bash scripts/coolify-env-set.sh NEXT_PUBLIC_NEWSLETTER_ENABLED=true --build-time  # märgi is_build_time
#
# Märkus: väärtus seatakse AINULT mitte-preview kirjele (is_preview=false = päris-deploy).
# Pärast kirjutust kontrollib, et õige kirje updated_at muutus. Deploy EI käivitu (tee eraldi
# coolify-deploy.sh — NEXT_PUBLIC_* vajab REBUILD'i, et build-ajal bake'ida).
set -euo pipefail

ENV_FILE="/opt/eumotors-tasks/.env"
K33G_UUID="k33g510dw19uyjau3ca7dqpi"           # staging compose-app (LUBATUD)
UO28_UUID="uo28ovobnflauslqjgxeohl0"           # prod coming-soon (KÕVA KEELD — HARD RULE #12 r2)
API_BASE="http://localhost:8000/api/v1"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
AUDIT_LOG="$ROOT/reports/coolify-env-writes.log"

ALLOWLIST="NEWSLETTER_COLLECTION_ENABLED NEXT_PUBLIC_NEWSLETTER_ENABLED EMAIL_DISABLED EMAIL_ALLOWLIST"
# Lipud, mille väärtus on boolean/mittesaladus → tohib literaalina logida (HARD RULE #11 erand).
BOOL_OK="NEWSLETTER_COLLECTION_ENABLED NEXT_PUBLIC_NEWSLETTER_ENABLED EMAIL_DISABLED"

DRY="false"; BUILD_TIME="false"; ARGS=()
for a in "$@"; do
  case "$a" in
    --dry-run) DRY="true" ;;
    --build-time) BUILD_TIME="true" ;;
    *=*) ARGS+=("$a") ;;
    *) echo "❌ tundmatu argument: '$a' (oota KEY=VALUE | --dry-run | --build-time)"; exit 2 ;;
  esac
done
[ "${#ARGS[@]}" -gt 0 ] || { echo "❌ vähemalt üks KEY=VALUE nõutav"; exit 2; }

# ── Token (EI source'i; |-kindel grep+cut; jutumärgid maha) ──────────────────────────────────
[ -f "$ENV_FILE" ] || { echo "❌ $ENV_FILE puudub"; exit 1; }
COOLIFY_TOKEN="$(grep -m1 '^COOLIFY_TOKEN=' "$ENV_FILE" | cut -d= -f2- || true)"
COOLIFY_TOKEN="${COOLIFY_TOKEN%\"}"; COOLIFY_TOKEN="${COOLIFY_TOKEN#\"}"
COOLIFY_TOKEN="${COOLIFY_TOKEN%\'}"; COOLIFY_TOKEN="${COOLIFY_TOKEN#\'}"
[ -n "${COOLIFY_TOKEN:-}" ] || { echo "❌ COOLIFY_TOKEN puudub $ENV_FILE-is"; exit 1; }

# ── Sihtrakendus FIKSEERITUD k33g. uo28 EI OLE siit kättesaadav (HARD RULE #12 r2). ──────────
UUID="$K33G_UUID"
if [ "$UUID" = "$UO28_UUID" ]; then echo "🛑 uo28 (prod) KEELATUD — ainult Tarmo loal, eraldi tööriist"; exit 3; fi

# Telegram (grep, EI source — COOLIFY_TOKEN 'N|' katkestaks). Väärtusi EI logita.
TELEGRAM_BOT_TOKEN="$(grep -m1 '^TELEGRAM_BOT_TOKEN=' "$ENV_FILE" | cut -d= -f2- || true)"; export TELEGRAM_BOT_TOKEN
TELEGRAM_CHAT_ID="$(grep -m1 '^TELEGRAM_CHAT_ID=' "$ENV_FILE" | cut -d= -f2- || true)"; export TELEGRAM_CHAT_ID
tg() { "$ROOT/scripts/lib/notify-telegram.sh" "$1" 2>/dev/null || true; }

# sha12 + pikkus ILMA väärtust printimata (HARD RULE #11).
mask() { # $1=key $2=value → "literal" boolidele, muidu "sha12=.. len=.."
  local k="$1" v="$2"
  if echo " $BOOL_OK " | grep -q " $k "; then printf 'väärtus="%s"' "$v"; else
    printf 'sha12=%s len=%s' "$(printf '%s' "$v" | sha256sum | cut -c1-12)" "${#v}"; fi
}

# Loe üks env-kirje (mitte-preview) → tagastab uuid või tühi (olemasolu-kontroll, väärtust ei loe).
env_uuid_for() { # $1=key
  curl -s -H "Authorization: Bearer $COOLIFY_TOKEN" "$API_BASE/applications/$UUID/envs" \
    | KEY="$1" python3 -c '
import json,sys,os
rows=json.load(sys.stdin); k=os.environ["KEY"]
for r in (rows if isinstance(rows,list) else []):
    if r.get("key")==k and not r.get("is_preview"): print(r.get("uuid","")); break
'
}
env_updated_for() { # $1=key → updated_at mitte-preview kirjele
  curl -s -H "Authorization: Bearer $COOLIFY_TOKEN" "$API_BASE/applications/$UUID/envs" \
    | KEY="$1" python3 -c '
import json,sys,os
rows=json.load(sys.stdin); k=os.environ["KEY"]
for r in (rows if isinstance(rows,list) else []):
    if r.get("key")==k and not r.get("is_preview"): print(r.get("updated_at","")); break
'
}

echo "── coolify-env-set → k33g STAGING ($UUID) · is_preview=false · build_time=$BUILD_TIME · dry=$DRY ──"
mkdir -p "$ROOT/reports"
RC=0
for pair in "${ARGS[@]}"; do
  KEY="${pair%%=*}"; RAW="${pair#*=}"
  # ALLOWLIST-värav
  if ! echo " $ALLOWLIST " | grep -q " $KEY "; then
    echo "🛑 '$KEY' EI ole allowlist'is ($ALLOWLIST) — vahele"; RC=4; continue
  fi
  # Väärtus failist (@path) → väldib ps/history-leket PII/saladuse puhul.
  VAL="$RAW"
  if [ "${RAW#@}" != "$RAW" ]; then
    f="${RAW#@}"; [ -f "$f" ] || { echo "🛑 $KEY: fail '$f' puudub"; RC=5; continue; }
    VAL="$(cat "$f")"
  fi

  EXISTING="$(env_uuid_for "$KEY" || true)"
  BEFORE="$(env_updated_for "$KEY" || true)"
  if [ -n "$EXISTING" ]; then METHOD="PATCH"; OP="uuenda (kirje ${EXISTING:0:8})"; else METHOD="POST"; OP="LOO uus"; fi
  echo "• $KEY → $OP · $(mask "$KEY" "$VAL")"

  if [ "$DRY" = "true" ]; then continue; fi

  # Payload node'iga (escapib väärtuse ohutult; väärtust EI prindita). is_literal=true → Coolify
  # ei tõlgenda $-märke (meie väärtused on true/false/email-list — literaal ohutu).
  RESP="$(KEY="$KEY" VAL="$VAL" BT="$BUILD_TIME" node -e '
    process.stdout.write(JSON.stringify({
      key: process.env.KEY, value: process.env.VAL,
      is_preview: false, is_buildtime: process.env.BT==="true",
      is_literal: true, is_multiline: false, is_shown_once: false
    }))' \
    | curl -s -o /tmp/coolify-env-resp.json -w "%{http_code}" \
        -X "$METHOD" -H "Authorization: Bearer $COOLIFY_TOKEN" \
        -H "Content-Type: application/json" --data-binary @- \
        "$API_BASE/applications/$UUID/envs")"

  if [ "$RESP" = "200" ] || [ "$RESP" = "201" ]; then
    AFTER="$(env_updated_for "$KEY" || true)"
    # Verifitseeri: kirje nüüd olemas JA (loomisel) või updated_at muutus (uuendusel).
    NOWUUID="$(env_uuid_for "$KEY" || true)"
    if [ -z "$NOWUUID" ]; then echo "  ⚠️ HTTP $RESP aga kirje puudub verifis — kontrolli UI"; RC=6; continue; fi
    if [ -n "$EXISTING" ] && [ "$AFTER" = "$BEFORE" ]; then
      echo "  ⚠️ HTTP $RESP aga updated_at ei muutunud ($BEFORE) — kontrolli UI"; RC=6; continue
    fi
    LINE="$(date -u +%FT%TZ) k33g $METHOD $KEY $(mask "$KEY" "$VAL") is_preview=false build_time=$BUILD_TIME http=$RESP uuid=${NOWUUID:0:8} updated=$AFTER"
    echo "  ✅ HTTP $RESP · kirje ${NOWUUID:0:8} updated=$AFTER"
    echo "$LINE" >> "$AUDIT_LOG"
    tg "🔧 Coolify k33g env: $METHOD $KEY ($(mask "$KEY" "$VAL")) is_preview=false → HTTP $RESP (uuid ${NOWUUID:0:8}). Vajab redeploy't, et jõustuks."
  else
    echo "  ❌ HTTP $RESP (401=write-õigus puudub, 404=vale uuid/endpoint, 422=valideerimis-viga)"
    cat /tmp/coolify-env-resp.json 2>/dev/null | sed -E 's/("value"[[:space:]]*:[[:space:]]*)"[^"]*"/\1"<MASKED>"/g'; echo
    tg "❌ Coolify k33g env $METHOD $KEY ebaõnnestus (HTTP $RESP) — vt logi"
    RC=1
  fi
done

rm -f /tmp/coolify-env-resp.json 2>/dev/null || true
[ "$RC" = 0 ] && echo "✅ VALMIS" || echo "⚠️ lõpetatud veakoodiga $RC"
exit "$RC"
