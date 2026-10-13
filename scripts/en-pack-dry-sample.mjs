#!/usr/bin/env node
/**
 * EN-pakett DRY-valim — näitab kvaliteet + TEGELIK kulu ENNE suurt jooksu.
 * 0 DB-write. Loeb category-tree + DB (read-only titles). Kirjutab reports/en-pakett-dry-valim.md.
 *
 * T1 nimi: Sonnet + Opus tõlgivad ET→EN (konsensus); lahku → märgi (prod: Fable viigimurdja).
 *          + EN-nimevärav (Fable): kas EN-nimi täpne + loomulik + mitte termin-ees.
 * T2 SEO : l3-gates.genAssets (Sonnet-caller) + seoClaimGate (keelab numbrid/lubadused).
 *
 * Mudelid taaskasutavad OLEMAS mooduleid (l3-gates). Nimevärav-promptitekst kopeeritud
 * classify-chain.mjs:171-192-st (prod-transform kutsub mooduli otse).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { genAssets, seoClaimGate } from "./lib/l3-gates.mjs";

const API_KEY = process.env.ANTHROPIC_API_KEY;
if (!API_KEY) { console.error("❌ ANTHROPIC_API_KEY puudub (set -a; . /opt/eumotors-tasks/.env; set +a)"); process.exit(2); }

const PRICE = { // $/1M (input, output), 2026-10-13 (Sonnet-5 intro aegunud)
  "claude-sonnet-5": [3, 15],
  "claude-opus-4-8": [5, 25],
  "claude-fable-5": [10, 50],
};
const usage = {}; // model → {in,out,calls}
function tally(model, j) {
  const u = usage[model] ||= { in: 0, out: 0, calls: 0 };
  if (j.usage) { u.in += j.usage.input_tokens || 0; u.out += j.usage.output_tokens || 0; u.calls++; }
}
function makeCaller(model, maxTokens = 2000) {
  return async function call(system, user) {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model, max_tokens: maxTokens, system, messages: [{ role: "user", content: user }] }),
    });
    if (!res.ok) throw new Error(`${model} HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const j = await res.json();
    tally(model, j);
    const raw = ((j.content || []).find(c => c.type === "text")?.text || "").replace(/```(?:json)?/gi, "").trim();
    const m = raw.match(/\{[\s\S]*\}/);
    if (!m) throw new Error(`${model} JSON puudub: ${raw.slice(0, 150)}`);
    return JSON.parse(m[0]);
  };
}
const sonnet = makeCaller("claude-sonnet-5");
const opus = makeCaller("claude-opus-4-8");
const fable = makeCaller("claude-fable-5", 32000); // Fable thinking alati sees

// ---- DB helpers (read-only) ----
const DB = execFileSync("bash", ["-c", "docker ps --format '{{.Names}}' | grep -E '^db-k33g' | head -1"]).toString().trim();
function psql(sql) {
  return execFileSync("docker", ["exec", DB, "psql", "-U", "xlmarket", "-d", "xlmarket", "-tAF", "\t", "-c", sql]).toString();
}
function catInfo(handle) {
  const row = psql(`SELECT id, name FROM product_category WHERE handle='${handle.replace(/'/g, "''")}' LIMIT 1;`).trim();
  if (!row) return null;
  const [id, name] = row.split("\t");
  const titles = psql(`SELECT p.title FROM product_category_product pcp JOIN product p ON p.id=pcp.product_id WHERE pcp.product_category_id='${id}' AND p.status='published' AND p.deleted_at IS NULL LIMIT 6;`)
    .trim().split("\n").filter(Boolean);
  return { id, name, titles };
}

// ---- Nime-tõlke prompt (ET→EN) ----
const TRANSLATE_SYS = `Sa oled XL e-poe (xlmarket.ee, Eesti) kataloogi-toimetaja. Tõlgid EESTI tootekategooria nime LOOMULIKUKS inglise e-poe kategooria-nimeks.
REEGLID: 1-4 sõna; e-poe sirvimistasandi üldnimi (mitte toote pealkiri); loomulik inglise kaubandus-termin (MITTE sõnasõnaline masintõlge); tehniline lühend ei alusta nime (läheb sulgu taha).
Tagasta AINULT JSON: {"name_en":"<ingliskeelne kategooria-nimi>","reason":"<1 lause>"}`;
function translateUser(nameEt, parentEt, titles) {
  return `EESTI KATEGOORIA: «${nameEt}»\nVANEM: «${parentEt || "—"}»\nNÄIDISTOOTED (ingliskeelsed pealkirjad):\n${titles.map(t => `  • ${t}`).join("\n") || "  (pole)"}\nTõlgi kategooria-nimi loomulikuks inglise e-poe nimeks.`;
}

// ---- EN-nimevärav (Fable) — täpsus + loomulikkus + termin-ees ----
const ENGATE_SYS = `Sa hindad inglise kategooria-nime täpsust Eesti e-poe kliendi jaoks. KOLM kriteeriumi:
(1) TÄPSUS: kas EN-nimi tähistab SAMU tooteid kui eesti nimi (mitte nihe/kitsendus/laiendus)?
(2) LOOMULIKKUS: kas see on loomulik inglise e-poe kategooria-termin (mitte sõnasõnaline/kohmakas masintõlge)?
(3) TERMIN EES: kas tehniline lühend/mudelkood on nime ALGUSES (halb)?
Tagasta AINULT JSON: {"accurate":true|false,"natural":true|false,"term_at_start":true|false,"proposed_name":"<parem EN-nimi kui midagi kukub, muidu null>","reason":"<1 lause>"}`;
function engateUser(nameEt, nameEn, titles) {
  return `EESTI NIMI: «${nameEt}»\nPAKUTUD INGLISE NIMI: «${nameEn}»\nTEGELIKUD TOOTED:\n${titles.map(t => `  • ${t}`).join("\n") || "  (pole)"}\nHinda: täpne? loomulik? termin ees?`;
}

const normN = s => (s || "").toLowerCase().replace(/\s+/g, " ").trim();

async function processCat(node, tree) {
  const info = catInfo(node.handle);
  if (!info) return { handle: node.handle, error: "DB-s puudub" };
  const parentEt = node.parent_handle ? (tree.nodes[node.parent_handle]?.name_et || "") : "";
  const titles = info.titles;

  // T1 — konsensus Sonnet + Opus
  const [sRes, oRes] = await Promise.all([
    sonnet(TRANSLATE_SYS, translateUser(node.name_et, parentEt, titles)),
    opus(TRANSLATE_SYS, translateUser(node.name_et, parentEt, titles)),
  ]);
  const agree = normN(sRes.name_en) === normN(oRes.name_en);
  const chosen = sRes.name_en; // konsensus → kumbki; lahku → prod kutsuks Fable viigimurdja (DRY: näita mõlemat)

  // EN-nimevärav
  const gate = await fable(ENGATE_SYS, engateUser(node.name_et, chosen, titles));
  const gatePass = gate.accurate !== false && gate.natural !== false && gate.term_at_start !== true;
  const finalName = gatePass ? chosen : (gate.proposed_name || chosen);

  // T2 — SEO (Sonnet via genAssets)
  const seo = await genAssets(sonnet, node.name_et, parentEt, titles);
  const seoGate = seoClaimGate(seo);

  return {
    handle: node.handle, level: node.level, name_et: node.name_et, parentEt, titles,
    sonnet_en: sRes.name_en, opus_en: oRes.name_en, agree,
    gate: { pass: gatePass, ...gate }, finalName,
    seo, seoGate,
  };
}

async function main() {
  const tree = JSON.parse(readFileSync("storefront/lib/category-tree.generated.json", "utf8"));
  const nodes = Object.values(tree.nodes);
  const byLevel = { 1: [], 2: [], 3: [] };
  for (const n of nodes) if (byLevel[n.level]) byLevel[n.level].push(n);
  // vali 5 igalt tasandilt (hajutatud — iga 7. puudest), eelista tootega
  const pick = [];
  for (const lvl of [1, 2, 3]) {
    const pool = byLevel[lvl];
    const step = Math.max(1, Math.floor(pool.length / 5));
    for (let i = 0; i < pool.length && pick.filter(p => p.level === lvl).length < 5; i += step) pick.push(pool[i]);
  }
  console.error(`Valim: ${pick.length} kat (${pick.map(p => "L" + p.level).join(",")}). DB=${DB}`);

  const results = [];
  for (const node of pick) {
    try { const r = await processCat(node, tree); results.push(r); console.error(`  ✓ ${node.handle}`); }
    catch (e) { results.push({ handle: node.handle, error: e.message }); console.error(`  ✗ ${node.handle}: ${e.message}`); }
  }

  // ---- Raport ----
  let md = `# EN-pakett — DRY-valim (päris kvaliteet + kulu)\n\n> ${new Date().toISOString()} · ${pick.length} kat · 0 DB-write · mudelid: Sonnet+Opus (nimi-konsensus), Fable (nimevärav), Sonnet (SEO).\n\n`;
  for (const r of results) {
    if (r.error) { md += `## ❌ ${r.handle}\n${r.error}\n\n`; continue; }
    md += `## L${r.level} · \`${r.handle}\`\n`;
    md += `- **ET-nimi:** «${r.name_et}» (vanem: «${r.parentEt || "—"}»)\n`;
    md += `- **Näidistooted:** ${r.titles.slice(0, 3).join(" · ") || "—"}\n`;
    md += `- **EN-nimi:** Sonnet=«${r.sonnet_en}» · Opus=«${r.opus_en}» · ${r.agree ? "✅ konsensus" : "⚠️ LAHKU (prod→Fable viigimurdja)"}\n`;
    md += `- **EN-nimevärav:** ${r.gate.pass ? "✅ läbis" : "⚠️ " + (r.gate.proposed_name ? "paku «" + r.gate.proposed_name + "»" : "kukkus")} — ${r.gate.reason}\n`;
    md += `- **→ Lõplik EN-nimi:** «${r.finalName}»\n`;
    md += `- **SEO tagline_et:** ${r.seo.tagline_et}\n`;
    md += `- **SEO desc_et:** ${r.seo.description_et}\n`;
    md += `- **SEO tagline_en:** ${r.seo.tagline_en}\n`;
    md += `- **SEO desc_en:** ${r.seo.description_en}\n`;
    md += `- **seoClaimGate:** ${r.seoGate.pass ? "✅ puhas (0 numbrit/lubadust)" : "⚠️ " + r.seoGate.offenders.join("; ")}\n\n`;
  }

  // ---- Kulu-tally → ekstrapoleeri ----
  md += `## Kulu (tegelik, sellest valimist)\n\n| Mudel | Kutseid | In-tok | Out-tok | $ |\n|---|---|---|---|---|\n`;
  let total = 0;
  for (const [model, u] of Object.entries(usage)) {
    const [pi, po] = PRICE[model];
    const cost = (u.in / 1e6) * pi + (u.out / 1e6) * po;
    total += cost;
    md += `| ${model} | ${u.calls} | ${u.in} | ${u.out} | $${cost.toFixed(4)} |\n`;
  }
  md += `| **KOKKU** | | | | **$${total.toFixed(4)}** |\n\n`;
  const perCat = total / pick.length;
  md += `**Per kat: $${perCat.toFixed(4)}** (non-batch, immediate). Ekstrapoleeritud:\n`;
  md += `- Nimed+SEO 1970 kat non-batch: **~$${(perCat * 1970).toFixed(0)}**\n`;
  md += `- Batch API (−50%): **~$${(perCat * 1970 * 0.5).toFixed(0)}**\n`;
  md += `\n> NB: nimevärav Fable (kallis) jookseb AINULT kui konsensus/gate seda nõuab; batch'is SEO+nimi eraldi. Tegelik batch-kulu tõenäoliselt madalam.\n`;

  writeFileSync("reports/en-pakett-dry-valim.md", md);
  console.error(`\n✅ reports/en-pakett-dry-valim.md · kokku $${total.toFixed(4)} · per kat $${perCat.toFixed(4)}`);
}
main().catch(e => { console.error("FATAL:", e.message); process.exit(1); });
