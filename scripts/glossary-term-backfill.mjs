#!/usr/bin/env node
/**
 * glossary-term-backfill.mjs — KUTSUJA A (kogu korpus, ühekordne) — HARD RULE #5.
 *
 * Sama otsustusahel (glossary-term-chain.mjs) kui öine hook [6.4] (pipeline-glossary-terms.mjs).
 * Backfill = KOGU korpus üks kord; hook = öine delta. ÜKS transform, kaks kutsujat.
 *
 * KASUTUS:
 *   node scripts/glossary-term-backfill.mjs --dry [--sample N]     # read-only, näita otsustusteed (vaikimisi)
 *   node scripts/glossary-term-backfill.mjs --dry --limit 10       # lahenda ainult 10 terminit (odav DRY-näidis)
 *   node scripts/glossary-term-backfill.mjs --execute              # kirjuta locked-terminid glossary.yaml-i (stack-lock!)
 *
 * TURVA: ANTHROPIC_API_KEY hostist (set -a; . /opt/eumotors-tasks/.env; set +a) — väärtust EI logita.
 * --execute võtab stack-luku (HARD RULE #9) + kirjutab batch-ledgeri (undo: glossary-term-undo.mjs <batch_id>).
 * Backfill ise = Tarmo otsus (kulu-varu) — vaikimisi DRY; novembrisse edasilükkamine lubatud, hook käib niikuinii.
 */

import fs from "node:fs";
import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadGlossary } from "./lib/content-gen.mjs";
import { makeAnthropicCall, harvestCandidates, filterGlossaryWorthy, resolveGlossaryTerm } from "./lib/glossary-term-chain.mjs";
import { appendTermsToYaml, writeLedger } from "./lib/glossary-write.mjs";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const GLOSSARY = `${REPO}/backend/src/data/glossary.yaml`;
const args = process.argv.slice(2);
const has = (f) => args.includes(f);
const val = (f, d) => { const i = args.indexOf(f); return i >= 0 && args[i + 1] ? args[i + 1] : d; };
const DRY = !has("--execute");
const SAMPLE = parseInt(val("--sample", "0"), 10) || 0;          // 0 = kogu korpus; muidu LIMIT N
const LIMIT = parseInt(val("--limit", DRY ? "10" : "0"), 10) || 0; // mitu terminit lahendada (DRY vaikimisi 10)

const API_KEY = process.env.ANTHROPIC_API_KEY || "";
if (!API_KEY) { console.error("🔴 ANTHROPIC_API_KEY puudub (set -a; . /opt/eumotors-tasks/.env; set +a)."); process.exit(2); }

const getDB = () => execSync("docker ps --format '{{.Names}}' | grep '^db-k33g' | head -1", { encoding: "utf8" }).trim();
let DB = getDB();
if (!DB) { console.error("🔴 db-k33g konteinerit ei leitud"); process.exit(2); }
const q = (sql) => { DB = getDB(); return execSync(`docker exec -i ${DB} psql -U xlmarket -d xlmarket -tA -v ON_ERROR_STOP=1 -f -`, { input: sql, encoding: "utf8", maxBuffer: 1 << 30 }); };

function log(...a) { console.log(...a); }

