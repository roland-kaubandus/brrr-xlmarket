#!/usr/bin/env node
/**
 * l3-create-engine.mjs — ÜLDINE L3-LOOMISMOOTOR (HARD RULE #5: üks mootor, kaks kutsujat).
 *
 * SAMA kood jookseb nii (a) ETAPP 3 backfillis (scripts/classify-etapp3-create.mjs — 48 auditi-kandidaati
 * partiidena) kui (b) öises auto-create'is (shadow-ledger flip → classifier-chain loodud L3-d). Mootor
 * EI lahkne kunagi — kõik väravad/deploy/undo/Telegram elavad ÜHES kohas.
 *
 * ÜLDISTUS vs endine classify-etapp2-create.mjs execute-blokk:
 *   • DÜNAAMILINE post-kontroll — fikseeritud `nowPub !== 40` → võrdlus SELLE PARTII oodatud arvuga
 *     (expectPub = partii mitte-kustutatud tooted; nowDraft===0). Töötab iga partii-suurusega.
 *   • PARTIID — createL3Batch() üks partii; runL3Batches() tükeldab (~10 L3), iga partii järel väravad,
 *     rohelised → järgmine automaatselt (HARD RULE #6), värav kukub → PEATA + Telegram (ei jätka).
 *   • NAABRITE ÜLEHINDAMINE iga loodud L3 järel — kutsub olemas-SSoT pipeline-neighbor-chain.mjs
 *     (--new-l3 <partii handled> --execute), mitte re-implementeeri (HARD RULE #5, neighbor-core SSoT).
 *   • dryRun — arvutab defs/attach/baseline (kerge DB-read), EI kirjuta ega deploy'i → plaani-raport.
 *
 * Väravad (iga partii, transaktsioonis, rollback igal kukkumisel):
 *   DB-txn (create-l3 + attach + publish + review-resolve, dünaam. post-kontroll) → Meili reindeks →
 *   pildid + heledus-värav (luma ≥ IMG_BRIGHT_MIN) → SSoT regen → INV --ci → lock-harness post →
 *   git push MÕLEMAD (HARD RULE #4) → Coolify redeploy → tervisekontroll → naabri-ülehindamine →
 *   review_decision_log (actor=claude-code-test, HARD RULE #8) → Telegram + undo-sidecar.
 *
 * Kutsuja annab juba-genereeritud `plans` (SEO/tüübiprofiil/completeness varad mälus) — mootor EI
 * regenereeri SEO-d (Fable mittedeterministlik; plaan on SSoT). Varade genereerimine = kutsuja töö.
 */
import fs from "node:fs";
import { execSync } from "node:child_process";
import { slugId, IMG_BRIGHT_MIN, brightCheckScript } from "./l3-gates.mjs";

const REPO = "/opt/xlmarket-github";
const sh = (cmd, opts = {}) => execSync(cmd, { encoding: "utf8", stdio: opts.capture ? "pipe" : "inherit", ...opts });
const sqlStr = (s) => `'${String(s).replace(/'/g, "''")}'`;
const NOTIFY = `${REPO}/scripts/lib/notify-telegram.sh`;
export function telegram(msg) {
  try { execSync(`${NOTIFY}`, { input: msg, encoding: "utf8", stdio: ["pipe", "ignore", "ignore"] }); } catch {}
  console.log(`📨 Telegram:\n${msg}`);
}

// ---- konteineri-resolutsioon (auth konteineri-sees; kood EI loe saladusi) ----
export function resolveContainers() {
  const pick = (p) => sh(`docker ps --format '{{.Names}}' | grep '^${p}' | head -1`, { capture: true }).trim();
  const c = { DB: pick("db-k33g"), MEILI: pick("meili-k33g"), MEDUSA: pick("medusa-k33g"), SF: pick("storefront-k33g") };
  c.ok = !!(c.DB && c.MEILI && c.MEDUSA && c.SF);
  return c;
}

/**
 * ÜKS PARTII: loob plans-L3-d + seob tooted + deploy + naabri-ülehindamine. Täis-atomaarne (rollback).
 * @returns {Promise<{ok, batch_id, reason?, created, baseline, health?, neighbor?, planned?}>}
 */
