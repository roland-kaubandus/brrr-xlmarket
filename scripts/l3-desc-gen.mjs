#!/usr/bin/env node
/*
 * l3-desc-gen.mjs — LAINE 2: L3 TÜÜBIPROFIILI-KIRJELDUSED (SSoT, judge-loetav `product_category.description`).
 *
 * MIKS (Tarmo DIRECTIVE 2026-10-07, plaan #4): öine kohtunik loeb iga L3-kandidaadi `description` esimest 400
 * tähemärki ("↳ piir", candLine judge.mjs). Piirireegliga (ETAPP 2) L3-d ON juba kirjeldusega; ülejäänud
 * ~1361 L3 on ILMA → kohtunik otsustab ainult NIME järgi (nõrk). See generaator annab IGALE L3-le lühikese,
 * funktsioonipõhise (MITTE turundus) tüübiprofiili: mis TÜÜP kuulub + ET/EN märksõnad + naaber-piir.
 *
 * HARD RULE #5 — ÜKS TRANSFORM, KAKS KUTSUJAT:
 *   genDescBatch / validateDesc / descClaimGate = SAMA kood →
 *     (a) backfill-runner (see skript, --execute kõigile) JA
 *     (b) öine auto-create hook (uus L3 saab sünnil kirjelduse — genAssetsGated kõrval).
 *
 * HARD RULE #8 — EI kirjuta DB-d --dry režiimis. --execute kirjutab actor='claude-code-test' logiga + batch_id + undo.
 * ETAPP 2 PIIRIREEGLID (description LIKE 'PIIRIREEGEL%') EI KIRJUTATA ÜLE. Ka olemas-kirjeldusega L3 (nt kalastus) jäetakse vahele.
 *
 * KASUTUS (DRY, vaikimisi):
 *   set -a; . /opt/eumotors-tasks/.env; set +a
 *   node scripts/l3-desc-gen.mjs --dry --sample 10        # 10 L3 eri peakategooriast → raport, EI DB
 *   node scripts/l3-desc-gen.mjs --dry --ids pcat_x,pcat_y # kindlad L3-d
 * Väljund: reports/l3-desc-dry-<ts>.md + .json (kulu + näidised + verdiktid). EI muuda DB-d.
 */
import { execSync } from "node:child_process";
import fs from "node:fs";

const KEY = process.env.ANTHROPIC_API_KEY;
if (!KEY) { console.error("🔴 ANTHROPIC_API_KEY puudub (set -a; . /opt/eumotors-tasks/.env; set +a)."); process.exit(2); }

const GEN_MODEL   = "claude-opus-4-8";   // generaator (SSoT kvaliteet)
const JUDGE_MODEL = "claude-opus-4-8";   // kohtunik
const REF_MODEL   = "claude-sonnet-5";   // sõltumatu referents (sama kui REF_MODEL_CLSF)
const FABLE_MODEL = "claude-fable-5";    // viigimurdja lahkheli korral
// hinnad $/1M (in,out) — cache_r = in*0.1, cache_w = in*1.25
const PRICE = {
  "claude-opus-4-8":  { in: 5,  out: 25 },
  "claude-sonnet-5":  { in: 3,  out: 15 },
  "claude-fable-5":   { in: 10, out: 50 },
};

const args = process.argv.slice(2);
const has = (f) => args.includes(f);
const val = (f, d) => (has(f) ? args[args.indexOf(f) + 1] : d);
const DRY = !has("--execute");
const SAMPLE = +(val("--sample", "10"));
const IDS = has("--ids") ? val("--ids", "").split(",").map((s) => s.trim()).filter(Boolean) : null;
const MIN_PROD = +(val("--min", "3"));
const TS = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);

let DB = "";
try { DB = execSync("docker ps --format '{{.Names}}' | grep '^db-k33g' | head -1", { encoding: "utf8" }).trim(); } catch {}
if (!DB) { console.error("🔴 db-k33g konteinerit ei leitud."); process.exit(2); }
const q = (sql) => execSync(`docker exec -i ${DB} psql -U xlmarket -d xlmarket -At -F '\t' -f -`, { input: sql, encoding: "utf8" }).trim();

