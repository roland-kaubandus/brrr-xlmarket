#!/usr/bin/env node
/**
 * family-scatter-detect.mjs — CROSS-L1 TOOTEPERE-SCATTER detektor (deterministlik, LAUNCH-QA).
 *
 * MIKS: täpne-nime cross-main dup (check: 5 L3-nime 2 mainis) EI püüa peret, mille liikmetel
 * on ERINEVAD liit-nimed sama põhisõnaga. Nt "soojendid" pere: Terrassisoojendid (Aed),
 * Ruumisoojendid (Kodumasinad), Autosoojendid (Auto), Infrapunasoojendid (…). Täpne-nime-dup
 * neid ei seo (nimed erinevad), AGA ostja jaoks on need SAMA pere, laiali mainide vahel.
 *
 * MEETOD (taaskasutab Eesti liitsõna-otsing KIHT 1 morfoloogia SSoT-i):
 *   - iga v4 L3 nimi → VIIMANE sõna → eesti PÕHISÕNA (head-final, qmap head/lemma, sama kood
 *     mis storefront/lib/morph-et.ts). Nt "Terrassisoojendid" → "soojendi".
 *   - grupeeri L3-d põhisõna järgi → pere. Pere, mis hõlmab ≥2 eri L1-maini = SCATTER-kandidaat.
 *   - raport: pere · mitu maini · L3-d main-kaupa + tootearv. Rank: mainide-arv ↓, tooted ↓.
 *
 * ⚠️ SEE ON RAPORT, MITTE AUTO-FIX. Sama tüüp ERI domeenis võib olla ÕIGE (CLAUDE.md:
 *   "sama tüüp eri domeenis = ÕIGE"). Inimene otsustab kliendikontseptsiooni (segment vs tüüp).
 *
 * READ-ONLY (ainult SELECT) → EI võta stack-lukku. Deterministlik → sobib nädalaseks cron-deltaks.
 *
 * KASUTUS: node scripts/family-scatter-detect.mjs [--min N] [--min-mains M] [--json] [--judge]
 *   --min N        : ainult pered, mille KOKKU-tootearv ≥N (vaikimisi 1)
 *   --min-mains M  : ainult pered ≥M eri L1-mainis (vaikimisi 2)
 *   --json         : JSON stdout (cron-delta jaoks — DETERMINISTLIK, EI kutsu API-t)
 *   --judge        : LLM-semantiline verdikt igale pere-kandidaadile (REAL/DOMAIN/GENERIC).
 *                    Vajab ANTHROPIC_API_KEY. Launch-QA + inimese-raport; cron kasutab deterministlikku.
 *
 * KOLM KIHTI (CLAUDE.md: nime/märksõna-detektsioon EI tööta semantika jaoks → LLM-judge):
 *   deterministlik põhisõna-grupeerimine (kandidaat) → stoplist+pikkus-filter (müra maha) → LLM verdikt.
 */
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { callMessages } from "./lib/llm-client.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const MIN = args.includes("--min") ? +args[args.indexOf("--min") + 1] || 1 : 1;
const MIN_MAINS = args.includes("--min-mains") ? +args[args.indexOf("--min-mains") + 1] || 2 : 2;
const JSON_OUT = args.includes("--json");
const JUDGE = args.includes("--judge");

// Geneerilised konteiner-põhisõnad (grupeerivad ERI tüüpe → pole pere, vaid lai sufiks).
// + prügi-fragmendid (mitmuse-lõpud, mida lemma-kaart ei kata: raamid→mid, kapid→pid).
// Need EI ole actionable scatter — filtreeri enne judge'i (säästab API) ja märgi raportis.
const GENERIC = new Set(["komplekt", "masin", "tarvik", "seade", "süsteem", "osa", "asi", "abi",
  "mid", "pid", "led", "kad", "nid", "did", "tid", "sid", "gid", "rid"]);
const isNoiseHead = (h) => !h || h.length < 4 || GENERIC.has(h);

// --- Eesti põhisõna (sama SSoT kui KIHT 1 otsing) ---
const QMAP = path.join(ROOT, "storefront", "lib", "data", "morph-et-query.generated.json");
const Q = JSON.parse(readFileSync(QMAP, "utf8"));
const LEMMA = Q.lemma || {}, HEAD = Q.head || {}, COMP = new Set(Q.comp || []);
const MINC = 3;
const lemmaOf = (w) => LEMMA[w] || w;
function headOf(w) {
  const base = lemmaOf(w);
  if (HEAD[base]) return HEAD[base];
  if (HEAD[w]) return HEAD[w];
  for (let i = 1; i <= w.length - MINC; i++) { const suf = w.slice(i); if (suf.length >= MINC && COMP.has(suf)) return suf; }
  return null;
}
// pere-võti: L3 nime VIIMANE sõna → põhisõna (või lemma, kui liitsõna pole)
function familyKey(name) {
  const words = (name || "").trim().toLowerCase().replace(/[(),.]/g, " ").split(/\s+/).filter(Boolean);
  if (!words.length) return null;
  const last = words[words.length - 1];
  return headOf(last) || lemmaOf(last);
}

