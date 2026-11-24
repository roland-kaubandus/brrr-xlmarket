#!/usr/bin/env node
/**
 * metric-et-audit.mjs — Opus-audit imperiaal→meetriline ET-transformile (read-only).
 *
 * Tarmo GO 2026-11-24 samm: dry → **Opus-audit 20 (eesti keel, numbrid vs allikas)** → 0 fail / 0 vale number → kirjuta.
 *
 * Loeb dry-emit JSON-i (metric-et-dry.mjs väljund), valib DETERMINISTLIKULT 20 mitmekesist
 * muudetud kirjet (tavalised + pöörded + mõõt-paarid + lb/ft/gal/°F + specid), saadab Opus-4.8-le
 * ja laseb KONTROLLIDA: (1) kas eesti keel on korrektne/loomulik; (2) kas IGA lisatud meetriline arv
 * vastab allikas olevale imperiaalile (õige teisendus) ja imperiaal-token on allikast säilinud.
 * Fail-closed agregaat: kui >0 keele-viga VÕI >0 vale number → VÄRAV KINNI (exit 1), EI tohi kirjutada.
 *
 * KASUTUS (ainult heakskiidetud võtme-wrapperiga):
 *   bash scripts/with-llm-env.sh node scripts/metric-et-audit.mjs --in <emit.json> --out <report.json> [--n 20]
 *
 * EI kirjuta DB-sse. EI prindi võtit. Ainult LLM-päring + raport-JSON + konsool-kokkuvõte.
 */
import fs from "node:fs";
import { callMessages } from "./lib/llm-client.mjs";

const MODEL = "claude-opus-4-8";
const KEY = process.env.ANTHROPIC_API_KEY;
if (!KEY) { console.error("🔴 ANTHROPIC_API_KEY puudub (käivita with-llm-env.sh kaudu)."); process.exit(2); }

function arg(name, def = null) {
  const i = process.argv.indexOf(name);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : def;
}
const IN = arg("--in");
const OUT = arg("--out");
const N = parseInt(arg("--n", "20"), 10);
const OFFSET = parseInt(arg("--offset", "0"), 10);
if (!IN || !OUT) { console.error("Kasutus: --in <emit.json> --out <report.json> [--n 20]"); process.exit(2); }

const emit = JSON.parse(fs.readFileSync(IN, "utf8"));
const recs = emit.records || [];
if (!recs.length) { console.error("🔴 emit-JSON-is pole muudetud kirjeid."); process.exit(2); }

