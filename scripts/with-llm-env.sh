#!/usr/bin/env bash
# with-llm-env.sh — laeb ANTHROPIC_API_KEY failist /opt/eumotors-tasks/.env ja käivitab
#   AINULT allowlist'i en-master skripti. Võtme VÄÄRTUST ei prindita KUNAGI (HARD RULE #11).
#
#   Mõte (Tarmo 2026-11-19 otsus): Claude saab LLM-töid käivitada ilma .env lugemisõiguseta
#   ja ilma Tarmot terminali — luba antakse AINULT selle skripti käivitamiseks.
#
#   Kasutus:
#     bash scripts/with-llm-env.sh --check                     # tõesta et võti laeb (hash+pikkus)
#     bash scripts/with-llm-env.sh node scripts/en-master-backfill.mjs --skus … --base-only --execute
#     bash scripts/with-llm-env.sh node scripts/en-master-remetric.mjs --execute
#
#   Turva-piirid:
#     1) ainult allowlist'i skriptid (allpool ALLOW)
#     2) esimene arg peab olema 'node' (--check erand)
#     3) eval/inline-kood lipud (-e/-p/--eval/--print/--input-type) KEELATUD → muidu saaks võtme välja printida
#     4) võti laetakse alles pärast kõiki kontrolle; väärtust ei kuvata (set -a; . env; set +a; exec)
set -euo pipefail

ENV_FILE="/opt/eumotors-tasks/.env"
ALLOW=(
  "scripts/en-master-backfill.mjs"
  "scripts/en-master-detect.mjs"
  "scripts/en-master-remetric.mjs"
  "scripts/credit-probe.mjs"
)

die() { echo "with-llm-env: keeldun — $1" >&2; exit 97; }

[ -f "$ENV_FILE" ] || die "env-fail puudub: $ENV_FILE"

# ── --check: tõesta et võti laeb — AINULT pikkus + sha256 esimesed 12 (MITTE väärtus) ──
if [ "${1:-}" = "--check" ]; then
  set -a; . "$ENV_FILE"; set +a
  [ -n "${ANTHROPIC_API_KEY:-}" ] || die "ANTHROPIC_API_KEY ei laadunud env-ist"
  printf 'KEY_PRESENT=yes len=%s sha256_head=%s\n' \
    "${#ANTHROPIC_API_KEY}" \
    "$(printf '%s' "$ANTHROPIC_API_KEY" | sha256sum | cut -c1-12)"
  exit 0
fi

# ── allowlist: esimene arg 'node', teine lubatud skript ──
[ "${1:-}" = "node" ] || die "ainult 'node <allowlist-skript>' või '--check' lubatud (sain: '${1:-}')"
SCRIPT="${2:-}"
ok=0; for a in "${ALLOW[@]}"; do [ "$SCRIPT" = "$a" ] && ok=1; done
[ "$ok" = 1 ] || die "skript pole allowlist'is: '$SCRIPT'"

# ── keela eval/inline-kood lipud (muidu saaks process.env.ANTHROPIC_API_KEY välja printida) ──
for arg in "$@"; do
  case "$arg" in
    -e|-p|--eval|--print|--input-type|--input-type=*|-e=*|-p=*)
      die "eval/print-lipp keelatud: '$arg'" ;;
  esac
done

# ── lae võti (väärtust ei kuvata) ja anna juhtimine täielikult üle ──
set -a; . "$ENV_FILE"; set +a
[ -n "${ANTHROPIC_API_KEY:-}" ] || die "ANTHROPIC_API_KEY ei laadunud env-ist"
exec "$@"
