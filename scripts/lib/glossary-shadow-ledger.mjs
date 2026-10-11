/**
 * glossary-shadow-ledger.mjs — glossary-hook SHADOW→LIVE AUTOMAATNE üleminek (Tarmo 2026-10-11 punkt 4).
 *
 * Peegeldab classifier shadow-ledger (scripts/lib/shadow-ledger.mjs) mustrit — HARD RULE #6:
 *   masin otsustab ISE, inimene EI. Üleminek = KOODIS olev kriteerium (stabiilsed otsused MITU ööd + 0 koodiviga),
 *   MITTE Tarmo ledgeri-ülevaatus. Telegram TEATAB ülemineku.
 *
 * Kriteerium (evaluateGlossaryTransition):
 *   SHADOW → LIVE kui: ≥minClean DISTINCT stabiilset terminit (all_gates_pass, mitte koodiviga)
 *                      ÜLE ≥minNights DISTINCT öö (batch_id) JA 0 koodiviga aknas.
 *   LIVE → SHADOW kui: koodiviga väravas (JS-exception, mod 4) → tagasi ohutusse shadow'sse + Telegram.
 *
 * KOODIVIGA vs LEGITIIMNE DEFER (sama vahe kui classifieris):
 *   - JS-exception transform-ahelas (bug) → recordGlossaryCodeBug() → LIVE välja / üleminek blokeeritud.
 *   - termin lihtsalt defer'ib (üldsõna/fragment/mitmetähenduslik) = väravad TÖÖTAVAD → EI ole koodiviga,
 *     EI takista üleminekut (lihtsalt ei lähe "stabiilsete" arvestusse).
 *
 * AKEN RESETTUB iga config-muutuse juures (created_at > config.updated_at) → tagasi-flip (bug) alustab
 * puhas-arvestust uuesti (ise-paranev), nagu classifieris.
 *
 * q = psql-helper (sql → raw string). Shadow-ridade KIRJUTUS ise elab glossary-write.writeShadowLedger-is
 * (SSoT — üks kirjutus-tee); see moodul omab AINULT config + hindamise + koodivea-logimise.
 */

