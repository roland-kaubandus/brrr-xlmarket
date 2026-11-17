#!/usr/bin/env node
/**
 * morph-et-apply.mjs — Eesti liitsõna-otsing KIHT 1 apply-runner.
 *
 * HARD RULE #5 (üks transform, kaks kutsujat): kogu morfoloogia tuleb SSoT-ist
 * `scripts/lib/morph_et.py` (EstNLTK/Vabamorf). SEE runner on backfill-kutsuja
 * JA öise hooki kutsuja — SAMA python-transform, eri sisend (täis-korpus vs delta).
 *
 * Kaks väljundit (mõlemad pythonist):
 *   (a) morph_et string  → Postgres `product.metadata.morph_et` (+ `morph_et_h` stale-hash)
 *                          → Meili indekseerija loeb DB-st → searchableAttributes (madal prio)
 *   (b) query-map JSON    → `storefront/lib/data/morph-et-query.generated.json`
 *                          (lemma/head/comp; päringu-pool normaliseerib käände + null-fallback)
 *
 * Režiimid:
 *   (vaikimisi, ilma --execute)     DRY — raporteeri deficit, EI kirjuta, EI luku (HARD RULE #9).
 *   --execute --all                 BACKFILL kogu korpus; qmap REGEN TÄIS (autoriteetne).
 *   --execute                       HOOK-deficit: ainult tooted, mille morph_et puudub/aegunud
 *                                   (source-hash ≠ salvestatu); qmap MERGE olemasolevasse.
 *   --execute --skus <fail>         Eksplitsiitne delta (vevor_sku rea kaupa); qmap MERGE.
 *
 * HARD RULE #9: stack-lukk võetakse AINULT kirjutus-faasiks (--execute); lugemine + python
 * (read-only, host-CPU) käivad ENNE lukku → lukku hoitakse minimaalselt. DRY ei luku.
 * HARD RULE #11: ükski saladus (DATABASE_URL) ei välju konteinerist — kirjutus käib
 * `docker exec medusa node` sees, DATABASE_URL loetakse konteineri env-ist, EI prindita.
 */
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, writeFileSync, readFileSync, existsSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { acquireStackLock } from "./lib/stack-lock.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PY = path.join(ROOT, "scripts", "lib", "morph_et.py");
const QMAP_OUT = path.join(ROOT, "storefront", "lib", "data", "morph-et-query.generated.json");

const argv = process.argv.slice(2);
const EXECUTE = argv.includes("--execute");
const ALL = argv.includes("--all");
const skusIdx = argv.indexOf("--skus");
const SKUS_FILE = skusIdx >= 0 ? argv[skusIdx + 1] : null;
const MODE = ALL ? "all" : SKUS_FILE ? "skus" : "deficit";

function sh(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { encoding: "utf8", maxBuffer: 1 << 30, ...opts });
  if (r.status !== 0) {
    throw new Error(`${cmd} ${args.join(" ")} → rc=${r.status}\n${(r.stderr || "").slice(0, 2000)}`);
  }
  return r.stdout;
}

function containers() {
  const names = sh("docker", ["ps", "--format", "{{.Names}}"]).split("\n").map(s => s.trim()).filter(Boolean);
  const db = names.find(n => n.startsWith("db-k33g"));
  const medusa = names.find(n => n.startsWith("medusa-k33g") && !n.startsWith("medusa-worker"));
  if (!db) throw new Error("db-k33g konteinerit ei leitud (docker ps)");
  if (!medusa) throw new Error("medusa-k33g konteinerit ei leitud (docker ps)");
  return { db, medusa };
}

// morph_et lähtetekst — SAMA loogika kui DRY-prototüüp ja indekseerija:
//   tõlgitud toode → title_et (fallback title); tõlkimata → title_et-i AINULT kui olemas, muidu tühi.
//   + KATEGOORIA-NIMED (L3/L2 leaf-nimed, mille sisse toode on lingitud): eesti liitsõna head
//   (diiselsoojendid→soojendi, terrassisoojendid→soojendi) jõuab morph_et-i ka siis, kui title_et
//   kasutab muud sõnavara (nt "õhukütteseade"). Kategooria on eestikeelne ka tõlkimata tootel →
//   rahvakeelne otsing ("soojendi") leiab. Kategooria nimi on ÜHTLASI srcHash'is → L3 ümbernimetamine
//   muudab allika → deficit-hook (self-healing) töötleb need tooted automaatselt (= rename-hook).
function sourceText(row) {
  const te = (row.te || "").trim();
  const title = (row.title || "").trim();
  const cats = (row.cats || "").trim();
  const base = (row.tr === "true" || row.tr === true) ? (te || title) : te;
  return [base, cats].filter(Boolean).join(" ");
}
const srcHash = s => createHash("sha256").update(s, "utf8").digest("hex").slice(0, 16);

