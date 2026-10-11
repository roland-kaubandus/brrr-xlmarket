#!/usr/bin/env node
/**
 * test-glossary-gates.mjs — glossary-väravate ühiktestid (PUHTAD, ilma API/DB-ta).
 * Katab Tarmo 2026-10-11 kolm uut väravat: ERIALATERMIN · ALGVORM · MÕJURAADIUS + runAllGates jrk.
 * Käivita: node scripts/test-glossary-gates.mjs
 */
import {
  specialistGate, fragmentGate, baseFormGate, impactRadiusGate, runAllGates, COMMON_VOCAB,
} from "./lib/glossary-gates.mjs";
import { classifyTermVoted } from "./lib/glossary-term-chain.mjs";

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; } else { fail++; console.error(`  ❌ ${m}`); } };
const sec = (s) => console.log(`\n— ${s} —`);

// ——— ERIALATERMIN ———
sec("specialistGate (erialatermin)");
ok(specialistGate({ en: "door" }).pass === false, "door (üldsõnavara) → fail");
ok(specialistGate({ en: "table" }).pass === false, "table (üldsõnavara) → fail");
ok(specialistGate({ en: "plastic" }).pass === false, "plastic → fail");
ok(specialistGate({ en: "aluminum" }).pass === false, "aluminum → fail");
ok(specialistGate({ en: "inches" }).pass === false, "inches → fail");
ok(specialistGate({ en: "door" }).defer === true, "üldsõnavara → defer (mitte skip)");
ok(specialistGate({ en: "steel cable" }).pass === true, "steel cable (liitfraas) → läbib COMMON_VOCAB (LLM otsustab)");
ok(specialistGate({ en: "pallet jack", isSpecialist: true, isAmbiguous: false }).pass === true, "pallet jack erialatermin → pass");
ok(specialistGate({ en: "torque wrench", isSpecialist: true }).pass === true, "torque wrench → pass");
ok(specialistGate({ en: "spring", isAmbiguous: true }).pass === false, "spring mitmetähenduslik → fail");
ok(specialistGate({ en: "widget", isSpecialist: false }).pass === false, "LLM specialist=false → fail");
ok(specialistGate({ en: "ratchet strap" }).pass === true, "tundmatu liitfraas (verdikt puudub) → EI blokeeri üksi");

// ——— FRAGMENT (Tarmo 2026-10-11 p1) ———
sec("fragmentGate (üksiksõna ⊂ mitmesõnaline)");
const phrases = ["heavy duty", "load capacity", "net weight", "angle grinder", "pallet jack"];
ok(fragmentGate({ en: "duty" }, { phraseEns: phrases }).pass === false, "duty ⊂ 'heavy duty' → fail");
ok(fragmentGate({ en: "duty" }, { phraseEns: phrases }).defer === true, "fragment → defer (mitte skip)");
ok(fragmentGate({ en: "duty" }, { phraseEns: phrases }).parent === "heavy duty", "parent = 'heavy duty'");
ok(fragmentGate({ en: "load" }, { phraseEns: phrases }).pass === false, "load ⊂ 'load capacity' → fail");
ok(fragmentGate({ en: "weight" }, { phraseEns: phrases }).pass === false, "weight ⊂ 'net weight' → fail");
ok(fragmentGate({ en: "heavy duty" }, { phraseEns: phrases }).pass === true, "mitmesõnaline 'heavy duty' ise → pass (pole fragment)");
ok(fragmentGate({ en: "grinder" }, { phraseEns: phrases }).pass === false, "grinder ⊂ 'angle grinder' → fail");
ok(fragmentGate({ en: "torque" }, { phraseEns: phrases }).pass === true, "torque (ei esine üheski fraasis) → pass");
ok(fragmentGate({ en: "duty" }, { phraseEns: [] }).pass === true, "fraase pole → fragment ei blokeeri");
ok(fragmentGate({ en: "capacity" }, { phraseEns: ["capacity"] }).pass === true, "sama sõna (mitte mitmesõnaline vanem) → pass");
ok(fragmentGate({ en: "part" }, { phraseEns: ["spare parts"] }).pass === true, "osaline-substring 'part'⊄'parts' TÄISSÕNANA → pass (parts ≠ part)");
// Tarmo p1-PARANDUS (üleblokeerimine): vanem peab olema LUKUSTATUD — kukkunud kandidaat EI blokeeri
ok(fragmentGate({ en: "steel" }, { phraseEns: ["heavy duty"] }).pass === true, "steel EI blokeeru kui 'stainless steel' POLE lukustatud-vanemate seas (ei üleblokeeri erialaterminit)");
ok(fragmentGate({ en: "voltage" }, { phraseEns: ["load capacity", "net weight"] }).pass === true, "voltage läbib kui ükski lukustatud vanem seda ei sisalda");

