#!/usr/bin/env node
/**
 * en-pack-backfill.mjs — EN-paketi täis-backfill: kategooria EN-nimed + ET/EN SEO-tekstid.
 *
 * SSoT = DB (HARD RULE #5 — üks transform, kaks kutsujat):
 *   • NIMI: scripts/lib/en-name.mjs (Sonnet+Opus konsensus → Fable viigimurdja/värav → stiil-norm)
 *   • SEO:  scripts/lib/l3-gates.mjs buildAssetsPrompt + seoClaimGate (Sonnet, kategooria tervikuna)
 *   Sama moodulid jooksevad classify-etapp2-create hookis (uue L3 sünnil) → backfill ja hook ei lahkne.
 *
 * Kirjutab: taxonomy_node_translation (locale='en', name) + taxonomy_node_seo (desc/tagline ET+EN).
 *
 * TINGIMUSED (Tarmo GO 2026-10-13):
 *   • Batch API (−50%)  • stack-lukk DB-kirjutusel  • undo (sidecar ledger)
 *   • parse-retry inline (max 2×, skip-not-block)   • usage-limit → peatu ohutult + checkpoint + Telegram
 *   • ÜHTNE STIIL nimeväravas (styleNormalize, mitte käsitsi)
 *
 * Käsk:
 *   node scripts/en-pack-backfill.mjs --sample 20            # DRY (vaikimisi): 20 juhuslikku, EI kirjuta DB
 *   node scripts/en-pack-backfill.mjs --sample 20 --execute  # kirjuta DB (stack-lukk)
 *   node scripts/en-pack-backfill.mjs --handles h1,h2 --execute
 *   node scripts/en-pack-backfill.mjs --all --execute        # kogu korpus (~1970)
 *   node scripts/en-pack-backfill.mjs --all --execute --batch-id <id>   # jätka pooleli jäänut (resume)
 *
 * Tulemus/undo-ledger: reports/en-pack-batches/<batch_id>.json
 * Undo: node scripts/en-pack-undo.mjs <batch_id>
 */
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import {
  glossaryEtToEn, glossaryHints, TRANSLATE_SYS, translateUser,
  ENGATE_SYS, engateUser, parseNameJson, reconcile, finalizeFromGate,
} from "./lib/en-name.mjs";
import { buildAssetsPrompt, seoClaimGate } from "./lib/l3-gates.mjs";
import { runChunk, chunk } from "./lib/content-batch.mjs";
import { acquireStackLock } from "./lib/stack-lock.mjs";
import { sendTelegram, isUsageLimitError } from "./lib/spend-guard.mjs";

const REPO = "/opt/xlmarket-github";
const GLOSSARY = `${REPO}/backend/src/data/glossary.yaml`;
const LEDGER_DIR = `${REPO}/reports/en-pack-batches`;
const argv = process.argv.slice(2);
const has = (f) => argv.includes(f);
const val = (f) => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : null; };

const EXECUTE = has("--execute");
const SAMPLE = val("--sample") ? Number(val("--sample")) : null;
const HANDLES = val("--handles") ? val("--handles").split(",").map(s => s.trim()).filter(Boolean) : null;
const ALL = has("--all");
const BATCH_ID = val("--batch-id") || `enpack-${new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)}`;

// Mudelid (claude-api skill): tõlge=Sonnet+Opus, SEO=Sonnet, nimevärav/viigimurdja=Fable.
const M_SONNET = "claude-sonnet-5";
const M_OPUS = "claude-opus-4-8";
const M_FABLE = "claude-fable-5";

const API_KEY = process.env.ANTHROPIC_API_KEY;
if (!API_KEY) { console.error("🔴 ANTHROPIC_API_KEY puudub (set -a; . /opt/eumotors-tasks/.env; set +a)"); process.exit(2); }

// DB-konteineri id võib muutuda, kui Coolify stacki ümber loob (HARD RULE #7/#9 intsident
// 2026-10-13 22:02: luku-väline redeploy kukutas backfilli keset osa 2). Re-resolvime + retry.
function resolveDB() {
  const n = execSync("docker ps --format '{{.Names}}' | grep -E '^db-k33g' | head -1", { encoding: "utf8" }).trim();
  if (!n) { console.error("🔴 db-k33g konteiner ei leitud"); process.exit(2); }
  return n;
}
let DB = resolveDB();
const isStaleContainer = (e) => /No such container|is not running|Cannot connect to the Docker daemon/i.test(String(e?.message || e));