(async () => {
  const t0 = Date.now();
  log(`\n=== GLOSSARY-TERM BACKFILL (${DRY ? "DRY" : "EXECUTE"}) ===`);
  const entries = loadGlossary(GLOSSARY);
  log(`glossary: ${entries.length} olemas-kirjet`);

  // 1. korpuse EN-sisu (title = EN baseline + description EN baseline)
  const lim = SAMPLE ? `LIMIT ${SAMPLE}` : "";
  const rows = q(`SELECT replace(replace(coalesce(title,'')||' '||coalesce(description,''), E'\\n',' '), '|',' ')
                  FROM product WHERE deleted_at IS NULL ${lim}`).trim();
  const enTexts = rows ? rows.split("\n") : [];
  log(`korpus: ${enTexts.length} toote EN-teksti`);

  // usage-akumulaator (kulu-nähtavus; väärtust ei logi, ainult tokenid)
  const usage = { in: 0, out: 0 };
  const opusCall = makeAnthropicCall(API_KEY, "claude-opus-4-8", usage);
  const sonnetCall = makeAnthropicCall(API_KEY, "claude-sonnet-5", usage);
  const fableCall = makeAnthropicCall(API_KEY, "claude-fable-5", usage);

  // 2. harvest + filter (detekt)
  const cand = harvestCandidates(enTexts, entries, { maxCand: 120, minFreq: 3 });
  log(`kandidaat-fraasid (katmata, freq≥3): ${cand.length} (top: ${cand.slice(0, 8).map((c) => `${c.en}(${c.freq})`).join(", ")})`);
  const worthy = await filterGlossaryWorthy(sonnetCall, cand, { batch: 40 });
  log(`glossary-väärt (Sonnet-filter): ${worthy.length}`);

  // match-ohutuse + mõjuraadiuse valim (esinduslik alamhulk — kiire)
  const sampleEnTexts = enTexts.slice(0, 200);
  // korpuse suurus mõjuraadiuse ekstrapolatsiooniks (SAMPLE korral loe kogu elus-arv eraldi)
  let corpusSize = enTexts.length;
  if (SAMPLE) { try { corpusSize = parseInt(q(`SELECT count(*) FROM product WHERE deleted_at IS NULL`).trim(), 10) || enTexts.length; } catch { /* jää valimile */ } }

  // phraseEns (fragment-värava jaoks, Tarmo p1): KÕIK mitmesõnalised EN-vormid (kandidaadid + olemas glossary)
  const phraseEns = [...new Set([...worthy.map((w) => w.en), ...entries.flatMap((e) => [e.en, ...(e.aliases || [])])])];

  // 3. lahenda terminid (DRY: LIMIT; EXECUTE: kõik)
  const toResolve = LIMIT ? worthy.slice(0, LIMIT) : worthy;
  log(`\n--- OTSUSED (${toResolve.length} terminit, korpus ${corpusSize}) ---`);
  const results = [];
  for (const w of toResolve) {
    // paar konteksti (kus termin esineb)
    const contexts = enTexts.filter((t) => t.toLowerCase().includes(w.en.toLowerCase())).slice(0, 3);
    const r = await resolveGlossaryTerm({ en: w.en, contexts, opusCall, sonnetCall, fableCall, entries, sampleEnTexts, freq: w.freq, corpusSize, phraseEns });
    results.push(r);
    const mark = r.decision === "locked" ? "🟢 LOCKED" : r.decision === "defer" ? "🟡 DEFER" : "⚪ SKIP";
    log(`\n${mark}  "${r.en}"  →  ${r.et ? `«${r.et}» (${r.cluster})` : "(—)"}  [freq ${w.freq}]`);
    for (const p of r.path) log(`      · ${p}`);
  }

  const locked = results.filter((r) => r.decision === "locked");
  const defer = results.filter((r) => r.decision === "defer");
  log(`\n--- KOKKUVÕTE ---`);
  log(`locked: ${locked.length} · defer: ${defer.length} · skip: ${results.length - locked.length - defer.length}`);
  log(`LLM-kulu (tokenid): in=${usage.in} out=${usage.out} (väärtust ei logita)`);
  log(`kestus: ${((Date.now() - t0) / 1000).toFixed(1)}s`);

  if (DRY) {
    log(`\n🟡 DRY — glossary.yaml PUUTUMATA. Execute: node scripts/glossary-term-backfill.mjs --execute`);
    process.exit(0);
  }

  // EXECUTE: stack-lock + kirjuta glossary.yaml + batch-ledger
  const { withStackLock } = await import("./lib/stack-lock.mjs");
  await withStackLock({ holder: "glossary-term-backfill", waitMs: 60000 }, async () => {
    const batchId = `gloss-${new Date().toISOString().replace(/[:.]/g, "").slice(0, 15)}`;
    appendTermsToYaml(GLOSSARY, locked, batchId);
    writeLedger(q, locked, batchId, "backfill");
    log(`\n🟢 EXECUTE: ${locked.length} terminit lisatud glossary.yaml-i (batch ${batchId}). Undo: node scripts/glossary-term-undo.mjs ${batchId}`);
  });
  process.exit(0);
})().catch((e) => { console.error(`🔴 backfill viga: ${e.message}`); process.exit(1); });
