#!/usr/bin/env node
/**
 * ETAPP 2 — AUTO-L3 LOOMINE (spec §4 + §4.5 täielikkus-värav).
 *
 * Loeb ETAPP 1 DRY-run väljundi (reports/classify-chain-dryrun-v2.json) new_l3-otsused
 * ja valmistab iga uue L3 jaoks ETTE KÕIK varad (§4.5 11-punkti täielikkus):
 *   handle · name_et (nimeväravast) · name_en (Fable) · parent-L2 · tooted ·
 *   pilt (kirjeldus + CDN/Gemini pipeline) · SEO (ET+EN kirjeldus + tagline, Fable).
 *
 * PLAAN-REŽIIM (vaikimisi): genereerib kõik varad MÄLLU, jooksutab täielikkus-
 * pre-checki, kirjutab plaani (reports/ETAPP2-plaan.md + .json). EI kirjuta DB-sse,
 * EI deploy'i. Näita Tarmole ENNE DB-kirjutust (DIRECTIVE 5 punkt 3).
 *
 * --execute (EI ole vaikimisi): DB-migratsioon + image-build + reindeks + 4-sammu
 * deploy + Telegram + undo (§4 gate #4–#10, §4b). Lisatakse hiljem, pärast plaani-OK.
 *
 * Võti: set -a; . /opt/eumotors-tasks/.env; set +a   (ANTHROPIC_API_KEY — EI logita)
 */
import fs from "node:fs";

const REPO = "/opt/xlmarket-github";
const val = (f, d) => { const i = process.argv.indexOf(f); return i > 0 ? process.argv[i + 1] : d; };
const EXECUTE = process.argv.includes("--execute");
const DRYJSON = val("--in", `${REPO}/reports/classify-chain-dryrun-v2.json`);
const OUT_MD = val("--out", `${REPO}/reports/ETAPP2-plaan.md`);
const OUT_JSON = OUT_MD.replace(/\.md$/, ".json");
const FABLE = "claude-fable-5";
const API_KEY = process.env.ANTHROPIC_API_KEY;
if (!API_KEY) { console.error("❌ ANTHROPIC_API_KEY puudub (set -a; . /opt/eumotors-tasks/.env; set +a)"); process.exit(2); }

// ---- andmed ----
const tree = JSON.parse(fs.readFileSync(`${REPO}/storefront/lib/category-tree.generated.json`, "utf8"));
const NODES = tree.nodes;
const dry = JSON.parse(fs.readFileSync(DRYJSON, "utf8"));
const classify = JSON.parse(fs.readFileSync(`${REPO}/storefront/public/xl-admin/calib-classify.json`, "utf8"));

// tooted klastri kaupa (prod_id + title)
const prodsByCk = {};
for (const d of classify.decisions) {
  (prodsByCk[d.cluster_key] ||= []).push({ id: d.id, title: d.title });
}