// --- DB: db-k33g (staging) ---
let DB = "";
try { DB = execSync("docker ps --format '{{.Names}}' | grep '^db-k33g' | head -1", { encoding: "utf8" }).trim(); } catch {}
if (!DB) { console.error("🔴 db-k33g konteinerit ei leitud."); process.exit(2); }
const q = (sql) => execSync(`docker exec -i ${DB} psql -U xlmarket -d xlmarket -At -F '\t' -f -`, { input: sql, encoding: "utf8" }).trim();

const rows = q(`SELECT l3.id, l3.name, split_part(l3.mpath,'.',1) mainid,
  (SELECT name FROM product_category WHERE id=split_part(l3.mpath,'.',1)) mainname,
  (SELECT count(*) FROM product_category_product WHERE product_category_id=l3.id) n
FROM product_category l3 WHERE l3.mpath LIKE 'pcat_v4_l%' AND l3.deleted_at IS NULL
  AND (char_length(l3.mpath)-char_length(replace(l3.mpath,'.','')))=2
ORDER BY l3.name;`).split("\n").filter(Boolean)
  .map((r) => { const [id, name, mainid, mainname, n] = r.split("\t"); return { id, name, mainid, mainname, n: +n }; });

// grupeeri pere-võtme järgi
const fam = new Map();
for (const r of rows) {
  const k = familyKey(r.name);
  if (!k) continue;
  if (!fam.has(k)) fam.set(k, []);
  fam.get(k).push(r);
}

// scatter = pere ≥MIN_MAINS eri mainis
const scatters = [];
for (const [key, l3s] of fam) {
  const mains = new Set(l3s.map((x) => x.mainid));
  if (mains.size < MIN_MAINS) continue;
  const total = l3s.reduce((s, x) => s + x.n, 0);
  if (total < MIN) continue;
  scatters.push({ key, mains: mains.size, l3count: l3s.length, total, noise: isNoiseHead(key),
    l3s: l3s.slice().sort((a, b) => a.mainname.localeCompare(b.mainname)) });
}
scatters.sort((a, b) => b.mains - a.mains || b.total - a.total);

// --- LLM-semantiline verdikt (--judge): REAL (sama kliendikontseptsioon laiali) / DOMAIN (õige, eri domeen) / GENERIC ---
async function judgeScatters(cands) {
  const KEY = process.env.ANTHROPIC_API_KEY;
  if (!KEY) { console.error("🔴 --judge vajab ANTHROPIC_API_KEY (set -a; . /opt/eumotors-tasks/.env; set +a)."); process.exit(2); }
  const MODEL = "claude-opus-4-8", BATCH = 10;
  const USAGE = { in: 0, out: 0 };
  const verdicts = {};
  for (let i = 0; i < cands.length; i += BATCH) {
    const batch = cands.slice(i, i + BATCH);
    const blocks = batch.map((s, j) => `### Pere #${j} — põhisõna="${s.key}" (${s.mains} maini, ${s.total} toodet)\n` +
      s.l3s.map((x) => `- ${x.mainname} → "${x.name}" (${x.n})`).join("\n")).join("\n\n");
    const prompt = `Oled e-poe taksonoomia-QA. Allpool TOOTEPERE-kandidaadid: L3-kategooriad, mille eesti PÕHISÕNA on sama, AGA mis asuvad ERI L1-pea-osakondades. Hinda IGA pere: kas laialipaiknemine on PROBLEEM või ÕIGE?

VERDIKT igale perele:
- "REAL" = SAMA kliendikontseptsioon (sama ostja otsib sama asja samas kontekstis) on killustatud mitmesse osakonda → PROBLEEM, tuleks koondada või cross-list'ida. Nt sama tüüp jagatud ainult segmendi (kodu vs kommerts) järgi.
- "DOMAIN" = sama põhisõna, AGA tõeliselt ERI domeen/ostja-kontekst → ÕIGE, jäta rahule. Nt autosoojendi (sõiduki) vs rätikusoojendi (vannituba) — eri ostja, eri kontekst.
- "GENERIC" = põhisõna on lai konteiner-sõna (nt "kott", "kast", "alus"), mis katab ERI tüüpe → pole pere, ignoreeri.

${blocks}

Vasta AINULT JSON-massiiviga, üks objekt per pere järjekorras:
[{"key":"<põhisõna>","verdict":"REAL"|"DOMAIN"|"GENERIC","confidence":"korge"|"kesk"|"madal","note":"lühi põhjendus + kui REAL: soovitus"}]`;
    try {
      // SSoT-klient (Faas 2): kulu-arvestus (task="family-scatter") + transient-retry ühes kohas. Body verbatim.
      const body = { model: MODEL, max_tokens: 4000, thinking: { type: "adaptive" }, output_config: { effort: "low" }, messages: [{ role: "user", content: prompt }] };
      const { text: txt, usage } = await callMessages({ apiKey: KEY, task: "family-scatter", body, ctx: "family-scatter-detect" });
      if (usage) { USAGE.in += usage.input_tokens || 0; USAGE.out += usage.output_tokens || 0; }
      const m = (txt || "").match(/\[[\s\S]*\]/);
      if (!m) throw new Error("JSON puudub: " + txt.slice(0, 120));
      for (const v of JSON.parse(m[0])) verdicts[v.key] = v;
      console.error(`  [${Math.min(i + BATCH, cands.length)}/${cands.length}]`);
    } catch (e) { console.error(`  batch ${i} VIGA: ${e.message}`); }
  }
  const cost = (USAGE.in / 1e6) * 5 + (USAGE.out / 1e6) * 25;
  console.error(`💰 judge token-kulu: input ${USAGE.in} · output ${USAGE.out} · ~$${cost.toFixed(4)}`);
  return verdicts;
}