// ——— SPECIALIST-KOHTUNIK 3× HÄÄLETUS (Tarmo 2026-10-11 p2, mock-call) ———
sec("classifyTermVoted (3× hääletus, mock)");
const mk = (seq) => { let i = 0; return async () => seq[i++ % seq.length]; };
let v = await classifyTermVoted(mk([{ specialist: true, ambiguous: false }]), { en: "pallet jack" }, { rounds: 3 });
ok(v.specialist === true && v.votes.sT === 3, "ühehäälne specialist=true 3× → specialist=true");
ok(v.stable === true, "ühehäälne → stable");
v = await classifyTermVoted(mk([{ specialist: true, ambiguous: false }, { specialist: false, ambiguous: false }, { specialist: true, ambiguous: false }]), { en: "net weight" }, { rounds: 3 });
ok(v.specialist === false, "net weight kõigub (2T/1F) → specialist=false (pole ühehäälne → DEFER)");
ok(v.stable === false, "kõikuv → stable=false");
v = await classifyTermVoted(mk([{ specialist: true, ambiguous: false }, { specialist: true, ambiguous: true }, { specialist: true, ambiguous: false }]), { en: "load" }, { rounds: 3 });
ok(v.ambiguous === true, "load: üks ring ambiguous → ambiguous=true (restriktiivne, DEFER)");
v = await classifyTermVoted(async () => null, { en: "x" }, { rounds: 3 });
ok(v.specialist === false && v.votes.answered === 0, "kõik ringid vaikisid → specialist=false (konservatiivne)");

// ——— ALGVORM ———
sec("baseFormGate (algvorm + käänded)");
let r = baseFormGate({ en: "inches", et: "tolli", enBase: "inch", etBase: "toll" });
ok(r.canonicalEn === "inch" && r.canonicalEt === "toll", "inches/tolli → algvorm inch/toll");
ok(r.aliases.includes("inches"), "originaal 'inches' lisatud aliasesse");
ok(r.aliases.includes("inchs") || r.aliases.includes("inches"), "mitmuse-vorm aliasesse");
r = baseFormGate({ en: "wheel", et: "ratas", enBase: "wheel", etBase: "ratas" });
ok(r.canonicalEn === "wheel" && r.aliases.includes("wheels"), "wheel → mitmus 'wheels' aliasesse");
r = baseFormGate({ en: "box", et: "kast", enBase: "box", etBase: "kast" });
ok(r.aliases.includes("boxes"), "box → 'boxes' (-es reegel)");
r = baseFormGate({ en: "battery", et: "aku", enBase: "battery", etBase: "aku" });
ok(r.aliases.includes("batteries"), "battery → 'batteries' (y→ies)");
r = baseFormGate({ en: "pallet jack", et: "kaubaalus-tõstuk", enBase: "pallet jack", etBase: "kaubaalus-tõstuk" });
ok(r.aliases.length === 0, "liitfraas → mitmuse-aliast ei lisata");
ok(baseFormGate({ en: "x", et: "", enBase: "x", etBase: "" }).pass === false, "tühi ET algvorm → fail");

