import fs from "node:fs";
import { execSync } from "node:child_process";
// final-tree.json = git-varundatud data-snapshot (scripts/data/, script-suhteline → jookseb igas asukohas).
// OUT = deploy-pipeline staging-sisend (sealt cp → backend/src/data/taxonomy.yaml).
const TREE_JSON = new URL("./data/2026-06-15-final-tree.json", import.meta.url), OUT="/opt/eumotors-tasks/v4-staging";

// ⚠️ AUTO-VÄRSKENDA DUMPE DB-st (väldib stale-dump gotcha't: genyM ei loe DB-d otse,
// vaid /tmp/x-l2.txt + /tmp/x-l3.txt; vanad dumbid → SSoT/nav VANA struktuuriga).
// Tõestus: torn-merge 1. deploy kasutas stale dumpe → torn jäi navi. Nüüd värskus garanteeritud.
try {
  const DB = execSync("docker ps --format '{{.Names}}' | grep '^db-k33g' | head -1", { encoding: "utf8" }).trim();
  if (!DB) throw new Error("db-k33g konteinerit ei leitud");
  const dump = (sql, path) => fs.writeFileSync(path, execSync(`docker exec -i ${DB} psql -U xlmarket -d xlmarket -At -F '|' -f -`, { input: sql, encoding: "utf8" }));
  dump("SELECT parent_category_id, rank, handle, name FROM product_category WHERE mpath LIKE 'pcat_v4_l%' AND deleted_at IS NULL AND (char_length(mpath)-char_length(replace(mpath,'.','')))=1 ORDER BY parent_category_id, rank;", "/tmp/x-l2.txt");
  dump("SELECT l2.handle, l3.handle, l3.name FROM product_category l3 JOIN product_category l2 ON l2.id=l3.parent_category_id WHERE l3.mpath LIKE 'pcat_v4_l%' AND l3.deleted_at IS NULL AND l2.deleted_at IS NULL AND (char_length(l3.mpath)-char_length(replace(l3.mpath,'.','')))=2 ORDER BY l2.handle, l3.rank;", "/tmp/x-l3.txt");
  console.error(`✅ dumbid värskendatud DB-st (${DB}): x-l2=${fs.readFileSync("/tmp/x-l2.txt","utf8").trim().split("\n").length} x-l3=${fs.readFileSync("/tmp/x-l3.txt","utf8").trim().split("\n").length}`);
} catch (e) {
  console.error(`⚠️  dump-värskendus VAHELE (${e.message.slice(0,60)}) — kasutan olemasolevaid /tmp/x-l*.txt (VÕIVAD OLLA STALE!)`);
}

const tree=JSON.parse(fs.readFileSync(TREE_JSON,"utf8"));
const J=s=>JSON.stringify(s);
const dbL2={}; for(const l of fs.readFileSync("/tmp/x-l2.txt","utf8").trim().split("\n")){const[l1id,rank,h,n]=l.split("|");(dbL2[l1id]=dbL2[l1id]||[]).push({rank:+rank,h,n});}
for(const k in dbL2)dbL2[k].sort((a,b)=>a.rank-b.rank);
const dbL3={}; for(const l of fs.readFileSync("/tmp/x-l3.txt","utf8").trim().split("\n")){const[l2h,l3h,l3n]=l.split("|");(dbL3[l2h]=dbL3[l2h]||[]).push([l3h,l3n]);}
const allDB={}; for(let i=1;i<=17;i++)allDB[i]="pcat_v4_l"+i;
function block(yl,h,name,short,count,subsFn){yl.push(`  - slug: ${h}`,`    name_en: ${J(name)}`,`    name_et: ${J(name)}`,`    short_slug: ${short}`,`    tagline_en: ${J(name)}`,`    tagline_et: ${J(name)}`,`    description_en: ${J(name+" — products.")}`,`    description_et: ${J(name+" — tooted.")}`,`    hero_img: /images/branches/horeca.webp`,`    hero_gradient: from-stone-950/80 via-stone-900/40 to-transparent`,`    product_count: ${count}`,`    subs:`);subsFn(yl);}
function subsDB(y,l1id){for(const l2 of (dbL2[l1id]||[])){y.push(`      - slug: ${l2.h}`,`        name_en: ${J(l2.n)}`,`        name_et: ${J(l2.n)}`,`        product_count: 0`);const l3s=dbL3[l2.h]||[];if(l3s.length){y.push(`        subs:`);for(const[a,b] of l3s)y.push(`          - slug: ${a}`,`            name_en: ${J(b)}`,`            name_et: ${J(b)}`,`            product_count: 0`);}}}
const yl=["version: 4","updated: '2026-06-19'","source: v4 + #20 Peoinventar (nav #11 järel) + #19 Muusika (#12 järel) + #18 (#14 järel)","l1:"];
for(const l1 of tree.l1){block(yl,"v4-"+l1.slug,l1.name,l1.slug,l1.count,(y)=>subsDB(y,allDB[l1.n]));
  if(l1.n===11)block(yl,"v4-peoinventar-ja-dekoratsioonid","Peoinventar ja dekoratsioonid","peoinventar",413,(y)=>subsDB(y,"pcat_v4_l20"));
  if(l1.n===12)block(yl,"v4-muusika-ja-helitehnika","Muusika ja helitehnika","muusika",201,(y)=>subsDB(y,"pcat_v4_l19"));
  if(l1.n===14)block(yl,"v4-pollumajandus-ja-loomakasvatus","Põllumajandus ja loomakasvatus","pollumajandus",238,(y)=>subsDB(y,"pcat_v4_l18"));
}
block(yl,"v4-buroo-ja-kontoritarvikud","Büroo & kontoritarvikud","buroo",124,(y)=>subsDB(y,"pcat_v4_l21"));
block(yl,"v4-ladu-hoiustamine-ja-pakendamine","Ladu, hoiustamine & pakendamine","ladu",447,(y)=>subsDB(y,"pcat_v4_l22"));
block(yl,"v4-elektroonika-ja-multimeedia","Elektroonika & multimeedia","elektroonika",123,(y)=>subsDB(y,"pcat_v4_l23"));
block(yl,"v4-lastekaubad-ja-manguasjad","Lastekaubad ja mänguasjad","lastekaubad",293,(y)=>subsDB(y,"pcat_v4_l24"));
fs.writeFileSync(`${OUT}/taxonomy-music.yaml`,yl.join("\n")+"\n");
console.log("yaml: 24 L1");
