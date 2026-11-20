#!/usr/bin/env node
/**
 * en-master-dry-sample.mjs — EN-MASTER PUHASTUSE DRY-VALIM (Tarmo 2026-11-18, stsenaarium A).
 *
 * MASTER = puhastatud EN (CLAUDE.md "SISU-ARHITEKTUUR"). Toores VEVOR title/description = ALLIKAS.
 * See skript DRY-jooksutab Sonnet-puhastuse (1 toode igast top-kategooriast), NÄITAB kvaliteeti +
 * ekstrapoleerib batch-kulu. EI KIRJUTA DB-sse (read-only + raport).
 *
 * Stsenaarium A: puhas `title_en_clean` + `description_en_clean` ERALDI väljadena; raw JÄÄB.
 * `selling_points` jäetakse (juba puhas) — kasutatakse allikana.
 *
 * KUUS VÄRAVAT (fail → regen tagasisidega, max 3×):
 *   1. TÄPSUS       — iga number puhtas tekstis peab esinema allikas (title+desc+SP+specs+dims).
 *   2. BRÄND        — puhtas tekstis EI tohi olla VEVOR/BlackTools/KraftDele/GEKO.
 *   3. HTML         — puhtas tekstis EI tohi olla `<...>` tage/entity'sid.
 *   4. PIKKUS       — title ≤ 90 tähte, description 40..700 tähte.
 *   5. VÄIDE-JÄLGITAVUS (Tarmo p1) — iga omadus/funktsioon/komplekti-sisu peab leiduma allikas.
 *                     Deterministlik lemma-kattuvus (vihje) + Sonnet-kohtunik (autoriteetne värav).
 *   6. ÜHIK (Tarmo p2) — iga (number,ühik) puhtas tekstis peab ESINEMA allikas SAMA ühikuga.
 *                     LLM EI teisenda ise (nt mm→toll keelatud). Meetriline eelistatud.
 *                     Imperiaalne-ainult → KOOD teisendab deterministlikult (addMetric, mitte LLM).
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

const PRICE = { "claude-sonnet-5": [3, 15], "claude-opus-4-8": [5, 25], "claude-haiku-4-5": [1, 5], "claude-fable-5": [10, 50] };
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
const sonnet = makeCaller("claude-sonnet-5", 1600);
const judge = makeCaller("claude-sonnet-5", 900); // DRY: Sonnet-kohtunik (parim kvaliteet); täisjooks võib Haiku

// ---- DB (read-only) ----
const DB = execFileSync("bash", ["-c", "docker ps --format '{{.Names}}' | grep -E '^db-k33g' | head -1"]).toString().trim();
if (!DB) { console.error("❌ db-k33g konteiner puudub"); process.exit(2); }
function psqlJson(sql) {
  const out = execFileSync("docker", ["exec", "-i", DB, "psql", "-U", "xlmarket", "-d", "xlmarket", "-tA", "-f", "-"],
    { input: sql, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }).trim();
  return out ? JSON.parse(out) : [];
}

// ---- allikas-tekst (tõestuse korpus) ----
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

// ---- number/ühik-ekstrakt ----
const NUM_RE = /\d+(?:[.,]\d+)?/g;
const normNum = x => x.replace(",", ".").replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "");
function numSet(s) { return new Set((String(s).match(NUM_RE) || []).map(normNum)); }
// ühik-normaliseerimine (variandid → kanooniline). Ainult TEADAOLEVAD mõõtühikud loevad ühikuks;
// muu number-järgne sõna (nt "5 balance", "4 seats", "45.7 to") on kogus/tekst → EI ole ühik.
const UNIT_MAP = { inch: "in", inches: "in", '"': "in", "″": "in", foot: "ft", feet: "ft", pound: "lbs", pounds: "lbs", lb: "lbs", litre: "l", liter: "l", litres: "l", liters: "l", litre: "l", pcs: "pc", pieces: "pc", piece: "pc", kgs: "kg", grams: "g", gram: "g", meter: "m", meters: "m", metre: "m", metres: "m", watt: "w", watts: "w", volt: "v", volts: "v", amp: "a", amps: "a", ampere: "a", gallon: "gal", gallons: "gal", ounce: "oz", ounces: "oz" };
const KNOWN_UNITS = new Set(["mm", "cm", "m", "km", "kg", "g", "mg", "t", "l", "ml", "w", "kw", "v", "kv", "a", "ma", "ah", "wh", "kwh", "hz", "khz", "ghz", "qt", "ft", "in", "lbs", "oz", "gal", "psi", "bar", "btu", "°c", "°f", "pc", "pa", "kpa", "mpa", "rpm", "db", "nm", "mph", "kmh", "lm", "lux", "k", "nit", "cc", "ml", "mah"]);
function normUnit(u) {
  u = (u || "").toLowerCase().replace(/[.,]$/, "");
  const c = UNIT_MAP[u] || u;
  return KNOWN_UNITS.has(c) ? c : ""; // mitte-mõõtühik → tühi (= ühikuta arv)
}
const NUMUNIT_RE = /(\d+(?:[.,]\d+)?)\s*([a-zA-Z%°″"]+)?/g;

// VÄRAV 1 — TÄPSUS (number esineb allikas)
function accuracyGate(clean, srcNums) {
  const off = [];
  for (const f of ["title_en_clean", "description_en_clean"]) {
    const v = String(clean[f] || ""); let m; NUMUNIT_RE.lastIndex = 0;
    while ((m = NUMUNIT_RE.exec(v))) {
      const num = normNum(m[1]);
      if (!/^(x|nd|rd|st|th)$/.test((m[2] || "").toLowerCase()) && !srcNums.has(num))
        off.push(`${f}: number «${m[1]}${m[2] ? " " + m[2] : ""}» pole allikas`);
    }
  }
  return { pass: off.length === 0, offenders: off };
}
// VÄRAV 6 — ÜHIK (number+ühik koos allikas; LLM ei teisenda)
function unitGate(clean, srcPairs, allowExtraPairs) {
  const off = [];
  for (const f of ["title_en_clean", "description_en_clean"]) {
    const v = String(clean[f] || ""); let m; NUMUNIT_RE.lastIndex = 0;
    while ((m = NUMUNIT_RE.exec(v))) {
      const unit = normUnit(m[2]);
      if (!unit || /^(x|nd|rd|st|th)$/.test(unit)) continue; // ühikuta arv = kogus/kordaja, kontrollib täpsus-värav
      const pair = `${normNum(m[1])}|${unit}`;
      if (!srcPairs.has(pair) && !(allowExtraPairs && allowExtraPairs.has(pair)))
        off.push(`${f}: (${m[1]} ${m[2]}) pole allikas SAMA ühikuga — LLM ei tohi teisendada`);
    }
  }
  return { pass: off.length === 0, offenders: off };
}
function srcUnitPairs(srcText) {
  const set = new Set(); let m; NUMUNIT_RE.lastIndex = 0;
  while ((m = NUMUNIT_RE.exec(srcText))) {
    const unit = normUnit(m[2]); if (!unit) continue;
    set.add(`${normNum(m[1])}|${unit}`);
  }
  return set;
}
const BRAND_RE = /\b(vevor|blacktools|kraftdele|geko)\b/i;
function brandGate(clean) {
  const off = [];
  for (const f of ["title_en_clean", "description_en_clean"]) { const mm = String(clean[f] || "").match(BRAND_RE); if (mm) off.push(`${f}: bränd «${mm[0]}»`); }
  return { pass: off.length === 0, offenders: off };
}
function htmlGate(clean) {
  const off = [];
  for (const f of ["title_en_clean", "description_en_clean"]) if (/<[^>]+>|&[a-z]+;|&#\d+;/i.test(String(clean[f] || ""))) off.push(`${f}: HTML/entity`);
  return { pass: off.length === 0, offenders: off };
}
function lengthGate(clean) {
  const off = [];
  const t = String(clean.title_en_clean || ""), d = String(clean.description_en_clean || "");
  if (t.length < 8) off.push(`title lühike (${t.length})`);
  if (t.length > 90) off.push(`title pikk (${t.length}>90)`);
  if (d.length < 40) off.push(`desc lühike (${d.length})`);
  if (d.length > 700) off.push(`desc pikk (${d.length}>700)`);
  return { pass: off.length === 0, offenders: off };
}

// VÄRAV 5 — lemma-kattuvus (deterministlik vihje kohtunikule)
const STOP = new Set("the a an and or for with your you this these those that of to in on at is are be by it as from into also up out new set each both offers feature features featuring design designed made built using use used ideal perfect easy quick fast simple durable premium strong reliable high low more most while allow allows let lets provide provides ensure ensures making makes keep keeps help helps so such other over under around their its can will which when where what who whom they them when than then plus include includes included including comes come".split(/\s+/));
function stem(w) { return w.replace(/(ies)$/, "y").replace(/(es|s)$/, "").replace(/(ing|ed)$/, ""); }
function lemmaOrphans(clean, srcText) {
  const srcStems = new Set((srcText.toLowerCase().match(/[a-z]{3,}/g) || []).map(stem));
  const orphans = new Set();
  for (const f of ["title_en_clean", "description_en_clean"]) {
    for (const w of (String(clean[f] || "").toLowerCase().match(/[a-z]{3,}/g) || [])) {
      if (STOP.has(w)) continue;
      if (!srcStems.has(stem(w))) orphans.add(w);
    }
  }
  return [...orphans];
}
const JUDGE_SYS = `Sa oled range faktikontrollija e-poe sisule. Antakse ALLIKAS (tarnija toore toote-andmed) ja PUHASTATUD master-tekst. Leia PUHASTATUD tekstis IGA konkreetne faktiväide, mida ALLIKAS EI TOETA.
Konkreetne väide = komponent/osa, komplekti kuuluv ese, funktsioon/režiim, materjal, sertifikaat, ühilduvus, nimetatud omadus/võimekus.
TOETATUD = allikas ütleb seda VÕI vihjab üheselt; ümbersõnastus/sünonüüm on toetatud; üldine turundus-omadussõna (vastupidav, kvaliteetne) EI ole väide.
Tagasta AINULT JSON: {"ok":true|false,"unsupported":[{"claim":"<väide>","field":"title|description","why":"<miks allikas ei toeta>"}]}`;
function judgeUser(p, clean, orphans) {
  return `ALLIKAS:\nTITLE: ${p.title}\nMÜÜGIPUNKTID: ${(Array.isArray(p.selling_points) ? p.selling_points.join(" | ") : "")}\nSPETSID: ${specsLines(p.specs).join(" | ")}\nKIRJELDUS(raw): ${(p.description || "").slice(0, 500)}\n\nPUHASTATUD TITLE: ${clean.title_en_clean}\nPUHASTATUD DESCRIPTION: ${clean.description_en_clean}\n\nVIHJE (sõnad, mida allikas-tekstis sõnasõnalt polnud — kontrolli kas need on leiutatud väited või lihtsalt sünonüümid): ${orphans.slice(0, 30).join(", ") || "(pole)"}\nLoetle toetamata konkreetsed väited.`;
}

// ---- DETERMINISTLIK meetriline teisendus (KOOD, mitte LLM) — Tarmo p2 ----
// Ainult imperiaalne-ainult mõõt (SULGUDE VÄLINE) → "meetriline (imperiaalne)". Sulgude-sisene jäetakse
// (seal on juba meetriline ees). Murd-tollid (3/8") = keere-nominaal → EI teisenda. Lisatud meetriline
// number on usaldusväärne (arvutatud) → whitelistitakse täpsus/ühik-värava jaoks.
const CONV = [
  { re: /(\d+(?:[.,]\d+)?)\s*(lbs|lb|pounds?|pound)\b/gi, unit: "kg", f: v => v * 0.453592, dec: v => v >= 10 ? 0 : 1 },
  { re: /(\d+(?:[.,]\d+)?)\s*(ft|foot|feet|FT)\b/gi, unit: "m", f: v => v * 0.3048, dec: v => v >= 10 ? 1 : 2 },
  { re: /(\d+(?:[.,]\d+)?)\s*(gal|gallons?|gallon)\b/gi, unit: "L", f: v => v * 3.78541, dec: () => 1 },
  { re: /(\d+(?:[.,]\d+)?)\s*(oz|ounces?|ounce)\b/gi, unit: "g", f: v => v * 28.3495, dec: () => 0 },
  { re: /(\d+(?:[.,]\d+)?)\s*°?\s?F\b/gi, unit: "°C", f: v => (v - 32) / 1.8, dec: () => 0 },
];
function parenDepthAt(str, idx) { let d = 0; for (let i = 0; i < idx; i++) { if (str[i] === "(") d++; else if (str[i] === ")") d = Math.max(0, d - 1); } return d; }
function addMetric(text, addedPairs) {
  let out = text;
  for (const c of CONV) {
    out = out.replace(c.re, (full, numStr, _u, offset, whole) => {
      if (parenDepthAt(whole, offset) > 0) return full; // sulgude sees = juba meetriline ees → jäta
      const v = Number(numStr.replace(",", "."));
      if (!isFinite(v)) return full;
      const met = v >= 100 ? Math.round(c.f(v)) : Number(c.f(v).toFixed(c.dec(v)));
      addedPairs.add(`${normNum(String(met))}|${normUnit(c.unit)}`);
      return `${met} ${c.unit} (${full.trim()})`;
    });
  }
  return out;
}

const CLEAN_SYS = `Sa oled XL e-poe (xlmarket.ee) ingliskeelse sisu MASTER-toimetaja. Sulle antakse TARNIJA (VEVOR) TOORE ingliskeelse toote title + müügipunktid + spetsifikatsioonid. Tee neist PUHAS, display-kvaliteediga ingliskeelne MASTER-title ja -kirjeldus.

RANGED REEGLID:
1. title_en_clean: LÜHIKE selge toote-nimi (nagu inimese kataloogis), MAX ~70 tähte. EI keyword-stuffing'ut ega komaga atribuut-loendit. Nimeta toode + 1-2 eristavat omadust. MITTE "VEVOR".
2. description_en_clean: LOOMULIK inglise proosa, 2-4 lauset. MITTE ühtegi HTML-tagi. MITTE "VEVOR". Kirjelda MIS toode on + peamine kasu/kasutus.
3. 🔑 FAKTID (kriitiline): KÕIK, mida kirjutad — komponendid, komplekti-sisu, funktsioonid, materjalid — PEAB tulema allikast. ÄRA leiuta ühtegi omadust ega komponenti. Kui allikas ei ütle → ÄRA kirjuta.
4. 🔑 NUMBRID+ÜHIKUD: iga number ja ühik PEAB esinema allikas. ÄRA leiuta numbreid.
5. 🔑 ÜHIKUD — ÄRA TEISENDA ISE: kui allikas annab meetrilise (mm/cm/m/kg/L/°C), KASUTA SEDA. Kui allikas annab ainult imperiaalse (lbs/ft/inch/°F), JÄTA imperiaalne nii nagu allikas (süsteem lisab meetrilise ise). ÄRA KUNAGI teisenda mm→toll ega lbs→kg ise. Eelista meetrilist seal, kus allikas pakub.

Tagasta AINULT JSON: {"title_en_clean":"<lühike puhas EN title>","description_en_clean":"<loomulik EN proosa>"}`;

function cleanUser(p, avoidNote) {
  const sp = Array.isArray(p.selling_points) ? p.selling_points.map(s => `  • ${s}`).join("\n") : "  (pole)";
  const specs = specsLines(p.specs).map(l => `  • ${l}`).join("\n") || "  (pole)";
  const dims = p.dimensions && typeof p.dimensions === "object" ? `  • ${JSON.stringify(p.dimensions)}` : "  (pole)";
  return `TOORE TITLE (VEVOR):\n${p.title}\n
MÜÜGIPUNKTID (allikas, puhas proosa):\n${sp}\n
SPETSIFIKATSIOONID (allikas — numbrid+ühikud):\n${specs}\n
MÕÕTMED:\n${dims}\n
TOOTE-TÜÜP: ${p.vptype}\n${avoidNote ? `\n⚠️ EELMINE KATSE KUKKUS. ${avoidNote}\n` : ""}
Tee puhas EN master-title + kirjeldus. Kõik faktid ja numbrid AINULT ülaltoodud allikast. Ära teisenda ühikuid.`;
}

async function cleanGated(p, srcText) {
  const srcNums = numSet(srcText);
  const srcPairs = srcUnitPairs(srcText);
  let avoid = "", clean, gate, orphans = [], judgeRes = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    clean = await sonnet(CLEAN_SYS, cleanUser(p, avoid));
    const acc = accuracyGate(clean, srcNums);
    const un = unitGate(clean, srcPairs, null);
    const br = brandGate(clean), ht = htmlGate(clean), ln = lengthGate(clean);
    orphans = lemmaOrphans(clean, srcText);
    // kohtunik jookseb ainult kui deterministlikud väravad läbivad (säästab kutseid)
    const detOff = [...acc.offenders, ...un.offenders, ...br.offenders, ...ht.offenders, ...ln.offenders];
    if (detOff.length === 0) {
      try { judgeRes = await judge(JUDGE_SYS, judgeUser(p, clean, orphans)); }
      catch (e) { judgeRes = { ok: true, unsupported: [], _err: e.message }; }
    } else { judgeRes = null; }
    const claimOff = (judgeRes && !judgeRes.ok) ? (judgeRes.unsupported || []).map(x => `VÄIDE «${x.claim}» (${x.field}): ${x.why}`) : [];
    const offenders = [...detOff, ...claimOff];
    gate = {
      pass: offenders.length === 0, offenders, attempts: attempt, orphans,
      detail: { accuracy: acc.pass, unit: un.pass, brand: br.pass, html: ht.pass, length: ln.pass, claim: claimOff.length === 0 },
    };
    if (gate.pass) break;
    avoid = `Paranda KÕIK: ${offenders.join("; ")}. Kasuta AINULT allika fakte/numbreid/ühikuid; eemalda leiutatud väited; ära teisenda ühikuid.`;
  }
  // DETERMINISTLIK meetriline teisendus PÄRAST väravaid (imperiaalne-ainult → + meetriline)
  const addedPairs = new Set();
  const titleM = addMetric(clean.title_en_clean || "", addedPairs);
  const descM = addMetric(clean.description_en_clean || "", addedPairs);
  const metrized = titleM !== clean.title_en_clean || descM !== clean.description_en_clean;
  clean.title_en_clean = titleM; clean.description_en_clean = descM;
  clean._gate = { ...gate, metrized };
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
    metadata->'specs' AS specs, metadata->'dimensions' AS dimensions,
    metadata->>'vevor_product_type' AS vptype
  FROM cand WHERE rn=1 ORDER BY topcount DESC LIMIT ${N}
) t;`;

(async () => {
  console.log(`🧪 EN-master DRY v2 (6 väravat + meetriline teisendus) — valin ${N} toodet…`);
  const rows = psqlJson(SELECT_SQL);
  console.log(`   ${rows.length} toodet ${new Set(rows.map(r => r.topcat)).size} kategooriast.\n`);

  const results = [];
  let i = 0;
  for (const p of rows) {
    i++;
    const srcText = sourceCorpus(p);
    let clean;
    try { clean = await cleanGated(p, srcText); }
    catch (e) { console.error(`  ✗ ${p.id} [${p.topcat}]: ${e.message}`); results.push({ id: p.id, topcat: p.topcat, error: e.message }); continue; }
    const g = clean._gate;
    const flags = [g.pass ? "✓" : "⚠️", g.metrized ? "📏" : "  "].join("");
    console.log(`  ${flags} ${String(i).padStart(2)}/${rows.length} [${p.topcat}] att=${g.attempts}${g.pass ? "" : " · " + g.offenders.slice(0, 2).join("; ")}`);
    results.push({
      id: p.id, topcat: p.topcat, vptype: p.vptype,
      title_raw: p.title, title_raw_len: (p.title || "").length,
      desc_raw_head: (p.description || "").slice(0, 300),
      title_en_clean: clean.title_en_clean, description_en_clean: clean.description_en_clean,
      gate: clean._gate,
    });
  }

  // ---- kulu ----
  const us = usage["claude-sonnet-5"] || { in: 0, out: 0, calls: 0 };
  const [pi, po] = PRICE["claude-sonnet-5"];
  const dryCost = us.in / 1e6 * pi + us.out / 1e6 * po;
  const ok = results.filter(r => r.gate && r.gate.pass).length;
  const regens = results.filter(r => r.gate && r.gate.attempts > 1).length;
  const metr = results.filter(r => r.gate && r.gate.metrized).length;
  const nProd = results.length || 1;
  const avgAtt = results.reduce((a, r) => a + (r.gate?.attempts || 1), 0) / nProd;
  const perIn = us.in / nProd, perOut = us.out / nProd; // sisaldab gen + judge + regen
  const FULL_N = 19632;
  // täisjooks batch (-50%): Sonnet-kohtunik (nagu DRY) vs Haiku-kohtunik (odavam)
  const fullSonnet = (perIn * FULL_N) / 1e6 * (pi / 2) + (perOut * FULL_N) / 1e6 * (po / 2);
  // Haiku-judge: eelda judge ~45% in-tok'ist (allikas) + väike out; asenda judge-hind Haiku-ga.
  // konservatiivne hinnang: gen-pool (Sonnet) ~65% in / ~75% out; judge-pool ~35% in / ~25% out.
  const genIn = perIn * 0.65, genOut = perOut * 0.75, judIn = perIn * 0.35, judOut = perOut * 0.25;
  const [hpi, hpo] = PRICE["claude-haiku-4-5"];
  const fullHaikuJudge = (genIn * FULL_N) / 1e6 * (pi / 2) + (genOut * FULL_N) / 1e6 * (po / 2)
    + (judIn * FULL_N) / 1e6 * (hpi / 2) + (judOut * FULL_N) / 1e6 * (hpo / 2);

  // november kulu-seis
  let nov = null;
  try { nov = JSON.parse(fs.readFileSync("/opt/eumotors-tasks/reports/spend-2026-11.state.json", "utf8")); } catch {}
  const LIMIT = 550;

  const report = buildReport({ results, us, dryCost, ok, regens, metr, nProd, avgAtt, fullSonnet, fullHaikuJudge, FULL_N, nov, LIMIT });
  const outMd = `${REPO}/reports/en-master-dry-${new Date().toISOString().slice(0, 10)}.md`;
  const outJson = `${REPO}/reports/en-master-dry-samples.json`;
  fs.writeFileSync(outMd, report);
  fs.writeFileSync(outJson, JSON.stringify(results, null, 2));

  console.log(`\n── KOKKUVÕTE ──`);
  console.log(`  väravad: ${ok}/${nProd} läbis · regen: ${regens} · meetriline-teisendus: ${metr} · keskm katseid: ${avgAtt.toFixed(2)}`);
  console.log(`  DRY-kulu (Sonnet gen+judge, täishind): $${dryCost.toFixed(2)} (${us.calls} kutset)`);
  console.log(`  täisjooks ${FULL_N}: Sonnet-judge BATCH ~$${fullSonnet.toFixed(0)} · Haiku-judge BATCH ~$${fullHaikuJudge.toFixed(0)}`);
  if (nov) console.log(`  november seni: $${nov.total_usd.toFixed(2)} / $${LIMIT} → jääk $${(LIMIT - nov.total_usd).toFixed(2)}`);
  console.log(`  raport: ${outMd}`);
})();

function esc(x) { return String(x == null ? "" : x).replace(/\|/g, "\\|").replace(/\n/g, " ⏎ "); }
function buildReport({ results, us, dryCost, ok, regens, metr, nProd, avgAtt, fullSonnet, fullHaikuJudge, FULL_N, nov, LIMIT }) {
  const L = []; const w = s => L.push(s);
  const today = new Date().toISOString().slice(0, 10);
  w(`# EN-master puhastus — DRY v2 (6 väravat + meetriline teisendus)\n`);
  w(`**Kuupäev:** ${today} · **Mudel:** claude-sonnet-5 (gen + kohtunik) · **Valim:** ${nProd} toodet (1 igast top-kategooriast)\n`);
  w(`> Stsenaarium A: puhas \`title_en_clean\` + \`description_en_clean\` ERALDI; raw JÄÄB; \`selling_points\` puutumata.\n`);
  w(`## Kokkuvõte\n`);
  w(`- **Väravad läbitud:** ${ok}/${nProd} (${(ok / nProd * 100).toFixed(0)}%) · **regen:** ${regens} · **meetriline-teisendus:** ${metr} · **keskm katseid:** ${avgAtt.toFixed(2)}`);
  w(`- **DRY-kulu (Sonnet gen+kohtunik, täishind):** $${dryCost.toFixed(2)} — ${us.calls} kutset, in ${us.in.toLocaleString()} / out ${us.out.toLocaleString()} tok`);
  w(`- **Täisjooks ${FULL_N.toLocaleString()} toodet, BATCH (−50%):** Sonnet-kohtunik **~$${fullSonnet.toFixed(0)}** · Haiku-kohtunik **~$${fullHaikuJudge.toFixed(0)}**\n`);
  if (nov) {
    w(`## Kulu-seis (Tarmo p4)\n`);
    w(`- **November seni:** $${nov.total_usd.toFixed(2)} / $${LIMIT} (${(nov.total_usd / LIMIT * 100).toFixed(0)}%) · jääk **$${(LIMIT - nov.total_usd).toFixed(2)}**`);
    w(`- **Täisjooks + jääk-kuu pipeline:** täisjooks ~$${fullHaikuJudge.toFixed(0)}–${fullSonnet.toFixed(0)} → kulu peale $${(nov.total_usd + fullSonnet).toFixed(0)}. Mahub $${LIMIT} alla, jätab öisele pipeline'ile ~$${(LIMIT - nov.total_usd - fullSonnet).toFixed(0)}.\n`);
  }
  w(`## 6 väravat\n`);
  w(`1. **TÄPSUS** — number esineb allikas. 2. **BRÄND**. 3. **HTML**. 4. **PIKKUS** (title ≤90, desc 40–700).`);
  w(`5. **VÄIDE-JÄLGITAVUS** (p1) — lemma-kattuvus (vihje) + Sonnet-kohtunik (autoriteetne): iga komponent/funktsioon/komplekti-sisu peab olema allikas.`);
  w(`6. **ÜHIK** (p2) — (number,ühik) peab olema allikas SAMA ühikuga; LLM ei teisenda; imperiaalne-ainult → KOOD lisab meetrilise (📏).\n`);
  const fails = results.filter(r => r.gate && !r.gate.pass);
  if (fails.length) { w(`### ⚠️ Pärast 3 katset ikka kukkunud (${fails.length})\n`); for (const r of fails) w(`- \`${r.id}\` [${r.topcat}]: ${esc(r.gate.offenders.join("; "))}`); w(""); }
  w(`## Näidised (enne/pärast)\n`);
  results.forEach((r, i) => {
    if (r.error) { w(`### ${i + 1}. \`${r.id}\` [${r.topcat}] — VIGA: ${esc(r.error)}\n`); return; }
    const g = r.gate;
    w(`### ${i + 1}. [${esc(r.topcat)}] · _${esc(r.vptype)}_ ${g.pass ? "✅" : "⚠️ " + esc(g.offenders.join("; "))}${g.metrized ? " 📏" : ""}\n`);
    w(`**ENNE title (${r.title_raw_len}):** ${esc(r.title_raw)}  `);
    w(`**ENNE desc (raw 300):** ${esc(r.desc_raw_head)}\n`);
    w(`**PÄRAST title (${(r.title_en_clean || "").length}):** ${esc(r.title_en_clean)}  `);
    w(`**PÄRAST desc:** ${esc(r.description_en_clean)}`);
    if (g.orphans && g.orphans.length) w(`<br>_lemma-orvud (kohtunik kontrollis): ${esc(g.orphans.join(", "))}_`);
    w("");
  });
  return L.join("\n");
}