// ── DB read helper — psql tagastab JSON (json_agg) → eraldaja-probleem puudub (tab/newline tiitlites turvaline) ──
// SQL peab olema vormis: SELECT coalesce(json_agg(...), '[]') FROM (...) t;
function psqlJson(sql) {
  for (let a = 0; a < 2; a++) {
    try {
      const out = execSync(`docker exec -i ${DB} psql -U xlmarket -d xlmarket -At`,
        { input: sql, encoding: "utf8", maxBuffer: 512 * 1024 * 1024 }).trim();
      return out ? JSON.parse(out) : [];
    } catch (e) { if (a === 0 && isStaleContainer(e)) { DB = resolveDB(); continue; } throw e; }
  }
}
function psqlWrite(sqlText) {
  for (let a = 0; a < 2; a++) {
    try {
      execSync(`docker exec -i ${DB} psql -U xlmarket -d xlmarket -v ON_ERROR_STOP=1 --single-transaction`,
        { input: sqlText, encoding: "utf8", stdio: ["pipe", "inherit", "inherit"] });
      return;
    } catch (e) { if (a === 0 && isStaleContainer(e)) { DB = resolveDB(); continue; } throw e; }
  }
}
const sq = (s) => `'${String(s ?? "").replace(/'/g, "''")}'`;         // SQL string literal
const sqN = (s) => s == null ? "NULL" : sq(s);                         // nullable

// ── Inline (immediate) kutse — parse-retry jaoks (mitte batch) ──
async function inlineCall(model, system, user, maxTokens) {
  const body = { model, max_tokens: maxTokens, system, messages: [{ role: "user", content: user }] };
  if (model === M_FABLE) body.max_tokens = Math.max(maxTokens, 3000); // Fable thinking always-on
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": API_KEY, "anthropic-version": "2023-06-01" },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) { const e = new Error(`inline HTTP ${res.status}: ${JSON.stringify(json).slice(0, 200)}`); e._json = json; throw e; }
  return textOf(json);
}
function textOf(message) {
  if (!message?.content) return "";
  return message.content.filter(b => b.type === "text").map(b => b.text).join("\n");
}

// ── Batch params builders ──
function pName(model, system, user) {
  const b = { model, max_tokens: 500, system, messages: [{ role: "user", content: user }] };
  if (model === M_FABLE) b.max_tokens = 3000;
  return b;
}
function pSeo(system, user) {
  return { model: M_SONNET, max_tokens: 1400, system, messages: [{ role: "user", content: user }] };
}

// ── Targets DB-st ──
function loadTargets() {
  // handle, node_id, name_et (=product_category.name), parent_et
  let where = "pc.deleted_at IS NULL AND pc.is_active = true";
  if (HANDLES) where += ` AND pc.handle = ANY(string_to_array(${sq(HANDLES.join(","))}, ','))`;
  const rows = psqlJson(`
    SELECT coalesce(json_agg(t), '[]') FROM (
      SELECT pc.id, pc.handle, pc.name AS name_et, COALESCE(parent.name,'') AS parent_et
      FROM product_category pc
      LEFT JOIN product_category parent ON parent.id = pc.parent_category_id
      WHERE ${where}
      ORDER BY ${SAMPLE && !HANDLES ? "random()" : "pc.handle"}
      ${SAMPLE && !HANDLES ? `LIMIT ${SAMPLE}` : ""}
    ) t;`);
  const targets = rows.map(r => ({ id: r.id, handle: r.handle, nameEt: r.name_et, parentEt: r.parent_et }));
  // titles (≤6 published per cat)
  const ids = targets.map(t => t.id);
  const titlesByCat = new Map();
  if (ids.length) {
    const trows = psqlJson(`
      SELECT coalesce(json_agg(t), '[]') FROM (
        SELECT product_category_id AS cid, title FROM (
          SELECT pcp.product_category_id, p.title,
                 row_number() OVER (PARTITION BY pcp.product_category_id ORDER BY p.id) rn
          FROM product_category_product pcp
          JOIN product p ON p.id = pcp.product_id
          WHERE p.status='published' AND p.deleted_at IS NULL
            AND pcp.product_category_id = ANY(string_to_array(${sq(ids.join(","))}, ','))
        ) q WHERE rn <= 6
      ) t;`);
    for (const { cid, title } of trows) {
      if (!titlesByCat.has(cid)) titlesByCat.set(cid, []);
      titlesByCat.get(cid).push(title);
    }
  }
  for (const t of targets) t.titles = titlesByCat.get(t.id) || [];
  return targets;
}

