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

// ⚠️ EN-NIMI + SEO DB-st (EN-pakett SSoT, 2026-10-13): taxonomy_node_translation(locale='en') + taxonomy_node_seo.
// handle→en_name ja handle→{desc/tagline et+en}. Puudub → fallback DB-ET-nimi + stub (idempotentne: tühi = vana käitumine).
let enMap={}, seoMap={};
try {
  const DB2 = execSync("docker ps --format '{{.Names}}' | grep '^db-k33g' | head -1", { encoding: "utf8" }).trim();
  if (!DB2) throw new Error("db-k33g puudub");
  const q = (sql) => { const o = execSync(`docker exec -i ${DB2} psql -U xlmarket -d xlmarket -At`, { input: sql, encoding: "utf8", maxBuffer: 128*1024*1024 }).trim(); return o ? JSON.parse(o) : []; };
  for (const r of q(`SELECT coalesce(json_agg(t),'[]') FROM (SELECT pc.handle, tr.name FROM taxonomy_node_translation tr JOIN product_category pc ON pc.id=tr.node_id WHERE tr.locale='en') t;`)) enMap[r.handle]=r.name;
  for (const r of q(`SELECT coalesce(json_agg(t),'[]') FROM (SELECT pc.handle, s.description_et, s.description_en, s.tagline_et, s.tagline_en FROM taxonomy_node_seo s JOIN product_category pc ON pc.id=s.node_id) t;`)) seoMap[r.handle]=r;
  console.error(`✅ EN/SEO DB-st: en=${Object.keys(enMap).length} seo=${Object.keys(seoMap).length}`);
} catch (e) { console.error(`⚠️  EN/SEO dump VAHELE (${e.message.slice(0,50)}) — fallback DB-ET-nimi + stub`); }

const J=s=>JSON.stringify(s);
const dbL2={}; for(const l of fs.readFileSync("/tmp/x-l2.txt","utf8").trim().split("\n")){const[l1id,rank,h,n]=l.split("|");(dbL2[l1id]=dbL2[l1id]||[]).push({rank:+rank,h,n});}
for(const k in dbL2)dbL2[k].sort((a,b)=>a.rank-b.rank);
const dbL3={}; for(const l of fs.readFileSync("/tmp/x-l3.txt","utf8").trim().split("\n")){const[l2h,l3h,l3n]=l.split("|");(dbL3[l2h]=dbL3[l2h]||[]).push([l3h,l3n]);}
const enName=(h,fallback)=>enMap[h]||fallback;                    // EN-nimi DB-st, fallback ET
// SEO-read (tagline+description en+et) handle'ile; seoMap puudub → fallback stub (ET-nimi põhjal).
function seoLines(ind,h,name){const s=seoMap[h];const p=" ".repeat(ind);
  return [`${p}tagline_en: ${J(s&&s.tagline_en||name)}`,`${p}tagline_et: ${J(s&&s.tagline_et||name)}`,
    `${p}description_en: ${J(s&&s.description_en||name+" — products.")}`,`${p}description_et: ${J(s&&s.description_et||name+" — tooted.")}`];}