let VERDICTS = null;
if (JUDGE) {
  const cands = scatters.filter((s) => !s.noise); // geneerilised/prügi EI lähe API-sse
  console.error(`--judge: ${cands.length} mitte-müra pere-kandidaati (${scatters.length - cands.length} müra vahele)...`);
  VERDICTS = await judgeScatters(cands);
  for (const s of scatters) { const v = VERDICTS[s.key]; if (v) { s.verdict = v.verdict; s.confidence = v.confidence; s.note = v.note; } }
}

if (JSON_OUT) {
  console.log(JSON.stringify({ generated: new Date().toISOString(), db: DB, min: MIN, minMains: MIN_MAINS,
    scatterCount: scatters.length, noiseCount: scatters.filter((s) => s.noise).length,
    scatters: scatters.map((s) => ({ family: s.key, mains: s.mains, l3count: s.l3count, total: s.total, noise: s.noise,
      verdict: s.verdict || null, confidence: s.confidence || null,
      members: s.l3s.map((x) => ({ l3: x.name, id: x.id, main: x.mainname, n: x.n })) })) }, null, 1));
  process.exit(0);
}

const out = path.join("/opt/eumotors-tasks/reports", "family-scatter.md");
const stamp = new Date().toISOString().slice(0, 10);
const vIcon = (v) => ({ REAL: "🔴 REAL", DOMAIN: "🟢 DOMAIN", GENERIC: "⚪ GENERIC" }[v] || (v || "—"));
const cIcon = (c) => ({ korge: "kõrge", kesk: "kesk", madal: "madal" }[c] || c || "");
const real = JUDGE ? scatters.filter((s) => s.verdict === "REAL") : [];
const clean = scatters.filter((s) => !s.noise);
const rowFor = (s, i) => `| ${i + 1} | **${s.key}** | ${JUDGE ? vIcon(s.verdict) + (s.confidence ? ` (${cIcon(s.confidence)})` : "") + " | " : ""}${s.mains} | ${s.l3count} | ${s.total} | ${s.l3s.map((x) => `${x.mainname} → ${x.name} · ${x.n}`).join("<br>")}${JUDGE && s.note ? "<br>_↳ " + s.note + "_" : ""} |`;
const hdr = JUDGE ? "| # | pere (põhisõna) | verdikt | mainid | L3 | tooted | liikmed |\n|--:|---|---|--:|--:|--:|---|"
                  : "| # | pere (põhisõna) | mainid | L3 | tooted | liikmed (main → L3 · n) |\n|--:|---|--:|--:|--:|---|";
const lines = ["# CROSS-L1 TOOTEPERE-SCATTER — deterministlik põhisõna + LLM-verdikt\n",
  `**${stamp} · db=${DB} · pered ≥${MIN_MAINS} mainis, ≥${MIN} toodet: ${scatters.length}** (müra-filtreeritud: ${clean.length})\n`,
  JUDGE ? `**LLM-verdikt: 🔴 REAL ${real.length} · 🟢 DOMAIN ${scatters.filter((s) => s.verdict === "DOMAIN").length} · ⚪ GENERIC ${scatters.filter((s) => s.verdict === "GENERIC").length}**\n` : "",
  "⚠️ RAPORT, MITTE auto-fix. REAL = sama kliendikontseptsioon killustatud (koonda/cross-list). DOMAIN = sama põhisõna eri domeenis = ÕIGE. Inimene (Tarmo) otsustab.\n",
  JUDGE && real.length ? "## 🔴 REAL — killustatud kliendikontseptsioon (üle vaadata)\n" + hdr + "\n" +
    real.map((s, i) => rowFor(s, i)).join("\n") + "\n" : "",
  JUDGE ? "## Kõik mitte-müra kandidaadid (verdikti järgi)\n" : "## Kandidaadid (mainide-arv ↓)\n",
  hdr,
  ...(JUDGE ? clean : scatters).map((s, i) => rowFor(s, i))];
writeFileSync(out, lines.filter(Boolean).join("\n"));
console.log(`🟢 pere-scatter: ${scatters.length} (müra-filtr ${clean.length})${JUDGE ? ` · 🔴 REAL ${real.length}` : ""}. Raport: ${out}`);
if (JUDGE) for (const s of real) console.log(`   🔴 "${s.key}" (${s.mains} maini, ${s.total}t): ${s.note || ""}`);
else { console.log(`   TOP 10:`); for (const s of clean.slice(0, 10)) console.log(`   ${s.mains} maini · ${s.total}t · "${s.key}"`); }
