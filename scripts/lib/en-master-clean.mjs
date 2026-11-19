#!/usr/bin/env node
/**
 * en-master-clean.mjs — EN-MASTER PUHASTUSE JAGATUD TRANSFORM (HARD RULE #5 SSoT).
 *
 * MASTER = puhastatud EN (CLAUDE.md "SISU-ARHITEKTUUR"). Toores VEVOR title/description = ALLIKAS.
 * See moodul hoiab KOGU puhastus-loogika (prompt + 6 väravat + meetriline teisendus) ÜHES kohas.
 * Kutsub nii:
 *   • scripts/en-master-backfill.mjs   (Batch API täis-backfill + öise hooki delta --skus)
 *   • scripts/en-master-dry-sample.mjs (DRY-valim; prototüüp)
 * → backfill, hook ja DRY EI LAHKNE kunagi (sama transform).
 *
 * Stsenaarium A: puhas `title_en_clean` + `description_en_clean` ERALDI väljadena; raw JÄÄB.
 * `selling_points` jäetakse (juba puhas) — kasutatakse allikana.
 *
 * KUUS VÄRAVAT (fail → regen tagasisidega):
 *   1. TÄPSUS       — iga number puhtas tekstis peab esinema allikas.
 *   2. BRÄND        — EI tohi olla VEVOR/BlackTools/KraftDele/GEKO.
 *   3. HTML         — EI tohi olla tage/entity'sid.
 *   4. PIKKUS       — title ≤ 90 tähte, description 40..700 tähte.
 *   5. VÄIDE-JÄLGITAVUS — lemma-vihje + Sonnet-kohtunik: iga komponent/funktsioon/komplekti-sisu allikas.
 *   6. ÜHIK         — (number,ühik) peab esinema allikas SAMA ühikuga; LLM EI teisenda; imperiaalne-ainult
 *                     → KOOD lisab meetrilise (addMetric, deterministlik).
 */

export const M_GEN = "claude-sonnet-5";
export const M_JUDGE = "claude-sonnet-5"; // Tarmo GO: Sonnet-kohtunik

// ─────────────────────────── allikas-korpus ───────────────────────────
export function specsLines(specs) {
  if (!specs || typeof specs !== "object") return [];
  const out = [];
  for (const [k, v] of Object.entries(specs)) {
    if (v && typeof v === "object") out.push(`${k}: ${v.d != null ? v.d : JSON.stringify(v)}`);
    else out.push(`${k}: ${v}`);
  }
  return out;
}
export function sourceCorpus(p) {
  const parts = [p.title || "", p.description || ""];
  if (Array.isArray(p.selling_points)) parts.push(...p.selling_points);
  parts.push(...specsLines(p.specs));
  if (p.dimensions && typeof p.dimensions === "object") parts.push(JSON.stringify(p.dimensions));
  return parts.join("\n");
}