function block(yl,h,name,short,count,subsFn){yl.push(`  - slug: ${h}`,`    name_en: ${J(enName(h,name))}`,`    name_et: ${J(name)}`,`    short_slug: ${short}`,...seoLines(4,h,name),`    hero_img: /images/branches/horeca.webp`,`    hero_gradient: from-stone-950/80 via-stone-900/40 to-transparent`,`    product_count: ${count}`,`    subs:`);subsFn(yl);}
function subsDB(y,l1id){for(const l2 of (dbL2[l1id]||[])){y.push(`      - slug: ${l2.h}`,`        name_en: ${J(enName(l2.h,l2.n))}`,`        name_et: ${J(l2.n)}`,...seoLines(8,l2.h,l2.n),`        product_count: 0`);const l3s=dbL3[l2.h]||[];if(l3s.length){y.push(`        subs:`);for(const[a,b] of l3s)y.push(`          - slug: ${a}`,`            name_en: ${J(enName(a,b))}`,`            name_et: ${J(b)}`,...seoLines(12,a,b),`            product_count: 0`);}}}
// 25 MAINI LÕPLIK JÄRJEKORD + nimi + slug (Tarmo nägemus 2026-07-19). SSoT = see massiiv (mitte snapshot).
// Slug ilma v4- prefiksita (block lisab). Count = reaalne distinct tootearv DB-st (2026-07-19).
const MAINS=[
  {id:"pcat_v4_l1", slug:"tooriistad-ja-tarvikud",              name:"Tööriistad ja tarvikud",              count:2697},
  {id:"pcat_v4_l2", slug:"garaaziseadmed-ja-autoremont",        name:"Garaažiseadmed ja autoremont",        count:591},
  {id:"pcat_v4_l5", slug:"suurkoogiseadmed",                    name:"Suurköögiseadmed",                    count:1371},
  {id:"pcat_v4_l4", slug:"kodumasinad-ja-kodutehnika",          name:"Kodumasinad ja kodutehnika",          count:270},
  {id:"pcat_v4_l6", slug:"moobel-ja-sisustus",                  name:"Mööbel ja sisustus",                  count:1303},
  {id:"pcat_v4_l7", slug:"aed-ja-aiatehnika",                   name:"Aed ja aiatehnika",                   count:1663},
  {id:"pcat_v4_l8", slug:"telgid-varjualused-ja-kasvuhooned",   name:"Telgid, varjualused ja kasvuhooned",  count:345},
  {id:"pcat_v4_l3", slug:"autovaruosad-ja-tarvikud",            name:"Autovaruosad ja -tarvikud",           count:1291},
  {id:"pcat_v4_l12",slug:"sport-ja-vaba-aeg",                   name:"Sport ja vaba aeg",                   count:1729},
  {id:"pcat_v4_l9", slug:"ehitus-ja-remont",                    name:"Ehitus ja remont",                    count:1022},
  {id:"pcat_v4_l11",slug:"elektritarvikud-ja-valgustus",        name:"Elektritarvikud ja valgustus",        count:479},
  {id:"pcat_v4_l10",slug:"santehnika-kute-ja-ventilatsioon",    name:"Santehnika, küte ja ventilatsioon",   count:797},
  {id:"pcat_v4_l22",slug:"ladu-hoiustamine-ja-pakendamine",     name:"Ladu, hoiustamine ja pakendamine",    count:387},
  {id:"pcat_v4_l21",slug:"buroo-ja-kontoritarvikud",            name:"Büroo ja kontoritarvikud",            count:185},
  {id:"pcat_v4_l13",slug:"reklaami-truki-ja-graveerimisseadmed",name:"Reklaami-, trüki- ja graveerimisseadmed",count:434},
  {id:"pcat_v4_l23",slug:"elektroonika-ja-multimeedia",         name:"Elektroonika ja multimeedia",         count:169},
  {id:"pcat_v4_l19",slug:"muusika-ja-helitehnika",              name:"Muusika ja helitehnika",              count:168},
  {id:"pcat_v4_l20",slug:"peoinventar-ja-dekoratsioonid",       name:"Peoinventar ja dekoratsioonid",       count:411},
  {id:"pcat_v4_l25",slug:"hobi-ja-kasitoo",                     name:"Hobi ja käsitöö",                     count:149},
  {id:"pcat_v4_l24",slug:"lastekaubad-ja-manguasjad",           name:"Lastekaubad ja mänguasjad",           count:353},
  {id:"pcat_v4_l14",slug:"lemmikloomatarbed",                   name:"Lemmikloomatarbed",                   count:427},
  {id:"pcat_v4_l18",slug:"pollumajandus-ja-loomakasvatus",      name:"Põllumajandus ja loomakasvatus",      count:251},
  {id:"pcat_v4_l15",slug:"tervis-hooldus-ja-ilu",               name:"Tervis, hooldus ja ilu",              count:314},
  {id:"pcat_v4_l16",slug:"meditsiin-labor-ja-teadus",           name:"Meditsiin, labor ja teadus",          count:374},
  {id:"pcat_v4_l17",slug:"tooriied-ja-isikukaitse",             name:"Tööriied ja isikukaitse",             count:244},
  // 26. main (Tarmo 2026-07-20) — Outlet: tagastatud/rikutud-pakend kaup, eraldi osakond. FLAT (ei L2/L3).
  // OUTLET PEIDETUD NAVIST 2026-08-25 (Tarmo, hübriid-b+c). Tuleviku-kontseptsioon, praktikas
  // populeerimata (0 reaalset sortimenti). Struktuur säilib DB-s (v4-outlet + 2 L2, is_internal=true)
  // + whitelist'is (dead_l2_ok). TAGASI NAVI: taasta rida + eemalda is_internal kui sortiment tekib.
  // {id:"pcat_v4_l26",slug:"outlet", name:"Outlet", count:1},
];
const yl=["version: 4","updated: '2026-07-20'","source: v4 nav-järjekord LÕPLIK + Outlet 26. main (Tarmo 2026-07-20)","l1:"];
for(const m of MAINS) block(yl,"v4-"+m.slug,m.name,m.slug,m.count,(y)=>subsDB(y,m.id));
fs.writeFileSync(`${OUT}/taxonomy-music.yaml`,yl.join("\n")+"\n");
console.log(`yaml: ${MAINS.length} L1 (Outlet peidetud navist — is_internal + whitelist)`);
