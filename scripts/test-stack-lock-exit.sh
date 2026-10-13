#!/usr/bin/env bash
# test-stack-lock-exit.sh — stack-luku VABASTUSE test KÕIGIS lõpphaarades (Tarmo 2026-10-13).
#
# TAUST (leke): import-pipeline.sh seadis rida ~41 `trap xl_lock_release EXIT`, AGA rida ~57 kirjutas
# EXIT-trapi ÜLE vea-print-trapiga (ilma release'ita), ja rida ~413 `trap - EXIT` kustutas trapi normaalse
# lõpu eel → lukk EI VABANENUD KUNAGI (ei normaalsel, ei vea-, ei signaali-lõpul). Ainult 45min stale-steal
# päästis. Tõestatud 2026-10-13: öine jooks rc=0 OK, pid surnud, lukufail jäi rippuma.
#
# SEE TEST simuleerib öist jooksu (import-pipeline luku-elutsükkel) 6 haarus ja nõuab: lukufail kadunud PÄRAST.
# Käivita: bash scripts/test-stack-lock-exit.sh
set -u
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export XL_LOCK_DIR; XL_LOCK_DIR="$(mktemp -d)"
LF="$XL_LOCK_DIR/xl-stack-write.lock"
LIB="$ROOT/scripts/lib/stack-lock.sh"
pass=0; fail=0
ok(){ if eval "$1"; then pass=$((pass+1)); else fail=$((fail+1)); echo "  ❌ $2"; fi; }
sec(){ echo "— $1 —"; }
cleanup(){ rm -rf "$XL_LOCK_DIR"; }
trap cleanup EXIT

# Lapse-skript, mis PEEGELDAB import-pipeline.sh luku-mustrit (acquire + _pipeline_atexit + trap EXIT,
# EI tee `trap - EXIT`). $1 = käitumine: ok | fail | sleep.
CHILD="$XL_LOCK_DIR/nightly-sim.sh"
cat > "$CHILD" <<CHILDEOF
set -euo pipefail
source "$LIB"
EXECUTE=1
xl_lock_acquire "import-pipeline-test" 5
_pipeline_atexit() {
  local rc=\$?
  [ "\$rc" -ne 0 ] && echo "SIM-KATKES rc=\$rc" >&2
  [ "\$EXECUTE" = "1" ] && command -v xl_lock_release >/dev/null 2>&1 && xl_lock_release
}
trap _pipeline_atexit EXIT
echo "CHILD-PID=\$\$"
case "\${1:-ok}" in
  ok)    echo "SIM tööd tehtud (rc=0)";;
  fail)  false;;                       # set -e → rc=1 (simuleerib sammu-viga)
  sleep) sleep 60 & wait \$!;;          # taustal + wait: bash KATKESTAB wait-builtini signaalil KOHE (→ trap)
esac
CHILDEOF

# 1. NORMAALNE LÕPP (rc=0) ──────────────────────────────────────────────────────────────────────
sec "1. normaalne lõpp (rc=0) → lukk vaba"
bash "$CHILD" ok >/dev/null 2>&1; rc=$?
ok '[ "$rc" = "0" ]' "normaalne jooks rc=0 (sai=$rc)"
ok '[ ! -f "$LF" ]' "lukufail KADUNUD peale normaalset lõppu"

# 2. VEA-LÕPP (rc!=0) ───────────────────────────────────────────────────────────────────────────
sec "2. vea-lõpp (rc!=0) → lukk vaba"
bash "$CHILD" fail >/dev/null 2>&1; rc=$?
ok '[ "$rc" != "0" ]' "vea-jooks rc!=0 (sai=$rc)"
ok '[ ! -f "$LF" ]' "lukufail KADUNUD peale vea-lõppu"

