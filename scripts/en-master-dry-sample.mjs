#!/usr/bin/env node
/**
 * en-master-dry-sample.mjs — EN-MASTER PUHASTUSE DRY-VALIM (Tarmo 2026-11-18, stsenaarium A).
 *
 * MASTER = puhastatud EN (CLAUDE.md "SISU-ARHITEKTUUR"). Toores VEVOR title/description on
 * ainult ALLIKAS. See skript DRY-jooksutab Sonnet-puhastuse 40 tootel (1 igast top-kategooriast)
 * ja NÄITAB kvaliteeti + ekstrapoleerib batch-kulu. EI KIRJUTA DB-sse (puhas read-only + raport).
 *
 * Stsenaarium A: puhas `title_en_clean` + `description_en_clean` ERALDI väljadena; raw JÄÄB.
 * `selling_points` jäetakse (juba puhas proosa) — kasutatakse allikana.
 *
 * NELI VÄRAVAT (fail → regen tagasisidega, max 3×):
 *   1. TÄPSUS   — iga number(+ühik) puhtas tekstis peab esinema allikas (title+desc+SP+specs+dims).
 *   2. BRÄND    — puhtas tekstis EI tohi olla "VEVOR" (ega muu tarnija-brändi).
 *   3. HTML     — puhtas tekstis EI tohi olla `<...>` tage.
 *   4. PIKKUS   — title ≤ 90 tähte (mitte keyword-stuff), description 40..700 tähte.
 *
 * Käsk:  set -a; . /opt/eumotors-tasks/.env; set +a
 *        node scripts/en-master-dry-sample.mjs [N=40]
 */
import fs from "node:fs";
import { execFileSync } from "node:child_process";

const API_KEY = process.env.ANTHROPIC_API_KEY;
if (!API_KEY) { console.error("❌ ANTHROPIC_API_KEY puudub (set -a; . /opt/eumotors-tasks/.env; set +a)"); process.exit(2); }
const N = Number(process.argv[2]) || 40;
const REPO = "/opt/xlmarket-github";

const PRICE = { "claude-sonnet-5": [3, 15], "claude-opus-4-8": [5, 25], "claude-fable-5": [10, 50] }; // $/1M in,out
const usage = {};
function tally(model, j) {
  const u = usage[model] ||= { in: 0, out: 0, calls: 0 };
  if (j.usage) { u.in += j.usage.input_tokens || 0; u.out += j.usage.output_tokens || 0; u.calls++; }
}
function makeCaller(model, maxTokens = 1200) {
  return async function call(system, user) {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model, max_tokens: maxTokens, system, messages: [{ role: "user", content: user }] }),
    });
    if (!res.ok) throw new Error(`${model} HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const j = await res.json();
    tally(model, j);
    const raw = ((j.content || []).find(c => c.type === "text")?.text || "").replace(/```(?:json)?/gi, "").trim();
    const m = raw.match(/\{[\s\S]*\}/);
    if (!m) throw new Error(`${model} JSON puudub: ${raw.slice(0, 150)}`);
    return JSON.parse(m[0]);
  };
}
const sonnet = makeCaller("claude-sonnet-5");

// ---- DB (read-only) ----
const DB = execFileSync("bash", ["-c", "docker ps --format '{{.Names}}' | grep -E '^db-k33g' | head -1"]).toString().trim();
if (!DB) { console.error("❌ db-k33g konteiner puudub"); process.exit(2); }
function psqlJson(sql) {
  const out = execFileSync("docker", ["exec", "-i", DB, "psql", "-U", "xlmarket", "-d", "xlmarket", "-tA", "-f", "-"],
    { input: sql, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }).trim();
  return out ? JSON.parse(out) : [];
}

