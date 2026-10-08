#!/usr/bin/env node
/**
 * workspace-spend-check.mjs — manuaalne/cron autoriteetse workspace-kulu kontroll (DIRECTIVE 2026-10-08).
 *
 * Loeb Anthropic Admin cost_report API-st workspace'i TEGELIKU kuu-kulu, võrdleb XLM_SPEND_LIMIT_USD-ga,
 * ≥80% → Telegram. Admin-key puudub / API maas → "kulu-jälgimine osaline" Telegram (üks kord/kuu).
 *
 * Kasutus:
 *   set -a; . /opt/eumotors-tasks/.env.xlmarket; set +a   # või laseb moodul ise lugeda faili
 *   node scripts/workspace-spend-check.mjs
 *   node scripts/workspace-spend-check.mjs --quiet   # ainult JSON, ei kutsu Telegramit (fetch-only)
 */
import { checkWorkspaceSpendAlert, fetchWorkspaceCostUSD, resolveAdminKey } from "./lib/spend-guard.mjs";

const QUIET = process.argv.includes("--quiet");

if (QUIET) {
  // fetch-only, EI alerti — kiire seisu-vaatamine
  const r = await fetchWorkspaceCostUSD({ adminKey: resolveAdminKey() });
  console.log(JSON.stringify(r, null, 2));
  process.exit(r.ok ? 0 : 1);
}

const r = await checkWorkspaceSpendAlert({ ctx: "manual" });
console.log(JSON.stringify(r, null, 2));
if (r.ok) {
  console.log(`\nworkspace-kulu $${(r.usd || 0).toFixed(2)} / limiit $${r.limit} = ${r.pct}% (${r.scope})${r.crossed ? "  ⚠️ 80%+ → Telegram saadetud" : ""}`);
  process.exit(0);
}
console.log(`\n⚠️ OSALINE: ${r.reason}${r.alerted ? "  → Telegram saadetud (üks kord/kuu)" : "  (juba hoiatatud sel kuul)"}`);
process.exit(1);
