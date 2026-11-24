#!/usr/bin/env node
/**
 * metric-et.mjs — IMPERIAAL→MEETRILINE ET-väljadele (title_et / description_et / specs).
 *
 * HARD RULE #5 SSoT: taaskasutab TÄIELIKULT scripts/lib/en-master-clean.mjs addMetric-ahelat
 *   (sama transform kui EN-masteril + ET-spetsidel). EI ole uus teisendus-loogika — ainult
 *   ET-spetsiifiline KEST: erandi-värav, inverteeritu-pööre, ET-lokaliseerimine (koma-kümnend +
 *   token-korrastus), ja samad fail-closed väravad (metricOffenders tagasiarvutus + srcConflictGate).
 *
 * Tarmo GO 2026-11-24:
 *   1. ET-kuju: meetriline ees + imperiaal sulgudes; koma-kümnend; token-korrastus (8FT→8 ft).
 *   2. 84 inverteeritut ("12\" (30 cm)") → pööra "30 cm (12\")".
 *   3. Erandid ENNE backfilli (toll Eestis standard): rehvid/veljed · telerid/ekraanid/projektorid ·
 *      toru-/keermemõõdud · jalgrattad + VELOTRENAŽÖÖRID (26"-29" rattad) · foto/etiketi-mõõdud (4x6", 5x7").
 *      Erand = SKIP (mitte teisendus). Fail-closed: kahtlus → jäta puutumata + logi.
 *   4. Skoop: title_et + description_et; specs AINULT kus meetriline puudub.
 *
 * TEISENDUS-KETT (ühe välja kohta):
 *   excProduct?  → skip (erand-kategooria/märksõna)
 *   maskProtected (foto-mõõdud) → addMetric(masked) → flipInverted → localizeEt → unmask
 *   → metricOffenders (tagasiarvutus) + srcConflictGate (allikas) → fail → skip + offenders
 */
import { addMetric, metricOffenders, srcConflictGate } from "./en-master-clean.mjs";

// ─────────────────────────── ERANDID (toll Eestis standard → SKIP) ───────────────────────────
// Kategooria-nime JA pealkirja/kirjelduse märksõna (velotrenažöör ei ole alati puhtas kategoorias).
// TÜVED (eesti käänded) — ainult juhtiv \b, EI lõpu-\b (muidu "keermega"/"rehvid"/"ekraaniga" jääks püüdmata).
const EXC_KEYWORD = [
  ["rehv/velg", /\b(rehv|velg|velje|rattavahetük|rattadistants|rattaadapter|veljeadapter|poldimuster|poldijaotus)/i],
  ["teler/ekraan", /\b(teler|ekraan|monitor|kuvar|projektor)/i],
  ["toru/keere", /\b(toru|keere|keerme|liitmik|nippel|niple|ventiil|fitting|äärik|npt|bsp)/i],
  ["jalgratas/velotrenažöör", /\b(jalgratt|ratturi|rattaraam|rattakett|rattarehv|velotrenažöör|velotrenaž|spinningrat)/i],
];
/** Kas toode on erand (toll = standard-spetsifikatsioon) → kogu toode SKIP. Vaatab kat-nimed + title + desc. */
export function excProduct({ title_et = "", description_et = "", cats = [] } = {}) {
  const hay = [(cats || []).join(" "), title_et, description_et].join("  ");
  for (const [name, re] of EXC_KEYWORD) if (re.test(hay)) return name;
  return null;
}

