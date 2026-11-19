#!/usr/bin/env bash
# check-no-direct-api.sh — GREP-VÄRAV (Tarmo DIRECTIVE 2026-11-19 id=1f0a p2).
#   Kukub läbi (exit 1), kui mõni skript kutsub api.anthropic.com OTSE, mitte llm-client.mjs kaudu.
#   EESMÄRK: üks mehhanism (HARD RULE #5) → kuu-kulu 100% omistatav (by_task).
#
# LUBATUD api.anthropic.com puutujad (SSoT transport-kiht ise):
#   - scripts/lib/llm-client.mjs   — sünkroon /v1/messages (+ Faas 2: batch + probe absorbeeritud)
# FAAS 2 TODO: content-batch.mjs (batch-endpoint) + credit-guard.mjs (1-token probe) → kolivad kliendi
#   alla VÕI lisatakse siia allowlist'i. KUNI SIIS: see värav on OODATULT PUNANE (loend näitab jääki).
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

ALLOW='scripts/lib/llm-client.mjs'

mapfile -t HITS < <(grep -rlE 'api\.anthropic\.com|/v1/messages' scripts --include='*.mjs' 2>/dev/null \
  | grep -vE "^(${ALLOW//./\\.})$" | sort || true)

if [ "${#HITS[@]}" -eq 0 ]; then
  echo "✅ grep-värav: ükski skript ei kutsu api.anthropic.com otse (ainult llm-client.mjs)."
  exit 0
fi

echo "❌ grep-värav: ${#HITS[@]} faili kutsub api.anthropic.com OTSE (peab käima llm-client.mjs kaudu):"
for f in "${HITS[@]}"; do echo "   - $f"; done
exit 1
