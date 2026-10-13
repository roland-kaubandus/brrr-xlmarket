#!/usr/bin/env node
/**
 * en-name.mjs — EN kategooria-nime transform SSoT (HARD RULE #5: üks moodul, mitu kutsujat).
 *
 * Kasutab: (a) en-pack-backfill.mjs (kogu korpus, Batch API) JA (b) classify-etapp2-create
 * hook (uue L3 sünnil). SAMA prompt + stiil + värav-otsus mõlemas → backfill ja hook ei lahkne.
 *
 * AHEL: Sonnet + Opus tõlgivad ET→EN (konsensus); lahku → Fable viigimurdja; siis EN-nimevärav
 * (Fable: täpsus + loomulikkus + termin-ees); lõpuks DETERMINISTLIK STIIL-NORM.
 *
 * 🎨 ÜHTNE STIIL (Tarmo tingimus 1, 2026-10-13 — "lisa nimeväravasse, mitte käsitsi"):
 *   • Title Case (väikesõnad a/an/the/and/of/… keskel väiketähega; akronüümid+numbrid säilivad)
 *   • "and" konjunktsioon → "&" JÄRJEKINDLALT (üks reegel kogu kataloogile)
 *   • glossary EN-terminid: kanooniline inglise termin hint'ina (sama termin kõigis kategooriates)
 * Stiil on DETERMINISTLIK (styleNormalize) → rakendub ALATI, sõltumata mudelist (mitte käsitsi).
 *
 * Moodul = puhas transform-loogika (promptid + parse + reconcile + stiil + finalize). Orkestratsioon
 * (batch vs inline) elab kutsujas. Kutsujad annavad mudeli-väljundi (raw tekst) → moodul parse'b.
 */
import { loadGlossary } from "./content-gen.mjs";

// ---- STIIL: Title Case ----
// Väikesõnad jäävad keskel väiketähega; esimene+viimane alati suur. Akronüümid (LED/USB/RC/HVAC)
// ja numbriga tokenid (4K/12V) säilivad muutmata.
const SMALL = new Set(["a", "an", "the", "and", "or", "nor", "but", "for", "of", "to", "in", "on", "at", "by", "with", "vs", "via", "per", "from", "&"]);
export function titleCaseEn(s) {
  const words = (s || "").trim().split(/\s+/).filter(Boolean);
  return words.map((w, i) => {
    if (/\d/.test(w)) return w;                                   // 4K, 12V, 24V/48V — säilita
    if (w.length <= 4 && w === w.toUpperCase() && /^[A-Z]/.test(w)) return w; // LED, USB, RC, HVAC
    const lw = w.toLowerCase();
    if (i !== 0 && i !== words.length - 1 && SMALL.has(lw)) return lw;
    return w.split("-").map(p => (p ? p[0].toUpperCase() + p.slice(1) : p)).join("-"); // All-Terrain
  }).join(" ");
}

/** styleNormalize — DETERMINISTLIK ühtne stiil (kõigi EN-nimede peal, alati). */
export function styleNormalize(name) {
  let s = (name || "").replace(/\s+/g, " ").trim();
  s = s.replace(/\s+and\s+/gi, " & ");  // "and" → "&" järjekindlalt
  s = s.replace(/\s*&\s*/g, " & ");      // ühtlane tühik ümber &
  s = s.replace(/\s+/g, " ").trim();
  return titleCaseEn(s);
}

// ---- GLOSSARY: kanooniline EN-termin (ET-nime sees esinevatele mõistetele) ----
let _etToEn = null;
export function glossaryEtToEn(glossaryPath) {
  if (_etToEn) return _etToEn;
  const entries = loadGlossary(glossaryPath).filter(e => e.status === "locked");
  const m = new Map();
  for (const e of entries.sort((a, b) => a.freq - b.freq)) m.set(e.et.toLowerCase().trim(), e.en); // kõrge freq kirjutab üle
  _etToEn = m;
  return m;
}
/** glossaryHints — glossary ET-terminid, mis esinevad kategooria-nimes → kanooniline EN (hint). */
export function glossaryHints(nameEt, etToEn) {
  const low = (nameEt || "").toLowerCase();
  const hits = [];
  for (const [et, en] of etToEn) if (et.length >= 4 && low.includes(et)) hits.push(`«${et}» → ${en}`);
  return hits.slice(0, 6);
}