# 3-5. SIGNAALID (TERM/INT/HUP) ─────────────────────────────────────────────────────────────────
sig_test() {
  local signame="$1" signum="$2"
  sec "$signame → lukk vaba"
  bash "$CHILD" sleep >/dev/null 2>&1 &
  local child=$!
  # oota kuni lukufail tekib (laps võttis luku)
  local i=0; while [ ! -f "$LF" ] && [ $i -lt 50 ]; do sleep 0.1; i=$((i+1)); done
  ok '[ -f "$LF" ]' "$signame: laps võttis luku (fail olemas enne signaali)"
  kill -s "$signum" "$child" 2>/dev/null
  wait "$child" 2>/dev/null; local rc=$?
  ok "[ \"$rc\" != \"0\" ]" "$signame: laps suri signaaliga (rc=$rc, oodatud 128+$signum)"
  ok '[ ! -f "$LF" ]' "$signame: lukufail KADUNUD peale signaali"
}
# NB: SIGTERM (cron timeout / süsteemi-shutdown) + SIGHUP (sessiooni-katkestus / SSH-disconnect) = öise crON-i
# REAALSED katkestus-signaalid. SIGINT (Ctrl-C) = interaktiivne-ainult; cron EI saada seda kunagi, ja mitte-
# interaktiivne bg-laps pärib SIGINT=SIG_IGN (POSIX) → siit usaldusväärselt testida ei saa. Lib käsitleb INT-i
# IDENTSELT (_xl_lock_arm_signals → sama handler kõigile kolmele) → TERM+HUP läbimine tõestab INT-i.
sig_test "3. SIGTERM" TERM
sig_test "4. SIGHUP"  HUP

# 6. COOLIFY-muster (üks `trap xl_lock_release EXIT`, ei klobberda) signaali all ──────────────────
sec "6. coolify-deploy muster (trap EXIT) + SIGTERM → lukk vaba"
COOLSIM="$XL_LOCK_DIR/coolify-sim.sh"
cat > "$COOLSIM" <<COOLEOF
set -u
source "$LIB"
xl_lock_acquire "coolify-deploy-test" 5
trap xl_lock_release EXIT
echo "COOL-PID=\$\$"
sleep 60 & wait \$!
COOLEOF
bash "$COOLSIM" >/dev/null 2>&1 &
cpid=$!
i=0; while [ ! -f "$LF" ] && [ $i -lt 50 ]; do sleep 0.1; i=$((i+1)); done
ok '[ -f "$LF" ]' "coolify: lukk võetud"
kill -s TERM "$cpid" 2>/dev/null; wait "$cpid" 2>/dev/null
ok '[ ! -f "$LF" ]' "coolify: lukufail KADUNUD peale SIGTERM (keskne signaali-trap vabastas)"

# 7. RE-ENTRANT: päritud laps EI vabasta vanema lukku ────────────────────────────────────────────
sec "7. re-entrant päritud laps ei varasta/vabasta vanema lukku"
source "$LIB"
xl_lock_acquire "parent-test" 5            # see protsess hoiab reaalset lukku (XL_STACK_LOCK_HELD=1 eksporditud)
ok '[ -f "$LF" ]' "parent võttis reaalse luku"
bash -c "source '$LIB'; xl_lock_acquire child 5; exit 0" >/dev/null 2>&1   # päritud → acquire+exit no-op
ok '[ -f "$LF" ]' "parent lukk säilis peale päritud lapse normaalset lõppu (ei vabastanud vanema oma)"
PID_NOW=$(grep -oE '"pid":[0-9]+' "$LF" | grep -oE '[0-9]+' | head -1)
ok '[ "$PID_NOW" = "$$" ]' "lukufail endiselt parent-pidi oma"
xl_lock_release
ok '[ ! -f "$LF" ]' "parent release kustutas luku"

echo ""
[ "$fail" = 0 ] && echo "🟢 kokku: $pass läbis, $fail kukkus" || echo "🔴 kokku: $pass läbis, $fail kukkus"
exit $(( fail == 0 ? 0 : 1 ))
