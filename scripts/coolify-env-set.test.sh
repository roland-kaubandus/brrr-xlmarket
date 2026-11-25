#!/usr/bin/env bash
# coolify-env-set.test.sh — turvatest coolify-env-set.sh'le (HARD RULE #11 + #12).
#   Stiil: with-llm-env.test.sh. Jooksuta: bash scripts/coolify-env-set.test.sh  (EI vaja võrku).
set -uo pipefail
cd "$(dirname "$0")/.."
S="scripts/coolify-env-set.sh"
FAIL=0
pass() { echo "  ✓ $1"; }
fail() { echo "  ✗ $1"; FAIL=1; }
[ -f "$S" ] || { echo "🔴 puudub $S"; exit 1; }

echo "── 1) LEKKE-GREP: skript ei prindi muutuja VÄÄRTUST (RAW/VAL raw echo/printf) ──"
# Lubatud: sha256/mask, väärtuse lugemine node env-i (process.env.VAL → curl stdin, EI meie stdout),
#          BOOL_OK literaal mask()-is (local $v, explicit #11 erand). Keelatud: $VAL/$RAW raw print.
hits="$(grep -nE '(echo|printf)[^#]*\$\{?(VAL|RAW)\b' "$S" | grep -vE 'sha256|mask ' || true)"
[ -z "$hits" ] && pass "ei prindi \$VAL/\$RAW väärtust" || { fail "prindib väärtust:"; echo "$hits" | sed 's/^/      /'; }
grep -qE '\bprintenv\b' "$S" && { fail "sisaldab printenv'i"; } || pass "ei kasuta printenv'i"
grep -qE 'JSON\.stringify\(process\.env\)' "$S" && fail "dumpab kogu process.env" || pass "ei dumpa process.env"
# Token ei tohi kunagi stdout/logisse minna — leke = muutuja-LAIEND $COOLIFY_TOKEN echo/printf'is
# (sõna "COOLIFY_TOKEN" literaalina veateates on OK — see ei paljasta väärtust).
grep -nE '(echo|printf)[^#]*\$\{?COOLIFY_TOKEN' "$S" && fail "kajab tokeni väärtust" || pass "ei kaja COOLIFY_TOKEN väärtust"

echo "── 2) uo28 (PROD) KÕVA KEELD + siht fikseeritud k33g ──"
grep -q 'UO28_UUID="uo28ovobnflauslqjgxeohl0"' "$S" && pass "uo28 uuid tuntud konstandina" || fail "uo28 konstant puudub"
grep -q 'UUID="\$K33G_UUID"' "$S" && pass "siht fikseeritud k33g" || fail "siht EI ole fikseeritud k33g"
grep -qiE 'uo28.*(KEEL|KEELATUD|deny)' "$S" && pass "uo28 keeld-haru olemas" || fail "uo28 keeld-haru puudub"
# Skript EI tohi kunagi POSTi/PATCHi uo28 uuid-le
grep -nE "applications/\\\$?\{?UO28" "$S" && fail "kirjutab uo28 uuid-le" || pass "ei kirjuta kunagi uo28-le"

echo "── 3) ALLOWLIST + is_preview eksplitsiitne (HARD RULE #12 r3) ──"
grep -q 'ALLOWLIST="NEWSLETTER_COLLECTION_ENABLED NEXT_PUBLIC_NEWSLETTER_ENABLED EMAIL_DISABLED EMAIL_ALLOWLIST"' "$S" \
  && pass "allowlist = 4 lubatud muutujat" || fail "allowlist vale/puudub"
grep -qi 'EI ole allowlist' "$S" && pass "allowlist-värav keeldub võõrast võtmest" || fail "allowlist-värav puudub"
grep -q 'is_preview: false' "$S" && pass "is_preview=false eksplitsiitne" || fail "is_preview puudub payloadist"
grep -q 'updated_at' "$S" && pass "verifitseerib updated_at muutust" || fail "updated_at-verif puudub"
grep -q 'notify-telegram' "$S" && pass "Telegram-teade (HARD RULE #12)" || fail "Telegram puudub"
grep -q 'AUDIT_LOG' "$S" && pass "audit-logi rida" || fail "audit-logi puudub"

echo "── 4) KÄITUMINE: keeldub valedest argumentidest (ei vaja võrku) ──"
run() { bash "$S" "$@" >/dev/null 2>&1; echo $?; }
[ "$(run --kurjus)" = "2" ] && pass "keeldub tundmatust lipust" || fail "ei keeldunud tundmatust lipust"
[ "$(run)" = "2" ] && pass "keeldub tühjast (KEY=VALUE nõutav)" || fail "ei keeldunud tühjast"
# Non-allowlist KEY → RC 4 (allowlist-värav enne võrku; token loetakse aga GETi ei tehta)
if [ -f /opt/eumotors-tasks/.env ]; then
  [ "$(run FOO=bar --dry-run)" = "4" ] && pass "keeldub allowlist-välisest võtmest (RC4)" || fail "ei keeldunud võõrast võtmest"
else
  echo "  … (vahele: .env puudub, behavioral allowlist-test nõuab tokenit)"
fi

echo "── 5) NEXT_PUBLIC_* → is_buildtime=true AUTOMAATNE (2026-11-25 regressiooni-lukk) ──"
# staatiline: auto-force haru olemas
grep -qE 'case "\$KEY" in NEXT_PUBLIC_\*\) KBT="true"' "$S" && pass "NEXT_PUBLIC_* sunnib KBT=true" || fail "NEXT_PUBLIC_* auto-force puudub"
# käitumuslik (dry-run; GET localhost:8000, POST/PATCH-i EI tehta) — nõuab tokenit
if [ -f /opt/eumotors-tasks/.env ]; then
  out="$(bash "$S" NEXT_PUBLIC_NEWSLETTER_ENABLED=true --dry-run 2>&1)"
  echo "$out" | grep -qE 'is_buildtime=true' && pass "NEXT_PUBLIC → is_buildtime=true (dry-run)" || { fail "NEXT_PUBLIC ei sundinud build-time'i:"; echo "$out" | sed 's/^/      /'; }
  echo "$out" | grep -qiE 'rebuild' && pass "hoiatab rebuild'i vajadusest" || { fail "rebuild-hoiatus puudub:"; echo "$out" | sed 's/^/      /'; }
  out2="$(bash "$S" EMAIL_DISABLED=true --dry-run 2>&1)"
  echo "$out2" | grep -qE 'is_buildtime=false' && pass "mitte-NEXT_PUBLIC jääb is_buildtime=false" || { fail "EMAIL_DISABLED polnud is_buildtime=false:"; echo "$out2" | sed 's/^/      /'; }
else
  echo "  … (vahele: .env puudub — dry-run nõuab tokenit)"
fi

echo
[ "$FAIL" = 0 ] && echo "✅ KÕIK ROHELINE" || { echo "🔴 TEST KUKKUS"; exit 1; }
