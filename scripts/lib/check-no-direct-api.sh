#!/usr/bin/env bash
# check-no-direct-api.sh — GREP-VÄRAV (Tarmo DIRECTIVE 2026-11-19 id=1f0a p2).
#   Kukub läbi (exit 1), kui mõni skript kutsub api.anthropic.com OTSE, mitte llm-client.mjs kaudu.
#   EESMÄRK: üks mehhanism (HARD RULE #5) → kuu-kulu 100% omistatav (by_task).
#
# LUBATUD api.anthropic.com puutujad (transport-/kontrolli-kiht ise, EI ole sisu-kutsujad):
#   - scripts/lib/llm-client.mjs   — sünkroon /v1/messages SSoT (kõik sisu-kutsed käivad siit läbi).
#   - scripts/lib/spend-guard.mjs  — Admin API (/v1/organizations/cost_report, /workspaces) — kulu-aruanne,
#                                    MITTE sisu-kutse; llm-client IMPORDIB sellest recordSpend'i (tsirkulaarne).
#   - scripts/lib/credit-guard.mjs — 1-token /v1/messages krediidi-proov (probeCredit); llm-client impordib
#                                    sellest isDegradeError/degradeKind (tsirkulaarne → ei saa ise kliendi alla).
#   - scripts/lib/content-batch.mjs— Batch API (/v1/messages/batches) eraldi elutsükkel (submit/poll/retrieve);
#                                    recordSpend({batch:true,task}) juba sees. Sünkroon-klient ≠ batch-endpoint.
# Faas 2 (DIRECTIVE 2026-11-19 id=1f0a p2): KÕIK sisu-skriptid migreeritud → värav peab olema ROHELINE.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

# 4 lubatud faili (alternatsioon ^(...)$ ); dotid escape'itakse allpool (${ALLOW//./\\.}).
ALLOW='scripts/lib/llm-client.mjs|scripts/lib/spend-guard.mjs|scripts/lib/credit-guard.mjs|scripts/lib/content-batch.mjs'

mapfile -t HITS < <(grep -rlE 'api\.anthropic\.com|/v1/messages' scripts --include='*.mjs' 2>/dev/null \
  | grep -vE "^(${ALLOW//./\\.})$" | sort || true)

if [ "${#HITS[@]}" -eq 0 ]; then
  echo "✅ grep-värav: ükski skript ei kutsu api.anthropic.com otse (ainult llm-client.mjs)."
  exit 0
fi

echo "❌ grep-värav: ${#HITS[@]} faili kutsub api.anthropic.com OTSE (peab käima llm-client.mjs kaudu):"
for f in "${HITS[@]}"; do echo "   - $f"; done
exit 1