// ──────────────────────────── 1. SIHTMÄRK-L3-d ────────────────────────────
// Kirjeldust vajavad: L3, millel description IS NULL/tühi (EI piirireegel, EI olemas-profiil). ≥MIN_PROD toodet.
function selectTargets() {
  const where = IDS
    ? `l3.id IN (${IDS.map((i) => `'${i.replace(/[^a-zA-Z0-9_]/g, "")}'`).join(",")})`
    : `(l3.description IS NULL OR l3.description='')
       AND (SELECT count(*) FROM product_category_product WHERE product_category_id=l3.id) >= ${MIN_PROD}`;
  let rows = q(`SELECT l3.id, l3.name, l3.handle,
      split_part(l3.mpath,'.',1) mainid,
      (SELECT name FROM product_category WHERE id=split_part(l3.mpath,'.',1)) main,
      l3.parent_category_id l2id,
      (SELECT name FROM product_category WHERE id=l3.parent_category_id) l2,
      (SELECT count(*) FROM product_category_product WHERE product_category_id=l3.id) n
    FROM product_category l3
    WHERE l3.mpath LIKE 'pcat_v4_l%' AND l3.deleted_at IS NULL
      AND (char_length(l3.mpath)-char_length(replace(l3.mpath,'.','')))=2
      AND ${where}
    ORDER BY main, l2, l3.name;`)
    .split("\n").filter(Boolean)
    .map((r) => { const [id, name, handle, mainid, main, l2id, l2, n] = r.split("\t"); return { id, name, handle, mainid, main, l2id, l2, n: +n }; });

  // DRY --sample: 1 L3 igast eri peakategooriast (mitmekesisus), eelista rohkem-toodetega
  if (!IDS && SAMPLE && rows.length > SAMPLE) {
    const byMain = new Map();
    for (const r of [...rows].sort((a, b) => b.n - a.n)) if (!byMain.has(r.mainid)) byMain.set(r.mainid, r);
    rows = [...byMain.values()].sort((a, b) => a.main.localeCompare(b.main)).slice(0, SAMPLE);
  }
  // näidistooted + naaber-L3 nimed
  for (const r of rows) {
    r.titles = q(`SELECT left(p.title,95) FROM product_category_product pcp JOIN product p ON p.id=pcp.product_id
                  WHERE pcp.product_category_id='${r.id}' ORDER BY p.title LIMIT 8;`).split("\n").filter(Boolean);
    r.naabrid = q(`SELECT name FROM product_category WHERE parent_category_id='${r.l2id}' AND deleted_at IS NULL AND id<>'${r.id}' ORDER BY name;`).split("\n").filter(Boolean);
  }
  return rows;
}

// ──────────────────────────── 2. KULU-ARVESTUS ────────────────────────────
const USAGE = {};
function acc(model, u) {
  if (!u) return;
  const a = (USAGE[model] ||= { in: 0, out: 0, cr: 0, cw: 0 });
  a.in += u.input_tokens || 0; a.out += u.output_tokens || 0;
  a.cr += u.cache_read_input_tokens || 0; a.cw += u.cache_creation_input_tokens || 0;
}
function totalCost() {
  let c = 0;
  for (const [m, u] of Object.entries(USAGE)) {
    const p = PRICE[m] || { in: 0, out: 0 };
    c += (u.in / 1e6) * p.in + (u.out / 1e6) * p.out + (u.cr / 1e6) * p.in * 0.1 + (u.cw / 1e6) * p.in * 1.25;
  }
  return c;
}