// ─────────── DETERMINISTLIK valim: bucketda mustri järgi, võta ümber-ringi ───────────
const has = (s, re) => re.test(String(s || ""));
const txtOf = (r) => `${r.title_after || ""}  ${r.desc_after || ""}`;
const buckets = {
  flip:  recs.filter((r) => has(txtOf(r), /\d\s*(?:cm|mm|m|kg|g|L)\b[^()]*\(\s*\d[^)]*["″in]/)), // meetr (imp) — pöördejälg
  dim:   recs.filter((r) => has(txtOf(r), /\d\s*[x×]\s*\d/)),          // mõõt-paarid
  lb:    recs.filter((r) => has(txtOf(r), /\d\s*kg\s*\(\s*\d+\s*lbs?\)/i)),
  ft:    recs.filter((r) => has(txtOf(r), /\d\s*m\s*\(\s*\d[\d,]*\s*ft\)/i)),
  gal:   recs.filter((r) => has(txtOf(r), /gal/i)),
  degF:  recs.filter((r) => has(txtOf(r), /°\s?F/)),
  spec:  recs.filter((r) => (r.specs_touched || []).length),
  muu:   recs,
};
const picked = [];
const seen = new Set();
const order = ["flip", "dim", "lb", "ft", "gal", "degF", "spec", "muu"];
let idx = OFFSET; // --offset nihutab valimi sügavamale (sõltumatu teine läbijooks)
while (picked.length < Math.min(N, recs.length)) {
  let added = false;
  for (const b of order) {
    const arr = buckets[b];
    if (idx < arr.length) {
      const r = arr[idx];
      if (!seen.has(r.handle)) { seen.add(r.handle); picked.push({ ...r, _bucket: b }); added = true; }
    }
    if (picked.length >= Math.min(N, recs.length)) break;
  }
  idx++;
  if (!added && idx > recs.length) break;
}

// ─────────── Prompt (eesti keeles, range JSON-väljund) ───────────
const items = picked.map((r, i) => {
  const parts = [`#${i + 1} [${r._bucket}]`];
  parts.push(`ALLIKAS (originaal-tekst, õiged arvud): ${r.source_excerpt}`);
  if (r.title_before) parts.push(`PEALKIRI ENNE: ${r.title_before}`);
  if (r.title_after)  parts.push(`PEALKIRI PÄRAST: ${r.title_after}`);
  if (r.desc_before)  parts.push(`KIRJELDUS ENNE: ${String(r.desc_before).slice(0, 500)}`);
  if (r.desc_after)   parts.push(`KIRJELDUS PÄRAST: ${String(r.desc_after).slice(0, 500)}`);
  if ((r.specs_touched || []).length) parts.push(`SPETSID: ${r.specs_touched.map((t) => `"${t.before}"→"${t.after}"`).join(" ; ")}`);
  return parts.join("\n");
}).join("\n\n");

const prompt = `Sa oled eesti keele ja mõõtühikute audiitor. Kontrollid imperiaal→meetriline teisendust tootetekstides.

REEGLID mida kontrollid IGA kirje kohta:
1. KEEL: kas eestikeelne tekst (PÄRAST) on korrektne ja loomulik? Teisendus ei tohi olla rikkunud grammatikat ega sõnajärge.
2. ARVUD: kuva-kuju on "<meetriline> <ühik> (<imperiaal>)". Kontrolli, et:
   a) imperiaal sulgudes on ALLIKAST muutmata (sama arv, sama ühik, nt 18" → (18"), 8 ft → (8 ft));
   b) meetriline ees on imperiaali ÕIGE teisendus. Kasuta TÄPSEID tegureid (mootor kasutab täisprecisiooni):
      1"=2,54 cm (täpne); 1 ft=0,3048 m=30,48 cm (täpne); 1 lb=0,45359237 kg; 1 gal=3,785411784 L; °F→°C=(F-32)/1,8.
      Kuva on ümardatud POOLE-ÜLES näidatud täpsusele. NB: ära kasuta ümardatud tegurit (nt 0,4536) — suurtel
      väärtustel (nt 8600 lb) annab see viimasel kohal vale tulemuse; ±0,1 erinevus AINULT teguri-ümardusest EI ole viga.
   c) EI ole tekkinud ühtki uut valet arvu; olemasolevad meetrilised arvud (nt "226,8 kg") peavad jääma samaks.
3. Koma-kümnend (eesti): "2,44 m" õige, "2.44 m" vale.

Vasta AINULT JSON-massiiviga, üks objekt kirje kohta, täpselt kujul:
[{"i":1,"keel_ok":true,"arvud_ok":true,"probleem":null}, ...]
Kui keel on vigane → keel_ok:false. Kui mõni arv on vale/teisendus vale/imperiaal muutunud → arvud_ok:false. "probleem" = lühike eestikeelne selgitus VÕI null kui korras. Ära lisa midagi muud peale JSON-massiivi.

KIRJED:
${items}`;

const body = { model: MODEL, max_tokens: 6000, thinking: { type: "adaptive" }, output_config: { effort: "low" }, messages: [{ role: "user", content: prompt }] };

const { text, usage } = await callMessages({ apiKey: KEY, task: "metric-et:audit", body, ctx: "metric-et-audit" });

// ─────────── Parse + agregaat (fail-closed) ───────────
let verdicts;
try {
  const m = text.match(/\[[\s\S]*\]/);
  verdicts = JSON.parse(m ? m[0] : text);
} catch (e) {
  console.error("🔴 Opus-vastust ei saanud JSON-iks parsida — FAIL-CLOSED. Toorvastus:\n" + text.slice(0, 2000));
  fs.writeFileSync(OUT, JSON.stringify({ created: new Date().toISOString(), model: MODEL, parse_error: true, raw: text, picked }, null, 2));
  process.exit(1);
}

let langFail = 0, numFail = 0;
const problems = [];
for (const v of verdicts) {
  const rec = picked[(v.i || 0) - 1];
  if (v.keel_ok === false) { langFail++; problems.push({ i: v.i, handle: rec?.handle, tyyp: "KEEL", probleem: v.probleem }); }
  if (v.arvud_ok === false) { numFail++; problems.push({ i: v.i, handle: rec?.handle, tyyp: "ARV", probleem: v.probleem }); }
}
const pass = langFail === 0 && numFail === 0 && verdicts.length === picked.length;

const report = {
  created: new Date().toISOString(), model: MODEL, in: IN,
  valitud: picked.length, hinnatud: verdicts.length,
  keele_vigu: langFail, arvu_vigu: numFail, VÄRAV: pass ? "ROHELINE (0 fail / 0 vale number)" : "KINNI (fail-closed)",
  usage, problems,
  valim: picked.map((r, i) => ({ i: i + 1, bucket: r._bucket, handle: r.handle, title_after: r.title_after, verdict: verdicts[i] || null })),
};
fs.writeFileSync(OUT, JSON.stringify(report, null, 2));

console.log(`\n# OPUS-AUDIT — imperiaal→meetriline ET (${MODEL})`);
console.log(`valitud: ${picked.length}  ·  hinnatud: ${verdicts.length}  ·  bucketid: ${picked.map((r) => r._bucket).join(",")}`);
console.log(`keele-vigu: ${langFail}  ·  arvu-vigu: ${numFail}`);
if (problems.length) { console.log("\nPROBLEEMID:"); for (const p of problems) console.log(`  #${p.i} [${p.tyyp}] ${p.handle}: ${p.probleem}`); }
console.log(`\nVÄRAV: ${report.VÄRAV}`);
console.log(`raport → ${OUT}`);
process.exit(pass ? 0 : 1);
