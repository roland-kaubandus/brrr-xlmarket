#!/usr/bin/env node
/**
 * pipeline-neighbor-chain.mjs — NAABRITE ÜLEHINDAMISE ÖINE HOOK (punkt 4, HARD RULE #5).
 *
 * HARD RULE #5 (üks transform, kaks kutsujat): SAMA tuum (scripts/lib/neighbor-core.mjs —
 * neighborsOf + pickClusters + reevalClusters + classifyNeighborMoves) jookseb nii
 *   (a) backfill/DRY-s (scripts/neighbor-reeval.mjs — kogu kataloog, ühekordne), kui
 *   (b) siin öises hookis (DELTA: iga äsja-sündinud L3, import-pipeline.sh [4.5], pärast klassifikaatorit).
 * Tuum ei lahkne kunagi.
 *
 * DELTA (HARD RULE #5 — hook EI jookse 18k peal): sisend = AINULT selle öö uued L3-d
 * (klassifikaatori shadow-ettepanekud VÕI auto-create loodud L3-d). Iga uue L3 kohta loetakse
 * selle NAABRITE (sama L2 pere KÕIK + semantiline top-K) olemas-tooted LIVE DB-st, klasterdatakse
 * ja jooksutatakse sama ahel → kas mõni lõksus-toode kuulub uude L3-sse PARIMA koduna (move).
 *
 * SHADOW kuni auto_create_enabled=false (classifier_config): masin läbib kogu ahela, AGA EI liiguta —
 *   logib "oleks liigutanud" review_decision_log'i (bucket_type='neighbor-shadow', status='shadow').
 *   Kui auto_create_enabled flipib true → naabri-liigutused rakenduvad LIVE (neighbor-execute.mjs kaudu:
 *   üks executor, samad väravad — transaktsioon + undo + inv + lock-harness + merge-WARN + Meili + Telegram).
 *
 * FAIL-LOUD (HARD RULE #5): üksik L3 kukub → skip + jätka + Telegram-loendur (EI peata kogu hooki).
 *   Süsteemne (API täiesti maas / krediit) → exit 3 (DEGRADE, nagu pipeline-classify-chain), laoseis jätkub.
 *
 * Kasutus:
 *   set -a; . /opt/eumotors-tasks/.env; set +a
 *   node scripts/pipeline-neighbor-chain.mjs [--from-classify <json>] [--new-l3 h1,h2] [--dry|--execute] [--k 20] [--topcl 40] [--cap-per 3]
 *   Vaikimisi = --dry. Öine cron [4.5] kutsub --execute (SHADOW-logi kuni auto_create flipib).
 */
import fs from "node:fs";
import { execSync } from "node:child_process";
import { isCreditError } from "./lib/credit-guard.mjs";
import { clusterize } from "./lib/judge.mjs";
import { getConfig, ensureShadowSchema } from "./lib/shadow-ledger.mjs";
import {
  buildNeighborCtx, neighborsOf, pickClusters, narrowCands, reevalClusters, classifyNeighborMoves,
} from "./lib/neighbor-core.mjs";

const REPO = "/opt/xlmarket-github";
const KEY = process.env.ANTHROPIC_API_KEY;
if (!KEY) { console.error("❌ ANTHROPIC_API_KEY puudub (set -a; . /opt/eumotors-tasks/.env; set +a)"); process.exit(2); }

const argv = process.argv;
const argVal = (n, d) => { const i = argv.indexOf(n); return i > 0 ? argv[i + 1] : d; };
const EXECUTE = argv.includes("--execute");
const DRY = !EXECUTE;
const FROM_CLASSIFY = argVal("--from-classify", "/tmp/pipeline-classify-chain-results.json");
const NEW_L3_ARG = argVal("--new-l3", "");
const K_SEM = parseInt(argVal("--k", "20")) || 20;
const TOP_CL_SEM = parseInt(argVal("--topcl", "40")) || 40;
const CAP_PER = parseFloat(argVal("--cap-per", "3")) || 3;   // kulu-lagi $ ühe uue L3 kohta (spets §5)
const OUT = argVal("--out", "/tmp/pipeline-neighbor-chain-results.json");

