#!/usr/bin/env bash
# stack-lock.sh — bash-pool ÜHEST globaalsest k33g stack-mutex'ist (Tarmo 2026-10-09, item 1).
# Sama PID-faili skeem kui scripts/lib/stack-lock.mjs → interop node↔bash (sama lockfile, sama host).
# Kasutus coolify-deploy.sh-s:
#   source "$(dirname "$0")/lib/stack-lock.sh"
#   xl_lock_acquire "coolify-deploy" 1200   # ootab kuni 20min kui DB-write käib, siis keeldub
#   trap xl_lock_release EXIT
#   ... trigger deploy + xl_wait_stack_healthy ...   (lukk hoitakse KUNI stack tagasi healthy)

XL_LOCK_DIR="${XL_LOCK_DIR:-/opt/eumotors-tasks/locks}"
XL_LOCKFILE="$XL_LOCK_DIR/xl-stack-write.lock"
XL_LOCK_STALE_S=$((45 * 60))

_xl_lock_alive() { kill -0 "$1" 2>/dev/null; }  # 0 = elus

_xl_lock_stale() {
  # $1 = lockfile sisu (json). stale kui pid surnud VÕI ts vana.
  local pid ts now
  pid=$(printf '%s' "$1" | grep -oE '"pid":[0-9]+' | grep -oE '[0-9]+' | head -1)
  ts=$(printf '%s' "$1" | grep -oE '"ts":[0-9]+' | grep -oE '[0-9]+' | head -1)
  [ -z "$pid" ] && return 0
  _xl_lock_alive "$pid" || return 0
  if [ -n "$ts" ]; then now=$(($(date +%s%3N))); [ $((now - ts)) -gt $((XL_LOCK_STALE_S * 1000)) ] && return 0; fi
  return 1
}

xl_lock_acquire() {
  local holder="${1:-coolify-deploy}" wait_s="${2:-1200}"
  mkdir -p "$XL_LOCK_DIR"
  local deadline=$(($(date +%s) + wait_s)) warned=0 me
  me="{\"pid\":$$,\"holder\":\"$holder\",\"host\":\"$(hostname)\",\"ts\":$(date +%s%3N)}"
  while :; do
    if ( set -o noclobber; printf '%s' "$me" > "$XL_LOCKFILE" ) 2>/dev/null; then
      return 0  # lukk käes
    fi
    local cur; cur=$(cat "$XL_LOCKFILE" 2>/dev/null || echo "")
    if _xl_lock_stale "$cur"; then rm -f "$XL_LOCKFILE"; continue; fi
    if [ "$warned" = 0 ]; then
      echo "🔒 stack-lukk hõivatud: $(printf '%s' "$cur" | grep -oE '"holder":"[^"]*"') — ootan kuni ${wait_s}s…" >&2
      warned=1
    fi
    if [ "$(date +%s)" -ge "$deadline" ]; then
      echo "❌ stack-lukk ei vabanenud ${wait_s}s jooksul (hoidja: $cur) — deploy KEELDUB (DB-töö käib?)." >&2
      return 1
    fi
    sleep 3
  done
}

xl_lock_release() {
  local cur; cur=$(cat "$XL_LOCKFILE" 2>/dev/null || echo "")
  local pid; pid=$(printf '%s' "$cur" | grep -oE '"pid":[0-9]+' | grep -oE '[0-9]+' | head -1)
  [ "$pid" = "$$" ] && rm -f "$XL_LOCKFILE"
  return 0
}

# Oota kuni KÕIK k33g-konteinerid on tagasi "healthy" (recreate-aken) — lukk hoitakse selle vältel.
xl_wait_stack_healthy() {
  local wait_s="${1:-300}" deadline=$(($(date +%s) + wait_s))
  echo "⏳ ootan k33g-stacki tervist (kuni ${wait_s}s)…"
  while :; do
    local total healthy
    total=$(docker ps --format '{{.Names}}' | grep -c '\-k33g' || echo 0)
    healthy=$(docker ps --filter health=healthy --format '{{.Names}}' | grep -c '\-k33g' || echo 0)
    # pgbouncer-il pole alati healthcheck'i → nõua vähemalt db+medusa+meili+storefront+redis healthy (>=5)
    if [ "$healthy" -ge 5 ]; then echo "✅ stack healthy ($healthy/$total)"; return 0; fi
    if [ "$(date +%s)" -ge "$deadline" ]; then
      echo "⚠️  stack ei saanud ${wait_s}s jooksul healthy ($healthy/$total) — vabastan luku siiski (jälgi Coolify UI)." >&2
      return 1
    fi
    sleep 5
  done
}