const esc = (s) => String(s == null ? "" : s).replace(/'/g, "''");
const escN = (v) => (v == null ? "NULL" : `'${esc(v)}'`);

export const MIN_CLEAN_DEFAULT = 3;   // DISTINCT stabiilset terminit
export const MIN_NIGHTS_DEFAULT = 2;  // DISTINCT ööd (batch_id) — "stabiilne MITU ööd" (Tarmo p4)

/** ensureGlossarySchema — loo config-singleton + taga shadow-ledger lisaveerud (idempotentne). */
export function ensureGlossarySchema(q) {
  q(`
CREATE TABLE IF NOT EXISTS glossary_config (
  id           text PRIMARY KEY DEFAULT 'singleton',
  live_enabled boolean NOT NULL DEFAULT false,
  reason       text,
  updated_at   timestamptz NOT NULL DEFAULT now()
);
INSERT INTO glossary_config (id, live_enabled, reason)
  VALUES ('singleton', false, 'algseis — SHADOW (Tarmo 2026-10-11)')
  ON CONFLICT (id) DO NOTHING;
CREATE TABLE IF NOT EXISTS glossary_shadow_ledger (
  id bigserial PRIMARY KEY, batch_id text, en text, et text, cluster text, origin text, aliases text,
  caller text, created_at timestamptz DEFAULT now());
ALTER TABLE glossary_shadow_ledger ADD COLUMN IF NOT EXISTS all_gates_pass  boolean NOT NULL DEFAULT true;
ALTER TABLE glossary_shadow_ledger ADD COLUMN IF NOT EXISTS code_bug        boolean NOT NULL DEFAULT false;
ALTER TABLE glossary_shadow_ledger ADD COLUMN IF NOT EXISTS code_bug_detail text;
CREATE INDEX IF NOT EXISTS idx_gloss_shadow_created ON glossary_shadow_ledger (created_at);
CREATE INDEX IF NOT EXISTS idx_gloss_shadow_bug     ON glossary_shadow_ledger (code_bug) WHERE code_bug;
`);
}

/** getGlossaryConfig → { live_enabled:boolean, reason, updated_at } */
export function getGlossaryConfig(q) {
  const out = q(`SELECT live_enabled::text, coalesce(reason,''), updated_at::text FROM glossary_config WHERE id='singleton'`).trim();
  if (!out) return { live_enabled: false, reason: "", updated_at: null };
  const [en, reason, updated_at] = out.split("\t");
  return { live_enabled: en === "t" || en === "true", reason, updated_at };
}

/** setLiveEnabled — lülita lipp + liiguta updated_at (resettib puhas-akna). */
export function setLiveEnabled(q, enabled, reason) {
  q(`UPDATE glossary_config SET live_enabled=${enabled ? "true" : "false"}, reason=${escN(reason)}, updated_at=now() WHERE id='singleton'`);
}

/** recordGlossaryCodeBug — logi KOODIVIGA (JS-exception transform-ahelas). Eraldi rida code_bug=true. */
export function recordGlossaryCodeBug(q, { batch_id, en, detail }) {
  q(`INSERT INTO glossary_shadow_ledger (batch_id, en, all_gates_pass, code_bug, code_bug_detail)
     VALUES (${escN(batch_id)}, ${escN(en)}, false, true, ${escN(detail)})`);
}

const countInt = (q, sql) => { const n = parseInt(q(sql).trim(), 10); return Number.isFinite(n) ? n : 0; };

/**
 * evaluateGlossaryTransition — mod 3/4 kontroller (vt classifier evaluateTransition). Tagastab alati
 * { changed, enabled, reason, cleanCount, nights, bugSince }.
 */
export function evaluateGlossaryTransition(q, { minClean = MIN_CLEAN_DEFAULT, minNights = MIN_NIGHTS_DEFAULT } = {}) {
  const cfg = getGlossaryConfig(q);
  const since = cfg.updated_at ? `created_at > (SELECT updated_at FROM glossary_config WHERE id='singleton')` : "true";
  const bugSince = countInt(q, `SELECT count(*) FROM glossary_shadow_ledger WHERE code_bug AND ${since}`);
  const cleanWhere = `all_gates_pass AND NOT code_bug AND en IS NOT NULL AND ${since}`;
  const cleanCount = countInt(q, `SELECT count(DISTINCT lower(en)) FROM glossary_shadow_ledger WHERE ${cleanWhere}`);
  const nights = countInt(q, `SELECT count(DISTINCT batch_id) FROM glossary_shadow_ledger WHERE ${cleanWhere}`);

  if (cfg.live_enabled) {
    if (bugSince > 0) {
      const reason = `KOODIVIGA väravas (${bugSince}×) → glossary-hook LIVE VÄLJA, tagasi SHADOW (mod 4)`;
      setLiveEnabled(q, false, reason);
      return { changed: true, enabled: false, codeBug: true, reason, cleanCount, nights, bugSince };
    }
    return { changed: false, enabled: true, reason: "glossary-hook juba LIVE, koodivigu pole", cleanCount, nights, bugSince };
  }

  if (bugSince > 0) {
    return { changed: false, enabled: false, pendingBug: true,
      reason: `SHADOW jätkub — koodiviga ootel (${bugSince}×), puhas-arvestus ei edene`, cleanCount, nights, bugSince };
  }
  if (cleanCount >= minClean && nights >= minNights) {
    const reason = `${cleanCount} stabiilset terminit (≥${minClean}) üle ${nights} öö (≥${minNights}), 0 koodiviga → glossary-hook LIVE AKTIVEERITUD (HARD RULE #6 auto-üleminek)`;
    setLiveEnabled(q, true, reason);
    return { changed: true, enabled: true, reason, cleanCount, nights, bugSince };
  }
  return { changed: false, enabled: false,
    reason: `SHADOW jätkub — ${cleanCount}/${minClean} stabiilset terminit, ${nights}/${minNights} ööd`, cleanCount, nights, bugSince };
}