// ── Checkpoint / ledger ──
function ledgerPath() { return path.join(LEDGER_DIR, `${BATCH_ID}.json`); }
function loadLedger() {
  const p = ledgerPath();
  if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, "utf8"));
  return { batch_id: BATCH_ID, created_at: new Date().toISOString(), done: {}, prev: {}, skipped: {}, samples: [] };
}
function saveLedger(l) { fs.mkdirSync(LEDGER_DIR, { recursive: true }); fs.writeFileSync(ledgerPath(), JSON.stringify(l, null, 2)); }

// ── DB-vaikuse aken (öine pipeline 03:00; Tarmo: ära kirjuta 02:45–04:30) ──
// LLM-batch-töö jookseb edasi (read-only API), AINULT DB-kirjutus ootab akna läbi.
function quietWindowMsRemaining() {
  const now = new Date();
  const mins = now.getHours() * 60 + now.getMinutes();
  const START = 2 * 60 + 45, END = 4 * 60 + 30;           // 02:45 .. 04:30 (local CEST)
  if (mins >= START && mins < END) {
    const end = new Date(now); end.setHours(4, 30, 0, 0);
    return end.getTime() - now.getTime();
  }
  return 0;
}
async function waitOutQuietWindow(ledger) {
  let rem = quietWindowMsRemaining();
  if (rem <= 0) return;
  const msg = `🟡 EN-backfill DB-vaikuse aknas (02:45–04:30) — DB-kirjutus OOTAB ~${Math.ceil(rem / 60000)} min (öine pipeline 03:00). Batch-LLM-töö tehtud, ainult kirjutus pausil.`;
  console.log(msg);
  if (EXECUTE) sendTelegram(msg);
  saveLedger(ledger);                                      // checkpoint enne pausi
  while (quietWindowMsRemaining() > 0 && !STOPPED) {
    await new Promise(r => setTimeout(r, 60_000));
  }
  console.log("🟢 EN-backfill: vaikuse aken möödas, jätkan DB-kirjutust.");
}

// ── Usage-limit safe-stop ──
let STOPPED = false;
function safeStop(reason, ledger) {
  STOPPED = true;
  saveLedger(ledger);
  const msg = `🟠 EN-backfill PEATUS ohutult (usage-limit?) batch=${BATCH_ID}\n${reason}\n` +
    `Tehtud: ${Object.keys(ledger.done).length} · jätka: node scripts/en-pack-backfill.mjs --all --execute --batch-id ${BATCH_ID}`;
  console.error(msg);
  if (EXECUTE) sendTelegram(msg);
}

