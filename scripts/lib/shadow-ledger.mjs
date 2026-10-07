/**
 * shadow-ledger.mjs — Task 5 SHADOW-režiimi pearaamat + auto-transition kontroller (Variant 1 + mod 3/4).
 *
 * Directive (Tarmo, 2026-10-06): uued L3-d → SHADOW (masin läbib KÕIK väravad, aga EI loo; logib "oleks loonud").
 *   • mod 3 AUTOMAATNE ÜLEMINEK (HARD RULE #6 — inimene EI otsusta): auto-create lülitub ISE sisse, kui
 *     shadow-režiim on töödelnud PÄRIS uusi-tüüpe + KÕIK läbisid väravad STABIILSELT. Kriteerium KOODIS (mitte ööde-arv).
 *   • mod 4: kui värav kukub KOODIVEA tõttu (JS-exception, MITTE {pass:false} legitiimne blokk) → shadow tagasi + Telegram.
 *
 * KOODIVIGA vs LEGITIIMNE BLOKK (kriitiline vahe):
 *   - JS-exception väravas (bug) → recordCodeBug() → auto-create keelatakse / lülitub tagasi shadow'sse.
 *   - {pass:false} värav (DUP/nimi/SEO/pilt töötab korrektselt) → recordShadowProposal(all_gates_pass=false):
 *     värav TÖÖTAB, EI ole koodiviga, EI takista üleminekut. Lihtsalt see ettepanek ei lähe "puhta" arvestusse.
 *
 * AKEN RESETTUB IGA config-muutuse juures: cleanCount/bugSince loetakse ainult `created_at > config.updated_at`.
 *   → shadow'sse tagasi-flip liigutab updated_at = now → bugSince=0 → puhas-arvestus algab uuesti (ise-paranev).
 *
 * q = psql-helper (sql[, tuplesOnly=true]) → raw string (vt pipeline-classify.mjs). KÕIK funktsioonid võtavad q.
 */

