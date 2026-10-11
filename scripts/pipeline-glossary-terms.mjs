#!/usr/bin/env node
/**
 * pipeline-glossary-terms.mjs — KUTSUJA B (öine hook [6.4], DELTA-peal) — HARD RULE #5 + #6.
 *
 * SAMA otsustusahel (glossary-term-chain.mjs) + SAMA kirjutus-tee (glossary-write.mjs) kui backfill (kutsuja A).
 * Backfill = kogu korpus üks kord; see hook = öine delta (AINULT /tmp/classify-skus.txt äsja-puudutatud SKU-d).
 *
 * POSITSIOON: import-pipeline.sh [6.4] — PÄRAST [6] spec, ENNE [6.5] sisu-gen (uued glossary-terminid lukus
 *   ENNE kui sisu-gen EN→ET tõlget teeb → sisu kasutab värsket glossaryt).
 *
 * KASUTUS: node scripts/pipeline-glossary-terms.mjs --skus /tmp/classify-skus.txt [--dry|--shadow]
 *   --dry    = read-only, näita otsustusteed, EI kirjuta midagi.
 *   --shadow = (Tarmo 2026-10-11) läbi KOGU ahel+väravad, logi "OLEKS lukustanud" glossary_shadow_ledger'isse,
 *              AGA ÄRA kirjuta glossary.yaml'i (nähtavus ilma mõjuta — HARD RULE #6 ohutu algseis).
 *   (vaikimisi = LIVE: kirjuta glossary.yaml + ledger — AINULT kui väravad kinnitatud ja Tarmo flip'ib live).
 *
 * FAIL-LOUD granulaarsus (HARD RULE #5):
 *   üksik termin kukub (defer/gate-fail) → SKIP + jätka (ei peata ööd ühe termini pärast); loe defer-arv.
 *   süsteemne viga (API täiesti maas, 0 pakkumist KÕIGILE) → exit≠0 → import-pipeline.sh fail → Telegram.
 * Delta tühi → kohe exit 0 (ei tee midagi — nagu [6]/[6.5] gate).
 */

import path from "node:path";
import fs from "node:fs";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { loadGlossary } from "./lib/content-gen.mjs";
import { makeAnthropicCall, harvestCandidates, filterGlossaryWorthy, resolveGlossaryTerm } from "./lib/glossary-term-chain.mjs";
import { appendTermsToYaml, writeLedger, writeShadowLedger } from "./lib/glossary-write.mjs";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const GLOSSARY = `${REPO}/backend/src/data/glossary.yaml`;
const args = process.argv.slice(2);
const val = (f, d) => { const i = args.indexOf(f); return i >= 0 && args[i + 1] ? args[i + 1] : d; };
const DRY = args.includes("--dry");
const SHADOW = args.includes("--shadow");  // Tarmo 2026-10-11: väravate valideerimiseni shadow (ledger, ei kirjuta yaml)
const SKUS_FILE = val("--skus", "/tmp/classify-skus.txt");

const API_KEY = process.env.ANTHROPIC_API_KEY || "";
if (!API_KEY) { console.error("🔴 [6.4] ANTHROPIC_API_KEY puudub — glossary-hook SKIP (degrade)"); process.exit(0); }

const skus = fs.existsSync(SKUS_FILE) ? fs.readFileSync(SKUS_FILE, "utf8").split("\n").map((s) => s.trim()).filter(Boolean) : [];
if (!skus.length) { console.log("[6.4] delta tühi → glossary-hook skip"); process.exit(0); }

