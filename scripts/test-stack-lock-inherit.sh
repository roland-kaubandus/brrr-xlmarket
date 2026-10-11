#!/usr/bin/env bash
# test-stack-lock-inherit.sh — stack-luku VANEMA-HOIDMISE pärandumise test (Tarmo 2026-10-12).
#
# SIMULEERIB ÖIST JOOKSU, kus glossary [6.4] on LIVE: import-pipeline.sh (bash) hoiab stack-lukku
# KOGU --execute jooksu, ja kutsub node-alamsamme (glossary, outlet-ristkuvamine), mis omakorda teevad
# DB-kirjutuse withStackLock all. ENNE parandust: node withStackLock nägi elusat PID-faili (teine pid kui
# bash), ootas 60s, viskas ELOCKBUSY → glossary LIVE kirjutus EI ÕNNESTUNUD KUNAGI öises hookis.
# PÄRAST parandust: teek tunneb XL_STACK_LOCK_HELD=1 (päritud env) ÄRA → re-entrant no-op → kirjutus õnnestub.
#
# Käivita: bash scripts/test-stack-lock-inherit.sh
set -u
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export XL_LOCK_DIR; XL_LOCK_DIR="$(mktemp -d)"
LF="$XL_LOCK_DIR/xl-stack-write.lock"
pass=0; fail=0
ok(){ if eval "$1"; then pass=$((pass+1)); else fail=$((fail+1)); echo "  ❌ $2"; fi; }
sec(){ echo "— $1 —"; }

cleanup(){ rm -rf "$XL_LOCK_DIR"; }
trap cleanup EXIT

source "$ROOT/scripts/lib/stack-lock.sh"

# ── 1. Parent (simuleerib pipeline rida 40) võtab REAALSE luku ────────────────────────────────
sec "parent (pipeline) võtab reaalse luku"
xl_lock_acquire "test-pipeline" 5
ok '[ -f "$LF" ]' "parent lukufail loodud"
ok '[ "${XL_STACK_LOCK_HELD:-}" = "1" ]' "XL_STACK_LOCK_HELD eksporditud peale acquire (pärandub alamatele)"
PPID_LOCK=$(grep -oE '"pid":[0-9]+' "$LF" | grep -oE '[0-9]+' | head -1)
ok '[ "$PPID_LOCK" = "$$" ]' "lukufail kuulub parent-pidile"

# ── 2. Node-alam (simuleerib glossary [6.4] LIVE DB-kirjutust) — peab õnnestuma KOHE ──────────
sec "node-alam (glossary LIVE) withStackLock all — EI tohi hanguda/kukkuda"
NODE_OUT=$(node --input-type=module -e "
import('file://$ROOT/scripts/lib/stack-lock.mjs').then(async ({ withStackLock }) => {
  const t0 = Date.now();
  await withStackLock({ holder: 'glossary-live-sim', waitMs: 3000 }, async () => { console.log('CHILD-WROTE'); });
  const dt = Date.now() - t0;
  if (dt > 1000) { console.error('HANG ' + dt + 'ms (oleks pidanud olema kohene no-op)'); process.exit(2); }
  console.log(process.env.XL_STACK_LOCK_HELD === '1' ? 'no-op (vanema-lukk päritud)' : 'NOENV');
}).catch((e) => { console.error('THREW ' + e.message); process.exit(1); });
" 2>&1); NODE_RC=$?
ok '[ "$NODE_RC" = "0" ]' "node-alam õnnestus rc=0 (glossary LIVE kirjutus ei hangunud/kukkunud): $NODE_OUT"
ok 'echo "$NODE_OUT" | grep -q CHILD-WROTE' "node-alam callback jooksis (DB-kirjutus toimus)"
ok 'echo "$NODE_OUT" | grep -q "no-op"' "node-alam tuvastas vanema-luku (re-entrant no-op, PID-faili EI võtnud)"

# ── 3. Parent lukk säilis peale node-alama tagasitulekut ──────────────────────────────────────
sec "parent lukk säilib peale node-alama lõppu"
ok '[ -f "$LF" ]' "parent lukufail säilis (node ei kustutanud)"
PID2=$(grep -oE '"pid":[0-9]+' "$LF" | grep -oE '[0-9]+' | head -1)
ok '[ "$PID2" = "$$" ]' "lukufail endiselt parent-pidi oma (node ei varastanud)"

# ── 4. Bash-alam (simuleerib mõnd [6.x] bash-sammu) — inherited release = no-op ────────────────
sec "bash-alam inherited no-op (ei vabasta vanema lukku)"
BASH_OUT=$(bash -c "source '$ROOT/scripts/lib/stack-lock.sh'; xl_lock_acquire child-bash 5 && echo ACQ-RC=\$?; xl_lock_release && echo REL-RC=\$?" 2>&1)
ok 'echo "$BASH_OUT" | grep -q "re-entrant no-op"' "bash-alam tuvastas vanema-luku: $BASH_OUT"
ok 'echo "$BASH_OUT" | grep -q ACQ-RC=0' "bash-alam acquire rc=0"
ok '[ -f "$LF" ]' "parent lukk säilis peale bash-alama release (inherited release = no-op)"

# ── 5. Parent vabastab → lukk kaob + env unset ────────────────────────────────────────────────
sec "parent release"
xl_lock_release
ok '[ ! -f "$LF" ]' "parent release kustutas lukufaili"
ok '[ -z "${XL_STACK_LOCK_HELD:-}" ]' "XL_STACK_LOCK_HELD unset peale release"

# ── 6. REGRESSIOON: node ILMA vanema-lukuta võtab+vabastab OMA luku normaalselt ────────────────
sec "regressioon: standalone node võtab+vabastab oma luku"
REG_OUT=$(env -u XL_STACK_LOCK_HELD node --input-type=module -e "
import('file://$ROOT/scripts/lib/stack-lock.mjs').then(async ({ withStackLock, STACK_LOCKFILE }) => {
  const fs = await import('node:fs');
  await withStackLock({ holder: 'standalone', waitMs: 3000 }, async () => {
    console.log(fs.existsSync(STACK_LOCKFILE) ? 'LOCK-EXISTS-DURING' : 'NO-LOCK-BUG');
  });
  console.log(fs.existsSync(STACK_LOCKFILE) ? 'LOCK-LEAK-BUG' : 'RELEASED-AFTER');
}).catch((e) => { console.error('THREW ' + e.message); process.exit(1); });
" 2>&1); REG_RC=$?
ok '[ "$REG_RC" = "0" ]' "standalone node rc=0: $REG_OUT"
ok 'echo "$REG_OUT" | grep -q LOCK-EXISTS-DURING' "standalone võttis reaalse luku jooksu ajaks"
ok 'echo "$REG_OUT" | grep -q RELEASED-AFTER' "standalone vabastas luku peale jooksu (ei lekkinud)"

echo ""
[ "$fail" = 0 ] && echo "🟢 kokku: $pass läbis, $fail kukkus" || echo "🔴 kokku: $pass läbis, $fail kukkus"
exit $(( fail == 0 ? 0 : 1 ))