// Loe konteineri-node pg kaudu (DATABASE_URL konteineri env-ist, EI prindita — HARD RULE #11).
// NDJSON: JSON.stringify escapib stringisisesed reavahetused → üks rida = üks toode. Read-only → EI luku.
function readProducts(medusa, tmp) {
  const reader = `
    const { Client } = require('pg');
    (async () => {
      const c = new Client({ connectionString: process.env.DATABASE_URL });
      await c.connect();
      const r = await c.query(
        "SELECT p.id, p.title, p.metadata->>'title_et' AS te, p.metadata->>'translated' AS tr, " +
        "p.metadata->>'morph_et_h' AS h, p.metadata->>'vevor_sku' AS sku, " +
        "COALESCE(string_agg(DISTINCT pc.name, ' ') FILTER (WHERE pc.name IS NOT NULL), '') AS cats " +
        "FROM product p " +
        "LEFT JOIN product_category_product pcp ON pcp.product_id = p.id " +
        "LEFT JOIN product_category pc ON pc.id = pcp.product_category_id AND pc.deleted_at IS NULL " +
        "WHERE p.deleted_at IS NULL " +
        "GROUP BY p.id, p.title, p.metadata");
      for (const row of r.rows) process.stdout.write(JSON.stringify(row) + "\\n");
      await c.end();
    })().catch(e => { console.error(e.message); process.exit(1); });
  `;
  const rdFile = path.join(tmp, "morph-reader.cjs");
  writeFileSync(rdFile, reader);
  sh("docker", ["cp", rdFile, `${medusa}:/tmp/morph-reader.cjs`]);
  const out = sh("docker", ["exec", "-e", "NODE_PATH=/app/node_modules", medusa, "node", "/tmp/morph-reader.cjs"]);
  const rows = [];
  for (const line of out.split("\n")) {
    const l = line.trim();
    if (l) rows.push(JSON.parse(l));
  }
  return rows;
}

function selectWork(rows) {
  if (MODE === "all") return rows;
  if (MODE === "skus") {
    const want = new Set(readFileSync(SKUS_FILE, "utf8").split("\n").map(s => s.trim()).filter(Boolean));
    return rows.filter(r => r.sku && want.has(r.sku));
  }
  // deficit: morph_et puudub VÕI source-hash erineb salvestatust (self-healing, HARD RULE #6)
  return rows.filter(r => (r.h || "") !== srcHash(sourceText(r)));
}

function runPython(workRows, tmp) {
  const idtext = path.join(tmp, "idtext.ndjson");
  const mout = path.join(tmp, "morph.json");
  const qout = path.join(tmp, "qmap.json");
  const lines = workRows.map(r => JSON.stringify({ id: String(r.id), text: sourceText(r) }));
  writeFileSync(idtext, lines.join("\n") + "\n");
  const r = spawnSync("python3", [PY, "--docs", idtext, "--out-morph", mout, "--out-qmap", qout],
    { encoding: "utf8", maxBuffer: 1 << 30, stdio: ["ignore", "inherit", "inherit"] });
  if (r.status !== 0) throw new Error(`morph_et.py rc=${r.status}`);
  return { mout, qout };
}