async function callApi(model, system, userText, { maxTokens = 2000, schema = null, cacheSystem = true, fable = false } = {}) {
  const body = {
    model, max_tokens: maxTokens,
    thinking: fable ? undefined : { type: "adaptive" },
    ...(fable ? {} : { output_config: { effort: "low" } }),
    system: [{ type: "text", text: system, ...(cacheSystem ? { cache_control: { type: "ephemeral" } } : {}) }],
    messages: [{ role: "user", content: [{ type: "text", text: userText }] }],
  };
  if (schema) body.output_config = { ...(body.output_config || {}), format: { type: "json_schema", schema } };
  for (let attempt = 1; attempt <= 5; attempt++) {
    const ctrl = new AbortController(); const to = setTimeout(() => ctrl.abort(), 120000);
    try {
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST", signal: ctrl.signal,
        headers: { "content-type": "application/json", "x-api-key": KEY, "anthropic-version": "2023-06-01" },
        body: JSON.stringify(body),
      });
      clearTimeout(to);
      if (!r.ok) {
        const t = await r.text();
        if ((r.status === 429 || r.status === 529 || r.status >= 500) && attempt < 5) { await new Promise((s) => setTimeout(s, Math.min(30000, 1000 * 2 ** attempt))); continue; }
        throw new Error(`API ${r.status}: ${t.slice(0, 250)}`);
      }
      const j = await r.json(); acc(model, j.usage);
      const txt = (j.content.find((b) => b.type === "text") || {}).text || "";
      return txt;
    } catch (e) { clearTimeout(to); if (attempt < 5) { await new Promise((s) => setTimeout(s, Math.min(30000, 1000 * 2 ** attempt))); continue; } throw e; }
  }
}

// ──────────────────────────── 3. GENERAATOR (üks transform) ────────────────────────────
const GEN_SYSTEM = `Oled XL e-poe (xlmarket.ee, Eesti) taksonoomia TÜÜBIPROFIILI-toimetaja. Iga L3 (leht-kategooria) jaoks
kirjuta LÜHIKE funktsioonipõhine tüübiprofiil, mille öine klassifikaator-kohtunik loeb, et otsustada kas toode kuulub siia.

EESMÄRK: profiil kirjeldab TÜÜPI (otstarve/funktsioon/väljund), MITTE nime ega turundust. Feed-toode mapitakse SELLE järgi.

VORM (üks eesti lõik, kuni 360 tähemärki):
"<Mis TÜÜPI tooted + otstarve>: <konkreetsed alamtüübid ET (english keyword)>. <Kui vajalik: mis EI kuulu / naaber-piir>."
Näide-stiil: "Kahvad ja saagivõrgud kala veest tõstmiseks: teleskoopvarrega maandusvõrgud (landing net), heitevõrgud (cast net). EI sisalda püügivõrke (need: Võrgud ja mõrrad)."

REEGLID:
- FUNKTSIOONIPÕHINE, mitte turundus. EI "kvaliteetne", "parim", "soodne", "vastupidav".
- KEELATUD konkreetsed toote-numbrid/lubadused, mis EI kehti kõigile toodetele (nt "200 W", "4000 tsüklit", "veekindel", "BMS", "LiFePO4", "kandevõime 250 kg"). Mõõtühiku NIMETAMINE üldiselt on OK ("mõõdab kiirust m/s"), AGA konkreetne spec-arv EI.
- Lisa alamtüüpide ET nimi + (english feed-märksõna) — see aitab masintõlke-feed'i mappida.
- Kui naabrid tekitavad segadust (sarnane tüüp kõrval), lisa 1 lühike piir-lause "EI sisalda X (need: <naaber>)".
- Profiil peab VASTAMA L3 nimele JA näidistoodetele. Ära leiuta tüüpe, mida näidistes pole.

Vasta AINULT JSON: {"items":[{"l3_id":"...","description":"<eesti tüübiprofiil, kuni 360 tähemärki>"}]}`;

const GEN_SCHEMA = {
  type: "object", additionalProperties: false, required: ["items"],
  properties: { items: { type: "array", items: {
    type: "object", additionalProperties: false, required: ["l3_id", "description"],
    properties: { l3_id: { type: "string" }, description: { type: "string" } },
  } } },
};