// ─────────── FOTO-/ETIKETI-STANDARDMÕÕDUD (token-tase, fail-closed → jäta puutumata) ───────────
// Standard foto-print tollides. addMetric teisendaks x-grupi (nt "4x6\"" → "10,2 x 15,2 cm") — EI soovi.
// Mask → placeholder (DIGIT-VABA, et localize/addMetric ei puutuks) → unmask lõpus (ORIGINAAL säilib täpselt).
const PHOTO_PAIRS = new Set([
  "4x6", "5x7", "6x8", "6x9", "8x10", "8x12", "8.5x11", "85x11",
  "10x12", "11x14", "12x16", "12x18", "13x18", "16x20", "16x24", "18x24", "20x24", "20x30", "24x36",
]);
const PHOTO_RE = /(\d{1,2}(?:[.,]\d)?)\s*[x×]\s*(\d{1,2}(?:[.,]\d)?)\s*(?:inches|inch|in|["″])/gi;
// "N-in-N" / "N-in-1" = MULTIFUNKTSIOONI toote-tüüp (5-in-1, 2-in-1), MITTE mõõt. addMetric teisendaks
// "5 in" → 12,7 cm (vale). Mask → placeholder → originaal säilib. Katab side-/tühik-variandid.
const INN_RE = /\b\d{1,3}\s*-?\s*in\s*-?\s*\d{1,3}\b/gi;
// placeholder: Private-Use algus + [a-j]-kodeeritud indeks + lõpp. Ei sisalda numbreid ega punkte.
const PH_A = "", PH_Z = "";
const encIdx = (i) => String(i).replace(/\d/g, (d) => "abcdefghij"[+d]);
function maskProtected(text) {
  const masks = [];
  let out = String(text).replace(PHOTO_RE, (full, a, b) => {
    const key = `${a.replace(",", ".")}x${b.replace(",", ".")}`.toLowerCase();
    const keyNoDot = key.replace(".", "");
    if (!PHOTO_PAIRS.has(key) && !PHOTO_PAIRS.has(keyNoDot)) return full; // pole standard-fotomõõt → luba teisendus
    const ph = `${PH_A}${encIdx(masks.length)}${PH_Z}`;
    masks.push(full);
    return ph;
  });
  // N-in-N toote-tüüp (peale foto — eraldi muster, ei kattu x-mõõduga)
  out = out.replace(INN_RE, (full) => {
    const ph = `${PH_A}${encIdx(masks.length)}${PH_Z}`;
    masks.push(full);
    return ph;
  });
  return { out, masks };
}
function unmask(text, masks) {
  let out = String(text);
  for (let i = 0; i < masks.length; i++) {
    const ph = `${PH_A}${encIdx(i)}${PH_Z}`;
    out = out.split(ph).join(masks[i]);
  }
  return out;
}

// ─────────────────────────── INVERTEERITU PÖÖRE: "imp (meetr)" → "meetr (imp)" ───────────────────────────
// addMetric JÄTAB need muutmata (meetriline on juba sulus). PUHAS ümberjärjestus — EI arvuta uut numbrit
// (mõlemad väärtused olid juba allikas). Hilisem metricOffenders valideerib tagasiarvutusega.
const _IMP_U = `inches|inch|feet|foot|ft|in|lbs|lb|pounds|pound|gallons|gallon|gal|["″]|°\\s?F`;
const _MET_U = `mm|cm²|cm³|cm|m²|m³|m|kg|g|mL|ml|L|°C`;
const _GRP = `\\d+(?:[.,]\\d+)?(?:\\s*[x×]\\s*\\d+(?:[.,]\\d+)?)*`;
// Imperiaal-JADA inverteeritud mõõdu puhul (meetriline sulg katab KÕIKI imperiaal-numbreid). Kaks kuju:
//   (A) ühik IGAL numbril:    `8" x 8"`, `2"x72"`, `22 in`  → _IMP_TOK (×-kordus)
//   (B) JAGATUD lõpp-ühik:    `18 x 25"`, `18 x 34 ft`      → _GRP + üks lõpp-ühik
// (A) PEAB olema enne (B)-d, muidu _GRP haaraks `8` ja jätaks `x 8"` ripakile.
const _IMP_TOK = `\\d+(?:[.,]\\d+)?\\s*(?:${_IMP_U})`;
const _IMP_SEQ = `(?:${_IMP_TOK}(?:\\s*[x×]\\s*${_IMP_TOK})+|${_GRP}\\s*(?:${_IMP_U}))`;
const FLIP_RE = new RegExp(
  `(?<![\\w"”″.,])(${_IMP_SEQ})\\s*\\(\\s*(${_GRP})\\s*(${_MET_U})\\s*\\)`,
  "gi",
);
const _numCount = (s) => (String(s).match(/\d[\d.,]*/g) || []).length;
export function flipInverted(text) {
  return String(text).replace(FLIP_RE, (full, impSeq, metNum, metUnit) => {
    // FAIL-CLOSED: pööra AINULT kui meetrilisel ja imperiaalil on SAMA arv numbreid.
    // Ebavõrdne (nt allikas "10x7 ft (3080x1850x1970 mm)" = 2 vs 3) = allika-ebakõla → ÄRA pööra,
    // jäta inverteerituks (meetriline on juba olemas, loetav) — ei kinnita moondunud ümberjärjestust.
    if (_numCount(impSeq) !== _numCount(metNum)) return full;
    // Imperiaal-jada jääb VERBATIM (sama arv+ühik+paigutus), ainult järjekord pöördub: meetriline ette.
    return `${metNum} ${metUnit} (${impSeq.trim()})`;
  });
}

// ─────────────────────────── ET-LOKALISEERIMINE (koma-kümnend + token-korrastus) ───────────────────────────
// addMetric annab punkt-kümnendi ("2.44 m", "64.8 cm (25.5\")"); ET-lokaal + olemasolevad spetsid = KOMA.
// Koma ainult DIGIT.DIGIT (kümnend) — mudeli-numbrid ilma kümnendita ei muutu. Placeholderid digit-vabad → ohutud.
// Token: "8FT"/"18IN" → "8 ft"/"18 in" (väiketäht + tühik). "2 IN 1" (turundus) EI puudutata (lookahead \d).
const UNIT_FIX = /(\d)\s*(FT|FEET|FOOT|INCHES|INCH|IN|LBS|LB|POUNDS|POUND|GALLONS|GALLON|GAL)\b(?![-\s]?\d)/gi;
// Imperiaal-VAHEMIK: kaks arvu sidekriipsuga, kus mõõt-grupp kannab imperiaal-ühikut (vahetult VÕI "x N" järel).
const RANGE_IMP = /\d[\d.,]*\s*[-–]\s*\d[\d.,]*(?:\s*[x×]\s*\d[\d.,]*)*\s*(?:["″]|\b(?:in|inch|inches|ft|feet|foot|lbs?|pounds?|gal|gallons?)\b)/i;
export function localizeEt(text) {
  let out = String(text);
  // kümnend-punkt → koma AINULT väljaspool sulgu. Imperiaal on sulus (meetriline (imperiaal)) ja
  // peab jääma ALLIKA-kujule (nt "(2.5\")" MITTE "(2,5\")") — see on verbatim allika-viide, mille
  // srcConflictGate/metricOffenders tagasi arvutab. Ainult meetriline EES saab ET-koma.
  let depth = 0, res = "";
  for (let i = 0; i < out.length; i++) {
    const c = out[i];
    if (c === "(") depth++;
    else if (c === ")") depth = Math.max(0, depth - 1);
    if (c === "." && depth === 0 && /\d/.test(out[i - 1] || "") && /\d/.test(out[i + 1] || "")) { res += ","; continue; }
    res += c;
  }
  out = res;
  out = out.replace(UNIT_FIX, (m, n, u) => `${n} ${u.toLowerCase()}`); // 8FT → 8 ft
  return out;
}

// ─────────────────────────── TÄIS-TRANSFORM ühe välja kohta ───────────────────────────
/**
 * transformField(text, {source, isException}) → { out, changed, skip, reason, offenders }
 *   source = allikas-korpus (specid .d + orig title_et/desc_et) srcConflictGate jaoks.
 *   isException = kui toode on juba erand-tasandil märgitud → skip ilma teisenduseta.
 */
export function transformField(text, { source = "", isException = null } = {}) {
  const orig = String(text ?? "");
  if (!orig.trim()) return { out: orig, changed: false, skip: false, reason: "tühi", offenders: [] };
  if (isException) return { out: orig, changed: false, skip: true, reason: `erand:${isException}`, offenders: [] };

  // FAIL-CLOSED: imperiaal-VAHEMIK (nt "72-82 x 2 in", "2-6 ft", "96\"x97-103\"") → addMetric laiendaks
  // vahemiku valeks x-mõõtmeks (183 x 208 cm = justkui 2 mõõdet). Jäta väli puutumata + logi.
  if (RANGE_IMP.test(orig)) return { out: orig, changed: false, skip: true, reason: "vahemik", offenders: ["imperiaal-vahemik (semantika)"] };

  // FAIL-CLOSED: jala-prim "10'" (ÜKSIK feet-sümbol) — addMetric EI tunne '-i → osaline teisendus
  // (ebaühtlane mõõt-string, nt "10' x 83,8 cm"). Mitmetähenduslik (jalg/minut/apostroof) → jäta puutumata.
  // NB: KAKS apostroofi "16''" = TOLLI-märk (mitte jalg) → EI skipi siin; addMetric jätab no-op'iks (ohutu).
  if (/\d\s*(?:'(?!')|′)/.test(orig)) return { out: orig, changed: false, skip: true, reason: "jala-prim", offenders: ["jala-prim ' (teisendamata ühik)"] };

  // FAIL-CLOSED: per-aja/rate-ühik ("50 ft/min", "2\"/min", "lb/ft") — addMetric lisab sulu imperiaal-ühiku
  // JÄREL ja lõikab "/min" sulust välja ("15,2 m (50 ft)/min" ⟵ vigane; peaks "15,2 m/min (50 ft/min)").
  // Rate-ühikud harvad + riskantsed auto-teisendada → jäta väli puutumata + logi. (imp-ühik + "/" + täht)
  if (/(?:["″]|\b(?:ft|feet|foot|in|inch|inches|lbs?|pounds?|gal|gallons?))\s*\/\s*[a-z]/i.test(orig)) {
    return { out: orig, changed: false, skip: true, reason: "rate-ühik", offenders: ["per-aja/rate-ühik (imp/X — mangel)"] };
  }

  const { out: masked, masks } = maskProtected(orig);
  // Tühik-tuhandeeraldaja ("15 000 lbs") → addMetric loeks "000 lbs" eraldi (0 kg). Normaliseeri "15000".
  const normed = masked.replace(/\b\d{1,3}(?:\s\d{3})+\b/g, (m) => m.replace(/\s/g, ""));
  const conv = flipInverted(addMetric(normed, new Set())); // addMetric + inverteeritu-pööre
  // SKOOP-VÄRAV: lokaliseeri AINULT kui tegelik imperiaal-teisendus/pööre toimus.
  // Muidu pelk-meetriline väli (nt "30.5 cm", imperiaali POLE) muutuks ainult koma pärast —
  // see on GO-skoobist (imperiaal→meetriline) VÄLJAS. Dot→koma mass-fix = eraldi otsus.
  if (conv === normed) return { out: orig, changed: false, skip: false, reason: "no-op", offenders: [] };

  let t = localizeEt(conv);         // koma-kümnend + token-korrastus (kogu väljal → järjepidevus)
  t = unmask(t, masks);             // foto-mõõdud tagasi (ORIGINAAL täpselt)

  if (t === orig) return { out: orig, changed: false, skip: false, reason: "no-op", offenders: [] };

  // ── FAIL-CLOSED väravad lõppväljundil ──
  const clean = { title_en_clean: t, description_en_clean: "" };
  const off = [
    ...metricOffenders(t),                                   // tagasiarvutus + kordus/topelt-sulg
    ...srcConflictGate(clean, source).offenders,             // arvutatud meetriline vs allika-spets
  ];
  if (off.length) return { out: orig, changed: false, skip: true, reason: "värav", offenders: off.slice(0, 6) };

  return { out: t, changed: true, skip: false, reason: "ok", offenders: [] };
}

// ─────────────────────────── SPETSID: AINULT kus meetriline PUUDUB ───────────────────────────
// specs = { key: { d: "<kuva-str>", v: <arv> } | <str> }. Tarmo #4: puutu AINULT entry'd, mille .d-s on
// imperiaal AGA MITTE meetrilist (= imperiaal-ainult). Enamik specse on juba "meetriline (imperiaal)" → SKIP.
const _HAS_METRIC = new RegExp(`\\d[\\d.,]*\\s*(?:${_MET_U})\\b`, "i");
const _HAS_IMPERIAL = new RegExp(`\\d[\\d.,]*\\s*(?:${_IMP_U})`, "i");
export function transformSpecs(specs, { source = "", isException = null } = {}) {
  if (!specs || typeof specs !== "object" || Array.isArray(specs)) return { specs, changed: false, touched: [], skipped: [] };
  const out = Array.isArray(specs) ? [...specs] : { ...specs };
  const touched = [], skipped = [];
  let changed = false;
  for (const [k, v] of Object.entries(specs)) {
    const d = (v && typeof v === "object") ? v.d : v;
    if (typeof d !== "string" || !d) continue;
    if (!_HAS_IMPERIAL.test(d)) continue;                    // pole imperiaali → jäta
    if (_HAS_METRIC.test(d)) continue;                       // meetriline JUBA olemas → Tarmo #4 SKIP
    const r = transformField(d, { source, isException });
    if (r.skip) { skipped.push({ key: k, reason: r.reason, offenders: r.offenders }); continue; }
    if (!r.changed) continue;
    if (v && typeof v === "object") out[k] = { ...v, d: r.out }; // .v (arv) säilib
    else out[k] = r.out;
    touched.push({ key: k, before: d, after: r.out });
    changed = true;
  }
  return { specs: out, changed, touched, skipped };
}

// ─────────────────────────── allikas-korpus (ET): specid .d + orig tekstid ───────────────────────────
export function etSource({ title_et = "", description_et = "", specs = null } = {}) {
  const parts = [title_et, description_et];
  if (specs && typeof specs === "object") {
    for (const v of Object.values(specs)) {
      if (v == null) continue;
      if (typeof v === "object") { if (v.d) parts.push(String(v.d)); }
      else parts.push(String(v));
    }
  }
  return parts.filter(Boolean).join("  ·  ");
}

// ─────────────────────────── ENESETEST (node scripts/lib/metric-et.mjs --selftest) ───────────────────────────
if (process.argv[1] && process.argv[1].endsWith("metric-et.mjs") && process.argv.includes("--selftest")) {
  const T = [
    // [sisend, oodatav väljund-FRAGMENT (sisaldub), pööre?]
    ["Spandeksist laudlinad 8FT ristkülikulauale", "2,44 m (8 ft)"],
    ["Survepesu pindapuhastaja 18\" 4000 PSI", "45,7 cm (18\")"],
    ["Puitküttega õuepizzaahi 12\", kuni 500°C", "30,5 cm (12\")"],
    ["Raske koormusega sahtliliugurid 22\", 226,8 kg", "55,9 cm (22\")"],
    ["Mini metallitreipink 7x14\" 550W", "17,8 x 35,6 cm (7x14\")"],
    ["Labori tõstuklaud 8\" x 8\", alumiinium", "20,3 x 20,3 cm (8\" x 8\")"],
    ["Külmlamineerimismasin, fooliumi laius 25.5\"", "64,8 cm (25.5\")"], // imperiaal sulus = allika-kuju (punkt)
    ["Terasest riiulikandurid 8x9x2.5\"", "(8x9x2.5\")"],                 // koma AINULT meetrilisel, imp punktiga
    ["Lamamiskäru, kandevõime 100 lbs", "45,4 kg (100 lbs)"],
    ["Haakekonksud 6 tk, kandevõime 15 000 lbs", "6803,9 kg (15000 lbs)"], // tühik-tuhat
    ["Paberigiljotiin 12\" (30 cm)", "30 cm (12\")"],   // inverteeritu PÖÖRE
    ["Labori tõstuklaud 8\" x 8\" (20,3 x 20,3 cm), alumiinium", "20,3 x 20,3 cm (8\" x 8\")"], // inverteeritud mõõt-PAAR (ühik igal)
    ["5-in-1 termopress 15\"x12\" digitaalne", "38,1 x 30,5 cm (15\"x12\")"], // N-in-1 EI teisendu (mask), dim küll
    ["kuivatusala 18 x 25\" (470 x 635 mm)", "470 x 635 mm (18 x 25\")"],   // inverteeritud, JAGATUD lõpp-ühik "
    ["mõõtudega 18 x 34 ft (5,49 x 10,36 m)", "5,49 x 10,36 m (18 x 34 ft)"], // inverteeritud, JAGATUD lõpp-ühik ft
  ];
  let pass = 0;
  for (const [inp, frag] of T) {
    const r = transformField(inp, { source: inp });
    const ok = r.out.includes(frag);
    console.log(`${ok ? "✅" : "❌"} "${inp.slice(0, 48)}"\n    → "${r.out}" ${r.skip ? `[SKIP ${r.reason}: ${r.offenders[0] || ""}]` : ""}${ok ? "" : `\n    OOTASIN fragmenti: "${frag}"`}`);
    if (ok) pass++;
  }
  // erand-näited (peavad SKIP'ima)
  const EXC = [
    { title_et: "Projektoriekraan 60\" 152 cm", cats: ["Telerid"] },
    { title_et: "Teemantpuurkroon 5/8\"-11 keermega", cats: ["Tööriistad"] },
    { title_et: "Velotrenažöör 26\"-28\" rattad", cats: ["Sport"] },
    { title_et: "Fotoprinter 4x6\" ja 5x7\" paberile", cats: ["Printerid"] },
  ];
  // VAHEMIK + allika-ebakõla (peavad SKIP'ima / MITTE pöörama)
  const EDGE = [
    ["Lintlihvija 72-82 x 2 in lindid", "skip", "vahemik"],                 // imperiaal-vahemik → skip
    ["Võrkaia värav 32 x 46 in, sobib 2-6 ft x 4 ft avadele", "skip", "vahemik"],
    ["Bimini-katus 96\"x97-103\"", "skip", "vahemik"],
    ["Golfi harjutusvõrk 10x7ft (3080x1850x1970 mm)", "noflip", "3080x1850x1970 mm (10x7 ft)"], // ei pööra (2≠3)
    ["Täispuhutav SUP-laud 10' x 33\" x 6\"", "skip", "jala-prim"],       // jala-prim ' → fail-closed skip
    ["Traadikoorija kiirus 50 ft/min mootoriga", "skip", "rate-ühik"],    // per-aja rate → fail-closed skip
  ];
  console.log("\n── VAHEMIK + EBAKÕLA (fail-closed) ──");
  for (const [inp, mode, expect] of EDGE) {
    const r = transformField(inp, { source: inp });
    let ok;
    if (mode === "skip") ok = r.skip && r.reason === expect;
    else ok = !r.out.includes("3080x1850x1970 mm (10x7"); // EI tohi pöörata (jääb inverteerituks VÕI muutmata)
    console.log(`${ok ? "✅" : "❌"} "${inp.slice(0, 48)}" → ${r.skip ? `SKIP(${r.reason})` : `"${r.out}"`}`);
    if (ok) pass++;
  }

  console.log("\n── ERANDID (peavad jääma MUUTMATA / skip) ──");
  for (const p of EXC) {
    const ex = excProduct(p);
    const r = transformField(p.title_et, { source: etSource(p), isException: ex });
    const unchanged = !r.changed;
    console.log(`${unchanged ? "✅" : "❌"} "${p.title_et}" → ${r.skip ? `SKIP (${r.reason})` : (r.changed ? `MUUDETUD: "${r.out}"` : "muutmata")}`);
    if (unchanged) pass++;
  }
  const TOTAL = T.length + EDGE.length + EXC.length;
  console.log(`\n${pass}/${TOTAL} testi OK`);
  process.exit(pass === TOTAL ? 0 : 1);
}
