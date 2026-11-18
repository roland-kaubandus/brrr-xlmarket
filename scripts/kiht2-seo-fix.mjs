#!/usr/bin/env node
/**
 * kiht2-seo-fix.mjs — SEO-VÄRAV + regeneratsioon.
 *
 * TAUST: kiht2-vocab-gen.mjs-il POLNUD SEO-väravat — laused läksid toorelt läbi ja mudel
 *   mõtles välja spetsiifikat (numbrid/mõõdud, "kuni sadu lehti", lubadused), mida andmetes pole.
 *
 * SEE SKRIPT:
 *   1. SEO-värav (seoGate): lükkab tagasi laused, mis sisaldavad mõõte/numbreid, kogus-lubadusi,
 *      konkreetseid tehno-spetse või turundus-superlatiive (kontrollimatu väide prosas).
 *   2. Regenereerib kukkunud laused Opus'ega RANGE promptiga (keelab numbrid/spetsid/lubadused).
 *   3. Uuendab reports/kiht2-sonavara-dry.json (seo_opus asendatakse; vana → seo_opus_orig).
 *   4. Väljund: reports/kiht2-seo-fix.md (väravast-kukkunute arv + 10 enne/pärast näidet).
 *
 * DRY: EI puuduta DB/Meili. Sõnavara (folk) EI muudeta — ainult SEO-laused.
 * Kasutus: node scripts/kiht2-seo-fix.mjs [--batch 15] [--budget 3] [--dry-scan]
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { cost, recordSpend, isUsageLimitError, alertUsageLimit } from "./lib/spend-guard.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "reports", "kiht2-sonavara-dry.json");
const REPORT = path.join(ROOT, "reports", "kiht2-seo-fix.md");
const arg = (k, d) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : d; };
const BATCH = parseInt(arg("--batch", "15"), 10);
const BUDGET = parseFloat(arg("--budget", "3"));
const SCAN_ONLY = process.argv.includes("--dry-scan");
const API_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-opus-4-8";
const MAXTOK = 6000;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const API_KEY = (() => {
  try { return fs.readFileSync("/opt/eumotors-tasks/.env", "utf8").split("\n").find(l => l.startsWith("ANTHROPIC_API_KEY="))?.split("=").slice(1).join("=").replace(/^["']|["']$/g, "").trim(); }
  catch { return process.env.ANTHROPIC_API_KEY; }
})();

// ---- SEO-VÄRAV ----
const GATE_RULES = [
  { re: /\b\d+([.,]\d+)?\s?(kw|kv|w|v|kg|g|mm|cm|m|l|ml|gpm|psi|bar|qt|rpm|tolli|hz|ah|wh|db|°c?)\b/i, why: "mõõt+ühik" },
  { re: /\b\d+\s?(kuni|–|—|-|\.\.\.)\s?\d+/i, why: "arvuvahemik" },
  { re: /\bkuni\s+(sadu|sada|tuhande|tuhat|\d)/i, why: "kogus-lubadus" },
  { re: /\b(sadu|tuhandeid|sadade|tuhandete)\b/i, why: "ebamäärane suurarv" },
  { re: /\b(ptfe|lifepo4|lipo|argb|rgb|ip\d{2}|type\s?2|ccs)\b/i, why: "konkreetne tehno-spets" },
  { re: /\b(parim|soodsaim|kiireim|odavaim|täiuslik|garanteeri|100\s?%|ületamatu|turu\s+parim)\b/i, why: "turundus-lubadus" },
];
function seoGate(seo) {
  for (const r of GATE_RULES) if (r.re.test(seo || "")) return r.why;
  return null;
}

const SYSTEM = `Oled eesti e-kaubanduse SEO-copywriter xlmarket.ee jaoks.
Kirjutad tootekategooriale (L3) 1–2 LOOMULIKKU eestikeelset müügilauset, mis kirjeldavad kategooriat
ja kasutavad orgaaniliselt antud rahvakeelseid otsingusõnu (MITTE loeteluna).

RANGED KEELUD (ära KUNAGI kasuta — need on andmetes kontrollimata ja tekitavad valeinfot):
- MITTE ühtki numbrit ega mõõtu (ei kW, V, L, mm, GPM, PSI, dB, %, tollid, kogused "kuni sadu/tuhat").
- MITTE konkreetseid tehno-spetse (PTFE, LiFePO4, Type 2, IP67, RGB/ARGB vms).
- MITTE turundus-superlatiive ega lubadusi (parim, kiireim, täiuslik, garanteeritud, 100%).
Kirjelda ÜLDISELT ja kasutuspõhiselt: mida kategooria on, kellele/milleks sobib, mis tüübid valikus.
Pigem lühem ja aus kui numbritega üle võlli.

Vasta AINULT JSON-skeemis. Iga sisend-id peab väljundisse tagasi tulema.`;

const SCHEMA = {
  type: "object",
  properties: { items: { type: "array", items: { type: "object", properties: { id: { type: "string" }, seo: { type: "string" } }, required: ["id", "seo"], additionalProperties: false } } },
  required: ["items"], additionalProperties: false,
};

function userMsg(batch) {
  const lines = batch.map(r => {
    const folk = [...(r.folk_consensus || []), ...(r.folk_candidate || [])].slice(0, 8).map(e => e.term).join(", ");
    return `- id=${r.id} | ${r.l1 || "?"} › ${r.l2 || "?"} › ${r.name} | rahvakeelsed: ${folk || "(pole)"}`;
  }).join("\n");
  return `Kirjuta igale kategooriale uus SEO-lause (numbrite/spetside/lubadusteta):\n${lines}`;
}

async function callModel(batch) {
  const body = {
    model: MODEL, max_tokens: MAXTOK,
    system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: userMsg(batch) }],
    output_config: { format: { type: "json_schema", schema: SCHEMA } },
  };
  for (let attempt = 1; attempt <= 5; attempt++) {
    const ctrl = new AbortController(); const to = setTimeout(() => ctrl.abort(), 120000);
    try {
      const r = await fetch(API_URL, { method: "POST", signal: ctrl.signal, headers: { "x-api-key": API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" }, body: JSON.stringify(body) });
      if (!r.ok) {
        const t = await r.text(); clearTimeout(to);
        if (isUsageLimitError(t)) { alertUsageLimit(`API ${r.status}`, { ctx: "seo-fix" }); throw new Error("USAGE_LIMIT"); }
        if ((r.status === 429 || r.status === 529 || r.status >= 500) && attempt < 5) { await sleep(Math.min(30000, 1000 * 2 ** attempt)); continue; }
        throw new Error(`API ${r.status}: ${t.slice(0, 160)}`);
      }
      const j = await r.json(); clearTimeout(to); recordSpend({ model: MODEL, usage: j.usage });
      const txt = (j.content.find(b => b.type === "text") || {}).text || "{}";
      return { parsed: JSON.parse(txt), usage: j.usage };
    } catch (e) { clearTimeout(to); if (String(e.message) === "USAGE_LIMIT") throw e; if (attempt < 5) { await sleep(Math.min(30000, 1000 * 2 ** attempt)); continue; } throw e; }
  }
  throw new Error("retries exhausted");
}

async function main() {
  const V = JSON.parse(fs.readFileSync(OUT, "utf8"));
  const flagged = [];
  for (const r of V.l3) {
    const seo = r.seo_opus || r.seo_sonnet || "";
    const why = seoGate(seo);
    if (why) flagged.push({ r, why, before: seo });
  }
  console.error(`[seo-gate] ${V.l3.length} SEO · kukub ${flagged.length} (${(100 * flagged.length / V.l3.length).toFixed(1)}%)`);
  const byRule = {}; for (const f of flagged) byRule[f.why] = (byRule[f.why] || 0) + 1;
  console.error(`[seo-gate] reeglite kaupa: ${JSON.stringify(byRule)}`);
  if (SCAN_ONLY) { console.log(JSON.stringify({ total: V.l3.length, fail: flagged.length, byRule })); return; }

  let spend = 0; const fixes = [];
  for (let i = 0; i < flagged.length; i += BATCH) {
    if (spend >= BUDGET) { console.error(`[seo-fix] eelarve $${BUDGET} täis @ ${i}/${flagged.length}`); break; }
    const batch = flagged.slice(i, i + BATCH).map(f => f.r);
    let res; try { res = await callModel(batch); } catch (e) { console.error(`[seo-fix] batch ${i} viga: ${e.message}`); if (String(e.message) === "USAGE_LIMIT") break; continue; }
    spend += cost(MODEL, res.usage);
    const map = new Map(res.parsed.items.map(it => [it.id, it.seo]));
    for (const f of flagged.slice(i, i + BATCH)) {
      const neu = map.get(f.r.id);
      if (!neu) continue;
      const stillBad = seoGate(neu);
      if (!f.r.seo_opus_orig) f.r.seo_opus_orig = f.before;   // säilita vana
      f.r.seo_opus = neu;
      fixes.push({ name: f.r.name, l1: f.r.l1, why: f.why, before: f.before, after: neu, stillBad });
    }
    console.error(`[seo-fix] ${Math.min(i + BATCH, flagged.length)}/${flagged.length} · $${spend.toFixed(4)}`);
  }

  // uuenda koond-arvud
  V.seo_gate = { rules: GATE_RULES.map(r => r.why), flagged: flagged.length, fixed: fixes.length, fixed_at: new Date().toISOString() };
  fs.writeFileSync(OUT, JSON.stringify(V, null, 1));

  const stillBad = fixes.filter(f => f.stillBad);
  const L = [`# KIHT 2 — SEO-VÄRAV + parandus\n`,
    `**${new Date().toISOString().slice(0, 10)} · ${MODEL} · $${spend.toFixed(4)} · DRY (SEO-laused, folk puutumata)**\n`,
    `## Miks värav varem ei püüdnud?`,
    `Generaatoril **polnud SEO-väravat** — SEO-prompt küsis vaid "loomulikku müügilauset", mudel mõtles`,
    `prosasse välja spetsiifikat (nt "7kW kuni 22kW", "PTFE taluvad", "kuni sadu lehti"), mida kategooria`,
    `andmetes pole. Nüüd on värav olemas ja kukkunud laused regenereeritud numbrite/spetside/lubadusteta.\n`,
    `## Värava tulemus`,
    `- SEO-lauseid kokku: **${V.l3.length}**`,
    `- Väravast kukkus: **${flagged.length}** (${(100 * flagged.length / V.l3.length).toFixed(1)}%)`,
    `- Reeglite kaupa: ${Object.entries(byRule).map(([k, v]) => `${k} ${v}`).join(" · ")}`,
    `- Regenereeritud: **${fixes.length}**${stillBad.length ? ` · ikka väravast läbi ei saa: ${stillBad.length} (jäetud märgistatult)` : " · kõik läbisid uue värava ✓"}\n`,
    `## 10 parandatud lauset (enne → pärast)\n`];
  for (const f of fixes.slice(0, 10)) {
    L.push(`### ${f.l1} › **${f.name}**  _(värav: ${f.why})_`);
    L.push(`- ❌ **enne:** ${f.before}`);
    L.push(`- ✅ **pärast:** ${f.after}\n`);
  }
  fs.writeFileSync(REPORT, L.join("\n"));
  console.error(`✅ SEO-fix: ${fixes.length}/${flagged.length} parandatud · $${spend.toFixed(4)} → ${REPORT}`);
}
main();
