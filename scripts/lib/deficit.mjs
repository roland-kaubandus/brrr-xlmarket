#!/usr/bin/env node
/**
 * deficit.mjs — SSoT: iga LLM-sammu "veel-tegemata" (deficit) SKU-hulk (Fix 2 self-healing, Tarmo 2026-10-14).
 *
 * MIKS: öine hook töötles seni AINULT delta (/tmp/classify-skus.txt = selle öö klassifitseeritud SKU-d).
 * Kui toote spec/sisu/sünonüüm kukkus eelmisel ööl (API-timeout, krediit-degrade, üksik-skip), EI proovitud
 * KUNAGI uuesti → vaikne kvaliteedi-lagunemine (HARD RULE #5 oht). Deficit-režiim: samm töötleb KÕIK tooted,
 * millel see väljund PUUDUB (sh eelmisel ööl kukkunud) → järgmine öö parandab ISE (HARD RULE #6, inimene EI sekku).
 *
 * DEFICIT ⊇ DELTA: äsja-klassifitseeritud toode on definitsiooni järgi "väljund puudub" → sisaldub deficitis juba.
 *   Seega deficit ÜKSI on õige sisend (asendab delta); already-done tooted jäävad VÄLJA (idempotentne, 0 topelt-kulu).
 *   Sama põhimõte, mida [4] classify juba kasutab (--source unhomed = klassifikatsiooni-deficit).
 *
 * DEFICIT-SQL = SAMA "not-done" definitsioon, mida sammu-skripti sisemine write-guard kasutab (HARD RULE #5 SSoT):
 *   spec      → metadata->'specs' IS NULL            (spec-extract-skus.mjs sisemine filter)
 *   content   → metadata->>'content_gen_hash' IS NULL (content-gen hash-guard: kunagi genereerimata)
 *   synonyms  → NOT EXISTS product_synonym lang='et'  (synonym-gen/-backfill NOT EXISTS write-guard)
 *
 * READ-ONLY (ainult SELECT) → HARD RULE #9: EI võta stack-lukku.
 *
 * KREDIIT = LOOMULIK LAGI: suur deficit jookseb kuni krediit-degrade (rc=3) → jääk järgmine öö (self-heal).
 *   Seega kõva cap pole vaja — budget ise piirab. See moodul AINULT mõõdab + annab suurusjärgu; orkestraator
 *   saadab Telegrami kui deficit üle läve (nähtavus, Tarmo nõue: "large deficit → Telegram").
 *
 * CLI:  node scripts/lib/deficit.mjs --step <spec|content|synonyms> [--out <fail>]
 *   stdout : SKU-d (üks rea kohta) kui --out puudub; --out → kirjutab faili.
 *   stderr : "DEFICIT_STEP=<step> DEFICIT_N=<n> EST_USD=<x>"  (orkestraator parsib)
 */
import { execSync } from "node:child_process";
import fs from "node:fs";

export const DEFICIT_SQL = {
  // spec [6]: specs puudu (sama filter kui spec-extract-skus.mjs sisemine WHERE p.metadata->'specs' IS NULL)
  spec: `SELECT metadata->>'vevor_sku' FROM product
    WHERE deleted_at IS NULL AND status='published'
      AND metadata->>'vevor_sku' IS NOT NULL
      AND metadata->'specs' IS NULL`,
  // content-gen [6.5]: content_gen_hash puudu = ET-sisu kunagi edukalt genereerimata (hash-guard SSoT)
  content: `SELECT metadata->>'vevor_sku' FROM product
    WHERE deleted_at IS NULL AND status='published'
      AND metadata->>'vevor_sku' IS NOT NULL
      AND (metadata->>'content_gen_hash') IS NULL`,
  // synonyms [6.6]: ühtki ET product_synonym rida pole (sama NOT EXISTS kui synonym write-guard)
  synonyms: `SELECT p.metadata->>'vevor_sku' FROM product p
    WHERE p.deleted_at IS NULL AND p.status='published'
      AND p.title IS NOT NULL AND p.metadata->>'vevor_sku' IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM product_synonym ps WHERE ps.product_id=p.id AND ps.lang='et')`,
};

// Jäme $/toode hinnang (AINULT Telegram-hoiatuse suurusjärguks — EI ole täppisarve):
//   spec ≈ 1 Haiku-kutse; content ≈ Sonnet suur väljund; synonyms ≈ Sonnet väike väljund.
const EST_USD_PER = { spec: 0.004, content: 0.03, synonyms: 0.007 };

function resolveDb() {
  return execSync("docker ps --format '{{.Names}}' | grep '^db-k33g' | head -1", { encoding: "utf8" }).trim();
}

export function deficitSkus(step) {
  const sql = DEFICIT_SQL[step];
  if (!sql) throw new Error(`tundmatu samm: ${step} (lubatud: ${Object.keys(DEFICIT_SQL).join(",")})`);
  const DB = resolveDb();
  if (!DB) throw new Error("db-k33g konteinerit ei leitud (docker ps)");
  const out = execSync(`docker exec -i ${DB} psql -U xlmarket -d xlmarket -tA -v ON_ERROR_STOP=1 -f -`,
    { input: sql, encoding: "utf8", maxBuffer: 1 << 30 });
  return out.split("\n").map((s) => s.trim()).filter(Boolean);
}

export function estUsd(step, n) { return (EST_USD_PER[step] ?? 0.01) * n; }

// ── CLI ──────────────────────────────────────────────────────────────────────
if (import.meta.url === `file://${process.argv[1]}`) {
  const argv = process.argv.slice(2);
  const val = (f) => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : undefined; };
  const step = val("--step");
  const outFile = val("--out");
  if (!step) { console.error("--step <spec|content|synonyms> puudub"); process.exit(2); }
  let skus;
  try { skus = deficitSkus(step); }
  catch (e) { console.error(`deficit-viga: ${e.message}`); process.exit(1); }
  const body = skus.join("\n") + (skus.length ? "\n" : "");
  if (outFile) fs.writeFileSync(outFile, body);
  else process.stdout.write(body);
  console.error(`DEFICIT_STEP=${step} DEFICIT_N=${skus.length} EST_USD=${estUsd(step, skus.length).toFixed(2)}`);
}