// morph_et + hash → konteineri sees batched parameterized UPDATE (DATABASE_URL konteineri env-ist).
function writeMorphToDb(medusa, morphObj, hashById, tmp) {
  const payload = Object.entries(morphObj).map(([id, m]) => ({ id, m, h: hashById.get(id) || "" }));
  const applyFile = path.join(tmp, "morph-apply.json");
  writeFileSync(applyFile, JSON.stringify(payload));
  sh("docker", ["cp", applyFile, `${medusa}:/tmp/morph-apply.json`]);
  const updater = `
    const { Client } = require('pg');
    const fs = require('fs');
    const rows = JSON.parse(fs.readFileSync('/tmp/morph-apply.json','utf8'));
    (async () => {
      const c = new Client({ connectionString: process.env.DATABASE_URL });
      await c.connect();
      let n = 0;
      const B = 500;
      for (let i = 0; i < rows.length; i += B) {
        const chunk = rows.slice(i, i + B);
        await c.query('BEGIN');
        try {
          for (const r of chunk) {
            await c.query(
              "UPDATE product SET metadata = COALESCE(metadata,'{}'::jsonb) || jsonb_build_object('morph_et',$2::text,'morph_et_h',$3::text) WHERE id = $1",
              [r.id, r.m, r.h]
            );
            n++;
          }
          await c.query('COMMIT');
        } catch (e) { await c.query('ROLLBACK'); throw e; }
      }
      await c.end();
      console.log('MORPH_UPDATED=' + n);
    })().catch(e => { console.error(e.message); process.exit(1); });
  `;
  const updFile = path.join(tmp, "morph-updater.cjs");
  writeFileSync(updFile, updater);
  sh("docker", ["cp", updFile, `${medusa}:/tmp/morph-updater.cjs`]);
  const out = sh("docker", ["exec", "-e", "NODE_PATH=/app/node_modules", medusa, "node", "/tmp/morph-updater.cjs"]);
  const m = out.match(/MORPH_UPDATED=(\d+)/);
  return m ? parseInt(m[1], 10) : 0;
}

function mergeQmap(deltaQmap) {
  let base = { lemma: {}, head: {}, comp: [] };
  if (existsSync(QMAP_OUT)) base = JSON.parse(readFileSync(QMAP_OUT, "utf8"));
  Object.assign(base.lemma, deltaQmap.lemma || {});
  Object.assign(base.head, deltaQmap.head || {});
  const comp = new Set([...(base.comp || []), ...(deltaQmap.comp || [])]);
  base.comp = [...comp].sort();
  return base;
}

function writeQmap(qmap) {
  const dir = path.dirname(QMAP_OUT);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(QMAP_OUT, JSON.stringify(qmap));
}

async function main() {
  const { db, medusa } = containers();
  console.error(`=== morph-et-apply MODE=${MODE} ${EXECUTE ? "EXECUTE" : "DRY"} ===`);
  console.error(`  db=${db} medusa=${medusa}`);
  const tmp = mkdtempSync(path.join(tmpdir(), "morph-apply-"));

  // FAAS A (read-only, EI luku): loe tooted, vali töö-hulk, arvuta hash, jooksuta python host-CPU-l.
  const rows = readProducts(medusa, tmp);
  const work = selectWork(rows);
  const hashById = new Map(work.map(r => [String(r.id), srcHash(sourceText(r))]));
  console.error(`  korpus=${rows.length}  töö-hulk(${MODE})=${work.length}`);

  if (work.length === 0) {
    console.error("  deficit tühi — midagi uuendada pole.");
    console.log("MORPH_UPDATED=0");
    return;
  }

  if (!EXECUTE) {
    console.error(`  [DRY] uuendaks ${work.length} toote morph_et; qmap ${MODE === "all" ? "REGEN" : "MERGE"}.`);
    console.error(`  [DRY] näiteid: ${work.slice(0, 5).map(r => r.sku || r.id).join(", ")}`);
    console.log(`MORPH_DEFICIT=${work.length}`);
    return;
  }

  const { mout, qout } = runPython(work, tmp);
  const morphObj = JSON.parse(readFileSync(mout, "utf8"));
  const deltaQmap = JSON.parse(readFileSync(qout, "utf8"));

  // FAAS B (kirjutus): stack-lukk kogu kirjutus-faasiks (DB UPDATE + qmap-fail). Vabasta lõpus.
  const release = acquireStackLock({ holder: "morph-et-apply", waitMs: MODE === "all" ? 1_200_000 : 60_000 });
  let updated = 0;
  try {
    updated = writeMorphToDb(medusa, morphObj, hashById, tmp);
    const finalQmap = MODE === "all" ? deltaQmap : mergeQmap(deltaQmap);
    writeQmap(finalQmap);
    console.error(`  qmap: ${MODE === "all" ? "REGEN" : "MERGE"} → ${QMAP_OUT} ` +
      `(lemma=${Object.keys(finalQmap.lemma).length} head=${Object.keys(finalQmap.head).length} comp=${finalQmap.comp.length})`);
  } finally {
    release();
  }
  console.error(`  DB morph_et uuendatud: ${updated} toodet`);
  console.log(`MORPH_UPDATED=${updated}`);
}

main().catch(e => { console.error("❌ morph-et-apply FAIL: " + e.message); process.exit(1); });