async function genDescBatch(batch) {
  const blocks = batch.map((r) =>
    `### L3 id=${r.id} — nimi="${r.name}" — peakategooria="${r.main}" — L2="${r.l2}" (${r.n} toodet)
NAABER-L3-d samas L2: ${r.naabrid.join(", ") || "(pole)"}
Näidistooted:\n${r.titles.map((t) => "  • " + t).join("\n")}`).join("\n\n");
  const txt = await callApi(GEN_MODEL, GEN_SYSTEM, "GENEREERI TÜÜBIPROFIILID:\n\n" + blocks, { maxTokens: 4000, schema: GEN_SCHEMA });
  const parsed = JSON.parse(txt);
  return parsed.items || [];
}

// ──────────────────────────── 4. VÄRAV: numbrid/lubadused (tüübiprofiili-kohane) ────────────────────────────
// LÕDVEM kui seoClaimGate: lubab üldise mõõtühiku-nimetuse + alamtüüp-loendi, AGA flag'b konkreetse spec-arvu
// (number + ühik: "200 W", "250 kg", "4000 tsüklit") ja turundus/lubadus-sõnad.
const PROMISE_RE = /\b(veekind\w*|vee-?kind\w*|waterproof|niiskuskind\w*|ilmastikukind\w*|roostevaba\w*|roostekind\w*|bms|lifepo4|li-?ion|parim|kvaliteet\w*|soodsa?\w*|vastupida\w*|professionaalse?\w*|ülitugev\w*)\b/i;
const SPECNUM_RE = /\b\d[\d.,]*\s?(w|kw|v|a|ah|wh|kg|g|mm|cm|m|l|ml|bar|psi|rpm|tsükl\w*|cycle\w*|°c|hz|db|lm)\b/i;
export function descClaimGate(text) {
  const offenders = [];
  const pm = (text || "").match(PROMISE_RE); if (pm) offenders.push(`lubadus/turundus «${pm[0]}»`);
  const sm = (text || "").match(SPECNUM_RE); if (sm) offenders.push(`spec-arv «${sm[0].trim()}»`);
  if ((text || "").length > 400) offenders.push(`liiga pikk (${text.length}>400, kohtunik lõikab 400)`);
  return { pass: offenders.length === 0, offenders };
}

// ──────────────────────────── 5. VALIDEERIMINE: kohtunik + referents (konsensus), lahkheli → Fable ────────────────────────────
const VALIDATE_SYSTEM = `Oled taksonoomia-kirjelduse HINDAJA xlmarket.ee jaoks. Sulle antakse L3 (leht-kategooria) NIMI,
näidistooted ja GENEREERITUD tüübiprofiil-kirjeldus. Hinda, kas kirjeldus on ÕIGE ja KASUTATAV öisele klassifikaator-kohtunikule.

Kriteeriumid (KÕIK peavad kehtima → verdict "OK"):
1. VASTAB NIMELE — kirjeldus kirjeldab sama tüüpi, mida L3 nimi lubab.
2. VASTAB TOODETELE — näidistooted sobivad kirjelduse alla (ei leiutatud tüüpe).
3. FUNKTSIOONIPÕHINE — otstarve/tüüp, MITTE turundus ("kvaliteetne"/"parim").
4. EI VALE-LUBADUSI — ei konkreetseid spec-numbreid/lubadusi, mis ei kehti kõigile (nt "200 W", "veekindel", "BMS").

Vasta AINULT JSON: {"verdict":"OK"|"NOT_OK","matches_name":true|false,"matches_products":true|false,"issues":"<lühike eesti põhjus või tühi>"}`;
const VALIDATE_SCHEMA = {
  type: "object", additionalProperties: false, required: ["verdict", "matches_name", "matches_products", "issues"],
  properties: {
    verdict: { type: "string", enum: ["OK", "NOT_OK"] },
    matches_name: { type: "boolean" }, matches_products: { type: "boolean" },
    issues: { type: "string" },
  },
};
function validateUserMsg(r, description) {
  return `L3 NIMI: «${r.name}»  (peakategooria: ${r.main} / L2: ${r.l2})
NÄIDISTOOTED:\n${r.titles.map((t) => "  • " + t).join("\n")}

GENEREERITUD KIRJELDUS:\n«${description}»

Hinda kirjeldust.`;
}
async function validateDesc(r, description) {
  const [jTxt, rTxt] = await Promise.all([
    callApi(JUDGE_MODEL, VALIDATE_SYSTEM, validateUserMsg(r, description), { maxTokens: 1200, schema: VALIDATE_SCHEMA }),
    callApi(REF_MODEL, VALIDATE_SYSTEM, validateUserMsg(r, description), { maxTokens: 1200, schema: VALIDATE_SCHEMA }),
  ]);
  const judge = JSON.parse(jTxt), ref = JSON.parse(rTxt);
  let consensus, fable = null;
  if (judge.verdict === ref.verdict) {
    consensus = judge.verdict;
  } else {
    // lahkheli → Fable viigimurdja
    const fTxt = await callApi(FABLE_MODEL, VALIDATE_SYSTEM, validateUserMsg(r, description), { maxTokens: 1500, schema: VALIDATE_SCHEMA, fable: true });
    fable = JSON.parse(fTxt);
    consensus = fable.verdict;
  }
  return { judge, ref, fable, consensus };
}