const esc = (s) => String(s == null ? "" : s).replace(/'/g, "''");
const escN = (v) => (v == null ? "NULL" : `'${esc(v)}'`);
const jsonb = (o) => `'${esc(JSON.stringify(o ?? {}))}'::jsonb`;

export const MIN_CLEAN_DEFAULT = 3;

/** ensureShadowSchema — loo tabelid (idempotentne) + seed config-singleton (auto_create_enabled=false). */
export function ensureShadowSchema(q) {
  q(`
CREATE TABLE IF NOT EXISTS classifier_config (
  id             text PRIMARY KEY DEFAULT 'singleton',
  auto_create_enabled boolean NOT NULL DEFAULT false,
  reason         text,
  updated_at     timestamptz NOT NULL DEFAULT now()
);
INSERT INTO classifier_config (id, auto_create_enabled, reason)
  VALUES ('singleton', false, 'algseis — shadow-režiim (Variant 1)')
  ON CONFLICT (id) DO NOTHING;
-- OHUTUS-VÄRAV (Tarmo 2026-10-07): auto_create EI tohi flippida enne kui naabrite-hook'i
-- päris-handle tee (auto-create loodud L3 → neighbor-execute õige handle, MITTE sünteetiline) on TESTITUD.
ALTER TABLE classifier_config ADD COLUMN IF NOT EXISTS neighbor_realhandle_verified boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS classifier_shadow_ledger (
  id               bigserial PRIMARY KEY,
  batch_id         text,
  cluster_key      text,
  proposed_name    text,
  parent_l2_handle text,
  origin           text,              -- konsensus | viigimurdja
  n_products       int,
  all_gates_pass   boolean NOT NULL DEFAULT false,
  gates            jsonb,
  code_bug         boolean NOT NULL DEFAULT false,
  code_bug_detail  text,
  created_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_shadow_ledger_created ON classifier_shadow_ledger (created_at);
CREATE INDEX IF NOT EXISTS idx_shadow_ledger_bug     ON classifier_shadow_ledger (code_bug) WHERE code_bug;
`, false);
}

/** getConfig → { auto_create_enabled:boolean, neighbor_realhandle_verified:boolean, reason, updated_at } */
export function getConfig(q) {
  const out = q(`SELECT auto_create_enabled::text, neighbor_realhandle_verified::text, coalesce(reason,''), updated_at::text
                 FROM classifier_config WHERE id='singleton'`).trim();
  if (!out) return { auto_create_enabled: false, neighbor_realhandle_verified: false, reason: "", updated_at: null };
  const [en, nrv, reason, updated_at] = out.split("\t");
  return {
    auto_create_enabled: en === "t" || en === "true",
    neighbor_realhandle_verified: nrv === "t" || nrv === "true",
    reason, updated_at,
  };
}

/** setAutoCreate — lülita lipp + liiguta updated_at (resettib akna). */
export function setAutoCreate(q, enabled, reason) {
  q(`UPDATE classifier_config
       SET auto_create_enabled=${enabled ? "true" : "false"}, reason=${escN(reason)}, updated_at=now()
     WHERE id='singleton'`, false);
}

/**
 * setRealhandleVerified — märgi naabrite-hook'i päris-handle tee KINNITATUKS (ohutus-värav avaneb).
 * Kutsutakse AINULT pärast testi, mis tõestab: auto-create loodud L3 PÄRIS DB-handle jõuab neighbor-hook'i
 * (MITTE sünteetiline `shadow:` handle). EI liiguta updated_at (ei resetti puhas-akent).
 */
export function setRealhandleVerified(q, verified, reason) {
  q(`UPDATE classifier_config
       SET neighbor_realhandle_verified=${verified ? "true" : "false"},
           reason=${escN(reason || (verified ? "naabrite päris-handle tee TESTITUD → ohutus-värav avatud" : "ohutus-värav suletud"))}
     WHERE id='singleton'`, false);
}

/**
 * recordShadowProposal — logi "oleks loonud" uue-L3 ettepanek (shadow).
 * all_gates_pass = kas KÕIK väravad (DUP/über-frag/nimi/SEO/pilt/täielikkus) andsid pass.
 * code_bug jääb false (legitiimne töö). Koodivea jaoks kasuta recordCodeBug().
 */
export function recordShadowProposal(q, { batch_id, cluster_key, proposed_name, parent_l2_handle, origin, n_products, all_gates_pass, gates }) {
  q(`INSERT INTO classifier_shadow_ledger
       (batch_id, cluster_key, proposed_name, parent_l2_handle, origin, n_products, all_gates_pass, gates, code_bug)
     VALUES (${escN(batch_id)}, ${escN(cluster_key)}, ${escN(proposed_name)}, ${escN(parent_l2_handle)},
             ${escN(origin)}, ${n_products | 0}, ${all_gates_pass ? "true" : "false"}, ${jsonb(gates)}, false)`, false);
}

/**
 * recordCodeBug — logi KOODIVIGA (JS-exception väravas). Eraldi rida code_bug=true.
 * Kontroller näeb seda → keelab auto-create / lülitab tagasi shadow'sse (mod 4).
 */
export function recordCodeBug(q, { batch_id, cluster_key, detail }) {
  q(`INSERT INTO classifier_shadow_ledger
       (batch_id, cluster_key, all_gates_pass, code_bug, code_bug_detail)
     VALUES (${escN(batch_id)}, ${escN(cluster_key)}, false, true, ${escN(detail)})`, false);
}

const countInt = (q, sql) => { const r = q(sql).trim(); const n = parseInt(r, 10); return Number.isFinite(n) ? n : 0; };

/**
 * evaluateTransition — mod 3/4 kontroller. Loeb aknast (created_at > config.updated_at):
 *   bugSince  = koodivea-ridu
 *   cleanCount= DISTINCT cluster_key, kus all_gates_pass JA MITTE code_bug (päris puhtad ettepanekud)
 *
 * Loogika:
 *   - lipp=true  + bugSince>0 → tagasi shadow'sse (setAutoCreate false). {changed:true, enabled:false, codeBug:true}
 *   - lipp=true  + bug=0      → muudatust pole. {changed:false, enabled:true}
 *   - lipp=false + bugSince>0 → jää shadow'sse (bug ootel). {changed:false, enabled:false, pendingBug:true}
 *   - lipp=false + clean≥min  → aktiveeri auto-create (setAutoCreate true). {changed:true, enabled:true}
 *   - lipp=false + clean<min  → jää shadow'sse. {changed:false, enabled:false}
 *
 * Tagastab alati { changed, enabled, reason, cleanCount, bugSince }.
 */
export function evaluateTransition(q, { minClean = MIN_CLEAN_DEFAULT } = {}) {
  const cfg = getConfig(q);
  const since = cfg.updated_at ? `created_at > (SELECT updated_at FROM classifier_config WHERE id='singleton')` : "true";
  const bugSince = countInt(q, `SELECT count(*) FROM classifier_shadow_ledger WHERE code_bug AND ${since}`);
  const cleanCount = countInt(q, `SELECT count(DISTINCT cluster_key) FROM classifier_shadow_ledger
                                   WHERE all_gates_pass AND NOT code_bug AND cluster_key IS NOT NULL AND ${since}`);

  if (cfg.auto_create_enabled) {
    if (bugSince > 0) {
      const reason = `KOODIVIGA väravas (${bugSince}×) → auto-create VÄLJA, tagasi shadow'sse (mod 4)`;
      setAutoCreate(q, false, reason);
      return { changed: true, enabled: false, codeBug: true, reason, cleanCount, bugSince };
    }
    return { changed: false, enabled: true, reason: "auto-create juba aktiivne, koodivigu pole", cleanCount, bugSince };
  }

  if (bugSince > 0) {
    return { changed: false, enabled: false, pendingBug: true,
      reason: `shadow jätkub — koodiviga ootel (${bugSince}×), puhas-arvestus ei edene`, cleanCount, bugSince };
  }
  if (cleanCount >= minClean) {
    // OHUTUS-VÄRAV (Tarmo 2026-10-07): isegi kui puhas-akna kriteerium on täidetud, EI tohi auto_create'i
    // flippida enne kui naabrite-hook'i PÄRIS-handle tee on testitud. Muidu auto-create loodud L3-d saaksid
    // neighbor-hook'is SÜNTEETILISE `shadow:` handle → neighbor-execute ei leia DB-st → lõksus-tooted jäävad kodutuks.
    if (!cfg.neighbor_realhandle_verified) {
      return { changed: false, enabled: false, blockedUnverified: true, cleanCount, bugSince,
        reason: `KVALIFITSEERUB (${cleanCount}/${minClean} puhast, 0 bugi) AGA auto-create BLOKEERITUD — ` +
                `naabrite päris-handle tee testimata (neighbor_realhandle_verified=false). ` +
                `Käivita test → setRealhandleVerified(q,true) → siis flipib järgmisel hindamisel.` };
    }
    const reason = `${cleanCount} puhast shadow-ettepanekut (≥${minClean}), 0 koodiviga, kõik väravad stabiilselt läbitud → auto-L3 loomine AKTIVEERITUD (mod 3)`;
    setAutoCreate(q, true, reason);
    return { changed: true, enabled: true, reason, cleanCount, bugSince };
  }
  return { changed: false, enabled: false,
    reason: `shadow jätkub — ${cleanCount}/${minClean} puhast ettepanekut`, cleanCount, bugSince };
}

/** recentShadow — viimased N shadow-ettepanekut digesti/raporti jaoks. */
export function recentShadow(q, { limit = 20 } = {}) {
  const out = q(`SELECT coalesce(proposed_name,''), coalesce(parent_l2_handle,''), coalesce(origin,''),
                        n_products, all_gates_pass::text, code_bug::text, created_at::text
                 FROM classifier_shadow_ledger ORDER BY created_at DESC LIMIT ${limit | 0}`).trim();
  if (!out) return [];
  return out.split("\n").map((l) => {
    const [name, parent, origin, n, pass, bug, ts] = l.split("\t");
    return { proposed_name: name, parent_l2_handle: parent, origin, n_products: parseInt(n, 10) || 0,
      all_gates_pass: pass === "t", code_bug: bug === "t", created_at: ts };
  });
}