export async function createL3Batch({
  plans, assigns = [], batchPrefix = "l3", dryRun = false,
  neighbor = { enabled: true, capPer: 3, topcl: 40 },
  label = "L3-create", extraGitPaths = [],
  detachV4L3 = true, // ETAPP3 reparent: uude L3-sse pandav toode eemaldatakse KÕIGIST senistest v4-L3-dest
                     //  (ainus-kodu invariant). Kodutu toode (öine) → detach no-op. distinct-loend EI muutu.
}) {
  const C = resolveContainers();
  if (!C.ok) return { ok: false, reason: `Konteiner puudu: db=${!!C.DB} meili=${!!C.MEILI} medusa=${!!C.MEDUSA} sf=${!!C.SF}` };
  const { DB, MEILI, MEDUSA, SF } = C;
  const psql = (sql) => execSync(`docker exec -i ${DB} psql -U xlmarket -d xlmarket -tA -v ON_ERROR_STOP=1 -f -`, { input: sql, encoding: "utf8" }).trim();
  const psqlTx = (sql) => execSync(`docker exec -i ${DB} psql -U xlmarket -d xlmarket -q -v ON_ERROR_STOP=1 -f -`, { input: sql, encoding: "utf8" });

  // ---- PRE: plaan terviklik (completeness + SEO-värav) ----
  const badPlan = plans.filter(p => !(p.completeness?.pass && p.assets?._seoGate?.pass));
  if (badPlan.length) return { ok: false, reason: `${badPlan.length} L3 ei läbi plaani-väravat (completeness/SEO): ${badPlan.map(p => p.name_et).join(", ")}` };

  // ---- parent-L2 + assign-siht id-d ----
  const parentIdOf = {};
  for (const p of plans) {
    if (parentIdOf[p.parentL2]) continue;
    const id = psql(`SELECT id FROM product_category WHERE handle=${sqlStr(p.parentL2)} AND deleted_at IS NULL;`);
    if (!id) return { ok: false, reason: `Vanem-L2 '${p.parentL2}' puudub DB-s` };
    parentIdOf[p.parentL2] = id;
  }
  const assignIdOf = {};
  for (const a of assigns) {
    const id = psql(`SELECT id FROM product_category WHERE handle=${sqlStr(a.handle)} AND deleted_at IS NULL;`);
    if (!id) return { ok: false, reason: `Assign-siht '${a.handle}' puudub DB-s` };
    assignIdOf[a.handle] = id;
  }

  // ---- defs (description = TÜÜBIPROFIIL internal väli, MITTE SEO) ----
  const defs = plans.map(p => ({
    id: slugId(p.name_en || p.name_et), name: p.name_et,
    description: (p.type_profile && p.type_profile.ok && p.type_profile.description) ? p.type_profile.description : "",
    handle: p.handle, parent_id: parentIdOf[p.parentL2], rank: 900,
  }));
  const newL3Attach = plans.flatMap((p, i) => p.products.map(pr => ({ product_id: pr.id, cat_id: defs[i].id })));
  const assignAttach = assigns.flatMap(a => a.ids.map(id => ({ product_id: id, cat_id: assignIdOf[a.handle] })));
  const allAttach = [...newL3Attach, ...assignAttach];
  const allProductIds = [...new Set(allAttach.map(x => x.product_id))];

  // ---- baseline + DÜNAAMILINE oodatud (asendab fikseeritud 40) ----
  const baseDistinct = +psql("SELECT count(DISTINCT product_id) FROM product_category_product;");
  const baseL3 = +psql("SELECT count(*) FROM product_category WHERE mpath LIKE 'pcat_v4_l%' AND deleted_at IS NULL AND (char_length(mpath)-char_length(replace(mpath,'.','')))=2;");
  const pidList = allProductIds.map(sqlStr).join(",");
  const homedNow = allProductIds.length ? +psql(`SELECT count(DISTINCT product_id) FROM product_category_product WHERE product_id IN (${pidList});`) : 0;
  const newlyHomed = allProductIds.length - homedNow;
  const expectDistinct = baseDistinct + newlyHomed;
  // expectPub = partii mitte-kustutatud tooted (kõik peavad lõpuks published olema; nowDraft===0)
  const expectPub = allProductIds.length ? +psql(`SELECT count(*) FROM product WHERE id IN (${pidList}) AND deleted_at IS NULL;`) : 0;
  const expectL3 = baseL3 + defs.length;
  const baseline = { baseDistinct, baseL3, newlyHomed, expectDistinct, expectPub, expectL3 };

  const BATCH = `${batchPrefix}-${new Date().toISOString().replace(/[:.]/g, "").slice(0, 15)}`;
  const created = defs.map((d, i) => ({ id: d.id, handle: d.handle, name: d.name, parentL2: plans[i].parentL2, n: plans[i].n }));

  // ===== DRY: ära kirjuta/deploy, tagasta planeeritud seis =====
  if (dryRun) {
    return {
      ok: true, dryRun: true, batch_id: BATCH, created, baseline,
      planned: {
        new_l3: defs.length, attach_new: newL3Attach.length, attach_assign: assignAttach.length,
        distinct_products: allProductIds.length,
        expect: { distinct: `${baseDistinct}→${expectDistinct}`, l3: `${baseL3}→${expectL3}`, published: expectPub, draft_remaining: 0 },
      },
    };
  }

  // ===== EXECUTE =====
  // REPARENT UNDO pre-state: iga uude L3-sse pandava toote senine v4-L3 kodu + staatus → undo taastab
  // vana kodu (EI draft'i, muidu juba-avaldatud toode kaoks poest). Kodutu toode → tühi from-list.
  const reparentPidsPre = detachV4L3 ? [...new Set(newL3Attach.map(x => x.product_id))] : [];
  let reparentPre = [];
  if (reparentPidsPre.length) {
    const rows = psql(`SELECT p.id, p.status,
        COALESCE(string_agg(DISTINCT pc.id, ',') FILTER (WHERE pc.mpath LIKE 'pcat_v4_l%' AND pc.deleted_at IS NULL), '') AS v4cats
      FROM product p LEFT JOIN product_category_product pcp ON pcp.product_id=p.id
      LEFT JOIN product_category pc ON pc.id=pcp.product_category_id
      WHERE p.id IN (${reparentPidsPre.map(sqlStr).join(",")})
      GROUP BY p.id, p.status;`);
    reparentPre = rows.split("\n").filter(Boolean).map(l => {
      const [id, status, v4cats] = l.split("|");
      return { product_id: id, prev_status: status, from_cat_ids: v4cats ? v4cats.split(",") : [] };
    });
  }
  const UNDO_FILE = `${REPO}/reports/etapp2-undo-${BATCH}.json`; // classifier-undo loeb seda prefiksit
  fs.writeFileSync(UNDO_FILE, JSON.stringify({
    batch_id: BATCH, created_at: new Date().toISOString(), actor: "claude-code-test", label,
    new_l3: defs.map(d => ({ id: d.id, handle: d.handle, name: d.name, parent_id: d.parent_id })),
    attach: allAttach, product_ids: allProductIds,
    reparent: reparentPre, // [{product_id, prev_status, from_cat_ids}] — undo taastab vana kodu+staatuse
  }, null, 2));

  let mainSync = "—", dbApplied = false, deployed = false;
  const regenSSoT = () => {
    sh(`node ${REPO}/scripts/genyM.mjs`);
    sh(`cp /opt/eumotors-tasks/v4-staging/taxonomy-music.yaml ${REPO}/backend/src/data/taxonomy.yaml`);
    sh(`node ${REPO}/scripts/gen-category-tree.mjs`);
  };
  const gitCommitPush = (msg) => {
    const paths = [
      "scripts/classify-etapp2-create.mjs", "scripts/classify-etapp3-create.mjs", "scripts/lib/l3-create-engine.mjs",
      "scripts/create-l3.mjs", "scripts/lock-harness.mjs", "scripts/genyM.mjs", "scripts/classifier-undo.mjs",
      "backend/src/data/taxonomy.yaml", "storefront/lib/category-tree.generated.json",
      "storefront/lib/outlet-labels.generated.json", `reports/etapp2-undo-${BATCH}.json`,
      ...extraGitPaths, ...defs.map(d => `storefront/public/cat-thumbs/${d.handle}.webp`),
    ];
    for (const p of paths) { try { if (fs.existsSync(`${REPO}/${p}`)) sh(`cd ${REPO} && git add -- ${p}`); } catch {} }
    try { sh(`cd ${REPO} && git commit -m ${JSON.stringify(msg + "\n\nCo-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>")}`); }
    catch (e) { console.log("  ℹ️ git commit: midagi ei muutunud/viga — " + String(e.message).slice(0, 120)); }
    sh(`cd ${REPO} && git push origin taxonomy-v4`);  // Coolify build-allikas
    try {
      const sha = sh(`cd ${REPO} && git rev-parse HEAD`, { capture: true }).trim();
      const wt = `/tmp/xl-main-sync-${BATCH}`;
      sh(`cd ${REPO} && git fetch -q origin main`);
      sh(`cd ${REPO} && git worktree add --force ${wt} origin/main 2>&1 | tail -1 || true`);
      try { sh(`cd ${wt} && git cherry-pick -x ${sha} && git push origin HEAD:main`); mainSync = "✓ (worktree cherry-pick)"; }
      catch { try { sh(`cd ${wt} && git cherry-pick --abort`); } catch {} mainSync = "⚠️ konflikt — käsitsi cherry-pick main-i"; }
      try { sh(`cd ${REPO} && git worktree remove --force ${wt}`); } catch {}
    } catch (e) { mainSync = "⚠️ " + String(e.message).slice(0, 80); }
  };
  const rollback = (reason) => {
    console.error(`\n🔁 ROLLBACK (${BATCH}) — ${reason}`);
    const nid = defs.map(d => sqlStr(d.id)).join(",");
    const pid = allProductIds.map(sqlStr).join(",");
    // REPARENT-taaste rollback'is (sama loogika kui classifier-undo): reparent-tooted → vana kodu + staatus,
    // ülejäänud (kodutud) → draft + pending. Muidu juba-avaldatud toode kaoks poest.
    const reparentIds = new Set(reparentPre.filter(r => (r.from_cat_ids || []).length).map(r => r.product_id));
    const homelessIds = allProductIds.filter(id => !reparentIds.has(id));
    const restorePairs = reparentPre.filter(r => (r.from_cat_ids || []).length).flatMap(r => r.from_cat_ids.map(cid => `(${sqlStr(r.product_id)}, ${sqlStr(cid)})`));
    const pubRestore = reparentPre.filter(r => r.prev_status === "published").map(r => sqlStr(r.product_id));
    const draftRestore = reparentPre.filter(r => r.prev_status && r.prev_status !== "published").map(r => sqlStr(r.product_id));
    try {
      psqlTx(`BEGIN;
        DELETE FROM product_category_product WHERE product_id IN (${pid});
        DELETE FROM taxonomy_node_meta WHERE node_id IN (${nid});
        DELETE FROM product_category WHERE id IN (${nid});
        ${restorePairs.length ? `INSERT INTO product_category_product (product_id, product_category_id) VALUES ${restorePairs.join(", ")} ON CONFLICT DO NOTHING;` : ""}
        ${pubRestore.length ? `UPDATE product SET status='published', updated_at=now() WHERE id IN (${pubRestore.join(",")});` : ""}
        ${draftRestore.length ? `UPDATE product SET status='draft', updated_at=now() WHERE id IN (${draftRestore.join(",")});` : ""}
        ${homelessIds.length ? `UPDATE product SET status='draft', updated_at=now() WHERE id IN (${homelessIds.map(sqlStr).join(",")});
        UPDATE classification_review SET status='pending', updated_at=now() WHERE product_id IN (${homelessIds.map(sqlStr).join(",")});` : ""}
        COMMIT;`);
      console.error(`  ✓ DB taastatud (reparent ${reparentIds.size} → vana kodu · kodutu ${homelessIds.length} → draft)`);
    } catch (e) { console.error("  🔴 DB-rollback viga: " + String(e.message).slice(0, 200)); }
    try { sh(`docker exec ${MEDUSA} node /app/scripts/index-meilisearch.mjs 2>/dev/null || node ${REPO}/backend/scripts/index-meilisearch.mjs`); } catch {}
    if (deployed) { try { regenSSoT(); gitCommitPush(`revert: ${label} rollback ${BATCH} (${reason})`); sh(`bash ${REPO}/scripts/coolify-deploy.sh`); } catch (e) { console.error("  🔴 deploy-rollback: " + String(e.message).slice(0, 150)); } }
    telegram(`🔁 XL ${label} ROLLBACK (${BATCH})\nPõhjus: ${reason}\nDB taastatud (${defs.length} L3 kustutatud, ${allProductIds.length} toodet draft).${deployed ? " Staging redeploy'tud." : ""}\nUndo: node scripts/classifier-undo.mjs --file reports/etapp2-undo-${BATCH}.json`);
  };

  try {
    // 1. DB create-l3
    console.log(`\n[1/9] ${BATCH} — DB create-l3 (${defs.length} L3)`);
    const defsFile = `/tmp/l3eng-defs-${BATCH}.json`;
    fs.writeFileSync(defsFile, JSON.stringify(defs, null, 2));
    sh(`node ${REPO}/scripts/create-l3.mjs --defs ${defsFile}`);

    // 1b. (reparent: detach senistest v4-L3-dest) + attach + publish + review-resolve
    console.log(`[1b/9] DB — ${detachV4L3 ? "reparent (detach v4-L3) + " : ""}seo ${allProductIds.length} toodet + publish + review-resolve`);
    const attachVals = allAttach.map(x => `(${sqlStr(x.product_id)}, ${sqlStr(x.cat_id)})`).join(",\n    ");
    // detach AINULT uude L3-sse pandavad tooted (newL3Attach) senistest v4-L3-dest — assign-tooteid EI puutu
    const reparentPids = [...new Set(newL3Attach.map(x => x.product_id))];
    const reparentList = reparentPids.map(sqlStr).join(",");
    const detachSql = (detachV4L3 && reparentPids.length)
      ? `DELETE FROM product_category_product WHERE product_id IN (${reparentList})
           AND product_category_id IN (SELECT id FROM product_category WHERE mpath LIKE 'pcat_v4_l%' AND deleted_at IS NULL);\n      `
      : "";
    psqlTx(`BEGIN;
      ${detachSql}INSERT INTO product_category_product (product_id, product_category_id) VALUES
      ${attachVals}
      ON CONFLICT DO NOTHING;
      UPDATE product SET status='published', updated_at=now() WHERE id IN (${pidList}) AND status='draft' AND deleted_at IS NULL;
      UPDATE classification_review SET status='resolved', updated_at=now() WHERE product_id IN (${pidList}) AND status='pending';
      COMMIT;`);
    dbApplied = true;
    const nowDistinct = +psql("SELECT count(DISTINCT product_id) FROM product_category_product;");
    const nowPending = +psql(`SELECT count(*) FROM classification_review WHERE product_id IN (${pidList}) AND status='pending';`);
    const nowPub = +psql(`SELECT count(*) FROM product WHERE id IN (${pidList}) AND status='published';`);
    const nowDraft = +psql(`SELECT count(*) FROM product WHERE id IN (${pidList}) AND status='draft' AND deleted_at IS NULL;`);
    console.log(`    distinct ${baseDistinct}→${nowDistinct} (oodatud ${expectDistinct}) · published=${nowPub}/${expectPub} · draft-jääk=${nowDraft} · pending=${nowPending}`);
    // DÜNAAMILINE post-kontroll (ei fikseeritud 40)
    if (nowDistinct !== expectDistinct || nowPub !== expectPub || nowDraft !== 0 || nowPending !== 0) {
      rollback(`DB post-kontroll: distinct=${nowDistinct}≠${expectDistinct} | published=${nowPub}≠${expectPub} | draft-jääk=${nowDraft}≠0 | pending=${nowPending}≠0`);
      return { ok: false, batch_id: BATCH, reason: "DB post-kontroll", baseline, created };
    }

    // 2. Meili reindeks
    console.log("[2/9] Meili reindeks");
    try { sh(`docker exec ${MEDUSA} node /app/scripts/index-meilisearch.mjs`); } catch { sh(`cd ${REPO} && node backend/scripts/index-meilisearch.mjs`); }
    try { sh(`cd ${REPO} && node scripts/sync-existing-synonyms.mjs`); } catch (e) { console.log("    ℹ️ sync-synonyms vahele: " + String(e.message).slice(0, 80)); }

    // 3. Pildid + heledus-värav
    console.log("[3/9] Pildid — build-cat-thumbs-l3 + heledus-kontroll");
    const miniTree = { nodes: Object.fromEntries(defs.map(d => [d.handle, { handle: d.handle, name_et: d.name, name_en: plans.find(p => p.handle === d.handle)?.name_en || d.name, level: 3 }])) };
    const miniFile = `/tmp/l3eng-minitree-${BATCH}.json`;
    fs.writeFileSync(miniFile, JSON.stringify(miniTree));
    sh(`docker cp ${REPO}/scripts/build-cat-thumbs-l3.mjs ${SF}:/app/bct-eng.mjs`);
    sh(`docker cp ${miniFile} ${SF}:/app/minitree-eng.json`);
    const onlyArg = defs.map(d => d.handle).join(",");
    sh(`docker exec ${SF} sh -c 'cd /app && MEILISEARCH_KEY="\${MEILISEARCH_KEY:-$MEILI_MASTER_KEY}" node bct-eng.mjs --tree /app/minitree-eng.json --out /app/public/cat-thumbs --only ${onlyArg}'`);
    const brightFile = `/tmp/l3eng-bright-${BATCH}.cjs`;
    fs.writeFileSync(brightFile, brightCheckScript(defs.map(d => d.handle)));
    sh(`docker cp ${brightFile} ${SF}:/app/bright-eng.cjs`);
    const brightOut = JSON.parse(sh(`docker exec ${SF} node /app/bright-eng.cjs`, { capture: true }).trim());
    console.log("    heledus: " + brightOut.map(b => b.missing ? `${b.h}:PUUDU` : `${b.h}:${b.luma}`).join(" · "));
    const imgBad = brightOut.filter(b => b.missing || b.luma < IMG_BRIGHT_MIN);
    if (imgBad.length) { rollback(`pildi-värav: ${imgBad.map(b => b.missing ? b.h + " puudub" : b.h + " luma=" + b.luma + "<" + IMG_BRIGHT_MIN).join(", ")}`); return { ok: false, batch_id: BATCH, reason: "pildi-värav", baseline, created }; }
    for (const d of defs) sh(`docker cp ${SF}:/app/public/cat-thumbs/${d.handle}.webp ${REPO}/storefront/public/cat-thumbs/${d.handle}.webp`);

    // 4. SSoT regen
    console.log("[4/9] SSoT regen"); regenSSoT();

    // 5. INV + lock-harness
    console.log("[5/9] INV + lock-harness post");
    try { sh(`cd ${REPO} && node scripts/check-taxonomy-invariants.mjs --ci`); } catch { rollback("INV FAIL"); return { ok: false, batch_id: BATCH, reason: "INV FAIL", baseline, created }; }
    const migrateEvidence = `/tmp/l3eng-migrate-${BATCH}.sql`;
    fs.writeFileSync(migrateEvidence, allProductIds.join("\n"));
    try { sh(`cd ${REPO} && node scripts/lock-harness.mjs post ${migrateEvidence} ${expectDistinct} ${baseL3}`); } catch { rollback("lock-harness post FAIL"); return { ok: false, batch_id: BATCH, reason: "lock-harness FAIL", baseline, created }; }

    // 6. git push MÕLEMAD
    console.log("[6/9] git commit + push (taxonomy-v4 + main)");
    gitCommitPush(`feat(taxonomy): ${label} — ${defs.length} uut L3 (${allProductIds.length} toodet), batch ${BATCH}`);

    // 7. Coolify redeploy
    console.log("[7/9] Coolify staging redeploy");
    sh(`bash ${REPO}/scripts/coolify-deploy.sh`); deployed = true;

    // 8. Tervisekontroll
    console.log("[8/9] Tervisekontroll — L3 nähtavus (helde oote-aken)");
    const BASE = "https://xlmarket.ee";
    const curlCode = (url) => { try { return +sh(`curl -k -s -o /dev/null -w '%{http_code}' --max-time 15 ${JSON.stringify(url)}`, { capture: true }).trim() || 0; } catch { return 0; } };
    await new Promise(r => setTimeout(r, 30000));
    const urls = plans.map(p => ({ handle: p.handle, name: p.name_et, url: `${BASE}/et/kategooriad/${p.handle}`, code: 0, ok: false }));
    const MAX_WAIT_MS = 12 * 60 * 1000, STEP = 20000, t0 = Date.now();
    while (Date.now() - t0 < MAX_WAIT_MS) {
      for (const h of urls) if (!h.ok) { h.code = curlCode(h.url); if (h.code === 200) h.ok = true; }
      const done = urls.filter(h => h.ok).length;
      console.log(`    ${Math.round((Date.now() - t0) / 1000)}s: ${done}/${urls.length} 200`);
      if (done === urls.length) break;
      await new Promise(r => setTimeout(r, STEP));
    }
    const unhealthy = urls.filter(h => !h.ok);
    if (unhealthy.length) { rollback(`tervisekontroll aegus: ${unhealthy.map(h => h.handle + " HTTP " + h.code).join(", ")}`); return { ok: false, batch_id: BATCH, reason: "tervisekontroll", baseline, created, health: urls }; }

    // review_decision_log (HARD RULE #8)
    for (let i = 0; i < defs.length; i++) {
      const d = defs[i], p = plans[i];
      psqlTx(`INSERT INTO review_decision_log (actor, actor_detail, channel, bucket_type, action, target_handle, target_l2, new_l3_name, status, affected, meta)
        VALUES ('claude-code-test','claude-code-test','api','auto-classifier','create_l3',${sqlStr(d.handle)},${sqlStr(p.parentL2)},${sqlStr(d.name)},'applied',
          ${sqlStr(JSON.stringify(p.products.map(x => x.id)))}::jsonb, ${sqlStr(JSON.stringify({ batch_id: BATCH, l3_id: d.id, label, undo_file: `reports/etapp2-undo-${BATCH}.json` }))}::jsonb);`);
    }
    for (const a of assigns) {
      psqlTx(`INSERT INTO review_decision_log (actor, actor_detail, channel, bucket_type, action, target_handle, status, affected, meta)
        VALUES ('claude-code-test','claude-code-test','api','auto-classifier','assign_existing',${sqlStr(a.handle)},'applied',
          ${sqlStr(JSON.stringify(a.ids))}::jsonb, ${sqlStr(JSON.stringify({ batch_id: BATCH, label }))}::jsonb);`);
    }

    // 9. NAABRITE ÜLEHINDAMINE (olemas-SSoT pipeline-neighbor-chain, MITTE re-implement) — iga loodud L3 järel.
    // Väljund-kuju (OUT): { batch_id, dry, auto_create, newL3s, failedL3, report:[{handle,pull:[{n}],costUsd,tally}] }.
    // auto_create=false → liigutused logitakse SHADOW-ina (ei liiguta); true → LIVE.
    let neighborResult = { skipped: true };
    if (neighbor?.enabled && defs.length) {
      console.log("[9/9] Naabrite ülehindamine (pipeline-neighbor-chain, delta = loodud L3-d)");
      const handles = defs.map(d => d.handle).join(",");
      const nOut = `/tmp/l3eng-neighbor-${BATCH}.json`;
      try {
        sh(`cd ${REPO} && node scripts/pipeline-neighbor-chain.mjs --new-l3 ${handles} --execute --cap-per ${neighbor.capPer} --topcl ${neighbor.topcl} --out ${nOut}`);
        if (fs.existsSync(nOut)) {
          const j = JSON.parse(fs.readFileSync(nOut, "utf8"));
          const rep = j.report || [];
          const moved = rep.reduce((s, r) => s + (r.pull || []).reduce((a, p) => a + (p.n || 0), 0), 0);
          const cost = rep.reduce((s, r) => s + (r.costUsd || 0), 0);
          neighborResult = { ok: true, moved, cost: +cost.toFixed(2), shadow: j.auto_create === false, newL3s: j.newL3s, failedL3: j.failedL3 || [] };
        } else neighborResult = { ok: true, note: "naaber-hook jooksis (väljund-faili pole)" };
      } catch (e) {
        // naaber-samm EI rolli L3-loomist tagasi (L3-d on LOODUD + terved) — logi + Telegram, jätka (HARD RULE #5 kukkumis-granulaarsus)
        neighborResult = { ok: false, error: String(e.message).slice(0, 150) };
        telegram(`⚠️ XL ${label} (${BATCH}) — naabrite-ülehindamine kukkus (L3-d on LOODUD + terved): ${neighborResult.error}\nNaabrid saab käsitsi üle hinnata: node scripts/pipeline-neighbor-chain.mjs --new-l3 ${handles} --execute`);
      }
    }

    const counts = plans.map(p => `${p.name_et}: ${p.n}`).join(" · ");
    const movedTxt = neighborResult?.moved != null ? `\nNaabri-liigutusi: ${neighborResult.moved}${neighborResult.shadow ? " (shadow)" : ""} · naaber-kulu ~$${neighborResult.cost}` : "";
    telegram(`✅ XL ${label} partii VALMIS (${BATCH})\n${defs.length} uut L3 + ${allProductIds.length} toodet avaldatud.\n${counts}\nStaging: ${urls.filter(h => h.ok).length}/${urls.length} L3 HTTP 200. main-sünk: ${mainSync}${movedTxt}\nUndo: node scripts/classifier-undo.mjs --file reports/etapp2-undo-${BATCH}.json`);
    return { ok: true, batch_id: BATCH, created, baseline, health: urls, neighbor: neighborResult, mainSync };
  } catch (e) {
    console.error("🛑 FATAAL: " + String(e.stack || e.message));
    if (dbApplied) rollback("ootamatu viga: " + String(e.message).slice(0, 150));
    else telegram(`🛑 XL ${label} FATAAL (${BATCH}) enne DB-muudatust: ${String(e.message).slice(0, 200)}`);
    return { ok: false, batch_id: BATCH, reason: "FATAAL: " + String(e.message).slice(0, 150), baseline, created };
  }
}

