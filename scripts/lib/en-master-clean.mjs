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
// Imperiaalne-ainult mõõt (SULGUDE VÄLINE) → "meetriline (imperiaalne)". Sulgude-sisene jäetakse.
// PIKKUS-ühikud (in/ft/") toetavad ATOMAARSEID mõõtme-GRUPPE: "A x B x C unit" → teisenda KÕIK numbrid või MITTE ÜHTKI
//   (parandus A, Tarmo 2026-11-19: osaline teisendus — nt "5 x 2.13 m (7 ft)" — on KEELATUD).
// Muud ühikud (lbs/gal/oz/°F) = üksikväärtus. Murd-tollid (3/8") jäetakse (ei ühti num-mustriga).
// Lisatud meetriline number on arvutatud → whitelistitakse täpsus/ühik-värava jaoks (addedPairs).
function parenDepthAt(str, idx) { let d = 0; for (let i = 0; i < idx; i++) { if (str[i] === "(") d++; else if (str[i] === ")") d = Math.max(0, d - 1); } return d; }

// ── NUMBRI-PARSE: inglise tuhandete-koma ("17,600"=17600) vs koma-koma (harv, "2,5"=2.5) ──
//   VANA BUG: "17,600 lbs" → Number("17.600")=17.6 → 8 kg. Nüüd: eemalda tuhandete-koma, siis koma→punkt.
function pNum(s) {
  let x = String(s).trim().replace(/,(?=\d{3}(?:\D|$))/g, ""); // 17,600 → 17600
  return Number(x.replace(",", "."));
}
// ── magnituudi-teadlik ümardus iga meetrilise ühiku jaoks (loetav + täpne) ──
//   VANA BUG: 0.33 lb → 0.15 kg → toFixed(1) = "0.1" (liiga agar). Nüüd väikesed kg/L/m 2 kohta.
function roundMet(v, u) {
  switch (u) {
    case "mm": return v >= 100 ? Math.round(v) : Number(v.toFixed(1));
    case "cm": return v >= 100 ? Math.round(v) : Number(v.toFixed(1));
    case "m": return v >= 10 ? Number(v.toFixed(1)) : Number(v.toFixed(2));
    case "kg": return v >= 10 ? Number(v.toFixed(1)) : Number(v.toFixed(2));
    case "g": return Math.round(v);
    case "L": return v >= 10 ? Number(v.toFixed(1)) : Number(v.toFixed(2));
    case "mL": return Math.round(v);
    case "°C": return Math.round(v);
    case "m²": return v >= 10 ? Number(v.toFixed(1)) : Number(v.toFixed(2));
    case "cm²": return Math.round(v);
    case "m³": return Number(v.toFixed(2));
    case "cm³": return Math.round(v);
    default: return Number(v.toFixed(2));
  }
}
// ── SKALAAR-perekonnad (ümberehitus, Tarmo 2026-11-19): igaühel OMA ühiku-tüüp + reegel. ──
//   Vahemik aatomina ("110-330 lbs" → "50-150 kg (…)"). Mitmetähenduslik "oz" (kaal vs vedelik) → PUUTUMATA
//   (vältis "30 ounces (900 mL)" → fabritseeritud "850 g"). Tundmatu ühik → puutumata. Tonn/T = juba meetriline.
//   Pindala/maht EI teisendata lineaarselt (vana bug: "1500 ft²" → "457 m (…)²"). Temp AINULT °F/℉/Fahrenheit (mitte paljas "F").
const SCALAR = [
  { k: "temp", units: `℉|°\\s?F|degrees?\\s?F(?:ahrenheit)?|Fahrenheit`, to: "°C", conv: (v) => (v - 32) / 1.8 },
  { k: "area_ft", units: `sq(?:uare)?\\.?\\s?(?:ft|feet|foot)|ft\\s?(?:²|\\^?2)|feet\\s?(?:²|\\^?2)`, to: "m²", conv: (v) => v * 0.092903 },
  { k: "area_in", units: `sq(?:uare)?\\.?\\s?(?:in|inch|inches)|in\\s?(?:²|\\^?2)`, to: "cm²", conv: (v) => v * 6.4516 },
  { k: "vol_ft", units: `cu(?:bic)?\\.?\\s?(?:ft|feet|foot)|ft\\s?(?:³|\\^?3)|feet\\s?(?:³|\\^?3)`, to: "m³", conv: (v) => v * 0.0283168 },
  { k: "vol_gal", units: `gallons?|gal\\b`, to: "L", conv: (v) => v * 3.78541 },
  { k: "weight_lb", units: `lbs|lb|pounds?|pound`, to: "kg", conv: (v) => v * 0.453592 },
];
// meetrilised ühikud mida loeme "juba olemas" (kõrval → ära teisenda, väldib topelt-sulgu)
const _MET_ADJ = `mm|cm|m²|cm²|m³|m|kg|g|t|L|mL|ml|°C|°c`;
const _SC_NUM = `\\d+(?:[.,]\\d+)*`;
const _SC_SIGN = `[−-]?`;                       // juhtiv märk (U+2212 või ASCII); vahemiku-kriips eristatakse _digitBefore'ga
const _SC_SEP = `(?:\\s*[-–—]\\s*|\\s+to\\s+)`;
// convScalar: üksik VÕI vahemik; paren-kaitse; kõrval-meetriline → skip (allikas andis mõlemad); 1 sulg; vahemik aatomina.
//   NEGATIIVNE allikas ("−4°F" = -4): märk HAARATAKSE tervikuna (teisendus -4°F→-20°C õige) ja algne märk ei jää orvuks
//   (vana bug: "4°F"→"-16 °C" + orb "−" → "−-16 °C"; 21 temp-toodet). Vahemiku-kriips ("35-48") EI ole märk.
function convScalar(text, fam, addedPairs) {
  const RE = new RegExp(`(${_SC_SIGN}${_SC_NUM}(?:${_SC_SEP}${_SC_SIGN}${_SC_NUM})?)\\s*(?:${fam.units})(?![a-zA-Z])`, "gi");
  const afterMet = new RegExp(`^\\s*[/,(]?\\s*${_SC_NUM}\\s*(?:${_MET_ADJ})\\b`, "i");
  const beforeMet = new RegExp(`${_SC_NUM}\\s*(?:${_MET_ADJ})\\b\\s*[/,(]?\\s*$`, "i");
  const NUMSIGN = new RegExp(`(${_SC_SIGN})(${_SC_NUM})`, "g");
  return text.replace(RE, (full, body, offset, whole) => {
    if (parenDepthAt(whole, offset) > 0) return full;             // sulgude sees = allika-meetriline annotatsioon
    const after = whole.slice(offset + full.length, offset + full.length + 18);
    const before = whole.slice(Math.max(0, offset - 18), offset);
    if (afterMet.test(after) || beforeMet.test(before)) return full; // meetriline kõrval → allikas duaalne, ära korda
    // märgi-teadlik arvude-haare: juhtiv "−"/"-" = märk; number ees → kriips on vahemik, mitte märk
    const nums = []; let m2;
    while ((m2 = NUMSIGN.exec(body))) {
      let sign = m2[1];
      if ((sign === "-" || sign === "−") && _digitBefore(body, m2.index)) sign = "";
      nums.push((sign === "−" ? "-" : sign) + m2[2]); // normaliseeri U+2212 → ASCII (pNum jaoks)
    }
    if (!nums.length) return full;
    const conv = nums.map((n) => { const cv = roundMet(fam.conv(pNum(n)), fam.to); addedPairs.add(`${normNum(String(cv))}|${normUnit(fam.to)}`); return cv; });
    // separaator = arvude VAHEL (mitte juhtiv märk): otsi esimese arvu JÄREL
    let sep = "";
    if (nums.length > 1) { const sm = body.match(new RegExp(`${_SC_NUM}(${_SC_SEP})`)); sep = sm ? (/to/i.test(sm[1]) ? " to " : sm[1].trim()) : ""; }
    return `${conv.join(sep)} ${fam.to} (${full.trim()})`;
  });
}