// ─────────────────────────── number/ühik-ekstrakt ───────────────────────────
const NUM_RE = /\d+(?:[.,]\d+)?/g;
const normNum = (x) => x.replace(",", ".").replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "");
export function numSet(s) { return new Set((String(s).match(NUM_RE) || []).map(normNum)); }
// ühik-normaliseerimine (variandid → kanooniline). AINULT teadaolevad mõõtühikud loevad ühikuks;
// muu number-järgne sõna (nt "5 balance", "4 seats") on kogus/tekst → EI ole ühik.
const UNIT_MAP = { inch: "in", inches: "in", '"': "in", "″": "in", foot: "ft", feet: "ft", pound: "lbs", pounds: "lbs", lb: "lbs", litre: "l", liter: "l", litres: "l", liters: "l", pcs: "pc", pieces: "pc", piece: "pc", kgs: "kg", grams: "g", gram: "g", meter: "m", meters: "m", metre: "m", metres: "m", watt: "w", watts: "w", volt: "v", volts: "v", amp: "a", amps: "a", ampere: "a", gallon: "gal", gallons: "gal", ounce: "oz", ounces: "oz" };
const KNOWN_UNITS = new Set(["mm", "cm", "m", "km", "kg", "g", "mg", "t", "l", "ml", "w", "kw", "v", "kv", "a", "ma", "ah", "wh", "kwh", "hz", "khz", "ghz", "qt", "ft", "in", "lbs", "oz", "gal", "psi", "bar", "btu", "°c", "°f", "pc", "pa", "kpa", "mpa", "rpm", "db", "nm", "mph", "kmh", "lm", "lux", "k", "nit", "cc", "mah"]);
function normUnit(u) {
  u = (u || "").toLowerCase().replace(/[.,]$/, "");
  const c = UNIT_MAP[u] || u;
  return KNOWN_UNITS.has(c) ? c : ""; // mitte-mõõtühik → tühi (= ühikuta arv)
}
const NUMUNIT_RE = /(\d+(?:[.,]\d+)?)\s*([a-zA-Z%°″"]+)?/g;

export function srcUnitPairs(srcText) {
  const set = new Set(); let m; NUMUNIT_RE.lastIndex = 0;
  while ((m = NUMUNIT_RE.exec(srcText))) {
    const unit = normUnit(m[2]); if (!unit) continue;
    set.add(`${normNum(m[1])}|${unit}`);
  }
  return set;
}

const FIELDS = ["title_en_clean", "description_en_clean"];

// ─────────────────────────── VÄRAVAD ───────────────────────────
// VÄRAV 1 — TÄPSUS (number esineb allikas)
export function accuracyGate(clean, srcNums) {
  const off = [];
  for (const f of FIELDS) {
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
export function unitGate(clean, srcPairs, allowExtraPairs) {
  const off = [];
  for (const f of FIELDS) {
    const v = String(clean[f] || ""); let m; NUMUNIT_RE.lastIndex = 0;
    while ((m = NUMUNIT_RE.exec(v))) {
      const unit = normUnit(m[2]);
      if (!unit || /^(x|nd|rd|st|th)$/.test(unit)) continue; // ühikuta arv = kogus/kordaja (täpsus-värav katab)
      const pair = `${normNum(m[1])}|${unit}`;
      if (!srcPairs.has(pair) && !(allowExtraPairs && allowExtraPairs.has(pair)))
        off.push(`${f}: (${m[1]} ${m[2]}) pole allikas SAMA ühikuga — LLM ei tohi teisendada`);
    }
  }
  return { pass: off.length === 0, offenders: off };
}
const BRAND_RE = /\b(vevor|blacktools|kraftdele|geko)\b/i;
export function brandGate(clean) {
  const off = [];
  for (const f of FIELDS) { const mm = String(clean[f] || "").match(BRAND_RE); if (mm) off.push(`${f}: bränd «${mm[0]}»`); }
  return { pass: off.length === 0, offenders: off };
}
export function htmlGate(clean) {
  const off = [];
  for (const f of FIELDS) if (/<[^>]+>|&[a-z]+;|&#\d+;/i.test(String(clean[f] || ""))) off.push(`${f}: HTML/entity`);
  return { pass: off.length === 0, offenders: off };
}
export function lengthGate(clean) {
  const off = [];
  const t = String(clean.title_en_clean || ""), d = String(clean.description_en_clean || "");
  if (t.length < 8) off.push(`title lühike (${t.length})`);
  if (t.length > 90) off.push(`title pikk (${t.length}>90)`);
  if (d.length < 40) off.push(`desc lühike (${d.length})`);
  if (d.length > 700) off.push(`desc pikk (${d.length}>700)`);
  return { pass: off.length === 0, offenders: off };
}

// VÄRAV 5 — lemma-kattuvus (deterministlik vihje kohtunikule)
const STOP = new Set("the a an and or for with your you this these those that of to in on at is are be by it as from into also up out new set each both offers feature features featuring design designed made built using use used ideal perfect easy quick fast simple durable premium strong reliable high low more most while allow allows let lets provide provides ensure ensures making makes keep keeps help helps so such other over under around their its can will which when where what who whom they them than then plus include includes included including comes come".split(/\s+/));
function stem(w) { return w.replace(/(ies)$/, "y").replace(/(es|s)$/, "").replace(/(ing|ed)$/, ""); }
export function lemmaOrphans(clean, srcText) {
  const srcStems = new Set((srcText.toLowerCase().match(/[a-z]{3,}/g) || []).map(stem));
  const orphans = new Set();
  for (const f of FIELDS) {
    for (const w of (String(clean[f] || "").toLowerCase().match(/[a-z]{3,}/g) || [])) {
      if (STOP.has(w)) continue;
      if (!srcStems.has(stem(w))) orphans.add(w);
    }
  }
  return [...orphans];
}

// ─────────────────────────── DETERMINISTLIK meetriline teisendus (KOOD, mitte LLM) ───────────────────────────
// Ainult imperiaalne-ainult mõõt (SULGUDE VÄLINE) → "meetriline (imperiaalne)". Sulgude-sisene jäetakse.
// Murd-tollid (3/8") = keere-nominaal → EI teisenda (ei ühti CONV num-mustriga). Lisatud meetriline
// number on usaldusväärne (arvutatud) → whitelistitakse täpsus/ühik-värava jaoks.
const CONV = [
  { re: /(\d+(?:[.,]\d+)?)\s*(lbs|lb|pounds?|pound)\b/gi, unit: "kg", f: (v) => v * 0.453592, dec: (v) => v >= 10 ? 0 : 1 },
  { re: /(\d+(?:[.,]\d+)?)\s*(ft|foot|feet|FT)\b/gi, unit: "m", f: (v) => v * 0.3048, dec: (v) => v >= 10 ? 1 : 2 },
  { re: /(\d+(?:[.,]\d+)?)\s*(gal|gallons?|gallon)\b/gi, unit: "L", f: (v) => v * 3.78541, dec: () => 1 },
  { re: /(\d+(?:[.,]\d+)?)\s*(oz|ounces?|ounce)\b/gi, unit: "g", f: (v) => v * 28.3495, dec: () => 0 },
  { re: /(\d+(?:[.,]\d+)?)\s*°?\s?F\b/gi, unit: "°C", f: (v) => (v - 32) / 1.8, dec: () => 0 },
];
function parenDepthAt(str, idx) { let d = 0; for (let i = 0; i < idx; i++) { if (str[i] === "(") d++; else if (str[i] === ")") d = Math.max(0, d - 1); } return d; }
export function addMetric(text, addedPairs) {
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
/** Rakenda meetriline teisendus mõlemale väljale. Tagastab {metrized, addedPairs}. Muudab clean'i kohapeal. */
export function applyMetric(clean) {
  const addedPairs = new Set();
  const t = addMetric(clean.title_en_clean || "", addedPairs);
  const d = addMetric(clean.description_en_clean || "", addedPairs);
  const metrized = t !== clean.title_en_clean || d !== clean.description_en_clean;
  clean.title_en_clean = t; clean.description_en_clean = d;
  return { metrized, addedPairs };
}

// ─────────────────────────── PROMPTID ───────────────────────────
export const CLEAN_SYS = `Sa oled XL e-poe (xlmarket.ee) ingliskeelse sisu MASTER-toimetaja. Sulle antakse TARNIJA (VEVOR) TOORE ingliskeelse toote title + müügipunktid + spetsifikatsioonid. Tee neist PUHAS, display-kvaliteediga ingliskeelne MASTER-title ja -kirjeldus.

RANGED REEGLID:
1. title_en_clean: LÜHIKE selge toote-nimi (nagu inimese kataloogis), MAX ~70 tähte. EI keyword-stuffing'ut ega komaga atribuut-loendit. Nimeta toode + 1-2 eristavat omadust. MITTE "VEVOR".
2. description_en_clean: LOOMULIK inglise proosa, 2-4 lauset. MITTE ühtegi HTML-tagi. MITTE "VEVOR". Kirjelda MIS toode on + peamine kasu/kasutus.
3. 🔑 FAKTID (kriitiline): KÕIK, mida kirjutad — komponendid, komplekti-sisu, funktsioonid, materjalid — PEAB tulema allikast. ÄRA leiuta ühtegi omadust ega komponenti. Kui allikas ei ütle → ÄRA kirjuta.
4. 🔑 NUMBRID+ÜHIKUD: iga number ja ühik PEAB esinema allikas. ÄRA leiuta numbreid.
5. 🔑 ÜHIKUD — ÄRA TEISENDA ISE: kui allikas annab meetrilise (mm/cm/m/kg/L/°C), KASUTA SEDA. Kui allikas annab ainult imperiaalse (lbs/ft/inch/°F), JÄTA imperiaalne nii nagu allikas (süsteem lisab meetrilise ise). ÄRA KUNAGI teisenda mm→toll ega lbs→kg ise. Eelista meetrilist seal, kus allikas pakub.

Tagasta AINULT JSON: {"title_en_clean":"<lühike puhas EN title>","description_en_clean":"<loomulik EN proosa>"}`;

export function cleanUser(p, avoidNote) {
  const sp = Array.isArray(p.selling_points) ? p.selling_points.map((s) => `  • ${s}`).join("\n") : "  (pole)";
  const specs = specsLines(p.specs).map((l) => `  • ${l}`).join("\n") || "  (pole)";
  const dims = p.dimensions && typeof p.dimensions === "object" ? `  • ${JSON.stringify(p.dimensions)}` : "  (pole)";
  return `TOORE TITLE (VEVOR):\n${p.title}\n
MÜÜGIPUNKTID (allikas, puhas proosa):\n${sp}\n
SPETSIFIKATSIOONID (allikas — numbrid+ühikud):\n${specs}\n
MÕÕTMED:\n${dims}\n
TOOTE-TÜÜP: ${p.vptype || p.vevor_product_type || ""}\n${avoidNote ? `\n⚠️ EELMINE KATSE KUKKUS. ${avoidNote}\n` : ""}
Tee puhas EN master-title + kirjeldus. Kõik faktid ja numbrid AINULT ülaltoodud allikast. Ära teisenda ühikuid.`;
}

export const JUDGE_SYS = `Sa oled range faktikontrollija e-poe sisule. Antakse ALLIKAS (tarnija toore toote-andmed) ja PUHASTATUD master-tekst. Leia PUHASTATUD tekstis IGA konkreetne faktiväide, mida ALLIKAS EI TOETA.
Konkreetne väide = komponent/osa, komplekti kuuluv ese, funktsioon/režiim, materjal, sertifikaat, ühilduvus, nimetatud omadus/võimekus.
TOETATUD = allikas ütleb seda VÕI vihjab üheselt; ümbersõnastus/sünonüüm on toetatud; üldine turundus-omadussõna (vastupidav, kvaliteetne) EI ole väide.
Tagasta AINULT JSON: {"ok":true|false,"unsupported":[{"claim":"<väide>","field":"title|description","why":"<miks allikas ei toeta>"}]}`;

export function judgeUser(p, clean, orphans) {
  return `ALLIKAS:\nTITLE: ${p.title}\nMÜÜGIPUNKTID: ${(Array.isArray(p.selling_points) ? p.selling_points.join(" | ") : "")}\nSPETSID: ${specsLines(p.specs).join(" | ")}\nKIRJELDUS(raw): ${(p.description || "").slice(0, 500)}\n\nPUHASTATUD TITLE: ${clean.title_en_clean}\nPUHASTATUD DESCRIPTION: ${clean.description_en_clean}\n\nVIHJE (sõnad, mida allikas-tekstis sõnasõnalt polnud — kontrolli kas need on leiutatud väited või lihtsalt sünonüümid): ${(orphans || []).slice(0, 30).join(", ") || "(pole)"}\nLoetle toetamata konkreetsed väited.`;
}

// ─────────────────────────── PARSE ───────────────────────────
export function parseCleanJson(raw) {
  const t = (raw || "").replace(/```(?:json)?/gi, "").trim();
  const m = t.match(/\{[\s\S]*\}/);
  if (!m) throw new Error(`JSON puudub: ${t.slice(0, 120)}`);
  const o = JSON.parse(m[0]);
  if (typeof o.title_en_clean !== "string" || typeof o.description_en_clean !== "string")
    throw new Error("title_en_clean/description_en_clean puudub");
  return { title_en_clean: o.title_en_clean.trim(), description_en_clean: o.description_en_clean.trim() };
}
export function parseJudgeJson(raw) {
  const t = (raw || "").replace(/```(?:json)?/gi, "").trim();
  const m = t.match(/\{[\s\S]*\}/);
  if (!m) throw new Error(`kohtuniku JSON puudub: ${t.slice(0, 120)}`);
  return JSON.parse(m[0]);
}

// ─────────────────────────── DETERMINISTLIKUD VÄRAVAD (üks koht) ───────────────────────────
/** Jooksuta KÕIK deterministlikud väravad (1,2,3,4,6) + lemma-orvud. Tagastab {detOff, detail, orphans}. */
export function runDetGates(clean, srcNums, srcPairs, srcText, allowExtraPairs) {
  const acc = accuracyGate(clean, srcNums);
  const un = unitGate(clean, srcPairs, allowExtraPairs);
  const br = brandGate(clean), ht = htmlGate(clean), ln = lengthGate(clean);
  const orphans = lemmaOrphans(clean, srcText);
  const detOff = [...acc.offenders, ...un.offenders, ...br.offenders, ...ht.offenders, ...ln.offenders];
  return { detOff, orphans, detail: { accuracy: acc.pass, unit: un.pass, brand: br.pass, html: ht.pass, length: ln.pass } };
}

// ─────────────────────────── INLINE orkestraator (hook / regen / väikesed jooksud) ───────────────────────────
/**
 * cleanGatedInline — puhasta ÜKS toode inline-kutsetega (max `maxAttempts` regen). Kasutab:
 *   • öine hook (delta), kui batch ei tasu ära
 *   • batch-backfilli regen-tee (parse-fail / värava-fail healing)
 *
 * callGen(system, user)   → tagastab mudeli RAW-teksti (string)
 * callJudge(system, user) → tagastab mudeli RAW-teksti (string); kui pole, kohtunik vahele (det-only)
 */
export async function cleanGatedInline(p, srcText, { callGen, callJudge, maxAttempts = 3 } = {}) {
  const srcNums = numSet(srcText);
  const srcPairs = srcUnitPairs(srcText);
  let avoid = "", clean = null, gate = null, orphans = [], judgeRes = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const raw = await callGen(CLEAN_SYS, cleanUser(p, avoid));
    clean = parseCleanJson(raw);
    const det = runDetGates(clean, srcNums, srcPairs, srcText, null);
    orphans = det.orphans;
    if (det.detOff.length === 0 && callJudge) {
      try { judgeRes = parseJudgeJson(await callJudge(JUDGE_SYS, judgeUser(p, clean, orphans))); }
      catch (e) { judgeRes = { ok: true, unsupported: [], _err: e.message }; }
    } else { judgeRes = det.detOff.length === 0 ? { ok: true, unsupported: [] } : null; }
    const claimOff = (judgeRes && !judgeRes.ok) ? (judgeRes.unsupported || []).map((x) => `VÄIDE «${x.claim}» (${x.field}): ${x.why}`) : [];
    const offenders = [...det.detOff, ...claimOff];
    gate = { pass: offenders.length === 0, offenders, attempts: attempt, orphans, detail: { ...det.detail, claim: claimOff.length === 0 } };
    if (gate.pass) break;
    avoid = `Paranda KÕIK: ${offenders.join("; ")}. Kasuta AINULT allika fakte/numbreid/ühikuid; eemalda leiutatud väited; ära teisenda ühikuid.`;
  }
  const { metrized } = applyMetric(clean);
  clean._gate = { ...gate, metrized };
  return clean;
}

/** Ehita avoid-note väravarikkujatest (batch-regen jaoks, et promptid ühtiksid inline-teega). */
export function buildAvoidNote(offenders) {
  return `Paranda KÕIK: ${offenders.join("; ")}. Kasuta AINULT allika fakte/numbreid/ühikuid; eemalda leiutatud väited; ära teisenda ühikuid.`;
}