// ──────────────────────────── 6. PÕHIVOOG (DRY) ────────────────────────────
(async () => {
  const targets = selectTargets();
  console.error(`Sihtmärke: ${targets.length} L3 (${DRY ? "DRY — EI DB" : "EXECUTE"}). Peakategooriad: ${[...new Set(targets.map((t) => t.main))].length}.`);
  if (!targets.length) { console.error("🔴 0 sihtmärki."); process.exit(1); }
  if (!DRY) { console.error("🔴 --execute ei ole veel lubatud (ootab Tarmo kinnitust). Kasuta --dry."); process.exit(1); }

  const BATCH = 6;
  const results = [];
  for (let i = 0; i < targets.length; i += BATCH) {
    const batch = targets.slice(i, i + BATCH);
    let gens = [];
    try { gens = await genDescBatch(batch); }
    catch (e) { console.error(`  gen batch ${i} VIGA: ${e.message}`); batch.forEach((r) => results.push({ ...r, description: "", error: e.message })); continue; }
    for (const r of batch) {
      const g = gens.find((x) => x.l3_id === r.id) || gens[batch.indexOf(r)];
      const description = (g && g.description || "").trim();
      const gate = descClaimGate(description);
      let validation = null;
      try { validation = await validateDesc(r, description); }
      catch (e) { validation = { error: e.message }; }
      results.push({ ...r, description, gate, validation });
      console.error(`  [${results.length}/${targets.length}] ${r.main} / ${r.name} → ${validation?.consensus || validation?.error || "?"}${gate.pass ? "" : " ⚠GATE"}`);
    }
  }

  // ── ekstrapoleerimine $25 cap vastu ──
  const FULL_TARGET = 1361; // ≥3 toodet, ilma kirjelduseta (staging seis 2026-10-07)
  const cost = totalCost();
  const perL3 = cost / targets.length;
  const extrap = perL3 * FULL_TARGET;

  // ── raport ──
  const okN = results.filter((r) => r.validation?.consensus === "OK").length;
  const gateFail = results.filter((r) => r.gate && !r.gate.pass).length;
  const disagree = results.filter((r) => r.validation?.fable).length;
  const md = [];
  md.push(`# LAINE 2 — L3 TÜÜBIPROFIILI-KIRJELDUSED · DRY RAPORT`);
  md.push(`**${TS}** · generaator=${GEN_MODEL} · kohtunik=${JUDGE_MODEL} · referents=${REF_MODEL} · viigimurdja=${FABLE_MODEL}\n`);
  md.push(`## Kokkuvõte`);
  md.push(`| Mõõdik | Väärtus |`);
  md.push(`|---|---|`);
  md.push(`| Näidiseid (eri peakategooriad) | ${targets.length} |`);
  md.push(`| Konsensus OK | ${okN}/${targets.length} |`);
  md.push(`| Värav kukkus (number/lubadus/pikkus) | ${gateFail} |`);
  md.push(`| Kohtunik↔referents lahkheli (→Fable) | ${disagree} |`);
  md.push(`| **Kulu (see DRY)** | **$${cost.toFixed(4)}** |`);
  md.push(`| Kulu / L3 | $${perL3.toFixed(4)} |`);
  md.push(`| **Ekstrapoleeritud ${FULL_TARGET} L3** | **$${extrap.toFixed(2)}** |`);
  md.push(`| Eelarve-lagi | $25.00 → ${extrap <= 25 ? "✅ MAHUB" : "🔴 ÜLETAB"} |`);
  md.push(``);
  md.push(`### Kulu mudelite kaupa`);
  md.push(`| Mudel | in | out | cache_r | cache_w |`);
  md.push(`|---|---|---|---|---|`);
  for (const [m, u] of Object.entries(USAGE)) md.push(`| ${m} | ${u.in} | ${u.out} | ${u.cr} | ${u.cw} |`);
  md.push(``);
  md.push(`## Näidiskirjeldused (${targets.length})\n`);
  for (const r of results) {
    const v = r.validation || {};
    md.push(`### ${r.main} › ${r.l2} › **${r.name}**  (${r.n} toodet)  \`${r.id}\``);
    md.push(`**Kirjeldus:** ${r.description || "(VIGA: " + (r.error || "tühi") + ")"}`);
    md.push(`**Pikkus:** ${r.description.length} · **Värav:** ${r.gate?.pass ? "✅" : "⚠ " + (r.gate?.offenders || []).join("; ")}`);
    if (v.error) md.push(`**Valideerimine:** VIGA ${v.error}`);
    else {
      md.push(`**Konsensus:** ${v.consensus === "OK" ? "✅ OK" : "🔴 NOT_OK"}${v.fable ? " (lahkheli → Fable otsustas)" : ""}`);
      md.push(`- kohtunik(${JUDGE_MODEL}): ${v.judge?.verdict} ${v.judge?.issues ? "— " + v.judge.issues : ""}`);
      md.push(`- referents(${REF_MODEL}): ${v.ref?.verdict} ${v.ref?.issues ? "— " + v.ref.issues : ""}`);
      if (v.fable) md.push(`- viigimurdja(${FABLE_MODEL}): ${v.fable?.verdict} ${v.fable?.issues ? "— " + v.fable.issues : ""}`);
    }
    md.push(`_näidistooted:_ ${r.titles.slice(0, 4).join(" · ")}`);
    md.push(``);
  }
  const dir = "/opt/eumotors-tasks/reports";
  fs.writeFileSync(`${dir}/l3-desc-dry-${TS}.json`, JSON.stringify({ ts: TS, models: { GEN_MODEL, JUDGE_MODEL, REF_MODEL, FABLE_MODEL }, cost, perL3, extrap, full_target: FULL_TARGET, usage: USAGE, results }, null, 1));
  fs.writeFileSync(`${dir}/l3-desc-dry-${TS}.md`, md.join("\n"));
  console.log(`\n🟢 DRY valmis · ${okN}/${targets.length} OK · värav-kukk ${gateFail} · lahkheli ${disagree}`);
  console.log(`💰 DRY kulu $${cost.toFixed(4)} · /L3 $${perL3.toFixed(4)} · ${FULL_TARGET} L3 ≈ $${extrap.toFixed(2)} (lagi $25 ${extrap <= 25 ? "✅" : "🔴"})`);
  console.log(`📄 reports/l3-desc-dry-${TS}.md`);
})();