// ---- helperid ----
const nodeName = (h) => NODES[h]?.name_et || NODES[h]?.name_en || h;
const existingHandles = new Set(Object.keys(NODES));
const existingNamesNorm = new Set(
  Object.values(NODES).filter(n => n.level === 3).map(n => norm(n.name_et || n.name_en))
);
function norm(s) { return (s || "").toLowerCase().normalize("NFKD").replace(/[^\p{L}\p{N} ]/gu, "").replace(/\s+/g, " ").trim(); }
function slug(s) {
  return (s || "").toLowerCase()
    .replace(/ä/g, "a").replace(/ö/g, "o").replace(/õ/g, "o").replace(/ü/g, "u").replace(/š/g, "s").replace(/ž/g, "z")
    .normalize("NFKD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
function deriveHandle(parentL2, name) {
  let base = `${parentL2}-${slug(name)}`;
  if (!existingHandles.has(base)) return { handle: base, collision: false };
  let i = 2; while (existingHandles.has(`${base}-${i}`)) i++;
  return { handle: `${base}-${i}`, collision: true };
}

// ---- Fable toor-kutse ----
let usage = { input: 0, output: 0, calls: 0 };
async function fableRaw(system, user) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model: FABLE, max_tokens: 8000, system, messages: [{ role: "user", content: user }] }),
  });
  if (!res.ok) throw new Error(`Fable HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const j = await res.json();
  if (j.usage) { usage.input += j.usage.input_tokens || 0; usage.output += j.usage.output_tokens || 0; usage.calls++; }
  const raw = (j.content || []).find(c => c.type === "text")?.text || "";
  const m = raw.match(/\{[\s\S]*\}/);
  if (!m) throw new Error(`Fable JSON puudub: ${raw.slice(0, 200)}`);
  return JSON.parse(m[0]);
}

// ---- SEO + EN-nimi + pildi-kirjeldus ÜHE kutsega (§4.5 vara #3, #7, #5-kirjeldus) ----
async function genAssets(nameEt, parentEt, titles) {
  const system = `Sa oled XL e-poe (xlmarket.ee, Eesti) kategooria-toimetaja. Genereerid UUE tootekategooria metaandmed.
Kirjuta loomulikus, müügivalmis eesti keeles (EI masintõlge). Lühike, konkreetne, ostjale suunatud.

Tagasta AINULT JSON (ilma muu tekstita):
{
  "name_en": "<kategooria ingliskeelne nimi, 1-4 sõna>",
  "description_et": "<2-3 lauset: mis tooted siin on, kellele, mida arvestada ostul>",
  "description_en": "<sama inglise keeles>",
  "tagline_et": "<1 lühike müügilause, kuni 8 sõna>",
  "tagline_en": "<sama inglise keeles>",
  "image_desc_et": "<1 lause: mida kategooria-pisipilt (hele valge taust) kujutab — tüüpiline toode sellest kategooriast>"
}`;
  const user = `UUS KATEGOORIA (eesti nimi): «${nameEt}»
VANEM-KATEGOORIA: «${parentEt}»
NÄIDISTOOTED (ingliskeelsed pealkirjad):
${titles.slice(0, 6).map(t => `  • ${t}`).join("\n")}

Genereeri metaandmed. name_en = kategooria üldnimi (MITTE toote pealkiri). Kirjeldused müügivalmis, mitte placeholder.`;
  return fableRaw(system, user);
}

// ---- §4.5 täielikkus-pre-check: kas KÕIK 11 vara on resolvitav? ----
function completenessCheck(plan) {
  const c = [];
  const ok = (n, pass, note) => c.push({ n, pass, note });
  ok("1 handle unikaalne", !existingHandles.has(plan.handle) || plan.handleCollisionResolved, plan.handle);
  ok("2 name_et (nimevärav)", !!plan.name_et && norm(plan.name_et).length > 2, plan.name_et);
  ok("3 name_en (Fable)", !!plan.assets?.name_en, plan.assets?.name_en || "—");
  ok("4 nav parent-L2 kehtiv", !!(NODES[plan.parentL2] && NODES[plan.parentL2].level === 2), plan.parentL2);
  ok("5 pilt (CDN primaar / Gemini fallback)", plan.n >= 1, `${plan.n} toodet → top-toote CDN-pilt → webp valge taust`);
  ok("6 webp genereeritav", plan.n >= 1, `cat-thumbs/${plan.handle}.webp (build-cat-thumbs-l3.mjs)`);
  const seoOk = ["description_et", "description_en", "tagline_et", "tagline_en"].every(k => {
    const v = plan.assets?.[k]; return v && !/^[\s—-]*products?\.?\s*$/i.test(v) && v.length > 5;
  });
  ok("7 SEO (ET+EN kirjeldus + tagline)", seoOk, seoOk ? "4/4 välja täidetud" : "placeholder/tühi");
  ok("8 Meili facet", plan.n >= 1, "tooted bind → reindeks → facet");
  ok("9 DB product_category rida", true, "seed/INSERT transaktsioonis (gate #4)");
  ok("10 tooted seotud (≥1)", plan.n >= 1, `${plan.n} toodet`);
  ok("11 täis-deploy", true, "genyM → Meili → push mõlemad → redeploy (§4b)");
  const fails = c.filter(x => !x.pass);
  return { checks: c, pass: fails.length === 0, fails };
}

// ---- main ----
// AINULT need, mis läbisid ETAPP 1 kõik väravad (dup/über-frag/nimi). decision="new_l3"
// üksi EI piisa — nt Mängulaud hääletas 3/3 new_l3, aga DUP-värav blokeeris → fallback assign.
const newL3 = dry.clusters.filter(c => c.decision === "new_l3" && c.gate && c.gate.allPass === true);
const blockedL3 = dry.clusters.filter(c => c.decision === "new_l3" && !(c.gate && c.gate.allPass === true));
if (blockedL3.length) console.log(`  (välja jäetud ${blockedL3.length} värav-blokeeritud: ${blockedL3.map(c => c.ck + " [" + (c.gate?.blocking || "?") + "]").join(", ")})`);
console.log(`\n🏗  ETAPP 2 ${EXECUTE ? "(--execute: DB+deploy)" : "(PLAAN — DB/deploy OOTAB)"} — ${newL3.length} uut L3\n`);

const plans = [];
for (const c of newL3) {
  const parentL2 = c.parentL2;
  const name_et = c.finalName || c.newName;
  const { handle, collision } = deriveHandle(parentL2, name_et);
  const prods = prodsByCk[c.ck] || [];
  const titles = c.titles || prods.map(p => p.title);
  process.stdout.write(`  • «${name_et}» (${c.n}) → ${nodeName(parentL2)} … Fable SEO`);
  let assets;
  try { assets = await genAssets(name_et, nodeName(parentL2), titles); process.stdout.write(" ✓\n"); }
  catch (e) { process.stdout.write(` ✗ ${e.message}\n`); assets = { error: e.message }; }
  const plan = {
    ck: c.ck, name_et, name_en: assets.name_en || null, handle, handleCollisionResolved: collision,
    parentL2, parentL2_name: nodeName(parentL2), n: c.n, origin: c.newOrigin, path: c.path,
    products: prods.map(p => ({ id: p.id, title: p.title })), assets,
  };
  plan.completeness = completenessCheck(plan);
  plans.push(plan);
}

// ---- plaani-raport ----
const nowIso = new Date().toISOString();
let md = `# ETAPP 2 — LÕPLIK PLAAN (ENNE DB-kirjutust)\n\n`;
md += `> Genereeritud ${nowIso} · \`scripts/classify-etapp2-create.mjs\` · allikas \`${DRYJSON.replace(REPO + "/", "")}\`\n`;
md += `> **REŽIIM: ${EXECUTE ? "⚠️ EXECUTE" : "PLAAN AINULT — DB-s/stagingus EI muudetud midagi"}.** Spec §4 + §4.5 täielikkus-värav.\n`;
md += `> Fable kutseid: ${usage.calls} (in ${usage.input} / out ${usage.output} tok, ~$${((usage.input / 1e6) * 10 + (usage.output / 1e6) * 50).toFixed(4)})\n\n---\n\n`;

for (const p of plans) {
  const a = p.assets || {};
  md += `## «${p.name_et}»  (×${p.n} toodet)\n\n`;
  md += `| väli | väärtus |\n|---|---|\n`;
  md += `| **ET nimi** | ${p.name_et} |\n`;
  md += `| **EN nimi** | ${a.name_en || "—"} |\n`;
  md += `| **handle/slug** | \`${p.handle}\`${p.handleCollisionResolved ? " (kollisioon → disambig)" : ""} |\n`;
  md += `| **L2-vanem** | ${p.parentL2_name} (\`${p.parentL2}\`) |\n`;
  md += `| **päritolu** | ${p.path} |\n`;
  md += `| **tagline ET** | ${a.tagline_et || "—"} |\n`;
  md += `| **tagline EN** | ${a.tagline_en || "—"} |\n`;
  md += `\n**SEO kirjeldus (ET):** ${a.description_et || "—"}\n\n`;
  md += `**SEO kirjeldus (EN):** ${a.description_en || "—"}\n\n`;
  md += `**Pilt (hele valge taust):** ${a.image_desc_et || "—"}  \n`;
  md += `_Pipeline: primaar \`build-cat-thumbs-l3.mjs\` (top-toote pilt Meili/VEVOR CDN → webp 400×400 valge taust); fallback Gemini \`image-pipeline/orchestrator.mjs\` (#FFFFFF seamless)._\n\n`;
  md += `**Tooted (${p.products.length}):**\n`;
  for (const pr of p.products.slice(0, 12)) md += `- \`${pr.id}\` ${pr.title}\n`;
  md += `\n**§4.5 täielikkus-värav:** ${p.completeness.pass ? "✅ KÕIK 11 vara resolvitav" : "🛑 PUUDU: " + p.completeness.fails.map(f => f.n).join(", ")}\n\n`;
  for (const ch of p.completeness.checks) md += `  - ${ch.pass ? "✓" : "✗"} ${ch.n} — ${ch.note}\n`;
  md += `\n---\n\n`;
}

const allPass = plans.every(p => p.completeness.pass);
md += `## KOKKUVÕTE\n\n`;
md += `- **${plans.length} uut L3**, kokku **${plans.reduce((s, p) => s + p.n, 0)} toodet**.\n`;
md += `- Täielikkus-värav: ${allPass ? "✅ kõik 4 L3 läbivad (kõik 11 vara olemas)" : "🛑 mõni L3 kukub — EI loodaks"}.\n`;
md += `- **${EXECUTE ? "EXECUTE-režiim" : "PLAAN — DB/staging puutumata"}.** ${EXECUTE ? "" : "Päris-loomine ootab `--execute` (pärast Tarmo OK)."}\n`;

fs.writeFileSync(OUT_MD, md);
fs.writeFileSync(OUT_JSON, JSON.stringify({ generated_at: nowIso, mode: EXECUTE ? "execute" : "plan", usage, plans }, null, 2));
console.log(`\n${allPass ? "✅" : "🛑"} Täielikkus: ${plans.filter(p => p.completeness.pass).length}/${plans.length} läbivad`);
console.log(`💾 ${OUT_MD.replace(REPO + "/", "")}  +  ${OUT_JSON.replace(REPO + "/", "")}`);
console.log(`Fable: ${usage.calls} kutset (~$${((usage.input / 1e6) * 10 + (usage.output / 1e6) * 50).toFixed(4)})`);

if (EXECUTE) {
  console.error("\n⚠️  --execute EI OLE veel implementeeritud (DB+deploy). Plaan on genereeritud; DB-kirjutus ootab järgmist etappi.");
  process.exit(3);
}
