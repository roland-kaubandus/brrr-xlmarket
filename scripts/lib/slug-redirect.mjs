/**
 * slug-redirect.mjs — abimoodul kategooria-301 jaoks (HARD RULE #5 SSoT sugar).
 *
 * PÕHIMEHHANISM = DB-trigger (scripts/migrations/010-slug-redirect-trigger.sql). Iga
 * product_category handle-muutus / eemaldamine kirjutab slug_redirect rea AUTOMAATSELT samas
 * transaktsioonis — ükski kutsuja ei pea midagi tegema. See moodul on ÕHUKE sugar KAHE erijuhu jaoks:
 *
 *   1. setRedirectTarget(client, handle) — MERGE TÄPSE sihiga. Seab SET LOCAL "xl.redirect_target"
 *      enne DELETE/soft-delete SAMAS txn-is → trigger kasutab seda (reason='merge') vanema asemel.
 *      Ilma selleta suunab trigger ELAVASSE vanemasse (ohutu vaikesiht).
 *
 *   2. recordCategoryRedirect(client, {...}) — EKSPLITSIITNE insert (nt legacy/backfill), kui muutus
 *      EI käi läbi product_category UPDATE/DELETE (nt handle elab mujal, või ajalooline backfill).
 *      Sama loogika kui trigger (ON CONFLICT + chain-collapse + self-loop puhastus).
 *
 * STACK-LUKK: see moodul EI võta stack-lukku — ta jookseb ALATI kutsuja transaktsiooni SEES
 * (kutsuja hoiab juba stack-lukku; XL_STACK_LOCK_HELD=1 → re-entrant). Standalone DB-write
 * (nt backfill-slug-redirects.mjs) võtab luku ISE enne pg.Client avamist.
 *
 * NB: set_config(...,true) == SET LOCAL → kehtib AINULT selle transaktsiooni lõpuni → PEAB olema
 * BEGIN sees. Väljaspool transaktsiooni on ta no-op (hoiatus allpool).
 */

const VALID_REASONS = new Set(["rename", "merge", "deprecate", "legacy"]);

/**
 * Sea merge täpne siht enne DELETE/soft-delete (SAMAS txn-is). Trigger loeb selle ja
 * suunab reason='merge' sellele handle'ile vanema asemel.
 * @param {import('pg').Client|import('pg').PoolClient} client  avatud client, BEGIN sees
 * @param {string} targetHandle  elav siht-kategooria handle
 */
export async function setRedirectTarget(client, targetHandle) {
  if (!targetHandle || typeof targetHandle !== "string") {
    throw new Error("setRedirectTarget: targetHandle puudub või pole string");
  }
  // true = is_local → SET LOCAL (txn-piiratud). Parameetri bind OK (erinevalt SET LOCAL süntaksist).
  await client.query(`SELECT set_config('xl.redirect_target', $1, true)`, [targetHandle]);
}

/** Tühjenda merge-siht (kui sama txn teeb mitu operatsiooni eri sihtidega). */
export async function clearRedirectTarget(client) {
  await client.query(`SELECT set_config('xl.redirect_target', '', true)`);
}

/**
 * Eksplitsiitne redirect-kirje (backfill/legacy). Sama loogika kui DB-trigger.
 * @param {import('pg').Client|import('pg').PoolClient} client  avatud client, soovitatavalt BEGIN sees
 * @param {{fromSlug:string,toSlug:string,reason?:string}} opts
 */
export async function recordCategoryRedirect(client, { fromSlug, toSlug, reason = "rename" } = {}) {
  if (!fromSlug || !toSlug) throw new Error("recordCategoryRedirect: fromSlug/toSlug puudub");
  if (fromSlug === toSlug) return; // self → no-op
  if (!VALID_REASONS.has(reason)) {
    throw new Error(`recordCategoryRedirect: vigane reason '${reason}' (lubatud: ${[...VALID_REASONS].join(", ")})`);
  }
  await client.query(
    `INSERT INTO slug_redirect (from_slug, to_slug, reason)
     VALUES ($1, $2, $3)
     ON CONFLICT (from_slug) DO UPDATE
       SET to_slug = EXCLUDED.to_slug, reason = EXCLUDED.reason, created_at = NOW()`,
    [fromSlug, toSlug, reason],
  );
  // chain-collapse: varasemad redirect'id vana handle'i peale → uuele sihile
  await client.query(
    `UPDATE slug_redirect SET to_slug = $1 WHERE to_slug = $2 AND from_slug <> $1`,
    [toSlug, fromSlug],
  );
  // self-loop puhastus
  await client.query(`DELETE FROM slug_redirect WHERE from_slug = to_slug`);
}
