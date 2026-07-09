#!/usr/bin/env node
/*
 * lock-harness.mjs — PROTSESSI-VÄRAVAD taksonoomia-luku ümber (Code'i ettepanek #3).
 * Kolm faasi:
 *   node scripts/lock-harness.mjs pre  <teema-kaart.md> [<migrate.sql>]
 *   node scripts/lock-harness.mjs post <migrate.sql> <baseline_distinct> <baseline_l3>
 * PRE  = keeldub jooksmast kui puudub kaart/backup või inv EI ole puhas (baseline).
 * POST = blokeerib "valmis" väite kui inv FAIL / tootekadu / mpath-katki / struktuur muutus aga deploy tegemata.
 * EVIDENCE = migrate.sql product_id-d peavad esinema teema-kaardis (tõendi-rida).
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const [, , phase, ...rest] = process.argv;
let DB = "";
try { DB = execSync("docker ps --format '{{.Names}}' | grep '^db-k33g' | head -1", { encoding: "utf8" }).trim(); } catch {}
const psql = (sql) => execSync(`docker exec -i ${DB} psql -U xlmarket -d xlmarket -At -f -`, { input: sql, encoding: "utf8" }).trim();
const runInv = () => { try { execSync(`node ${resolve(HERE, "inv-taxonomy.mjs")}`, { stdio: "pipe" }); return true; } catch { return false; } };

const checks = [];
const ok = (name, pass, detail = "") => { checks.push({ name, pass, detail }); console.log(`  ${pass ? "✅" : "🔴"} ${name}${detail ? " — " + detail : ""}`); };

function distinct() { return +psql("SELECT count(DISTINCT product_id) FROM product_category_product;"); }
function l3count() { return +psql("SELECT count(*) FROM product_category WHERE mpath LIKE 'pcat_v4_l%' AND deleted_at IS NULL AND (char_length(mpath)-char_length(replace(mpath,'.','')))=2;"); }
function mpathBroken() {
  // L3 mille parent EI ole L2 (nt Vahtmatid-bug: parent=L3). depth(parent)!=1 → katki.
  return +psql(`WITH v4 AS (SELECT * FROM product_category WHERE mpath LIKE 'pcat_v4_l%' AND deleted_at IS NULL)
    SELECT count(*) FROM v4 c WHERE (char_length(c.mpath)-char_length(replace(c.mpath,'.','')))=2
      AND (SELECT char_length(p.mpath)-char_length(replace(p.mpath,'.','')) FROM v4 p WHERE p.id=c.parent_category_id) <> 1;`);
}
function migrateProductIds(sqlPath) {
  const txt = fs.readFileSync(sqlPath, "utf8");
  return [...new Set(txt.match(/prod_[0-9A-Z]{20,}/g) || [])];
}

if (!DB) { console.error("🔴 db-k33g konteinerit ei leitud."); process.exit(2); }

// ==================== PRE-FLIGHT ====================
if (phase === "pre") {
  const [mapPath, migratePath] = rest;
  console.log("🚦 PRE-FLIGHT");
  // 1. teema-kaart olemas + mittetühi
  ok("SAMM 0 kaart olemas", mapPath && fs.existsSync(mapPath) && fs.statSync(mapPath).size > 200, mapPath || "(kaart-argument puudub)");
  // 2. värske backup (< 90 min)
  let freshBackup = false, bkDetail = "";
  try {
    const dir = "/opt/eumotors-tasks/reports/backups";
    const files = fs.readdirSync(dir).filter((f) => f.endsWith(".sql")).map((f) => ({ f, m: fs.statSync(`${dir}/${f}`).mtimeMs }));
    const newest = files.sort((a, b) => b.m - a.m)[0];
    freshBackup = newest && (Date.now() - newest.m) < 90 * 60 * 1000;
    bkDetail = newest ? `${newest.f} (${Math.round((Date.now() - newest.m) / 60000)} min tagasi)` : "backup puudub";
  } catch { bkDetail = "backups-kaust puudub"; }
  ok("Värske backup (<90min)", freshBackup, bkDetail);
  // 3. inv-taxonomy BASELINE puhas (0 FAIL)
  ok("inv-taxonomy 0 FAIL (baseline)", runInv(), "vt node scripts/inv-taxonomy.mjs");
  // 4. EVIDENCE-GATE: migrate.sql product_id-d esinevad kaardis
  if (migratePath && fs.existsSync(migratePath) && mapPath && fs.existsSync(mapPath)) {
    const ids = migrateProductIds(migratePath);
    if (ids.length) {
      const mapTxt = fs.readFileSync(mapPath, "utf8");
      const missing = ids.filter((id) => !mapTxt.includes(id));
      ok("Evidence-gate (migrate id-d kaardis)", missing.length === 0, `${ids.length - missing.length}/${ids.length} tõendatud${missing.length ? "; puudu: " + missing.slice(0, 3).join(",") : ""}`);
    } else console.log("  ℹ️  migrate.sql kasutab L3-skoobi UPDATE-t (mitte id-loend) — evidence-gate vahele");
  }
}

// ==================== POST-FLIGHT ====================
else if (phase === "post") {
  const [migratePath, baseDistinct, baseL3] = rest;
  console.log("🏁 POST-FLIGHT");
  ok("inv-taxonomy 0 FAIL", runInv());
  const d = distinct();
  ok("Distinct-tooteid säilinud (0 kadu)", baseDistinct ? d === +baseDistinct : true, `nüüd=${d}${baseDistinct ? " baseline=" + baseDistinct : ""}`);
  ok("mpath terve (L3 parent = L2)", mpathBroken() === 0, mpathBroken() ? `${mpathBroken()} L3 vale parendiga` : "");
  const l3now = l3count();
  const structChanged = baseL3 && l3now !== +baseL3;
  if (structChanged) {
    console.log(`  ℹ️  STRUKTUUR MUUTUS (L3 ${baseL3}→${l3now}) → täis-4-sammu deploy nõutud:`);
    let pushed = false;
    try {
      execSync("git -C /opt/xlmarket-github fetch origin taxonomy-v4 -q");
      const local = execSync("git -C /opt/xlmarket-github rev-parse taxonomy-v4", { encoding: "utf8" }).trim();
      const origin = execSync("git -C /opt/xlmarket-github rev-parse origin/taxonomy-v4", { encoding: "utf8" }).trim();
      pushed = local === origin;
    } catch {}
    ok("  taxonomy-v4 pushitud origin'i (samm 3)", pushed, pushed ? "" : "git push origin taxonomy-v4 PUUDU");
  } else console.log(`  ℹ️  Struktuur muutumatu (L3=${l3now}) → deploy-nüanss: piisab Meili reindeksist.`);
  // Meili värskus: võrdle üht kategooriat DB vs Meili
  try {
    const MEILI = execSync("docker ps --format '{{.Names}}' | grep '^meili-k33g' | head -1", { encoding: "utf8" }).trim();
    const MK = execSync(`docker exec ${MEILI} printenv MEILI_MASTER_KEY`, { encoding: "utf8" }).trim();
    const h = psql("SELECT handle FROM product_category WHERE id='pcat_el_12x2_14';"); // Magnet-klotsid (stabiilne)
    const dbn = +psql("SELECT count(DISTINCT pcp.product_id) FROM product_category_product pcp JOIN product p ON p.id=pcp.product_id WHERE pcp.product_category_id='pcat_el_12x2_14' AND EXISTS(SELECT 1 FROM product_variant v WHERE v.product_id=p.id AND v.deleted_at IS NULL);");
    const mres = execSync(`docker exec ${MEILI} sh -c "wget -qO- --post-data='{\\"filter\\":\\"category_handles = ${h}\\",\\"limit\\":0}' --header=\\"Authorization: Bearer ${MK}\\" --header='Content-Type: application/json' http://127.0.0.1:7700/indexes/products/search"`, { encoding: "utf8" });
    const mn = JSON.parse(mres).estimatedTotalHits;
    ok("Meili värske (sample-kategooria DB≈Meili)", Math.abs(dbn - mn) <= 2, `DB=${dbn} Meili=${mn}`);
  } catch (e) { console.log("  ℹ️  Meili-kontroll vahele (ei saanud päringut teha)"); }
  // grab-bag INKREMENTAALNE (WARN, mitte FAIL — LLM pole deterministlik, inimene otsustab):
  // judge AINULT lukus puudutatud L3-d (~$0.01). Vahele kui ANTHROPIC_API_KEY puudub.
  if (process.env.ANTHROPIC_API_KEY && migratePath && fs.existsSync(migratePath)) {
    const catIds = [...new Set((fs.readFileSync(migratePath, "utf8").match(/pcat_[a-zA-Z0-9_]+/g) || []))].slice(0, 40);
    if (catIds.length) {
      try {
        const o = execSync(`node ${resolve(HERE, "grab-bag-judge.mjs")} --ids ${catIds.join(",")}`, { encoding: "utf8", env: process.env });
        const g = +((o.match(/GRAB:\s*(\d+)/) || [])[1] || 0);
        console.log(`  ${g ? "🟡" : "✅"} grab-bag inkrementaalne: ${g} GRAB ${catIds.length} puudutatud L3-s ${g ? "(WARN — vt reports/grab-judge-ids-tulem.md, inimene otsustab)" : ""}`);
      } catch (e) { console.log("  ℹ️  grab-bag judge vahele: " + String(e.message).slice(0, 60)); }
    }
  } else console.log("  ℹ️  grab-bag inkrementaalne vahele (ANTHROPIC_API_KEY/migrate puudub) — jooksuta käsitsi vajadusel");
  // intra-QA INKREMENTAALNE (WARN, mitte FAIL): toode vales L3-s samas mainis, puudutatud L3-del.
  if (process.env.ANTHROPIC_API_KEY && migratePath && fs.existsSync(migratePath)) {
    const catIds = [...new Set((fs.readFileSync(migratePath, "utf8").match(/pcat_[a-zA-Z0-9_]+/g) || []))].slice(0, 40);
    if (catIds.length) {
      try {
        const o = execSync(`node ${resolve(HERE, "intra-qa-judge.mjs")} --ids ${catIds.join(",")}`, { encoding: "utf8", env: process.env });
        const g = +((o.match(/Misfite:\s*(\d+)/) || [])[1] || 0);
        console.log(`  ${g ? "🟡" : "✅"} intra-QA inkrementaalne: ${g} misfit ${catIds.length} puudutatud L3-s ${g ? "(WARN — vt reports/intra-qa-test-tulem.md, inimene otsustab)" : ""}`);
      } catch (e) { console.log("  ℹ️  intra-QA vahele: " + String(e.message).slice(0, 60)); }
    }
  }
}

else { console.error("Kasuta: lock-harness.mjs pre <kaart.md> [<migrate.sql>]  |  post <migrate.sql> <baseline_distinct> <baseline_l3>"); process.exit(2); }

const failed = checks.filter((c) => !c.pass);
console.log(`\n${"=".repeat(46)}\n${phase.toUpperCase()}: ${failed.length ? "🔴 FAIL (" + failed.length + ")" : "🟢 PASS"}`);
process.exit(failed.length ? 1 : 0);