const getDB = () => execSync("docker ps --format '{{.Names}}' | grep '^db-k33g' | head -1", { encoding: "utf8" }).trim();
let DB = getDB();
if (!DB) { console.error("db-k33g konteinerit ei leitud"); process.exit(2); }
const q = (sql) => { DB = getDB(); return execSync(`docker exec -i ${DB} psql -U xlmarket -d xlmarket -tA -v ON_ERROR_STOP=1 -f -`, { input: sql, encoding: "utf8", maxBuffer: 1 << 30 }); };
const esc = (s) => (s == null ? "" : String(s).replace(/'/g, "''"));
const S = (s) => `'${esc(s)}'`;

const NOTIFY = `${REPO}/scripts/lib/notify-telegram.sh`;
const NO_TELEGRAM = process.env.CLASSIFY_HOOK_NO_TELEGRAM === "1";
function telegram(msg) {
  if (NO_TELEGRAM) { console.log(`📨 [Telegram SUPRESSITUD test-režiim]\n${msg}`); return; }
  try { execSync(`${NOTIFY}`, { input: msg, encoding: "utf8", stdio: ["pipe", "ignore", "ignore"] }); } catch {}
  console.log(`📨 Telegram:\n${msg}`);
}

// ── SSoT NODES + LIVE L3META (handle → {name, desc, l2}) ──
const NODES = JSON.parse(fs.readFileSync(`${REPO}/storefront/lib/category-tree.generated.json`, "utf8")).nodes;
function buildL3Meta() {
  const meta = {};
  const rows = q(`SELECT pc.handle, pc.name, coalesce(pc.description,''), coalesce(l2.handle,'')
    FROM product_category pc
    LEFT JOIN product_category l2 ON l2.id = pc.parent_category_id AND l2.deleted_at IS NULL
    WHERE pc.deleted_at IS NULL AND pc.mpath LIKE 'pcat_v4_l%'
      AND (char_length(pc.mpath)-char_length(replace(pc.mpath,'.','')))=2`);
  for (const line of rows.trim().split("\n")) {
    if (!line) continue;
    const [h, name, desc, l2] = line.split("|");
    meta[h] = { name: name || h, desc: desc || "", l2: l2 || NODES[h]?.parent_handle || null };
  }
  return meta;
}

// ── DELTA: selle öö uued L3-d (shadow-ettepanekud VÕI auto-create loodud) ──
function loadNewL3s(L3META) {
  // (1) käsitsi --new-l3 h1,h2 (test / taas-jooks)
  if (NEW_L3_ARG) {
    return NEW_L3_ARG.split(",").map((s) => s.trim()).filter(Boolean).map((h) => ({
      handle: h, name: L3META[h]?.name || h, l2: L3META[h]?.l2 || NODES[h]?.parent_handle || null, synthetic: !L3META[h],
    }));
  }
  // (2) klassifikaatori väljundist (shadow_names = "oleks loonud"; auto-create aktiivne → samad handle'id DB-s)
  if (!fs.existsSync(FROM_CLASSIFY)) { console.log(`ℹ️ klassifikaatori väljund puudub (${FROM_CLASSIFY}) — 0 uut L3.`); return []; }
  let J; try { J = JSON.parse(fs.readFileSync(FROM_CLASSIFY, "utf8")); } catch { return []; }
  const names = J.summary?.shadow_names || [];
  return names.map((s) => {
    // slug proposed_name'ist (ainult sünteetiline H-id; päris handle tekib alles auto-create's)
    const slug = (s.name || s.ck || "uus").toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const parentL2 = s.parentL2 || null;
    const synthH = `shadow:${parentL2 || "?"}:${slug}`;
    return { handle: synthH, name: s.name, l2: parentL2, synthetic: true, ck: s.ck };
  });
}

// ── naabri-L3-de olemas-tooted LIVE DB-st → normaliseeritud klaster-kuju (ck,n,rep,currentL3,titles) ──
function loadNeighborClusters(neighborHandles) {
  if (!neighborHandles.length) return [];
  const inList = [...neighborHandles].map(S).join(",");
  const rows = q(`SELECT jsonb_build_object(
      'id',p.id,'sku',p.metadata->>'vevor_sku','cur',pc.handle,
      'title',p.title,'title_et',p.metadata->>'title_et',
      'description',left(regexp_replace(coalesce(p.description,''),E'[\\n\\r]+',' ','g'),400),
      'meta',jsonb_build_object('vevor_spu',p.metadata->>'vevor_spu','vevor_product_type',p.metadata->>'vevor_product_type')
    )::text
    FROM product p
    JOIN product_category_product pcp ON pcp.product_id=p.id
    JOIN product_category pc ON pc.id=pcp.product_category_id
    WHERE pc.handle IN (${inList}) AND p.deleted_at IS NULL AND p.status IN ('draft','published')`);
  const prod = [];
  for (const line of rows.trim().split("\n")) { if (line.startsWith("{")) { try { prod.push(JSON.parse(line)); } catch {} } }
  if (!prod.length) return [];
  const id2cur = new Map(prod.map((p) => [p.id, p.cur]));
  const clusters = clusterize(prod.map((p) => ({ id: p.id, sku: p.sku, title: p.title, title_et: p.title_et, description: p.description, bucket: "nbr", meta: p.meta })));
  return clusters.map((cl) => {
    const rep = cl.items[0];
    const cnt = {}; for (const it of cl.items) { const c = id2cur.get(it.id); if (c) cnt[c] = (cnt[c] || 0) + 1; }
    const currentL3 = Object.entries(cnt).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
    return { ck: cl.cluster_key, n: cl.items.length, titles: cl.items.map((i) => i.title),
      currentL3, rep: { title: rep.title, title_et: rep.title_et, description: rep.description, vpt: rep.meta?.vevor_product_type } };
  });
}

// ── MAIN ──
const cfg = (() => { try { ensureShadowSchema(q); return getConfig(q); } catch { return { auto_create_enabled: false }; } })();
const L3META = buildL3Meta();
const newL3s = loadNewL3s(L3META);
console.log(`=== NAABRITE ÜLEHINDAMISE HOOK (${DRY ? "DRY" : EXECUTE ? "EXECUTE" : ""}) — ${cfg.auto_create_enabled ? "auto_create AKTIIVNE → LIVE-liigutus" : "SHADOW (auto_create väljas → logib oleks-liigutanud)"} ===`);
console.log(`delta uusi L3: ${newL3s.length}${newL3s.map((x) => `\n   • «${x.name}» (${x.synthetic ? "sünteetiline/shadow" : "päris"}, L2=${x.l2 || "?"})`).join("")}`);
if (!newL3s.length) { console.log("0 uut L3 → naaber-reeval vahele (idempotentne)."); fs.writeFileSync(OUT, JSON.stringify({ newL3s: 0, report: [] }, null, 1)); process.exit(0); }

const BATCH_ID = `nbr-hook-${new Date().toISOString().replace(/[:.]/g, "").slice(0, 15)}`;
const report = [];
let failedL3 = 0, apiDown = false;

for (const nl of newL3s) {
  const H = nl.handle;
  // sünteetiline uus L3 → süsti L3META-sse, et neighborsOf leiaks struktuurse pere (sama L2)
  if (!L3META[H]) L3META[H] = { name: nl.name, desc: "", l2: nl.l2 };
  try {
    const ctx = buildNeighborCtx({ clusters: [], l3meta: L3META });   // CL_BY_L3 täidetakse allpool naabrite toodetest
    const { structural, semantic, neighbors } = neighborsOf(H, ctx, { K_SEM });
    // naabrite tooted LIVE (ainult tegelikult-olemas naabrid; sünteetilise H enda handle'it DB-s pole)
    const neighborClusters = loadNeighborClusters([...neighbors].filter((h) => !h.startsWith("shadow:")));
    // uuenda konteksti klastritega (CL_BY_L3 vajab neid pickClusters jaoks)
    const ctx2 = buildNeighborCtx({ clusters: neighborClusters, l3meta: L3META });
    const { picked, nStruct, nSem } = pickClusters(H, { structural, semantic }, ctx2, { TOP_CL_SEM });
    const cands = narrowCands(H, neighbors, ctx2);
    console.log(`\n▸ «${nl.name}» (${H})\n  naabrid: ${structural.size} strukt + ${semantic.length} sem = ${neighbors.size} uniq | klastreid: ${nStruct} strukt + ${nSem} sem = ${picked.length} ahelasse`);
    if (!picked.length) { report.push({ handle: H, name: nl.name, neighbors: neighbors.size, evaluated: 0, pull: [], other: [] }); continue; }
    const { decisions, costUsd } = await reevalClusters(picked, cands, { nodes: NODES, apiKey: KEY, cap: CAP_PER, chunk: 20,
      onProgress: (d, t, usd) => process.stderr.write(`  ahel ${d}/${t}  $${usd.toFixed(2)}\r`) });
    const { pull, other, failed, tally } = classifyNeighborMoves(H, picked, decisions);
    console.log(`  → PULL: ${pull.length} klastrit (${pull.reduce((s, p) => s + p.n, 0)} toodet) | other: ${other.length} | jääb: ${tally.stay} | new: ${tally.new} | kukkus: ${failed.length} | $${costUsd.toFixed(2)}`);
    report.push({ handle: H, name: nl.name, synthetic: nl.synthetic, neighbors: neighbors.size, evaluated: picked.length, nStruct, nSem, pull, other, failed: failed.length, tally, costUsd });
  } catch (e) {
    const msg = String(e?.message || e);
    if (isCreditError(msg) || /HTTP (429|5\d\d)|fetch failed|network|timeout|aborted|ECONN|ETIMEDOUT|EAI_AGAIN|socket|AbortError/i.test(msg)) {
      apiDown = true; console.error(`💳 api/krediit maas «${nl.name}»: ${msg.slice(0, 100)} → DEGRADE`); break;
    }
    failedL3++; console.error(`  🔴 «${nl.name}» kukkus (skip + jätka): ${msg.slice(0, 120)}`);
    report.push({ handle: H, name: nl.name, error: msg.slice(0, 200) });
  }
}

fs.writeFileSync(OUT, JSON.stringify({ batch_id: BATCH_ID, dry: DRY, auto_create: cfg.auto_create_enabled, newL3s: newL3s.length, failedL3, report }, null, 1));

const totPull = report.reduce((s, r) => s + (r.pull?.length || 0), 0);
const totPullN = report.reduce((s, r) => s + (r.pull || []).reduce((a, p) => a + p.n, 0), 0);
const totOther = report.reduce((s, r) => s + (r.other?.length || 0), 0);
console.log(`\n=== KOKKUVÕTE === uusi L3: ${newL3s.length} | PULL ${totPull} klastrit / ${totPullN} toodet | other ${totOther} | kukkunud L3: ${failedL3}`);

if (apiDown) {
  console.log("CREDIT_DEGRADE=1");
  console.error("💳 DEGRADE [4.5]: api/krediit maas — naaber-reeval pooleli, re-run kui LLM tagasi.");
  process.exit(3);
}

// ── SHADOW vs LIVE ──
const allMoves = [];
for (const r of report) {
  for (const p of (r.pull || [])) allMoves.push({ new_l3: r.handle, new_l3_name: r.name, ck: p.ck, n: p.n, from: p.from, to: r.handle, kind: "pull", path: p.path });
  for (const o of (r.other || [])) allMoves.push({ new_l3: r.handle, new_l3_name: r.name, ck: o.ck, n: o.n, from: o.from, to: o.to, kind: "other", path: o.path });
}

if (DRY) { console.log(`\n[DRY] EI kirjutatud DB-sse. Tulemused: ${OUT}`); process.exit(0); }

if (!cfg.auto_create_enabled) {
  // SHADOW: logi "oleks liigutanud" (nähtavus, HARD RULE #6) — EI liiguta
  if (allMoves.length) {
    const vals = allMoves.map((m) => {
      const meta = { batch_id: BATCH_ID, new_l3: m.new_l3, new_l3_name: m.new_l3_name, ck: m.ck, from_handle: m.from, to_handle: m.to, kind: m.kind, path: m.path, n: m.n };
      return `('claude-code-test','auto-judge-audit','pipeline','neighbor-shadow','would_move',${S(m.ck)},${S(m.to)},'shadow',${S(JSON.stringify({ ck: m.ck, n: m.n }))}::jsonb,${S(JSON.stringify(meta))}::jsonb)`;
    }).join(",\n");
    q(`INSERT INTO review_decision_log (actor, actor_detail, channel, bucket_type, action, concept_key, target_handle, status, affected, meta) VALUES\n${vals};`);
    console.log(`🌓 SHADOW: ${allMoves.length} "oleks liigutanud" logitud (review_decision_log bucket_type='neighbor-shadow'). EI liigutatud.`);
  } else console.log("🌓 SHADOW: 0 liigutust (ükski naaber-toode ei kuulunud uude L3-sse).");
  telegram([`🧭 XL naaber-reeval HOOK (${BATCH_ID}) — SHADOW`,
    `Uusi L3: ${newL3s.length} | oleks liigutanud: ${totPull} pull + ${totOther} other = ${allMoves.length} klastrit / ${totPullN + report.reduce((s, r) => s + (r.other || []).reduce((a, o) => a + o.n, 0), 0)} toodet`,
    failedL3 ? `⚠️ ${failedL3} L3 kukkus (skip)` : "✓ 0 L3 viga",
    `auto_create väljas → logitud, EI liigutatud (flipib → LIVE)`].join("\n"));
  process.exit(0);
}

// LIVE (auto_create aktiivne) → reuse neighbor-execute.mjs (üks executor, samad väravad)
if (!allMoves.length) { console.log("✓ auto_create aktiivne, aga 0 naaber-liigutust — midagi teha."); process.exit(0); }
const execReport = { report: report.map((r) => ({ handle: r.handle, pull: r.pull || [], other: r.other || [] })) };
const execFile = `/tmp/neighbor-hook-exec-${BATCH_ID}.json`;
fs.writeFileSync(execFile, JSON.stringify(execReport, null, 1));
console.log(`\n🏗 auto_create AKTIIVNE → ${allMoves.length} naaber-liigutust LIVE (neighbor-execute.mjs)`);
try {
  execSync(`node ${REPO}/scripts/neighbor-execute.mjs --from ${execFile}`, { stdio: "inherit", env: { ...process.env, BATCH_ID } });
} catch (e) {
  console.error(`🔴 neighbor-execute kukkus: ${String(e.message).slice(0, 150)}`);
  telegram(`🛑 XL naaber-reeval HOOK (${BATCH_ID}): auto_create aktiivne, aga neighbor-execute KUKKUS — ${allMoves.length} liigutust EI rakendatud. Põhjus: ${String(e.message).slice(0, 150)}`);
  process.exit(1);
}
console.log(`\n✅ NAABER-HOOK VALMIS — batch ${BATCH_ID}`);
process.exit(0);
