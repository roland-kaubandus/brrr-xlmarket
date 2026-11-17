#!/usr/bin/env node
/**
 * morph-et-undo.mjs — Eesti liitsõna-otsing KIHT 1 DB-poole UNDO (HARD RULE #6).
 *
 * Eemaldab `product.metadata.morph_et` + `morph_et_h` KÕIGILT (või --skus delta) toodetelt.
 * morph_et on PUHAS LISANDUV metadata (madal-prio searchableAttribute) → eemaldamine taastab
 * otsingu KIHT 1 eelsesse (index-pool). DRY vaikimisi; --execute kirjutab (stack-lukk).
 *
 * TÄIELIK undo = KOLM osa (see skript = osa 1):
 *   1) DB-pool (SEE skript): strip metadata.morph_et/_h → --execute → siis [7] reindeks (morph_et kaob indeksist).
 *   2) INDEKS-pool: backend/scripts/index-meilisearch.mjs searchableAttributes tagasi (git revert) + reindeks.
 *   3) PÄRINGU-pool: storefront/lib/{morph-et.ts,meilisearch.ts,data/morph-et-query.generated.json} git revert + redeploy.
 * Index/päringu-pool = git revert + 4-sammu redeploy (dokumenteeritud sessioonilogis).
 *
 * HARD RULE #9: stack-lukk AINULT kirjutus-faasiks (--execute). HARD RULE #11: DATABASE_URL konteineri env-ist, EI prindita.
 *
 * Kasutus:
 *   node scripts/morph-et-undo.mjs                 # DRY: mitu toodet morph_et väljaga
 *   node scripts/morph-et-undo.mjs --execute       # strip KÕIGILT
 *   node scripts/morph-et-undo.mjs --execute --skus <fail>   # ainult loendi vevor_sku-d
 */
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { acquireStackLock } from "./lib/stack-lock.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const argv = process.argv.slice(2);
const EXECUTE = argv.includes("--execute");
const skusIdx = argv.indexOf("--skus");
const SKUS_FILE = skusIdx >= 0 ? argv[skusIdx + 1] : null;

function sh(cmd, args) {
  const r = spawnSync(cmd, args, { encoding: "utf8", maxBuffer: 1 << 30 });
  if (r.status !== 0) throw new Error(`${cmd} ${args.join(" ")} rc=${r.status}\n${(r.stderr || "").slice(0, 2000)}`);
  return r.stdout;
}

function medusaContainer() {
  const names = sh("docker", ["ps", "--format", "{{.Names}}"]).split("\n").map(s => s.trim()).filter(Boolean);
  const m = names.find(n => n.startsWith("medusa-k33g") && !n.startsWith("medusa-worker"));
  if (!m) throw new Error("medusa-k33g konteinerit ei leitud (docker ps)");
  return m;
}

function run(medusa, skus) {
  const tmp = mkdtempSync(path.join(tmpdir(), "morph-undo-"));
  const skuArg = skus ? JSON.stringify(skus) : "null";
  const script = `
    const { Client } = require('pg');
    const skus = ${skuArg};
    (async () => {
      const c = new Client({ connectionString: process.env.DATABASE_URL });
      await c.connect();
      const where = skus
        ? "metadata ? 'morph_et' AND metadata->>'vevor_sku' = ANY($1)"
        : "metadata ? 'morph_et'";
      const params = skus ? [skus] : [];
      const cnt = await c.query("SELECT count(*)::int AS n FROM product WHERE deleted_at IS NULL AND " + where, params);
      const n = cnt.rows[0].n;
      if (!${EXECUTE}) { console.log('MORPH_WITH_FIELD=' + n); await c.end(); return; }
      const r = await c.query(
        "UPDATE product SET metadata = (metadata - 'morph_et') - 'morph_et_h' WHERE deleted_at IS NULL AND " + where, params);
      console.log('MORPH_STRIPPED=' + r.rowCount);
      await c.end();
    })().catch(e => { console.error(e.message); process.exit(1); });
  `;
  const f = path.join(tmp, "morph-undo.cjs");
  writeFileSync(f, script);
  sh("docker", ["cp", f, `${medusa}:/tmp/morph-undo.cjs`]);
  return sh("docker", ["exec", "-e", "NODE_PATH=/app/node_modules", medusa, "node", "/tmp/morph-undo.cjs"]);
}

function main() {
  const medusa = medusaContainer();
  const skus = SKUS_FILE
    ? readFileSync(SKUS_FILE, "utf8").split("\n").map(s => s.trim()).filter(Boolean)
    : null;
  console.error(`=== morph-et-undo ${EXECUTE ? "EXECUTE" : "DRY"} ${skus ? `(skus=${skus.length})` : "(KÕIK)"} medusa=${medusa} ===`);

  if (!EXECUTE) {
    const out = run(medusa, skus);
    const m = out.match(/MORPH_WITH_FIELD=(\d+)/);
    console.error(`  [DRY] ${m ? m[1] : "?"} tootel on morph_et väli (eemaldaks need). Pärast --execute → [7] reindeks.`);
    console.log(out.trim());
    return;
  }

  const release = acquireStackLock({ holder: "morph-et-undo", waitMs: 1_200_000 });
  try {
    const out = run(medusa, skus);
    const m = out.match(/MORPH_STRIPPED=(\d+)/);
    console.error(`  morph_et eemaldatud: ${m ? m[1] : "?"} tootelt. JÄRGMINE SAMM: [7] reindeks (morph_et kaob indeksist).`);
    console.log(out.trim());
  } finally {
    release();
  }
}

main();