// ——— MÕJURAADIUS ———
sec("impactRadiusGate (suhteline lävi)");
const texts = ["steel frame cart", "pallet jack hydraulic", "garden hose reel", "steel wire rope", "wood table top"];
r = impactRadiusGate({ en: "steel" }, { sampleEnTexts: texts, corpusSize: 1000, threshold: 0.20 });
ok(r.pass === false && r.signal === true, "steel 2/5=40% > 20% → fail+signal");
ok(r.estDocs === 400, "ekstrapolatsioon: 40% × 1000 = 400 toodet");
ok(typeof r.estCost === "number" && r.estCost > 0, "regen-kulu hinnang antud");
r = impactRadiusGate({ en: "pallet jack" }, { sampleEnTexts: texts, corpusSize: 1000, threshold: 0.20 });
ok(r.pass === true, "pallet jack 1/5=20% ≤ 20% → pass");
ok(impactRadiusGate({ en: "x" }, { sampleEnTexts: [] }).pass === true, "valim puudub → ei blokeeri");

// ——— runAllGates järjekord ———
sec("runAllGates (täisahel, õige järjekord)");
const entries = [{ en: "steel cable", et: "terastross", aliases: [], status: "locked" }];
// esinduslik valim: "pallet jack"/"jack" esineb vähestes (< 20% lävi), et mõjuraadius ei blokeeriks erialaterminit
const sample = ["pallet jack 5 ton", "garden hose reel", "wood table top", "kitchen mixer steel",
  "cordless drill set", "led work light", "office chair wheels", "hydraulic jack 3 ton",
  "paint roller kit", "safety gloves pair"];
// üldsõnavara peatub ERIALATERMIN-väraval (enne proposet pole siin, aga runAllGates re-check)
r = runAllGates({ en: "door", et: "uks", cluster: "tehniline", freq: 3, isSpecialist: true }, { entries, sampleEnTexts: sample });
ok(r.allPass === false && r.blocking[0].startsWith("ERIALATERMIN"), "door peatub ERIALATERMIN-väraval");
ok(r.defer === true, "üldsõnavara → defer-lipp");
// FRAGMENT peatab üksiksõna, mis on tükk mitmesõnalisest kandidaadist (duty ⊂ heavy duty)
r = runAllGates({ en: "duty", et: "vastupidavus", cluster: "tehniline", freq: 3, isSpecialist: true, isAmbiguous: false, enBase: "duty", etBase: "vastupidavus" }, { entries, sampleEnTexts: sample, phraseEns: ["heavy duty", "duty"] });
ok(r.allPass === false && r.blocking[0].startsWith("FRAGMENT") && r.defer === true, "duty peatub FRAGMENT-väraval (⊂ heavy duty) → defer");
// päris erialatermin läbib kõik
r = runAllGates({ en: "pallet jack", et: "kaubaalus-tõstuk", cluster: "tööriistad", freq: 2, isSpecialist: true, isAmbiguous: false, enBase: "pallet jack", etBase: "kaubaalus-tõstuk" }, { entries, sampleEnTexts: sample });
ok(r.allPass === true && r.status === "locked", "pallet jack läbib kõik väravad → locked");
ok(r.canonicalEt === "kaubaalus-tõstuk", "canonicalEt tagastatud");
// algvorm normaliseeritakse enne kehtivust/mõjuraadiust
r = runAllGates({ en: "jacks", et: "tõstukid", cluster: "tööriistad", freq: 2, isSpecialist: true, enBase: "jack", etBase: "tõstuk" }, { entries, sampleEnTexts: sample });
ok(r.allPass === true && r.canonicalEn === "jack" && r.canonicalEt === "tõstuk", "algvorm normaliseeritud ahelas");
// mõjuraadius blokeerib laia termini
const wide = runAllGates({ en: "steel", et: "teras", cluster: "materjalid", freq: 5, isSpecialist: true, enBase: "steel", etBase: "teras" }, { entries, sampleEnTexts: ["steel a", "steel b", "wood c"] });
ok(wide.allPass === false, "lai termin (steel, mõjuraadius) peatub");

console.log(`\n${fail === 0 ? "🟢" : "🔴"} kokku: ${pass} läbis, ${fail} kukkus`);
process.exit(fail === 0 ? 0 : 1);