(async () => {
  console.log(`🌐 EN-backfill · batch=${BATCH_ID} · ${EXECUTE ? "EXECUTE" : "DRY"} · DB=${DB}`);
  const etToEn = glossaryEtToEn(GLOSSARY);
  const ledger = loadLedger();
  let targets = loadTargets();
  const before = targets.length;
  targets = targets.filter(t => !ledger.done[t.handle]);          // resume: jäta tehtud vahele
  console.log(`📋 ${before} sihtmärki · ${before - targets.length} juba tehtud (resume) · ${targets.length} töös`);
  if (!targets.length) { console.log("✓ kõik tehtud"); return; }

  const CHUNK = 400;                                               // batch-request osa (osaline progress)
  const groups = chunk(targets, CHUNK);
  const results = [];                                             // {handle, nameEt, name_en, seo, nameGate, seoGate}

  for (let gi = 0; gi < groups.length && !STOPPED; gi++) {
    const grp = groups[gi];
    console.log(`\n━━ osa ${gi + 1}/${groups.length} (${grp.length} kat) ━━`);
    const hintsOf = new Map();
    for (const t of grp) hintsOf.set(t.handle, glossaryHints(t.nameEt, etToEn));
    const ix = new Map(grp.map((t, i) => [t.handle, i]));           // handle→indeks (custom_id ≤64 nõue)

    // ── BATCH A: tõlge (Sonnet+Opus) + SEO (Sonnet) ──
    const reqA = [];
    for (const t of grp) {
      const i = ix.get(t.handle), h = hintsOf.get(t.handle);
      const uTr = translateUser(t.nameEt, t.parentEt, t.titles, h);
      reqA.push({ custom_id: `trS_${i}`, params: pName(M_SONNET, TRANSLATE_SYS, uTr) });
      reqA.push({ custom_id: `trO_${i}`, params: pName(M_OPUS, TRANSLATE_SYS, uTr) });
      const { system, user } = buildAssetsPrompt(t.nameEt, t.parentEt, t.titles);
      reqA.push({ custom_id: `seo_${i}`, params: pSeo(system, user) });
    }
    let A;
    try { A = await runChunk(reqA, API_KEY, { label: "A" }); }
    catch (e) { if (isUsageLimitError(e) || isUsageLimitError(e._json)) return safeStop(`BATCH A: ${e.message}`, ledger); throw e; }
    console.log(`  A valmis: ${JSON.stringify(A.counts)} (batch ${A.batchId})`);
    const aMap = new Map(A.results.map(r => [r.custom_id, r]));
    if (A.results.some(r => !r.ok && /credit|usage|insufficient/i.test(r.error || ""))) return safeStop("BATCH A usage-limit tulemustes", ledger);

    // ── parse A + reconcile ──
    const perCat = new Map();
    for (const t of grp) {
      const i = ix.get(t.handle);
      const rS = aMap.get(`trS_${i}`), rO = aMap.get(`trO_${i}`), rSeo = aMap.get(`seo_${i}`);
      let sName = null, oName = null, seo = null;
      try { sName = parseNameJson(textOf(rS?.message)).name_en; } catch { sName = await retryName(M_SONNET, TRANSLATE_SYS, translateUser(t.nameEt, t.parentEt, t.titles, hintsOf.get(t.handle))); }
      try { oName = parseNameJson(textOf(rO?.message)).name_en; } catch { oName = await retryName(M_OPUS, TRANSLATE_SYS, translateUser(t.nameEt, t.parentEt, t.titles, hintsOf.get(t.handle))); }
      try { seo = parseSeo(textOf(rSeo?.message)); } catch { seo = await retrySeo(t); }
      perCat.set(t.handle, { sName, oName, seo });
    }

    // ── BATCH B: Fable nimevärav/viigimurdja (1 kutse/kat; konsensus→kinnitus, lahku→vali) ──
    const reqB = [];
    for (const t of grp) {
      const { sName, oName } = perCat.get(t.handle);
      if (!sName && !oName) continue;
      const { agree } = reconcile(sName || oName, oName || sName);
      const candidates = agree ? [sName || oName] : [sName, oName].filter(Boolean);
      reqB.push({ custom_id: `gate_${ix.get(t.handle)}`, params: pName(M_FABLE, ENGATE_SYS, engateUser(t.nameEt, candidates, t.titles, hintsOf.get(t.handle))) });
    }
    let B;
    try { B = await runChunk(reqB, API_KEY, { label: "B" }); }
    catch (e) { if (isUsageLimitError(e) || isUsageLimitError(e._json)) return safeStop(`BATCH B: ${e.message}`, ledger); throw e; }
    console.log(`  B valmis: ${JSON.stringify(B.counts)} (batch ${B.batchId})`);
    const bMap = new Map(B.results.map(r => [r.custom_id, r]));

    // ── finalize nimi + SEO-värav → kogu C-kandidaadid ──
    const seoFailCats = [];
    for (const t of grp) {
      const pc = perCat.get(t.handle);
      const fallback = pc.sName || pc.oName || t.nameEt;
      let gate = null;
      const rG = bMap.get(`gate_${ix.get(t.handle)}`);
      try { gate = rG?.ok ? parseNameJson(textOf(rG.message)) : null; } catch { gate = null; }
      const fin = finalizeFromGate(gate, fallback);
      pc.name_en = fin.name;
      pc.nameGate = fin.gate ? { accurate: fin.gate.accurate, natural: fin.gate.natural, term_at_start: fin.gate.term_at_start } : null;
      // SEO-värav
      const sg = pc.seo ? seoClaimGate(pc.seo) : { pass: false, offenders: ["seo puudub"] };
      pc.seoGate = sg;
      if (!sg.pass) seoFailCats.push(t);
    }

    // ── BATCH C: SEO regen kukkunutele (avoidNote), 1 ring; jääk → skip-not-block ──
    if (seoFailCats.length) {
      console.log(`  SEO-värav kukkus: ${seoFailCats.length} → BATCH C regen`);
      const reqC = [];
      for (const t of seoFailCats) {
        const off = perCat.get(t.handle).seoGate.offenders.join("; ");
        const { system, user } = buildAssetsPrompt(t.nameEt, t.parentEt, t.titles, `Eemalda KÕIK: ${off}. ÄRA kasuta ühtegi numbrit ega tehnilist lubadust — kirjelda kategooriat üldiselt.`);
        reqC.push({ custom_id: `seo2_${ix.get(t.handle)}`, params: pSeo(system, user) });
      }
      let C;
      try { C = await runChunk(reqC, API_KEY, { label: "C" }); }
      catch (e) { if (isUsageLimitError(e) || isUsageLimitError(e._json)) return safeStop(`BATCH C: ${e.message}`, ledger); throw e; }
      console.log(`  C valmis: ${JSON.stringify(C.counts)} (batch ${C.batchId})`);
      const cMap = new Map(C.results.map(r => [r.custom_id, r]));
      for (const t of seoFailCats) {
        const pc = perCat.get(t.handle);
        let seo2 = null;
        try { const r = cMap.get(`seo2_${ix.get(t.handle)}`); seo2 = r?.ok ? parseSeo(textOf(r.message)) : null; } catch { seo2 = null; }
        if (seo2) { const sg = seoClaimGate(seo2); if (sg.pass) { pc.seo = seo2; pc.seoGate = sg; } else pc.seoGate = sg; }
      }
    }

    // ── kogu tulemused + skip-logi (SEO-värav ikka fail → nimi kirjutatakse, SEO vahele) ──
    for (const t of grp) {
      const pc = perCat.get(t.handle);
      results.push({ handle: t.handle, id: t.id, nameEt: t.nameEt, name_en: pc.name_en,
        seo: pc.seoGate.pass ? pc.seo : null, nameGate: pc.nameGate, seoGate: pc.seoGate });
      if (!pc.seoGate.pass) ledger.skipped[t.handle] = { reason: "seo-gate", offenders: pc.seoGate.offenders };
    }

    // ── KIRJUTA DB (stack-lukk) — osade kaupa, et katkemisel tehtu püsiks ──
    if (EXECUTE) await writeChunk(grp, perCat, ledger);
    else { for (const t of grp) ledger.done[t.handle] = { dry: true }; saveLedger(ledger); }
  }

  // ── 20 juhuslikku näidist raportisse (nimi + SEO) ──
  ledger.samples = results.slice(0, 40);
  saveLedger(ledger);

  const named = results.filter(r => r.name_en).length;
  const seoOk = results.filter(r => r.seo).length;
  const seoSkip = Object.keys(ledger.skipped).length;
  const sum = `${EXECUTE ? "✅" : "🟡 DRY"} EN-backfill valmis · batch=${BATCH_ID}\n` +
    `nimi: ${named}/${results.length} · SEO: ${seoOk}/${results.length} · SEO-skip: ${seoSkip}`;
  console.log(`\n${sum}`);
  console.log(`📄 ledger: ${ledgerPath()}`);
  if (EXECUTE) sendTelegram(sum);

  // ── parse-retry helperid (inline, max 2×) ──
  async function retryName(model, sys, user) {
    for (let a = 1; a <= 2; a++) {
      try { return parseNameJson(await inlineCall(model, sys, user, 500)).name_en; }
      catch (e) { if (isUsageLimitError(e) || isUsageLimitError(e._json)) { safeStop(`retryName: ${e.message}`, ledger); return null; } }
    }
    return null;
  }
  async function retrySeo(t) {
    const { system, user } = buildAssetsPrompt(t.nameEt, t.parentEt, t.titles);
    for (let a = 1; a <= 2; a++) {
      try { return parseSeo(await inlineCall(M_SONNET, system, user, 1400)); }
      catch (e) { if (isUsageLimitError(e) || isUsageLimitError(e._json)) { safeStop(`retrySeo: ${e.message}`, ledger); return null; } }
    }
    return null;
  }
})().catch(e => { console.error(`🔴 ${e.stack || e.message}`); if (EXECUTE) sendTelegram(`🔴 EN-backfill KUKKUS batch=${BATCH_ID}: ${e.message}`); process.exit(1); });