/**
 * PARTIID (~batchSize L3): iga partii järel väravad; roheline → järgmine AUTOMAATSELT (HARD RULE #6),
 * värav kukub → PEATA + Telegram, EI jätka (ei kuhja vigast olekut).
 * @param mode "dry-first" (partii 1 DRY → raporteeri → STOP) | "execute" (kõik partiid live)
 */
export async function runL3Batches({
  allPlans, assigns = [], batchSize = 10, mode = "dry-first",
  batchPrefix = "l3", label = "L3-create", neighbor = { enabled: true, capPer: 3, topcl: 40 }, extraGitPaths = [],
}) {
  const chunk = (a, n) => { const o = []; for (let i = 0; i < a.length; i += n) o.push(a.slice(i, i + n)); return o; };
  const batches = chunk(allPlans, batchSize);
  const results = [];
  console.log(`\n🧱 ${label}: ${allPlans.length} L3 → ${batches.length} partii (à ${batchSize}), režiim=${mode}`);

  for (let i = 0; i < batches.length; i++) {
    const isDry = mode === "dry-first" && i === 0;
    const bAssigns = i === 0 ? assigns : []; // assignid lähevad esimese partiiga (ETAPP3-l tühi)
    console.log(`\n${"━".repeat(50)}\n▶ PARTII ${i + 1}/${batches.length} (${batches[i].length} L3)${isDry ? " — DRY" : ""}\n${"━".repeat(50)}`);
    const res = await createL3Batch({
      plans: batches[i], assigns: bAssigns, batchPrefix: `${batchPrefix}-b${i + 1}`,
      dryRun: isDry, neighbor, label: `${label} p${i + 1}/${batches.length}`, extraGitPaths,
    });
    results.push({ batch: i + 1, ...res });
    if (isDry) { console.log(`\n⏸ DRY esimene partii valmis — raporteeri + oota kinnitust ENNE execute'i.`); break; }
    if (!res.ok) {
      telegram(`🛑 XL ${label} — PARTII ${i + 1}/${batches.length} KUKKUS → PEATUN (järgmisi partiisid EI jätka).\nPõhjus: ${res.reason}\nLoodud seni: ${results.filter(r => r.ok && !r.dryRun).length} partii.`);
      console.error(`\n🛑 Partii ${i + 1} kukkus (${res.reason}) → PEATAN batching'u.`);
      break;
    }
    console.log(`✅ Partii ${i + 1} roheline → järgmine automaatselt.`);
  }
  return results;
}
