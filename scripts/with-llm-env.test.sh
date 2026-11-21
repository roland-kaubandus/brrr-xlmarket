#!/usr/bin/env bash
# with-llm-env.test.sh — turvatest wrapperile + allowlist'i skriptidele.
#   (Tarmo 2026-11-19 tingimus #1: grep-kontroll — ükski allowlist'i skript ei tohi logida
#    process.env / ANTHROPIC_API_KEY VÄÄRTUST. Leke → test KUKUB LÄBI.)
#
#   Jooksuta: bash scripts/with-llm-env.test.sh   (EI vaja võtit; --check-i test on eraldi)
set -uo pipefail
cd "$(dirname "$0")/.."
FAIL=0
pass() { echo "  ✓ $1"; }
fail() { echo "  ✗ $1"; FAIL=1; }

ALLOW=(
  "scripts/en-master-backfill.mjs"
  "scripts/en-master-detect.mjs"
  "scripts/en-master-remetric.mjs"
  "scripts/en-master-review.mjs"
  "scripts/with-llm-env.sh"
)

echo "── 1) LEKKE-GREP: allowlist'i skriptid ei logi võtme VÄÄRTUST ──"
# Eristus: VÄÄRTUSE logimine (keelatud) vs nime-mainimine stringis / olemasolu-test / räsi (lubatud).
#   .mjs: eemalda KÕIK stringiliteraalid ("…" ja '…') → prose-mainimine kaob; siis otsi võtit
#         print-funktsiooni ARGUMENDIST (väärtusena) või tervet env-i dumpi.
#   .sh : echo/printf raw $ANTHROPIC_API_KEY-ga, VÄLJA ARVATUD sha256/pikkus(${#})/KEY_PRESENT.
for f in "${ALLOW[@]}"; do
  [ -f "$f" ] || { fail "puudub: $f"; continue; }
  case "$f" in
    *.mjs|*.js)
      hits=$(sed -E 's/"[^"]*"//g; s/'\''[^'\'']*'\''//g' "$f" \
        | grep -nE '(console\.(log|error|warn|info|debug)|process\.(stdout|stderr)\.write)\([^)]*(ANTHROPIC_API_KEY|API_KEY|apiKey)|JSON\.stringify\(process\.env' || true) ;;
    *.sh)
      hits=$(grep -nE '(echo|printf)[^|]*\$\{?ANTHROPIC_API_KEY' "$f" \
        | grep -vE 'sha256|\$\{#ANTHROPIC_API_KEY|KEY_PRESENT' || true) ;;
    *) hits="" ;;
  esac
  if [ -n "$hits" ]; then fail "$f LOGIB võtme väärtust:"; echo "$hits" | sed 's/^/      /'; else pass "$f — ei logi võtit (ainult loeb/testib/räsib)"; fi
done

echo "── 2) WRAPPER keeldub valedest sisenditest (EI source'i enne kontrolle) ──"
run() { bash scripts/with-llm-env.sh "$@" >/dev/null 2>&1; echo $?; }
[ "$(run node scripts/kurjus.mjs)" = "97" ] && pass "keeldub allowlist'i-välisest skriptist" || fail "ei keeldunud allowlist'i-välisest"
[ "$(run node scripts/en-master-detect.mjs -e 'x')" = "97" ] && pass "keeldub -e eval-lipust" || fail "ei keeldunud -e eval-lipust"
[ "$(run node scripts/en-master-detect.mjs --eval 'x')" = "97" ] && pass "keeldub --eval lipust" || fail "ei keeldunud --eval lipust"
[ "$(run python3 -c 'x')" = "97" ] && pass "keeldub mitte-node käsust" || fail "ei keeldunud mitte-node käsust"

echo "── 3) WRAPPER ise ei kaja võtit (ainult pikkus/hash) ──"
if grep -nE 'printf|echo' scripts/with-llm-env.sh | grep -E 'ANTHROPIC_API_KEY' | grep -vE '\$\{#ANTHROPIC_API_KEY\}|sha256|KEY_PRESENT'; then
  fail "wrapper kajab võtit"
else pass "wrapper kuvab ainult pikkuse + sha256"; fi

echo
[ "$FAIL" = 0 ] && echo "✅ KÕIK ROHELINE" || { echo "🔴 TEST KUKKUS"; exit 1; }
