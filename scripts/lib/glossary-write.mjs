/**
 * glossary-write.mjs — glossary.yaml kirjutus + batch-ledger (JAGATUD backfill + hook, HARD RULE #5 SSoT).
 * Üks kirjutus-tee → kaks kutsujat (glossary-term-backfill.mjs + pipeline-glossary-terms.mjs) ei lahkne.
 */
import fs from "node:fs";

const esc = (s) => (s == null ? "" : String(s)).replace(/'/g, "''");

/** appendTermsToYaml — lisa locked-terminid glossary.yaml 'terms:' lõppu (loadGlossary-ühilduv vorm). */
export function appendTermsToYaml(file, locked, batchId) {
  if (!locked.length) return 0;
  let yaml = fs.readFileSync(file, "utf8");
  const block = locked.map((r) =>
    `  - en: ${JSON.stringify(r.en)}\n    et: ${JSON.stringify(r.et)}\n    freq: ${r.freq || 1}\n    cluster: ${r.cluster}\n    status: locked\n    origin: ${r.origin}\n    batch: ${batchId}`
  ).join("\n");
  yaml = yaml.replace(/\s*$/, "") + "\n" + block + "\n";
  fs.writeFileSync(file, yaml);
  return locked.length;
}

/** writeLedger — kirjuta terminid glossary_term_ledger'isse (undo-allikas). q = psql-helper. */
export function writeLedger(q, locked, batchId, caller = "unknown") {
  q(`CREATE TABLE IF NOT EXISTS glossary_term_ledger (
      id bigserial PRIMARY KEY, batch_id text, en text, et text, cluster text, origin text, caller text, created_at timestamptz DEFAULT now());`);
  if (!locked.length) return;
  const vals = locked.map((r) => `('${esc(batchId)}','${esc(r.en)}','${esc(r.et)}','${esc(r.cluster)}','${esc(r.origin)}','${esc(caller)}')`).join(",");
  q(`INSERT INTO glossary_term_ledger (batch_id,en,et,cluster,origin,caller) VALUES ${vals};`);
}
