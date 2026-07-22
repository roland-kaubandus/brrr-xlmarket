#!/usr/bin/env node
/*
 * inv-taxonomy.mjs — DB-põhised taksonoomia-invariandid (rules-as-checks).
 * Code'i ettepanek #1: proosa-reegel ei peata vigu; kontroll peatab.
 * Jooksuta IGA luku lõpus: `node scripts/inv-taxonomy.mjs`
 * FAIL → paranda ENNE commit'i. WARN → vaata üle.
 * Ühendub STAGING db-k33g konteinerisse (docker exec psql, stdin).
 * Whitelist: scripts/inv-whitelist.json (kinnitatud kaheti-tooted/L3-d).
 */
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import fs from "node:fs";

const HERE = dirname(fileURLToPath(import.meta.url));
const WL = JSON.parse(fs.readFileSync(resolve(HERE, "inv-whitelist.json"), "utf8"));

// --- leia DB konteiner ---
let DB;
try {
  DB = execSync("docker ps --format '{{.Names}}' | grep '^db-k33g' | head -1", { encoding: "utf8" }).trim();
} catch { DB = ""; }
if (!DB) { console.error("VIGA: db-k33g konteinerit ei leitud (docker ps)."); process.exit(2); }

function q(sql) {
  const out = execSync(`docker exec -i ${DB} psql -U xlmarket -d xlmarket -At -F '|' -f -`,
    { input: sql, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  return out.trim() ? out.trim().split("\n").map((l) => l.split("|")) : [];
}

const dualL3 = WL.dual_l3.map((s) => `'${s}'`).join(",") || "''";
const dualProd = (WL.dual_products || []).map((s) => `'${s}'`).join(",") || "''";
const dualIn24 = (WL.dual_in_24 || []).map((s) => `'${s}'`).join(",") || "''";

let fails = 0, warns = 0;
const sec = (id, sev, name) => console.log(`\n${sev === "FAIL" ? "🔴" : "🟡"} ${id} [${sev}] ${name}`);

// ============ INV-SEG-01: for-Kids väljaspool laste-kodusid ============
sec("INV-SEG-01", "FAIL", "for-Kids toode väljaspool #24 / Lapsemööbel / Beebi");
const seg01 = q(`
SELECT p.id, left(p.title,58),
  (SELECT name FROM product_category WHERE id=split_part(l3.mpath,'.',1)) main, l3.name
FROM product_category_product pcp JOIN product p ON p.id=pcp.product_id
JOIN product_category l3 ON l3.id=pcp.product_category_id
WHERE l3.mpath LIKE 'pcat_v4_l%' AND l3.deleted_at IS NULL
  AND split_part(l3.mpath,'.',1) <> 'pcat_v4_l24'
  AND l3.parent_category_id NOT IN ('pcat_v4_l6_7','pcat_v4_l15_2')
  AND l3.id NOT IN (${dualL3})
  AND p.id NOT IN (${dualProd})
  AND p.title ~* '(for kids|kids ages|kids (piano|drum|keyboard|guitar|scooter|swing|trampoline|bike|nest)|for children|for toddler|toddler|[0-9] ?\\+ ?year|ages [3-9])'
  AND p.title !~* '(adult|teen|beginner|youth|commercial|professional|spa |hot tub|classroom|starter|office|elderly)'
GROUP BY p.id, p.title, l3.mpath, l3.name
ORDER BY l3.name;`);
if (seg01.length) {
  fails += seg01.length;
  const byL3 = {};
  for (const [pid, title, main, l3] of seg01) (byL3[`${main} › ${l3}`] ||= []).push([pid, title]);
  for (const k in byL3) { console.log(`  ${k}: ${byL3[k].length}`); byL3[k].slice(0,3).forEach(([pid,t]) => console.log(`     ${pid}  ${t}`)); if (byL3[k].length>3) console.log(`     … +${byL3[k].length-3}`); }
  console.log(`  → soovitus: kontrolli sisu; eksklusiiv-laps → #24; kaheti → lisa whitelist'i`);
} else console.log("  ✓ puhas");

// ============ INV-SEG-02: for-Adults #24-s ============
sec("INV-SEG-02", "FAIL", "for-Adults/Adult toode #24 Lastekaupades");
const seg02 = q(`
SELECT p.id, left(p.title,58), l3.name
FROM product_category_product pcp JOIN product p ON p.id=pcp.product_id
JOIN product_category l3 ON l3.id=pcp.product_category_id
WHERE l3.mpath LIKE 'pcat_v4_l24.%' AND l3.deleted_at IS NULL
  AND p.title ~* '(for adults|adult only| adult )' AND p.title !~* '(kids|child|toddler)'
  AND p.id NOT IN (${dualIn24})
GROUP BY p.id,p.title,l3.name ORDER BY l3.name;`);
if (seg02.length) { fails += seg02.length; seg02.forEach(([pid,t,l3]) => console.log(`  ${l3}: ${pid}  ${t}`)); }
else console.log("  ✓ puhas");

// ============ INV-DUP-01: sama L3-nimi 2+ mainis (cross-main dup kandidaat) ============
sec("INV-DUP-01", "WARN", "sama normaliseeritud L3-nimi 2+ mainis");
const dup01 = q(`
SELECT regexp_replace(lower(l3.name),'[^a-zäöüõ0-9]','','g') nn,
  string_agg(DISTINCT (SELECT name FROM product_category WHERE id=split_part(l3.mpath,'.',1)),' | ') mains,
  count(DISTINCT split_part(l3.mpath,'.',1)) nm
FROM product_category l3 WHERE l3.mpath LIKE 'pcat_v4_l%' AND l3.deleted_at IS NULL
  AND (char_length(l3.mpath)-char_length(replace(l3.mpath,'.','')))=2
GROUP BY nn HAVING count(DISTINCT split_part(l3.mpath,'.',1))>1
  AND regexp_replace(lower(min(l3.name)),'[^a-zäöüõ0-9]','','g') NOT IN (${(WL.domain_ok_dup||[]).map(s=>`'${s}'`).join(",")||"''"})
ORDER BY nm DESC;`);
if (dup01.length) { warns += dup01.length; dup01.forEach(([nn,mains,nm]) => console.log(`  "${nn}" (${nm} maini): ${mains}`)); }
else console.log("  ✓ puhas");

// ============ INV-STRUCT-01: orb L3 / dead L2 / dup-handle ============
sec("INV-STRUCT-01", "FAIL", "orb L3 · dead L2 · dup-handle");
const st = q(`
WITH v4 AS (SELECT * FROM product_category WHERE mpath LIKE 'pcat_v4_l%' AND deleted_at IS NULL)
SELECT 'orphan_L3', count(*)::text FROM v4 c WHERE (char_length(c.mpath)-char_length(replace(c.mpath,'.','')))=2 AND NOT EXISTS(SELECT 1 FROM v4 p WHERE p.id=c.parent_category_id)
UNION ALL SELECT 'empty_L3', count(*)::text FROM v4 c WHERE (char_length(c.mpath)-char_length(replace(c.mpath,'.','')))=2 AND NOT EXISTS(SELECT 1 FROM product_category_product pcp WHERE pcp.product_category_id=c.id)
UNION ALL SELECT 'dead_L2', count(*)::text FROM v4 l2 WHERE (char_length(l2.mpath)-char_length(replace(l2.mpath,'.','')))=1 AND NOT EXISTS(SELECT 1 FROM v4 l3 WHERE l3.parent_category_id=l2.id)
UNION ALL SELECT 'dup_handle', count(*)::text FROM (SELECT handle FROM v4 GROUP BY handle HAVING count(*)>1) h;`);
let stFail = 0;
for (const [k, v] of st) { const n = +v; if (n > 0) { stFail += n; console.log(`  🔴 ${k}: ${n}`); } else console.log(`  ✓ ${k}: 0`); }
fails += stFail;

// ============ INV-META-01: iga v4 kategooria omab taxonomy_node_meta rea (õige level) ============
// JUUR: L3-loomine migrate-SQL-iga jättis meta-rea lisamata (956-import) → meta-põhised
//   tööriistad (whole-catalog spec-backfill, nav-gen) jätsid tooted vaikselt vahele.
//   Jõustus: create-l3.mjs teeb kategooria+meta atomaarselt; SEE invariant püüab käsitsi-augud.
sec("INV-META-01", "FAIL", "v4 kategooria ilma meta-reata / vale level");
const meta01 = q(`
WITH v4 AS (SELECT id, name, mpath, (char_length(mpath)-char_length(replace(mpath,'.','')))+1 AS depth
  FROM product_category WHERE mpath LIKE 'pcat_v4_l%' AND deleted_at IS NULL)
SELECT v4.depth::text, v4.id, v4.name,
  CASE WHEN m.node_id IS NULL THEN 'META-PUUDU' ELSE 'LEVEL-VALE('||m.level||'≠'||v4.depth||')' END
FROM v4 LEFT JOIN taxonomy_node_meta m ON m.node_id=v4.id
WHERE m.node_id IS NULL OR m.level <> v4.depth
ORDER BY v4.depth, v4.name;`);
if (meta01.length) {
  fails += meta01.length;
  console.log(`  ${meta01.length} v4-node ilma korrektse meta-reata:`);
  meta01.slice(0, 15).forEach(([d, id, nm, issue]) => console.log(`     L${d} ${id}  ${nm}  → ${issue}`));
  if (meta01.length > 15) console.log(`     … +${meta01.length - 15}`);
  console.log(`  → soovitus: L3-loomine läbi scripts/create-l3.mjs (kategooria+meta atomaarselt); käsitsi-parand: taxonomy_node_meta INSERT (vt new5-l3-meta-fix-migrate.sql)`);
} else console.log("  ✓ puhas");

// ============ INV-NAME-01: L2/L3 nimi inglise sõnaga (nime-faasi kandidaat) ============
sec("INV-NAME-01", "WARN", "L2/L3 nimi sisaldab inglise sõna");
const nm01 = q(`
SELECT (SELECT name FROM product_category WHERE id=split_part(c.mpath,'.',1)) main, c.name
FROM product_category c WHERE c.mpath LIKE 'pcat_v4_l%' AND c.deleted_at IS NULL
  AND (char_length(c.mpath)-char_length(replace(c.mpath,'.',''))) IN (1,2)
  AND c.name ~ '\\y(Toys|Toy|Kit|Kits|Set|Sets|Machine|Swing|Wagon|Bounce|Play|Kids|Baby|Sport|Box|Cart|Stand|Rack|Board)\\y'
ORDER BY c.name;`);
if (nm01.length) { warns += nm01.length; nm01.forEach(([main,name]) => console.log(`  ${main} › ${name}`)); }
else console.log("  ✓ puhas");

// ============ INV-WIDTH-01: L3 < 3 tootega (kitsas sundkodu?) ============
sec("INV-WIDTH-01", "WARN", "L3 < 3 tootega (laiuse-reegel — kitsas L3?)");
const w1 = q(`
SELECT (SELECT name FROM product_category WHERE id=split_part(l3.mpath,'.',1)) main, l3.name,
  (SELECT count(*) FROM product_category_product WHERE product_category_id=l3.id) n
FROM product_category l3 WHERE l3.mpath LIKE 'pcat_v4_l%' AND l3.deleted_at IS NULL
  AND (char_length(l3.mpath)-char_length(replace(l3.mpath,'.','')))=2
  AND (SELECT count(*) FROM product_category_product WHERE product_category_id=l3.id) < 3
ORDER BY n, l3.name;`);
if (w1.length) { warns += w1.length; console.log(`  ${w1.length} L3 alla 3 toote (näita esimesed 15):`); w1.slice(0,15).forEach(([m,nm,n]) => console.log(`     ${n}  ${m} › ${nm}`)); if (w1.length>15) console.log(`     … +${w1.length-15}`); }
else console.log("  ✓ puhas");

// ============ INV-GRAB-01: EEMALDATUD keyword-heuristika (recall 0% — tõestatud vale-negatiiv) ============
// Grab-bagid jagavad dominantset sõna (grill/desk/aquarium/cooking) → märksõna-heuristika ei näe sekundaar-klastrit.
// Nime-signaal "X ja Y" = 85% recall aga 50% FP (805/1595). → SEMANTILINE tuvastus AINULT: scripts/grab-bag-judge.mjs (LLM).
console.log("\n🟡 INV-GRAB-01 [INFO] grab-bag = scripts/grab-bag-judge.mjs (LLM-semantiline, perioodiline)");
console.log("  ℹ️  keyword-heuristika EEMALDATUD (recall 0% — vt reports/detektor-valideerimine.md). Jooksuta judge uue maini/feedi järel.");

// ============ INV-ORPHAN-01: kulumaterjal-L3 ilma paaris-seadmeta samas L2 ============
sec("INV-ORPHAN-01", "WARN", "kulumaterjal-L3 (lint/tint/filter/kassett/tera) — kontrolli paaris-seade samas L2");
const o1 = q(`
SELECT (SELECT name FROM product_category WHERE id=split_part(l3.mpath,'.',1)) main,
  (SELECT name FROM product_category WHERE id=l3.parent_category_id) l2, l3.name
FROM product_category l3 WHERE l3.mpath LIKE 'pcat_v4_l%' AND l3.deleted_at IS NULL
  AND (char_length(l3.mpath)-char_length(replace(l3.mpath,'.','')))=2
  AND l3.name ~* '(lint|tint|kassett|cartridge|toner|filter|filtri|tera |terad|otsik|kulumaterjal|refill|padjake)'
  -- välista L2, mis ISE on kulumaterjali/tarvikute/varuosade kodu (seal on koos = ÕIGE)
  AND (SELECT name FROM product_category WHERE id=l3.parent_category_id) !~* '(tarvikud|kulumaterjal|varuosad|filtr)'
ORDER BY l2, l3.name;`);
if (o1.length) { warns += o1.length; console.log(`  ${o1.length} kulumaterjal-L3 (kontrolli seade kõrval):`); o1.forEach(([m,l2,nm]) => console.log(`     ${m} › ${l2} › ${nm}`)); }
else console.log("  ✓ puhas");

// ============ INV-COMPLETE-01: sama L3-nimi 2 L3-s ÜHES mainis (teostus poolik) ============
sec("INV-COMPLETE-01", "WARN", "sama normaliseeritud L3-nimi 2+ korda ÜHES mainis");
const c1 = q(`
WITH x AS (SELECT split_part(l3.mpath,'.',1) mainid, regexp_replace(lower(l3.name),'[^a-zäöüõ0-9]','','g') nn, l3.name
  FROM product_category l3 WHERE l3.mpath LIKE 'pcat_v4_l%' AND l3.deleted_at IS NULL AND (char_length(l3.mpath)-char_length(replace(l3.mpath,'.','')))=2)
SELECT (SELECT name FROM product_category WHERE id=mainid) main, nn, count(*) c FROM x GROUP BY mainid, nn HAVING count(*)>1 ORDER BY c DESC;`);
if (c1.length) { warns += c1.length; c1.forEach(([m,nn,c]) => console.log(`  🔴 ${m}: "${nn}" ×${c} (teostus poolik — koonda)`)); }
else console.log("  ✓ puhas");

// ============ KOKKUVÕTE ============
console.log(`\n${"=".repeat(50)}`);
console.log(`KOKKU: ${fails} FAIL · ${warns} WARN  (DB=${DB})`);
console.log(fails ? "🔴 FAIL — paranda ENNE commit'i." : "🟢 Invariandid puhtad.");
process.exit(fails ? 1 : 0);
