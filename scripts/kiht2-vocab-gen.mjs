#!/usr/bin/env node
/**
 * kiht2-vocab-gen.mjs — KIHT 2 rahvakeelse otsingu-sõnavara DRY-generaator (KÕIK ~1719 L3).
 *
 * ⚠️ DRY: EI kirjuta DB-sse, EI sünki Meili'sse, EI deploy'. Ainult LLM-kutsed (loe) + JSON-väljund.
 *    Live-sünk (folk → product_synonym → Meili) = HILISEM samm, eraldi Tarmo kinnitusel (vt
 *    kiht2-vocab-v1-dry: formaat+skoop+sünk+disambig otsustuskohad).
 *
 * KONSENSUS: iga L3 kohta genereerivad SÕLTUMATULT Sonnet-5 JA Opus-4.8. Merge:
 *    tier A = mõlemad pakkusid (space-insensitive võti) → kõrge kindlus
 *    tier B = ainult üks pakkus → kandidaat
 *    SEO-lause: eelista Opus (hoia mõlemad JSON-is).
 *
 * KONTEKST: igale L3-le antakse L1 › L2 › L3 + kuni 3 näidispealkirja → disambig
 *    (toidusoojendi ≠ kütteseade; "puhur" köögis ≠ töökojas).
 *
 * KULU: cost() per kutse; peatub kui jooksu-kulu > --budget (vaikimisi $24, Tarmo piir $25).
 *    recordSpend() hoiab kuu-liidri täpsena. Checkpoint pärast iga batch'i → resume ohutu
 *    (öö-aken 02:45–04:30 katkestus ei kaota tööd).
 *
 * Kasutus: node scripts/kiht2-vocab-gen.mjs [--batch 15] [--budget 24] [--limit N] [--resume]
 * READ-ONLY (LLM + fail) → EI võta stack-lukku (HARD RULE #9).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { cost, recordSpend, isUsageLimitError, alertUsageLimit } from "./lib/spend-guard.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SP = "/tmp/claude-0/-opt-xlmarket-github/8966820c-cfb5-4418-ab04-7e331739a85c/scratchpad";
const L3_FILE = path.join(SP, "l3-data.jsonl");
const CKPT = path.join(SP, "kiht2-ckpt.json");
const OUT = path.join(ROOT, "reports", "kiht2-sonavara-dry.json");

const arg = (k, d) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : d; };
const BATCH = parseInt(arg("--batch", "15"), 10);
const BUDGET = parseFloat(arg("--budget", "24"));
const LIMIT = parseInt(arg("--limit", "0"), 10) || Infinity;
const RESUME = process.argv.includes("--resume");
const INPUT = arg("--input", L3_FILE_DEFAULT_SENTINEL());
const MERGE = process.argv.includes("--merge");           // merge tulemused olemasolevasse OUT-i (augutäide)
const MAXTOK = parseInt(arg("--maxtok", "6000"), 10);     // 4000 kärpis 15-kirjelisi batch'e
function L3_FILE_DEFAULT_SENTINEL() { return ""; }

const API_URL = "https://api.anthropic.com/v1/messages";
const API_KEY = (() => {
  try { return fs.readFileSync("/opt/eumotors-tasks/.env", "utf8").split("\n").find(l => l.startsWith("ANTHROPIC_API_KEY="))?.split("=").slice(1).join("=").replace(/^["']|["']$/g, "").trim(); }
  catch { return process.env.ANTHROPIC_API_KEY; }
})();
const MODELS = ["claude-sonnet-5", "claude-opus-4-8"];
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const SYSTEM = `Oled eesti e-kaubanduse OTSINGU-sõnavara ekspert xlmarket.ee jaoks.
Sulle antakse tootekategooriaid (L3) koos kontekstiga: L1 › L2 › L3 + näidistooted.

Iga kategooria kohta anna KAKS asja:

1. "folk" = rahvakeelsed/otsingunimed, mida EESTI klient võiks otsingusse kirjutada selle
   kategooria toodete leidmiseks. SH:
   - kokku- JA lahkukirjutus (nt "diiselsoojendi" JA "diisel soojendi")
   - kõnekeel ja rahvapärane (nt soojapuhuri "torpeedo", pehme jäätise masin, "halupuhur")
   - levinud ingliskeelsed otsingusõnad kui eestlane neid kasutab (nt "standheater", "patio heater")
   - üldnimeks muutunud kaubamärgid kui neid otsingusõnana kasutatakse (nt kärcher, flex)
   REEGLID:
   - KONTEKST on ülim: "soojendi" TOIDU-kontekstis (soojalett/toidusoe) ≠ KÜTTE-kontekstis (ruumisoojendi).
     Ära anna termineid, mis viiks VALE kategooriasse.
   - ÄRA korda L3 nime täpset kuju ega liiga üldisi sõnu ("masin", "seade", "toode").
   - 3–10 terminit. Kui kategooria on kitsas/selge, pigem vähem kui müra.
   - Kõik väiketähtedega.

2. "seo" = 1–2 LOOMULIKKU eestikeelset lauset, mis kirjeldavad kategooriat ja kasutavad
   neid rahvakeelseid nimesid orgaaniliselt (MITTE sõnade loetelu). Müügitekstiks sobiv.

Vasta AINULT etteantud JSON-skeemis. iga sisend-id peab tulema väljundisse tagasi.`;

const SCHEMA = {
  type: "object",
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          folk: { type: "array", items: { type: "string" } },
          seo: { type: "string" },
        },
        required: ["id", "folk", "seo"],
        additionalProperties: false,
      },
    },
  },
  required: ["items"],
  additionalProperties: false,
};

function userMsg(batch) {
  const lines = batch.map(c => {
    const samp = (c.samples || []).slice(0, 3).map(s => `"${String(s).slice(0, 90)}"`).join("; ");
    return `- id=${c.id} | ${c.l1 || "?"} › ${c.l2 || "?"} › ${c.name} | tooteid=${c.n} | näited: ${samp || "(pole)"}`;
  }).join("\n");
  return `Kategooriad (anna igaühele folk + seo):\n${lines}`;
}

async function callModel(model, batch) {
  const body = {
    model, max_tokens: MAXTOK,
    system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: userMsg(batch) }],
    output_config: { format: { type: "json_schema", schema: SCHEMA } },
  };
  for (let attempt = 1; attempt <= 5; attempt++) {
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), 120000);
    try {
      const r = await fetch(API_URL, {
        method: "POST", signal: ctrl.signal,
        headers: { "x-api-key": API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!r.ok) {
        const t = await r.text();
        if (isUsageLimitError(t)) { clearTimeout(to); alertUsageLimit(`API ${r.status}: ${t.slice(0, 160)}`, { ctx: "kiht2-gen" }); throw new Error("USAGE_LIMIT"); }
        if ((r.status === 429 || r.status === 529 || r.status >= 500) && attempt < 5) { clearTimeout(to); await sleep(Math.min(30000, 1000 * 2 ** attempt)); continue; }
        clearTimeout(to); throw new Error(`API ${r.status}: ${t.slice(0, 160)}`);
      }
      const j = await r.json();
      clearTimeout(to);
      recordSpend({ model, usage: j.usage });
      const txt = (j.content.find(b => b.type === "text") || {}).text || "{}";
      return { parsed: JSON.parse(txt), usage: j.usage };
    } catch (e) {
      clearTimeout(to);
      if (String(e.message) === "USAGE_LIMIT") throw e;
      if (attempt < 5) { await sleep(Math.min(30000, 1000 * 2 ** attempt)); continue; }
      throw e;
    }
  }
  throw new Error("retries exhausted");
}

const keyOf = (t) => String(t).toLowerCase().trim().replace(/\s+/g, "");
const norm = (t) => String(t).toLowerCase().trim().replace(/\s+/g, " ");

// Merge Sonnet + Opus per L3 → tier A (both) / tier B (one), keep surface variants.
function mergeL3(c, sonnet, opus) {
  const groups = new Map(); // key → {surfaces:Set, src:Set}
  const add = (terms, who) => {
    for (const raw of terms || []) {
      const t = norm(raw); if (!t || t.length < 2) continue;
      if (t === norm(c.name)) continue; // skip exact L3 name
      const k = keyOf(t);
      if (!groups.has(k)) groups.set(k, { surfaces: new Map(), src: new Set() });
      const g = groups.get(k);
      g.surfaces.set(t, (g.surfaces.get(t) || 0) + 1);
      g.src.add(who);
    }
  };
  add(sonnet?.folk, "s"); add(opus?.folk, "o");
  const tierA = [], tierB = [];
  for (const [, g] of groups) {
    const surface = [...g.surfaces.entries()].sort((a, b) => b[1] - a[1])[0][0];
    const variants = [...g.surfaces.keys()];
    const entry = { term: surface, variants, src: [...g.src].sort() };
    (g.src.size >= 2 ? tierA : tierB).push(entry);
  }
  return {
    id: c.id, name: c.name, l1: c.l1, l2: c.l2, n: c.n,
    folk_consensus: tierA,   // mõlemad mudelid
    folk_candidate: tierB,   // ainult üks
    seo_opus: opus?.seo || "",
    seo_sonnet: sonnet?.seo || "",
  };
}

async function main() {
  if (!API_KEY) { console.error("ANTHROPIC_API_KEY puudub"); process.exit(1); }
  const srcFile = INPUT || L3_FILE;
  const all = fs.readFileSync(srcFile, "utf8").trim().split("\n").map(l => JSON.parse(l));
  const l3s = all.slice(0, LIMIT === Infinity ? all.length : LIMIT);

  let results = {}, startBatch = 0, spend = 0, calls = 0;
  if (MERGE && fs.existsSync(OUT)) {
    for (const r of JSON.parse(fs.readFileSync(OUT, "utf8")).l3 || []) results[r.id] = r;
    console.error(`[merge] ${Object.keys(results).length} L3 olemas OUT-is, täidan ${l3s.length} auku`);
  }
  if (RESUME && !MERGE && fs.existsSync(CKPT)) {
    const ck = JSON.parse(fs.readFileSync(CKPT, "utf8"));
    results = ck.results || {}; startBatch = ck.nextBatch || 0; spend = ck.spend || 0; calls = ck.calls || 0;
    console.error(`[resume] batch ${startBatch}, seni $${spend.toFixed(4)}, ${Object.keys(results).length} L3 valmis`);
  }

  const batches = [];
  for (let i = 0; i < l3s.length; i += BATCH) batches.push(l3s.slice(i, i + BATCH));
  console.error(`[kiht2-gen] ${l3s.length} L3, ${batches.length} batch'i × ${MODELS.length} mudelit, eelarve $${BUDGET}`);

  for (let bi = startBatch; bi < batches.length; bi++) {
    if (spend >= BUDGET) { console.error(`⛔ EELARVE: $${spend.toFixed(4)} >= $${BUDGET} — peatun batch ${bi}/${batches.length}`); break; }
    const batch = batches[bi];
    try {
      const [sRes, oRes] = await Promise.all([callModel(MODELS[0], batch), callModel(MODELS[1], batch)]);
      calls += 2;
      spend += cost(MODELS[0], sRes.usage) + cost(MODELS[1], oRes.usage);
      const sMap = new Map((sRes.parsed.items || []).map(x => [x.id, x]));
      const oMap = new Map((oRes.parsed.items || []).map(x => [x.id, x]));
      for (const c of batch) results[c.id] = mergeL3(c, sMap.get(c.id), oMap.get(c.id));
      fs.writeFileSync(CKPT, JSON.stringify({ nextBatch: bi + 1, results, spend, calls }));
      if (bi % 5 === 0 || bi === batches.length - 1) console.error(`  batch ${bi + 1}/${batches.length} · $${spend.toFixed(4)} · ${calls} kutset · ${Object.keys(results).length} L3`);
    } catch (e) {
      if (String(e.message) === "USAGE_LIMIT") { console.error("⛔ USAGE-LIMIT — peatun, checkpoint alles"); break; }
      console.error(`  batch ${bi} VIGA: ${String(e.message).slice(0, 120)} — jätkan järgmisega`);
      fs.writeFileSync(CKPT, JSON.stringify({ nextBatch: bi + 1, results, spend, calls }));
    }
  }

  const arr = Object.values(results);
  const nConsensus = arr.reduce((a, r) => a + r.folk_consensus.length, 0);
  const nCand = arr.reduce((a, r) => a + r.folk_candidate.length, 0);
  fs.writeFileSync(OUT, JSON.stringify({
    generated: new Date().toISOString(),
    mode: "DRY — ei kirjutatud DB/Meili",
    models: MODELS, consensus_rule: "tierA=mõlemad, tierB=üks",
    l3_total: (() => { try { return fs.readFileSync(L3_FILE, "utf8").trim().split("\n").length; } catch { return l3s.length; } })(), l3_done: arr.length,
    folk_consensus_total: nConsensus, folk_candidate_total: nCand,
    spend_usd: +spend.toFixed(4), calls,
    l3: arr,
  }, null, 2));
  console.error(`✅ VALMIS: ${arr.length}/${l3s.length} L3 · konsensus-termineid ${nConsensus} · kandidaate ${nCand} · $${spend.toFixed(4)} · ${calls} kutset`);
  console.error(`   → ${OUT}`);
}
main().catch(e => { console.error("FATAL", e); process.exit(1); });
