#!/usr/bin/env node
/**
 * credit-probe.mjs — KREDIIT-PROBE värav (import-pipeline.sh alguses).
 *
 * 1-token proov ENNE LLM-samme → orkestraator seab CREDIT_OK lipu.
 * Väldib 18k×retry asjatut API-katset kui krediit juba maas.
 *
 * Exit: 0 = krediit OK · 3 = krediit maas (DEGRADE) · 2 = API maas (süsteemne)
 *   (eristus KRIITILINE — "ära aja segamini": krediit→degrade, API-timeout→süsteemne.)
 *
 * Kasutus: node scripts/credit-probe.mjs [model]   (vaikimisi odav claude-haiku-4-5)
 */
import { probeCredit } from "./lib/credit-guard.mjs";
import { alertUsageLimit, checkWorkspaceSpendAlert } from "./lib/spend-guard.mjs";

const KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = process.argv[2] || "claude-haiku-4-5";

const res = await probeCredit({ apiKey: KEY, model: MODEL });
if (res.status === "ok") {
  console.log(`krediit OK (${res.detail})`);
  // 1a: AUTORITEETNE workspace-kulu kontroll (Admin API) — üks kord öö kohta, pipeline-alguses.
  //   ≥80% → Telegram; admin-key puudub / API maas → "osaline" Telegram üks kord. EI blokeeri pipeline'i
  //   (vaid hoiatab — degrade/laoseis jätkub nagunii; 1b react blokeerib päris cap-i korral).
  try {
    const ws = await checkWorkspaceSpendAlert({ ctx: "probe" });
    if (ws.ok) console.log(`workspace-kulu $${(ws.usd || 0).toFixed(2)}/$${ws.limit} (${ws.pct}%)${ws.crossed ? " ⚠️ 80%+" : ""} · ${ws.scope}`);
    else console.log(`workspace-kulu OSALINE: ${ws.reason}`);
  } catch (e) { console.log(`workspace-kulu kontroll ebaõnnestus: ${String((e && e.message) || e).slice(0, 80)}`); }
  process.exit(0);
}
if (res.status === "usage") {
  // 1b: workspace spend-cap täis → KOHE Telegram (eilne pimeala). Exit 3 = degrade (LLM skip, laoseis JÄTKUB).
  console.log(`usage-limit (${res.detail})`);
  alertUsageLimit(res.detail, { ctx: "probe" });
  process.exit(3);
}
if (res.status === "credit") { console.log(`krediit maas (${res.detail})`); process.exit(3); }
console.log(`API maas (${res.detail})`); process.exit(2);