// ---- PROMPTID ----
export const TRANSLATE_SYS = `Sa oled XL e-poe (xlmarket.ee, Eesti) kataloogi-toimetaja. Tõlgid EESTI tootekategooria nime LOOMULIKUKS inglise e-poe kategooria-nimeks.
REEGLID: 1-4 sõna; e-poe sirvimistasandi ÜLDnimi (mitte toote pealkiri); loomulik inglise kaubandus-termin (MITTE sõnasõnaline masintõlge); tehniline lühend EI alusta nime (läheb sulgu taha); kasuta glossary kanoonilisi EN-termineid kui antud.
Tagasta AINULT JSON: {"name_en":"<ingliskeelne kategooria-nimi>","reason":"<1 lause>"}`;
export function translateUser(nameEt, parentEt, titles, hints = []) {
  return `EESTI KATEGOORIA: «${nameEt}»
VANEM: «${parentEt || "—"}»
NÄIDISTOOTED (ingliskeelsed pealkirjad):
${titles.slice(0, 6).map(t => `  • ${t}`).join("\n") || "  (pole)"}
${hints.length ? `GLOSSARY KANOONILISED EN-TERMINID (kasuta neid):\n${hints.map(h => `  • ${h}`).join("\n")}\n` : ""}Tõlgi kategooria-nimi loomulikuks inglise e-poe nimeks.`;
}

// EN-nimevärav (Fable) — täpsus + loomulikkus + termin-ees (+ viigimurdja kui 2 nime antud).
export const ENGATE_SYS = `Sa hindad inglise kategooria-nime Eesti e-poe kliendi jaoks. Kriteeriumid:
(1) TÄPSUS: kas EN-nimi tähistab SAMU tooteid kui eesti nimi (mitte nihe/kitsendus/laiendus)?
(2) LOOMULIKKUS: kas see on loomulik inglise e-poe kategooria-termin (mitte sõnasõnaline/kohmakas)?
(3) TERMIN EES: kas tehniline lühend/mudelkood on nime ALGUSES (halb)?
Kui antakse KAKS kandidaati, vali parem (või paku kolmas, kui mõlemad kehvad).
Tagasta AINULT JSON: {"accurate":true|false,"natural":true|false,"term_at_start":true|false,"chosen":"<parim EN-nimi>","reason":"<1 lause>"}`;
export function engateUser(nameEt, candidates, titles, hints = []) {
  const cand = Array.isArray(candidates) ? candidates : [candidates];
  return `EESTI NIMI: «${nameEt}»
${cand.length > 1 ? "KANDIDAADID" : "PAKUTUD INGLISE NIMI"}: ${cand.map(c => `«${c}»`).join(" VÕI ")}
TEGELIKUD TOOTED:
${titles.slice(0, 6).map(t => `  • ${t}`).join("\n") || "  (pole)"}
${hints.length ? `GLOSSARY KANOONILISED EN-TERMINID:\n${hints.map(h => `  • ${h}`).join("\n")}\n` : ""}Hinda: täpne? loomulik? termin ees? ${cand.length > 1 ? "Vali parim (chosen)." : "chosen = parandatud nimi kui vaja, muidu seesama."}`;
}

// ---- PARSE + RECONCILE + FINALIZE ----
const normCmp = s => styleNormalize(s).toLowerCase();

/** parseNameJson — robustne JSON-ekstraktsioon mudeli raw-tekstist (viskab kui puudub). */
export function parseNameJson(raw) {
  const t = (raw || "").replace(/```(?:json)?/gi, "").trim();
  const m = t.match(/\{[\s\S]*\}/);
  if (!m) throw new Error(`JSON puudub: ${t.slice(0, 120)}`);
  return JSON.parse(m[0]);
}

/** reconcile — kaks tõlget → kas konsensus (stiil-normaliseeritult)? tagastab valitud (styled). */
export function reconcile(sonnetName, opusName) {
  const agree = normCmp(sonnetName) === normCmp(opusName);
  return { agree, chosen: styleNormalize(sonnetName) }; // konsensus → kumbki; lahku → kutsuja läheb viigimurdjasse
}

/**
 * finalizeFromGate — värava JSON + fallback-nimi → lõplik EN-nimi (stiil-normaliseeritud).
 * Värav kukub (accurate=false VÕI natural=false VÕI term_at_start=true) → kasuta gate.chosen'it.
 */
export function finalizeFromGate(gate, fallbackName) {
  const pass = gate && gate.accurate !== false && gate.natural !== false && gate.term_at_start !== true;
  const name = (gate && gate.chosen) || fallbackName;
  return { pass, name: styleNormalize(name), gate };
}