const getDB = () => execSync("docker ps --format '{{.Names}}' | grep '^db-k33g' | head -1", { encoding: "utf8" }).trim();
let DB = getDB();
if (!DB) { console.error("🔴 [6.4] db-k33g puudub"); process.exit(1); }
const q = (sql) => { DB = getDB(); return execSync(`docker exec -i ${DB} psql -U xlmarket -d xlmarket -tA -v ON_ERROR_STOP=1 -f -`, { input: sql, encoding: "utf8", maxBuffer: 1 << 30 }); };
const esc = (s) => (s == null ? "" : String(s)).replace(/'/g, "''");

(async () => {
  const MODE = DRY ? "DRY" : SHADOW ? "SHADOW" : "LIVE";
  console.log(`\n=== [6.4] GLOSSARY-HOOK (delta, ${MODE}) — ${skus.length} SKU ===`);
  const entries = loadGlossary(GLOSSARY);

  // delta EN-sisu (AINULT puudutatud SKU-d)
  const inList = skus.map((s) => `'${esc(s)}'`).join(",");
  const rows = q(`SELECT replace(replace(coalesce(title,'')||' '||coalesce(description,''), E'\\n',' '), '|',' ')
                  FROM product WHERE deleted_at IS NULL AND metadata->>'vevor_sku' IN (${inList})`).trim();
  const enTexts = rows ? rows.split("\n") : [];
  console.log(`  delta EN-teksti: ${enTexts.length}`);
  if (!enTexts.length) { console.log("  (delta-tooteid ei leitud DB-st) → skip"); process.exit(0); }

  // mõjuraadiuse jaoks: elus-toodete koguarv (korpuse suurus)
  let corpusSize = 0;
  try { corpusSize = parseInt(q(`SELECT count(*) FROM product WHERE deleted_at IS NULL`).trim(), 10) || 0; } catch { corpusSize = 0; }

  const usage = { in: 0, out: 0 };
  const opusCall = makeAnthropicCall(API_KEY, "claude-opus-4-8", usage);
  const sonnetCall = makeAnthropicCall(API_KEY, "claude-sonnet-5", usage);
  const fableCall = makeAnthropicCall(API_KEY, "claude-fable-5", usage);

  // detekt (delta-korpuses katmata terminid)
  const cand = harvestCandidates(enTexts, entries, { maxCand: 60, minFreq: 2 });
  const worthy = await filterGlossaryWorthy(sonnetCall, cand, { batch: 40 });
  console.log(`  kandidaate: ${cand.length} · glossary-väärt: ${worthy.length}`);

  const sampleEnTexts = enTexts.slice(0, 120);
  const locked = []; const defer = []; let hardErr = 0; let signalCnt = 0;
  for (const w of worthy) {
    const contexts = enTexts.filter((t) => t.toLowerCase().includes(w.en.toLowerCase())).slice(0, 3);
    try {
      const r = await resolveGlossaryTerm({ en: w.en, contexts, opusCall, sonnetCall, fableCall, entries, sampleEnTexts, freq: w.freq, corpusSize });
      if (r.decision === "locked") { locked.push(r); entries.push({ en: r.en, et: r.et, aliases: r.aliases || [], status: "locked", freq: r.freq || 1 }); }
      else if (r.decision === "defer") { defer.push(r); if (r.signal) signalCnt++; }
    } catch (e) { hardErr++; console.error(`  🔴 termin "${w.en}" kukkus: ${e.message}`); }  // üksik kukub → skip+jätka
  }
  console.log(`  ${MODE === "SHADOW" ? "OLEKS lukustanud" : "locked"}: ${locked.length} · defer: ${defer.length}${signalCnt ? ` (sh ${signalCnt} mõjuraadius-signaal)` : ""} · vigu: ${hardErr}`);
  console.log(`  LLM-kulu (tokenid): in=${usage.in} out=${usage.out}`);

  // SÜSTEEMNE viga: oli kandidaate aga KÕIK kukkusid koodiveaga (API maas) → fail-loud (exit≠0)
  if (worthy.length > 0 && hardErr === worthy.length) {
    console.error("🔴 [6.4] SÜSTEEMNE: kõik terminid kukkusid koodiveaga (API maas?) → FAIL");
    process.exit(1);
  }

  if (DRY) { console.log("  🟡 DRY — glossary.yaml puutumata"); process.exit(0); }

  if (SHADOW) {
    // nähtavus ilma mõjuta: logi "oleks lukustanud" shadow-ledger'isse, ÄRA kirjuta yaml
    if (locked.length) {
      const { withStackLock } = await import("./lib/stack-lock.mjs");
      await withStackLock({ holder: "glossary-hook-6.4-shadow", waitMs: 60000 }, async () => {
        const batchId = `gloss-shadow-${new Date().toISOString().replace(/[:.]/g, "").slice(0, 15)}`;
        writeShadowLedger(q, locked, batchId, "hook-6.4-shadow");
        console.log(`  🟣 [6.4] SHADOW: ${locked.length} terminit OLEKS lukustanud (batch ${batchId}, glossary_shadow_ledger) — yaml PUUTUMATA.`);
      });
    } else console.log("  🟣 [6.4] SHADOW: 0 terminit läbis väravaid (midagi ei logita).");
    process.exit(0);
  }

  if (locked.length) {
    const { withStackLock } = await import("./lib/stack-lock.mjs");
    await withStackLock({ holder: "glossary-hook-6.4", waitMs: 60000 }, async () => {
      const batchId = `gloss-hook-${new Date().toISOString().replace(/[:.]/g, "").slice(0, 15)}`;
      appendTermsToYaml(GLOSSARY, locked, batchId);
      writeLedger(q, locked, batchId, "hook-6.4");
      console.log(`  🟢 [6.4] ${locked.length} uut terminit lukus (batch ${batchId}). Undo: node scripts/glossary-term-undo.mjs ${batchId}`);
    });
  }
  process.exit(0);
})().catch((e) => { console.error(`🔴 [6.4] glossary-hook viga: ${e.message}`); process.exit(1); });