// ── PIKKUS-ühikud (toll + jalg) atomaarse grupi-toega ──
const LEN = {
  in: { f: 2.54, u: "cm" }, inch: { f: 2.54, u: "cm" }, inches: { f: 2.54, u: "cm" },
  '"': { f: 2.54, u: "cm" }, "″": { f: 2.54, u: "cm" },
  ft: { f: 0.3048, u: "m" }, foot: { f: 0.3048, u: "m" }, feet: { f: 0.3048, u: "m" },
};
const lenKey = (u) => { u = (u || "").toLowerCase(); return LEN[u] ? u : null; };
const lenRound = (met, unit) => unit === "cm"
  ? (met >= 100 ? Math.round(met) : Number(met.toFixed(1)))
  : (met >= 10 ? Number(met.toFixed(1)) : Number(met.toFixed(2)));
const LEN_UNIT = `inches|inch|feet|foot|ft|in|″|"`; // pikim enne (inches enne in)
// allikas-duaal PIKKUSELE: imperiaal + KOHE meetriline pikkus-annotatsioon ("12\" (320 mm)", "60 x 24 in (152 x 61 cm)",
//   "2 in / 5 cm") → ära lisa teist teisendust (väldib topelt-sulgu). AINULT pikkus-ühikud (mm/cm/m): "12 in, 5 kg"
//   on ERI mõõt (kaal), seda teisenda normaalselt.
const _LEN_GRP = `\\d+(?:[.,]\\d+)?(?:\\s*[x×-]\\s*\\d+(?:[.,]\\d+)?)*`;
const _AFTER_LEN_MET = new RegExp(`^\\s*[/,(]?\\s*${_LEN_GRP}\\s*(?:mm|cm|m)\\b`, "i");
const _BEFORE_LEN_MET = new RegExp(`\\d+(?:[.,]\\d+)?\\s*(?:mm|cm|m)\\b\\s*[/(,]?\\s*$`, "i");
// grupp: num [unit?] (SEP num [unit?])* lõpp-unit ; sabas (?![a-z]) väldib osa-sõna ("12int")
//   Separaator x/× = mõõtmed ("60 x 24 in"); KRIIPS ja sõna "to" = vahemik ("28-32 inch", "34 to 48 inches").
//   MÕLEMAD otsad haaratakse aatomina, et vältida osalist teisendust nagu "28–81.3 cm (32 inch)" või
//   "34.8 to 123 cm (48.4 inches)" (parandus B, Tarmo 2026-11-19: vahemiku üks ots jäi varem teisendamata →
//   ebasidus/vale ühik; vt parandus A sama loogika x-grupile). "to" nõuab ümber tühikut (väldib "into"/"onto").
const DIM_SEP = `(?:\\s*(?:${LEN_UNIT})?\\s*(?:[x×]|[-–—])\\s*|\\s+to\\s+)`;
const DIM_RE = new RegExp(
  `(\\d+(?:[.,]\\d+)?(?:${DIM_SEP}\\d+(?:[.,]\\d+)?)*)\\s*(${LEN_UNIT})(?![a-z])`,
  "gi",
);
function convertLengths(text, addedPairs) {
  return text.replace(DIM_RE, (full, body, endUnit, offset, whole) => {
    if (parenDepthAt(whole, offset) > 0) return full; // juba meetriline ees → jäta
    if (whole[offset - 1] === "/") return full;        // murd-toll (3/8") = keere-nominaal → EI teisenda
    // PINDALA/MAHT: "ft²"/"ft2"/"ft^3" (ühik järel vahetult ²/³/2/3) → PINDALA/MAHT-konverter, MITTE lineaarne pikkus
    //   (vana bug: "1500 ft²" → "457 m (1500 ft)²"). Tühik enne arvu ("6 ft 2 in" jalg-toll) EI käivita kaitset.
    { const tail0 = whole.slice(offset + full.length); if (/^(?:[²³]|\^?[23])(?![0-9])/.test(tail0)) return full; }
    const key = lenKey(endUnit);
    if (!key) return full;
    const isXGroup = /[x×]/.test(body);                   // mõõtme-grupp = ühemõtteliselt ühik
    const isDashRange = /[-–—]/.test(body);               // kriips-vahemik
    const isToRange = /\s+to\s+/i.test(body);             // sõna-vahemik ("34 to 48")
    const isRange = !isXGroup && (isDashRange || isToRange);
    // bare "in" on ka inglise eessõna ("12 in the box") — ÜKSIKväärtusel JA vahemikul (mitte x-grupis) ära
    // teisenda, kui järgneb sõna. x-grupis ("60 x 24 x 12 in") on "in" kindlalt ühik. Sümbolid/"inch(es)"/"ft" ok.
    const after = whole.slice(offset + full.length);
    // allikas andis juba meetrilise PIKKUSE kõrval ("12\" (320 mm)", "2 in / 5 cm") → ära korda (topelt-sulg)
    if (_AFTER_LEN_MET.test(after) || _BEFORE_LEN_MET.test(whole.slice(0, offset))) return full;
    // "in" vahetult numbri küljes (tühikuta, nt "71in") = kindel ühik, mitte eessõna; tühikuga "in" + sõna → eessõna, jäta
    const inAttached = /\d$/.test(full.slice(0, full.length - endUnit.length));
    if (endUnit.toLowerCase() === "in" && !isXGroup && !inAttached && /^\s+[a-z]/i.test(after)) return full;
    // inline-ühikud grupis peavad olema sama perekond (cm vs m) — muidu ohtlik, jäta teisendamata.
    const inlineUnits = body.match(new RegExp(LEN_UNIT, "gi")) || [];
    for (const iu of inlineUnits) { const k = lenKey(iu); if (!k || LEN[k].u !== LEN[key].u) return full; }
    const fam = LEN[key];
    const nums = body.match(/\d+(?:[.,]\d+)?/g) || [];
    if (!nums.length) return full;
    const conv = nums.map((n) => {
      const met = lenRound(Number(n.replace(",", ".")) * fam.f, fam.u);
      addedPairs.add(`${normNum(String(met))}|${normUnit(fam.u)}`);
      return met;
    });
    // ühenda ORIGINAAL-struktuuriga: x-grupp → " x ", kriips-vahemik → sama kriipsumärk, "to"-vahemik → " to ".
    // Nii teiseneb vahemik TERVIKUNA ("28-32 inch" → "71.1-81.3 cm (28-32 inch)"), mitte pooleldi.
    let sep = " x ";
    if (isRange && isDashRange) { const m = body.match(/[-–—]/); sep = m ? m[0] : "-"; }
    else if (isRange && isToRange) { sep = " to "; }
    return `${conv.join(sep)} ${fam.u} (${full.trim()})`;
  });
}

