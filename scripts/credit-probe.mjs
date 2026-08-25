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

const KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = process.argv[2] || "claude-haiku-4-5";

const res = await probeCredit({ apiKey: KEY, model: MODEL });
if (res.status === "ok") { console.log(`krediit OK (${res.detail})`); process.exit(0); }
if (res.status === "credit") { console.log(`krediit maas (${res.detail})`); process.exit(3); }
console.log(`API maas (${res.detail})`); process.exit(2);
