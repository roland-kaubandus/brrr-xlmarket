#!/usr/bin/env node
/**
 * a2-grabbag-enrich.mjs — A2 GRAB-BAG jagamis-ettepanek DRY (82 kõrge-kindlusega GRAB).
 *
 * ⚠️ DRY: EI muuda taksonoomiat, EI kirjuta DB-sse (ainult SELECT title-näidised). Väljund = .md.
 *
 * SISEND: /opt/eumotors-tasks/reports/grab-verdiktid.json (grab-bag-judge cache), verdict=GRAB &
 *         confidence=korge. Opus-judge andis juba klaster-analüüsi; see skript RIKASTAB selle
 *         konkreetseks jagamis-ettepanekuks: alamtüübid → uued L3-nimed → hinnang-tooteid → VÄRAV.
 *
 * ÜLE-FRAG-VÄRAV (mälu over-frag-guard-l2): ära loo uut L2 ühe L3 jaoks — paiguta uued L3-d
 *         OLEMASOLEVA L2 alla; uut L2 ainult kui mitu uut L3 seda õigustab.
 * VÄRAVAD per uus L3: (a) ≥3 toodet VÕI ≥15% L3-st, (b) eristuv ostja-kontseptsioon (väljund-test).
 *
 * Kasutus: node scripts/a2-grabbag-enrich.mjs [--budget 6] [--limit N]
 * READ-ONLY → EI võta stack-lukku.
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { cost } from "./lib/spend-guard.mjs";
import { callMessages } from "./lib/llm-client.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CACHE = "/opt/eumotors-tasks/reports/grab-verdiktid.json";
const OUT = path.join(ROOT, "reports", "a2-grabbag-dry.md");
const arg = (k, d) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : d; };
const BUDGET = parseFloat(arg("--budget", "6"));
const LIMIT = parseInt(arg("--limit", "0"), 10) || Infinity;
const BATCH = 6, SAMPLE = 24, MODEL = "claude-opus-4-8";

const API_KEY = (() => { try { return fs.readFileSync("/opt/eumotors-tasks/.env", "utf8").split("\n").find(l => l.startsWith("ANTHROPIC_API_KEY="))?.split("=").slice(1).join("=").replace(/^["']|["']$/g, "").trim(); } catch { return process.env.ANTHROPIC_API_KEY; } })();
const DB = execSync("docker ps --format '{{.Names}}' | grep '^db-k33g' | head -1", { encoding: "utf8" }).trim();
const q = (sql) => execSync(`docker exec -i ${DB} psql -U xlmarket -d xlmarket -At -F '\t' -f -`, { input: sql, encoding: "utf8" }).trim();

const SCHEMA = {
  type: "object",
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          splits: {
            type: "array",
            items: {
              type: "object",
              properties: {
                subtype: { type: "string" },
                proposed_l3: { type: "string" },
                est_n: { type: "integer" },
                gate_min_ok: { type: "boolean" },
                gate_distinct_ok: { type: "boolean" },
                gate_verdict: { type: "string", enum: ["LÄBIS", "PIIRIPEALNE", "KUKKUS"] },
              },
              required: ["subtype", "proposed_l3", "est_n", "gate_min_ok", "gate_distinct_ok", "gate_verdict"],
              additionalProperties: false,
            },
          },
          l2_advice: { type: "string" },
          note: { type: "string" },
        },
        required: ["id", "splits", "l2_advice", "note"],
        additionalProperties: false,
      },
    },
  },
  required: ["items"],
  additionalProperties: false,
};

const SYSTEM = `Oled taksonoomia-arhitekt xlmarket.ee jaoks. Sulle antakse GRAB-BAG L3 kategooriaid
(sisaldavad 2+ eri toote-tüüpi) koos tootepealkirjade näidistega ja varasema klaster-analüüsiga.

Iga L3 kohta koosta KONKREETNE jagamis-ettepanek:
- "splits" = iga tuvastatud alamtüübi kohta: subtype (lühikirjeldus), proposed_l3 (uue L3 EESTIKEELNE
  nimi, konkreetne ja otsitav), est_n (hinnang mitu toodet — näidiste põhjal, märgi et hinnang),
  ja VÄRAVAD:
    gate_min_ok      = kas alamtüübil ≥3 toodet VÕI ≥15% L3 kogumahust?
    gate_distinct_ok = kas eristuv ostja-kontseptsioon? (VÄLJUND-TEST: kas toode A asendab B sama
                       tulemusega? JAH→variant, sama tüüp, EI jaga; EI→eri tüüp, jaga)
    gate_verdict     = LÄBIS (mõlemad väravad ok) / PIIRIPEALNE (üks nõrk) / KUKKUS (ei jaga)
- "l2_advice" = kuhu uued L3-d paigutada. ÜLE-FRAG-VÄRAV: ära soovita uut L2 ühe L3 jaoks —
  paiguta OLEMASOLEVA L2 alla (sama kus praegu), uut L2 ainult kui mitu uut L3 seda selgelt õigustab.
- "note" = 1 lause: kas jagada üldse, või jätta (kui väravad ei läbi).

Vasta AINULT JSON-skeemis. Iga sisend-id tuleb väljundisse.`;

function userMsg(batch) {
  return batch.map((r, i) => `### id=${r.id} — "${r.name}" (${r.main}, ${r.n} toodet)\nVaremleitud klastrid: ${r.clusters}\nPealkirjad:\n${r.titles.join("\n")}`).join("\n\n");
}

async function callOpus(batch) {
  const body = {
    model: MODEL, max_tokens: 6000,
    system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: userMsg(batch) }],
    output_config: { format: { type: "json_schema", schema: SCHEMA } },
  };
  const { json, text } = await callMessages({ apiKey: API_KEY, task: "a2:grabbag", body, timeoutMs: 150000, ctx: "a2-enrich" });
  return { parsed: JSON.parse(text || "{}"), usage: json.usage };
}

async function main() {
  if (!API_KEY) { console.error("ANTHROPIC_API_KEY puudub"); process.exit(1); }
  const cache = JSON.parse(fs.readFileSync(CACHE, "utf8"));
  let grabs = Object.entries(cache.verdicts).map(([id, x]) => ({ id, ...x }))
    .filter(x => x.verdict === "GRAB" && x.confidence === "korge").sort((a, b) => b.n - a.n);
  if (LIMIT !== Infinity) grabs = grabs.slice(0, LIMIT);
  console.error(`[a2-enrich] ${grabs.length} kõrge GRAB, ${Math.ceil(grabs.length / BATCH)} batch'i, eelarve $${BUDGET}`);

  for (const r of grabs) {
    r.titles = q(`SELECT left(COALESCE(NULLIF(p.metadata->>'title_et',''),p.title),80) FROM product_category_product pcp JOIN product p ON p.id=pcp.product_id WHERE pcp.product_category_id='${r.id.replace(/[^a-zA-Z0-9_]/g, "")}' AND p.status='published' AND p.deleted_at IS NULL ORDER BY p.title LIMIT ${SAMPLE};`).split("\n").filter(Boolean);
  }

  const out = []; let spend = 0, calls = 0;
  for (let i = 0; i < grabs.length; i += BATCH) {
    if (spend >= BUDGET) { console.error(`⛔ EELARVE $${spend.toFixed(4)} >= $${BUDGET} — peatun ${i}/${grabs.length}`); break; }
    const batch = grabs.slice(i, i + BATCH);
    try {
      const { parsed, usage } = await callOpus(batch); calls++; spend += cost(MODEL, usage);
      const map = new Map((parsed.items || []).map(x => [x.id, x]));
      for (const r of batch) out.push({ ...r, enrich: map.get(r.id) || null });
      console.error(`  [${Math.min(i + BATCH, grabs.length)}/${grabs.length}] $${spend.toFixed(4)}`);
    } catch (e) { if (String(e.message) === "USAGE_LIMIT") { console.error("⛔ USAGE-LIMIT"); break; } console.error(`  batch ${i} VIGA: ${String(e.message).slice(0, 100)}`); batch.forEach(r => out.push({ ...r, enrich: null })); }
  }

  // raport
  const gv = (v) => ({ "LÄBIS": "✅ LÄBIS", "PIIRIPEALNE": "🟠 PIIRIPEALNE", "KUKKUS": "⛔ KUKKUS" }[v] || v);
  const byMain = {}; out.forEach(r => (byMain[r.main] ||= []).push(r));
  const L = [`# A2 GRAB-BAG — jagamis-ettepanek (DRY)\n`,
    `**${new Date().toISOString().slice(0, 10)} · ${MODEL} · ${out.length} kõrge-kindlusega GRAB-L3 · $${spend.toFixed(4)}**\n`,
    `> DRY: miski ei ole liigutatud. est_n = HINNANG ${SAMPLE} näidise põhjal (suurtel L3 võib alahinnata).`,
    `> Üle-frag-värav: uued L3 OLEMASOLEVA L2 alla; väravad per uus L3: ≥3 toodet/≥15% + eristuv kontseptsioon.`,
    `> Allikas: grab-bag-judge cache (verdict=GRAB, confidence=kõrge). Teostus = eraldi, Tarmo kinnitusel.\n`,
    `## Ettepanekud main-kategooria kaupa\n`];
  for (const [main, rs] of Object.entries(byMain).sort((a, b) => b[1].length - a[1].length)) {
    L.push(`### ${main} (${rs.length} L3)\n`);
    for (const r of rs) {
      L.push(`**${r.name}** \`${r.id}\` · ${r.n} toodet`);
      if (!r.enrich) { L.push(`- _(rikastus puudu — eelarve/viga; vt cache-klaster: ${r.clusters})_\n`); continue; }
      L.push(`| alamtüüp | → uus L3 | ~tooteid | väravad | verdikt |`);
      L.push(`|---|---|--:|---|---|`);
      for (const s of r.enrich.splits || []) L.push(`| ${s.subtype} | ${s.proposed_l3} | ~${s.est_n} | min ${s.gate_min_ok ? "✓" : "✗"} · eristuv ${s.gate_distinct_ok ? "✓" : "✗"} | ${gv(s.gate_verdict)} |`);
      L.push(`- **L2-paigutus:** ${r.enrich.l2_advice}`);
      L.push(`- **Kokkuvõte:** ${r.enrich.note}\n`);
    }
  }
  const nSplits = out.reduce((a, r) => a + (r.enrich?.splits?.filter(s => s.gate_verdict === "LÄBIS").length || 0), 0);
  L.splice(5, 0, `**Väravad-läbinud uusi L3 kokku: ${nSplits}** (kandidaadid teostuseks; piiripealsed/kukkunud = jäta või vaata üle)\n`);
  fs.writeFileSync(OUT, L.join("\n"));
  console.error(`✅ A2 VALMIS: ${out.length} L3 · ${nSplits} värava-läbinud uut L3 · $${spend.toFixed(4)} · ${calls} kutset\n   → ${OUT}`);
}
main().catch(e => { console.error("FATAL", e); process.exit(1); });