// ---- allikas-tekst (number/ühik-tõestuse korpus) ----
function specsLines(specs) {
  if (!specs || typeof specs !== "object") return [];
  const out = [];
  for (const [k, v] of Object.entries(specs)) {
    if (v && typeof v === "object") out.push(`${k}: ${v.d != null ? v.d : JSON.stringify(v)}`);
    else out.push(`${k}: ${v}`);
  }
  return out;
}
function sourceCorpus(p) {
  const parts = [p.title || "", p.description || ""];
  if (Array.isArray(p.selling_points)) parts.push(...p.selling_points);
  parts.push(...specsLines(p.specs));
  if (p.dimensions && typeof p.dimensions === "object") parts.push(JSON.stringify(p.dimensions));
  return parts.join("\n");
}

// ---- number-ekstrakt (täpsuse-värav) ----
const NUM_RE = /\d+(?:[.,]\d+)?/g;
const normNum = x => x.replace(",", ".").replace(/\.0+$/, "").replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "");
function numSet(s) { return new Set((String(s).match(NUM_RE) || []).map(normNum)); }
// ühik = numbrile vahetult järgnev täht-/°/%-jada
const NUMUNIT_RE = /(\d+(?:[.,]\d+)?)\s*([a-zA-Z%°″"]+)?/g;

function accuracyGate(clean, srcText) {
  const srcNums = numSet(srcText);
  const srcLow = srcText.toLowerCase();
  const offenders = [];
  for (const field of ["title_en_clean", "description_en_clean"]) {
    const v = String(clean[field] || "");
    let m;
    NUMUNIT_RE.lastIndex = 0;
    while ((m = NUMUNIT_RE.exec(v))) {
      const num = normNum(m[1]);
      const unit = (m[2] || "").toLowerCase().replace(/[.,]$/, "");
      if (!srcNums.has(num)) { offenders.push(`${field}: number «${m[1]}${m[2] ? " " + m[2] : ""}» pole allikas`); continue; }
      // ühik (kui on ja >1 täht või teadaolev lühi-ühik) peab samuti allikas esinema
      if (unit && unit.length >= 1 && !/^(x|nd|rd|st|th)$/.test(unit) && !srcLow.includes(unit)) {
        offenders.push(`${field}: ühik «${unit}» (number ${m[1]}) pole allikas`);
      }
    }
  }
  return { pass: offenders.length === 0, offenders };
}
const BRAND_RE = /\b(vevor|blacktools|kraftdele|geko)\b/i;
function brandGate(clean) {
  const off = [];
  for (const f of ["title_en_clean", "description_en_clean"]) {
    const mm = String(clean[f] || "").match(BRAND_RE);
    if (mm) off.push(`${f}: bränd «${mm[0]}»`);
  }
  return { pass: off.length === 0, offenders: off };
}
function htmlGate(clean) {
  const off = [];
  for (const f of ["title_en_clean", "description_en_clean"]) {
    if (/<[^>]+>|&[a-z]+;|&#\d+;/i.test(String(clean[f] || ""))) off.push(`${f}: HTML/entity`);
  }
  return { pass: off.length === 0, offenders: off };
}
function lengthGate(clean) {
  const off = [];
  const t = String(clean.title_en_clean || ""), d = String(clean.description_en_clean || "");
  if (t.length < 8) off.push(`title liiga lühike (${t.length})`);
  if (t.length > 90) off.push(`title liiga pikk (${t.length} > 90) — keyword-stuff kahtlus`);
  if (d.length < 40) off.push(`description liiga lühike (${d.length})`);
  if (d.length > 700) off.push(`description liiga pikk (${d.length} > 700)`);
  return { pass: off.length === 0, offenders: off };
}
function runGates(clean, srcText) {
  const acc = accuracyGate(clean, srcText);
  const br = brandGate(clean);
  const ht = htmlGate(clean);
  const ln = lengthGate(clean);
  const offenders = [...acc.offenders, ...br.offenders, ...ht.offenders, ...ln.offenders];
  return { pass: offenders.length === 0, offenders, detail: { accuracy: acc.pass, brand: br.pass, html: ht.pass, length: ln.pass } };
}

// ---- puhastus-prompt ----
const CLEAN_SYS = `Sa oled XL e-poe (xlmarket.ee) ingliskeelse sisu MASTER-toimetaja. Sulle antakse TARNIJA (VEVOR) TOORE ingliskeelse toote title + kirjeldus + müügipunktid + spetsifikatsioonid. Sinu töö: tee neist PUHAS, display-kvaliteediga ingliskeelne MASTER-title ja -kirjeldus.

RANGED REEGLID:
1. title_en_clean: LÜHIKE, selge toote-nimi (nagu inimese kataloogis), MAX ~70 tähte. EI keyword-stuffing'ut, EI komaga eraldatud atribuut-loendit. Nimeta toode + 1-2 eristavat omadust. MITTE bränd "VEVOR".
2. description_en_clean: LOOMULIK inglise proosa, 2-4 lauset. MITTE ühtegi HTML-tagi (<br>, <p> jne). MITTE sõna "VEVOR". Kirjelda MIS toode on + peamine kasu/kasutus.
3. 🔑 TÄPSUS (kriitiline): IGA number + ühik, mille kirjutad, PEAB esinema allikas (title/kirjeldus/müügipunktid/spetsid). ÄRA leiuta numbreid. ÄRA teisenda ühikuid (kui allikas on "70 kg", ära kirjuta "154 lbs" kui seda allikas pole). Kui pole kindel → JÄTA number välja.
4. Tugine AINULT antud allikale. Ära lisa fakte, mida allikas pole.

Tagasta AINULT JSON (ilma muu tekstita):
{"title_en_clean":"<lühike puhas EN title>","description_en_clean":"<loomulik EN proosa, 2-4 lauset>"}`;

function cleanUser(p, avoidNote) {
  const sp = Array.isArray(p.selling_points) ? p.selling_points.map(s => `  • ${s}`).join("\n") : "  (pole)";
  const specs = specsLines(p.specs).map(l => `  • ${l}`).join("\n") || "  (pole)";
  const dims = p.dimensions && typeof p.dimensions === "object"
    ? `  • ${JSON.stringify(p.dimensions)}` : "  (pole)";
  return `TOORE TITLE (VEVOR):\n${p.title}\n
MÜÜGIPUNKTID (allikas, puhas proosa):\n${sp}\n
SPETSIFIKATSIOONID (allikas — numbrid+ühikud):\n${specs}\n
MÕÕTMED:\n${dims}\n
TOOTE-TÜÜP: ${p.vptype}\n${avoidNote ? `\n⚠️ EELMINE KATSE KUKKUS VÄRAVAST. ${avoidNote}\n` : ""}
Tee puhas EN master-title + kirjeldus. Kõik numbrid peavad tulema ülaltoodud allikast.`;
}

async function cleanGated(p, srcText) {
  let avoid = "", clean, gate;
  for (let attempt = 1; attempt <= 3; attempt++) {
    clean = await sonnet(CLEAN_SYS, cleanUser(p, avoid));
    gate = runGates(clean, srcText);
    clean._gate = { ...gate, attempts: attempt };
    if (gate.pass) break;
    avoid = `Paranda KÕIK: ${gate.offenders.join("; ")}. Kasuta AINULT allika numbreid/ühikuid; eemalda bränd ja HTML; hoia title lühike.`;
  }
  return clean;
}

// ---- main ----
const SELECT_SQL = `
WITH cand AS (
  SELECT p.id, p.title, p.description, p.metadata,
    split_part(p.metadata->>'vevor_product_type',' > ',1) AS top,
    row_number() OVER (PARTITION BY split_part(p.metadata->>'vevor_product_type',' > ',1) ORDER BY md5(p.id)) AS rn,
    count(*) OVER (PARTITION BY split_part(p.metadata->>'vevor_product_type',' > ',1)) AS topcount
  FROM product p
  WHERE p.status='published'
    AND p.metadata->'specs' IS NOT NULL
    AND jsonb_typeof(p.metadata->'selling_points')='array'
    AND p.metadata->>'vevor_product_type' IS NOT NULL
    AND length(p.title) > 20
)
SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM (
  SELECT id, title, description, top AS topcat,
    metadata->'selling_points' AS selling_points,
    metadata->'specs' AS specs,
    metadata->'dimensions' AS dimensions,
    metadata->>'vevor_product_type' AS vptype
  FROM cand WHERE rn=1 ORDER BY topcount DESC LIMIT ${N}
) t;`;

(async () => {
  console.log(`🧪 EN-master DRY — valin ${N} toodet (1 igast top-kategooriast, suuremad eest)…`);
  const rows = psqlJson(SELECT_SQL);
  console.log(`   ${rows.length} toodet ${new Set(rows.map(r => r.topcat)).size} kategooriast.\n`);

  const results = [];
  let i = 0;
  for (const p of rows) {
    i++;
    const srcText = sourceCorpus(p);
    let clean;
    try { clean = await cleanGated(p, srcText); }
    catch (e) { console.error(`  ✗ ${p.id} [${p.topcat}]: ${e.message}`); results.push({ ...p, error: e.message }); continue; }
    const g = clean._gate;
    console.log(`  ${g.pass ? "✓" : "⚠️"} ${String(i).padStart(2)}/${rows.length} [${p.topcat}] att=${g.attempts}${g.pass ? "" : " · " + g.offenders.slice(0, 2).join("; ")}`);
    results.push({
      id: p.id, topcat: p.topcat, vptype: p.vptype,
      title_raw: p.title, title_raw_len: (p.title || "").length,
      desc_raw_head: (p.description || "").slice(0, 300),
      title_en_clean: clean.title_en_clean, description_en_clean: clean.description_en_clean,
      gate: clean._gate,
    });
  }

  // ---- kulu ----
  const u = usage["claude-sonnet-5"] || { in: 0, out: 0, calls: 0 };
  const [pi, po] = PRICE["claude-sonnet-5"];
  const dryCost = u.in / 1e6 * pi + u.out / 1e6 * po;
  const ok = results.filter(r => r.gate && r.gate.pass).length;
  const regens = results.filter(r => r.gate && r.gate.attempts > 1).length;
  const nProd = results.length || 1;
  const perProdIn = u.in / nProd, perProdOut = u.out / nProd; // sisaldab regen-overhead'i
  const FULL_N = 19632;
  // täisjooks batch (-50%), ILMA regen-overhead'ita (eeldus: üks katse) ja regen-overhead'iga
  const batchPi = pi / 2, batchPo = po / 2;
  const fullBatchHi = (perProdIn * FULL_N) / 1e6 * batchPi + (perProdOut * FULL_N) / 1e6 * batchPo; // DRY per-toode (regen sees)
  const avgAtt = results.reduce((a, r) => a + (r.gate?.attempts || 1), 0) / nProd;
  const fullBatchLo = fullBatchHi / avgAtt; // ilma regen'ita (üks katse)

  const report = buildReport({ results, u, dryCost, ok, regens, nProd, avgAtt, fullBatchLo, fullBatchHi, FULL_N });
  const outMd = `${REPO}/reports/en-master-dry-${new Date().toISOString().slice(0, 10)}.md`;
  const outJson = `${REPO}/reports/en-master-dry-samples.json`;
  fs.writeFileSync(outMd, report);
  fs.writeFileSync(outJson, JSON.stringify(results, null, 2));

  console.log(`\n── KOKKUVÕTE ──`);
  console.log(`  väravad läbitud: ${ok}/${nProd} · regen vajas: ${regens} · keskm. katseid: ${avgAtt.toFixed(2)}`);
  console.log(`  DRY-kulu (Sonnet, täishind): $${dryCost.toFixed(2)} (${u.calls} kutset, in ${u.in} / out ${u.out} tok)`);
  console.log(`  täisjooks ${FULL_N} toodet, Sonnet BATCH (-50%): $${fullBatchLo.toFixed(0)}–${fullBatchHi.toFixed(0)}`);
  console.log(`  raport: ${outMd}`);
  console.log(`  JSON:   ${outJson}`);
})();

function esc(x) { return String(x == null ? "" : x).replace(/\|/g, "\\|").replace(/\n/g, " ⏎ "); }
function buildReport({ results, u, dryCost, ok, regens, nProd, avgAtt, fullBatchLo, fullBatchHi, FULL_N }) {
  const L = [];
  const w = s => L.push(s);
  const today = new Date().toISOString().slice(0, 10);
  w(`# EN-master puhastus — DRY-valim (stsenaarium A)\n`);
  w(`**Kuupäev:** ${today}  ·  **Mudel:** claude-sonnet-5  ·  **Valim:** ${nProd} toodet (1 igast top-kategooriast)\n`);
  w(`> Stsenaarium A: puhas \`title_en_clean\` + \`description_en_clean\` ERALDI väljadena; toores \`title\`/\`description\` JÄÄB allikaks; \`selling_points\` jäetakse.\n`);
  w(`## Kokkuvõte\n`);
  w(`- **Väravad läbitud:** ${ok}/${nProd} (${(ok / nProd * 100).toFixed(0)}%) · **regen vajas:** ${regens} · **keskm. katseid:** ${avgAtt.toFixed(2)}`);
  w(`- **DRY-kulu (Sonnet, täishind):** $${dryCost.toFixed(2)} — ${u.calls} kutset, in ${u.in.toLocaleString()} / out ${u.out.toLocaleString()} tok`);
  w(`- **Täisjooks ${FULL_N.toLocaleString()} toodet, Sonnet BATCH (−50%):** **~$${fullBatchLo.toFixed(0)}–${fullBatchHi.toFixed(0)}** (lo=üks katse, hi=DRY regen-määraga). Lagi $350 → mahub.\n`);
  w(`## Väravad (4)\n`);
  w(`1. **TÄPSUS** — iga number+ühik puhtas tekstis peab esinema allikas (title+desc+SP+specs+dims). Leiutatud → fail → regen.`);
  w(`2. **BRÄND** — puhtas tekstis ei tohi olla VEVOR/BlackTools/KraftDele/GEKO.`);
  w(`3. **HTML** — puhtas tekstis ei tohi olla tage/entity'sid.`);
  w(`4. **PIKKUS** — title ≤ 90 tähte, description 40–700 tähte.\n`);
  const fails = results.filter(r => r.gate && !r.gate.pass);
  if (fails.length) {
    w(`### ⚠️ Pärast 3 katset ikka kukkunud (${fails.length})\n`);
    for (const r of fails) w(`- \`${r.id}\` [${r.topcat}]: ${esc(r.gate.offenders.join("; "))}`);
    w("");
  }
  w(`## Näidised (enne/pärast)\n`);
  results.forEach((r, i) => {
    if (r.error) { w(`### ${i + 1}. \`${r.id}\` [${r.topcat}] — VIGA: ${esc(r.error)}\n`); return; }
    w(`### ${i + 1}. [${esc(r.topcat)}] · _${esc(r.vptype)}_ ${r.gate.pass ? "✅" : "⚠️ " + esc(r.gate.offenders.join("; "))}\n`);
    w(`**ENNE — title (${r.title_raw_len} tähte):** ${esc(r.title_raw)}  `);
    w(`**ENNE — description (raw, 300):** ${esc(r.desc_raw_head)}\n`);
    w(`**PÄRAST — title (${(r.title_en_clean || "").length}):** ${esc(r.title_en_clean)}  `);
    w(`**PÄRAST — description:** ${esc(r.description_en_clean)}\n`);
  });
  return L.join("\n");
}