// ── SEO parse (sama robustsus kui parseNameJson) ──
function parseSeo(raw) {
  const t = (raw || "").replace(/```(?:json)?/gi, "").trim();
  const m = t.match(/\{[\s\S]*\}/);
  if (!m) throw new Error(`SEO JSON puudub: ${t.slice(0, 120)}`);
  const o = JSON.parse(m[0]);
  return { description_et: o.description_et, description_en: o.description_en, tagline_et: o.tagline_et, tagline_en: o.tagline_en, image_desc_et: o.image_desc_et };
}

// ── DB-kirjutus ühe osa kohta (stack-lukk, transaktsioon, prev-väärtused undo jaoks) ──
async function writeChunk(grp, perCat, ledger) {
  const ids = grp.map(t => t.id);
  // prev-väärtused (undo)
  const prevTr = new Map(psqlJson(`SELECT coalesce(json_agg(t),'[]') FROM (SELECT node_id, name FROM taxonomy_node_translation WHERE locale='en' AND node_id = ANY(string_to_array(${sq(ids.join(","))},','))) t;`).map(r => [r.node_id, r.name]));
  const prevSeo = new Map(psqlJson(`SELECT coalesce(json_agg(t),'[]') FROM (SELECT node_id, description_et, description_en, tagline_et, tagline_en, source_batch FROM taxonomy_node_seo WHERE node_id = ANY(string_to_array(${sq(ids.join(","))},','))) t;`).map(r => [r.node_id, r]));

  const stmts = [];
  for (const t of grp) {
    const pc = perCat.get(t.handle);
    if (!pc.name_en) continue;
    stmts.push(`INSERT INTO taxonomy_node_translation (node_id, locale, name) VALUES (${sq(t.id)}, 'en', ${sq(pc.name_en)}) ON CONFLICT (node_id, locale) DO UPDATE SET name=EXCLUDED.name, updated_at=NOW();`);
    if (pc.seoGate.pass && pc.seo) {
      stmts.push(`INSERT INTO taxonomy_node_seo (node_id, description_et, description_en, tagline_et, tagline_en, source_batch, seo_gate_pass) VALUES (${sq(t.id)}, ${sqN(pc.seo.description_et)}, ${sqN(pc.seo.description_en)}, ${sqN(pc.seo.tagline_et)}, ${sqN(pc.seo.tagline_en)}, ${sq(BATCH_ID)}, true) ON CONFLICT (node_id) DO UPDATE SET description_et=EXCLUDED.description_et, description_en=EXCLUDED.description_en, tagline_et=EXCLUDED.tagline_et, tagline_en=EXCLUDED.tagline_en, source_batch=EXCLUDED.source_batch, seo_gate_pass=true, updated_at=NOW();`);
    }
    ledger.prev[t.handle] = {
      node_id: t.id,
      tr: prevTr.has(t.id) ? prevTr.get(t.id) : null,                 // null = rida ei olnud → undo DELETE
      seo: prevSeo.has(t.id) ? prevSeo.get(t.id) : null,              // {description_et,...,source_batch} või null
    };
  }
  if (!stmts.length) return;

  await waitOutQuietWindow(ledger);                        // Tarmo: ära kirjuta DB-vaikuse aknas (02:45–04:30)
  const release = acquireStackLock({ holder: "en-pack-backfill", waitMs: Number(process.env.XL_DBWRITE_WAIT_MS) || 60_000 });
  try {
    psqlWrite(stmts.join("\n"));
    for (const t of grp) if (perCat.get(t.handle).name_en) ledger.done[t.handle] = { name_en: perCat.get(t.handle).name_en, seo: perCat.get(t.handle).seoGate.pass };
    saveLedger(ledger);
    console.log(`  💾 DB kirjutatud: ${stmts.length} lauset (${grp.length} kat)`);
  } finally { release(); }
}