/**
 * dedupeDualUnit — eemalda duaalühiku-dubleerimine, mille addMetric ise tekitab. Allikas annab sageli
 *   "IMPERIAAL/MEETRILINE" (nt "220 lbs/100 kg"); addMetric teisendab imperiaalse poole → "100 kg (220 lbs)"
 *   ja jätab "/100 kg" alles → "100 kg (220 lbs)/100 kg" (väärtus ÕIGE, vormistus korratud). Siin varistame
 *   SAMA arv+ühik mõlemal pool kaldkriipsu kokku. VÄÄRTUS säilib → ohutu. (Tarmo 2026-11-19, 259 toodet.)
 */
export function dedupeDualUnit(text) {
  let out = String(text);
  // (?<![\d.,]) = number EI tohi alata keset teist arvu (nt "4.5 kg / 5 kg" ei tohi haarata "5 kg/5 kg")
  // "M u (I)/M u" → "M u (I)"  (imperiaal-pool teisendati ette, meetriline kordus taga)
  out = out.replace(/(?<![\d.,])(\d+(?:[.,]\d+)?)\s*([a-zA-Z°"″]+)\s*\(([^)]*)\)\s*\/\s*\1\s*\2\b/g, "$1 $2 ($3)");
  // "M u/M u (I)" → "M u (I)"  (meetriline ees, imperiaal-pool teisendati taha)
  out = out.replace(/(?<![\d.,])(\d+(?:[.,]\d+)?)\s*([a-zA-Z°"″]+)\s*\/\s*\1\s*\2\s*\(([^)]*)\)/g, "$1 $2 ($3)");
  return out;
}

export function addMetric(text, addedPairs) {
  // Töötab PUHTAL LLM-baasil (arhitektuur: metadata.*_en_base; addMetric = puhas funktsioon baas→clean).
  // 1) pikkus (atomaarne x-grupp + vahemik, ²/³-kaitse)  2) skalaar-perekonnad (igaüks oma tüüp+reegel)
  let out = convertLengths(text, addedPairs);
  for (const fam of SCALAR) out = convScalar(out, fam, addedPairs);
  return dedupeDualUnit(out); // duaalühiku-jääk (allikas "220 lbs/100 kg") kokku (SSoT, kõik kutsujad)
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

// ─────────────────────── PÜSIV VÄRAV (addMetric JÄREL, lõppväljund) — ÜMBEREHITUS 2026-11-19 ───────────────────────
// Tarmo #4: TAGASIARVUTUS-kontroll + KORDUS-tuvastus lõppväljundil (asendab vana ainult-pikkus coherence-värava).
// Jookseb addMetric JÄREL: backfill + öine hook [6.55], fail → EI kirjuta DB + signaal (rule #5).
//
// Annotatsiooni-kuju mida addMetric toodab: "<meetriline(d)> <mühik> (<originaal imperiaal>)".
// 1) TAGASIARVUTUS: arvuta imperiaal → meetriline uuesti, võrdle; kardinaalsus (vahemik 2 vs üksik 1) peab klappima.
// 2) KORDUS: ")(" kõrvuti (topelt-sulg) VÕI sama "(sisu)" kaks korda → ebasidus.
const _MG_NUM = `-?\\d+(?:[.,]\\d+)?`; // -? → negatiivne temp ("-16 °C") haaratakse; vahemiku kriips eristab _nums
const _MG_RANGE = `${_MG_NUM}(?:\\s*(?:[-–—]|x|×)\\s*|\\s+to\\s+)${_MG_NUM}`;
// imperiaal → {meetriline ühik, tegur}; järjekord: pindala/maht ENNE lineaarset (² ja ³ sabaga)
const _IMP2MET = [
  { re: /\bsq(?:uare)?\.?\s?(?:ft|feet|foot)\b|\bft\s?(?:²|\^?2)|feet\s?(?:²|\^?2)/i, u: "m²", f: 0.092903 },
  { re: /\bcu(?:bic)?\.?\s?(?:ft|feet|foot)\b|\bft\s?(?:³|\^?3)|feet\s?(?:³|\^?3)/i, u: "m³", f: 0.0283168 },
  { re: /\bsq(?:uare)?\.?\s?(?:in|inch|inches)\b|\bin\s?(?:²|\^?2)|inches\s?(?:²|\^?2)/i, u: "cm²", f: 6.4516 }, // ruut-toll ENNE lineaarset
  { re: /inch|inches|\bin\b|["″]/i, u: "cm", f: 2.54 },
  { re: /\bft\b|\bfeet\b|\bfoot\b/i, u: "m", f: 0.3048 },
  { re: /lbs|\blb\b|pounds?|pound/i, u: "kg", f: 0.453592 },
  { re: /gallons?|\bgal\b/i, u: "L", f: 3.78541 },
  { re: /℉|°\s?F|fahrenheit/i, u: "°C", f: null }, // temp = eri-valem
];
const _METU = `m²|cm²|m³|cm³|mm|cm|m|kg|g|L|mL|°C`;
// meetriliste ühikute DIMENSIOONI-perekonnad + SI-baasühiku tegur. Värav võrdleb PEREKONDA + baasühikus,
//   MITTE täpset alam-ühikut: allikas annab sageli "1100 mm (43.3\")" — dimensiooniliselt ÕIGE, aga _IMP2MET
//   kanooniline oleks cm. mm≡cm≡m (pikkus), mL≡L≡m³ (maht) jne → ei tohi "ühiku-tüüp ei klapi" valepositiivi anda.
const _MET_FAM = {
  "mm": { fam: "len", base: 0.001 }, "cm": { fam: "len", base: 0.01 }, "m": { fam: "len", base: 1 },
  "cm²": { fam: "area", base: 0.0001 }, "m²": { fam: "area", base: 1 },
  "cm³": { fam: "vol", base: 1e-6 }, "m³": { fam: "vol", base: 1 }, "mL": { fam: "vol", base: 1e-6 }, "L": { fam: "vol", base: 1e-3 },
  "g": { fam: "mass", base: 0.001 }, "kg": { fam: "mass", base: 1 },
  "°C": { fam: "temp", base: 1 },
};
// kriips = VAHEMIK (mitte miinus-märk), kui ees — ühikuid/sümboleid (" ″ ' % ) tähed) ignoreerides — on number.
//   Nii "71-81" ja "7.75\"-8.25\"" on vahemikud, aga "-16 °C" ja "range -4 to" on negatiivsed.
function _digitBefore(str, idx) { return /\d$/.test(str.slice(0, idx).replace(/[\s"″'%)a-z]*$/i, "")); }
// Arvude-parse värava tagasiarvutuseks: MURD-tollid ("1/8\""=0.125, "5/16 in"=0.3125) = ÜKS väärtus (mitte [1,8]);
//   MÄRGI-teadlik (negatiivne temp säilib, vahemiku-kriips mitte). Mõlemad pooled sama _nums → kardinaalsus klapib.
function _nums(s) {
  const str = String(s); const out = [];
  const re = /(-?)(\d+(?:[.,]\d+)?)\s*\/\s*(\d+(?:[.,]\d+)?)|(-?)(\d+(?:[.,]\d+)?)/g; let m;
  while ((m = re.exec(str))) {
    if (m[2] !== undefined) {                                    // murd a/b → üks väärtus
      let sign = m[1]; if (sign === "-" && _digitBefore(str, m.index)) sign = "";
      out.push(pNum(sign + m[2]) / pNum(m[3]));
    } else {                                                     // tavaline arv
      let sign = m[4]; if (sign === "-" && _digitBefore(str, m.index)) sign = "";
      out.push(pNum(sign + m[5]));
    }
  }
  return out;
}
function _annRe() { return new RegExp(`(${_MG_RANGE}|${_MG_NUM})\\s*(${_METU})\\s*\\(([^)]*)\\)`, "gi"); }
export function metricOffenders(text) {
  const t = String(text); const out = [];
  // 1) topelt-sulg kõrvuti: "(…num…) (…num…)" → kordus/kuhjumine
  if (/\([^)]*\d[^)]*\)\s*\([^)]*\d[^)]*\)/.test(t)) {
    const m = t.match(/\([^)]*\d[^)]*\)\s*\([^)]*\d[^)]*\)/); out.push(`topelt-sulg: ${m[0]}`);
  }
  // 2) sama sulu-sisu kaks korda LÄHESTIKKU (≤60 tähte) = teisendus-artefakt; kaugel = legitiimne proosa-kordus
  { const seen = new Map(); for (const m of t.matchAll(/\(([^)]*\d[^)]*)\)/g)) { const k = m[1].replace(/\s+/g, "").toLowerCase(); const prev = seen.get(k); if (prev !== undefined && (m.index - prev) <= 60) { out.push(`korduv sulg: (${m[1]})`); break; } seen.set(k, m.index); } }
  // 3) tagasiarvutus iga annotatsiooni kohta
  let m; const RE = _annRe();
  while ((m = RE.exec(t))) {
    const metNums = _nums(m[1]); const munit = m[2]; const paren = m[3];
    // x-grupp (nt "152 x 61 x 30.5 cm (60 x 24 in)"): convertLengths teisendab aatomina → usalda, ära tagasiarvuta
    if (/[x×]/i.test(m[1]) || /[x×]/i.test(paren)) continue;
    const end = m.index + m[0].length; const tail = t.slice(end, end + 2);
    // PINDALA/MAHT lineaarsena: originaalis või saba-s ²/³, aga meetriline ühik on lineaarne (m/cm) → vale
    if ((/[²³]/.test(paren) || /^\s*[²³]/.test(tail)) && !/[²³]/.test(munit)) {
      out.push(`pindala/maht lineaarsena: "${m[0]}${/^\s*[²³]/.test(tail) ? tail.trim() : ""}"`); continue;
    }
    const fam = _IMP2MET.find((x) => x.re.test(paren));
    if (!fam) continue;                                   // originaal pole tuntud imperiaal → jäta (nt juba-meetriline sulg)
    // PEREKONNA-kontroll (mitte täpne alam-ühik): mm/cm/m kõik "len" → "1100 mm (43.3\")" ei ole viga.
    const gm = _MET_FAM[munit]; const fm = _MET_FAM[fam.u];
    if (!gm || !fm || gm.fam !== fm.fam) { out.push(`ühiku-tüüp ei klapi: "${m[0]}" (ootasin ${fm ? fm.fam : fam.u}-perekonda, sain ${munit})`); continue; }
    const impNums = _nums(paren);
    if (metNums.length !== impNums.length) { out.push(`kardinaalsus: "${m[0]}" (${metNums.length} vs ${impNums.length})`); continue; }
    for (let i = 0; i < metNums.length; i++) {
      const exp = fam.f === null ? (impNums[i] - 32) / 1.8 : impNums[i] * fam.f; // kanoonilises ühikus fam.u
      const got = (metNums[i] * gm.base) / fm.base;                              // got → kanooniline ühik (mm→cm jne)
      const tol = Math.max(Math.abs(exp) * 0.04, munit === "°C" ? 1.1 : 0.06);   // 4% või temp ±1.1°C
      if (Math.abs(got - exp) > tol) { out.push(`vale teisendus: "${m[0]}" (${metNums[i]} ${munit} ≠ ${Number(exp.toFixed(2))} ${fam.u})`); break; }
    }
  }
  return out;
}
/** Värav clean-objektile (mõlemad väljad). Tagastab {pass, offenders}. */
export function metricGate(clean) {
  const off = [
    ...metricOffenders(clean.title_en_clean || "").map((s) => `title: ${s}`),
    ...metricOffenders(clean.description_en_clean || "").map((s) => `desc: ${s}`),
  ];
  return { pass: off.length === 0, offenders: off };
}
// Tagasiühilduvus (vanad kutsujad): endine nimi delegeerib uuele värav-loogikale.
export const rangeCoherenceOffenders = metricOffenders;
export const rangeCoherenceGate = metricGate;

// ─────────────────────────── PROMPTID ───────────────────────────
export const CLEAN_SYS = `Sa oled XL e-poe (xlmarket.ee) ingliskeelse sisu MASTER-toimetaja. Sulle antakse TARNIJA (VEVOR) TOORE ingliskeelse toote title + müügipunktid + spetsifikatsioonid. Tee neist PUHAS, display-kvaliteediga ingliskeelne MASTER-title ja -kirjeldus.

RANGED REEGLID:
1. title_en_clean: LÜHIKE selge toote-nimi (nagu inimese kataloogis), MAX ~70 tähte. EI keyword-stuffing'ut ega komaga atribuut-loendit. Nimeta toode + 1-2 eristavat omadust. MITTE "VEVOR".
2. description_en_clean: LOOMULIK inglise proosa, 2-4 lauset. MITTE ühtegi HTML-tagi. MITTE "VEVOR". Kirjelda MIS toode on + peamine kasu/kasutus.
3. 🔑 FAKTID (kriitiline): KÕIK, mida kirjutad — komponendid, komplekti-sisu, funktsioonid, materjalid — PEAB tulema allikast. ÄRA leiuta ühtegi omadust ega komponenti. Kui allikas ei ütle → ÄRA kirjuta.
4. 🔑 NUMBRID+ÜHIKUD: iga number ja ühik PEAB esinema allikas. ÄRA leiuta numbreid.
5. 🔑 ÜHIKUD — ÄRA TEISENDA ISE: kui allikas annab meetrilise (mm/cm/m/kg/L/°C), KASUTA SEDA. Kui allikas annab ainult imperiaalse (lbs/ft/inch/°F), JÄTA imperiaalne nii nagu allikas (süsteem lisab meetrilise ise). ÄRA KUNAGI teisenda mm→toll ega lbs→kg ise. Eelista meetrilist seal, kus allikas pakub.
6. 🔑 KOMPLEKT/VARIANT — ÄRA ÜLDISTA: kui allikas annab ERINEVATELE osadele/variantidele ERINEVAD mõõdud või kaalud (nt 3 ketast: 210 / 214 / 213 mm), ÄRA kirjuta "each/all/every/per X" ühe variandi arvuga — see on VALE (üldistad ühe mõõdu kõigile). Kas loetle variandid eraldi VÕI jäta konkreetne arv välja ("in three sizes"). Komplekti kogukaal/-mõõt ≠ ühe eseme oma.
7. 🔑 ALLIKA VASTUOLU: kui allikas annab SAMALE atribuudile vastuolulised väärtused (nt mootor "100 HP" ühes kohas, "150 HP" teises), ÄRA vali vaikselt ühte. Kui SPETSIFIKATSIOONI-väljal (specs) on väärtus, kasuta SEDA; kui specs ei ütle, JÄTA see number hoopis välja. Ära arva. Lisa iga selline juhtum "data_quality" loendisse (nt "motor power: source conflicts 100 HP vs 150 HP").

Tagasta AINULT JSON: {"title_en_clean":"<lühike puhas EN title>","description_en_clean":"<loomulik EN proosa>","data_quality":["<vastuolu/väljajätu märge või tühi loend>"]}`;

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
🔑 PER-VARIANT ÜLDISTUS (loe rikkumiseks): kui puhas tekst ütleb "each/all/every/per <ese>" KOOS konkreetse mõõdu/kaaluga, aga allikas annab erinevatele variantidele ERINEVAD väärtused (nt kettad 210 vs 214 vs 213 mm), siis on see TOETAMATA väide — üks variandi arv on vale-üldistatud kõigile. Lisa see "unsupported" loendisse (why = millised allika-väärtused erinevad).
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
  const dq = Array.isArray(o.data_quality)
    ? o.data_quality.filter((x) => typeof x === "string" && x.trim()).map((x) => x.trim())
    : [];
  return { title_en_clean: o.title_en_clean.trim(), description_en_clean: o.description_en_clean.trim(), data_quality: dq };
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
  clean._gate = { ...gate, metrized, data_quality: clean.data_quality || [] };
  return clean;
}

/** Ehita avoid-note väravarikkujatest (batch-regen jaoks, et promptid ühtiksid inline-teega). */
export function buildAvoidNote(offenders) {
  return `Paranda KÕIK: ${offenders.join("; ")}. Kasuta AINULT allika fakte/numbreid/ühikuid; eemalda leiutatud väited; ära teisenda ühikuid.`;
}
