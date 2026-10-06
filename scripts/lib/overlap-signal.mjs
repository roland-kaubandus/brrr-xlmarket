#!/usr/bin/env node
/**
 * overlap-signal.mjs — TAKSONOOMIA-KATTUVUSE SIGNAAL (B3, Tarmo 2026-10-06).
 *
 * Kui kohtunik ja referents valivad SAMALE tootele ERI olemas-L3 (mõlemad assign_existing,
 * aga eri target_handle — nt LiFePO4 "sõiduki-aku" vs "tööriista-aku") → see on signaal, et
 * kaks L3-d on OSTJA/MUDELI jaoks SEGADUSSE-aetavad → võimalik kattuvus (merge/selgituse kandidaat).
 *
 * KOGUTAKSE AUTOMAATSELT (kalibreerimine + backfill-dry-run + öine hook) → taxonomy_overlap_signal
 * tabelisse + digesti rida. MITTE inimese järjekorda — masin kogub, inimene vaatab digestist koond-vaates.
 *
 * HARD RULE #5: üks transform (recordOverlap), mitu kutsujat (kalibreerimine/dry-run/hook).
 */

/** Idempotentne skeem. `q` = funktsioon, mis jooksutab SQL-i (execSync psql -f -). */
export function ensureOverlapSchema(q) {
  q(`
CREATE TABLE IF NOT EXISTS taxonomy_overlap_signal (
  id         bigserial PRIMARY KEY,
  handle_a   text NOT NULL,
  handle_b   text NOT NULL,
  name_a     text,
  name_b     text,
  hits       int  NOT NULL DEFAULT 1,
  examples   jsonb NOT NULL DEFAULT '[]'::jsonb,
  source     text,
  first_seen timestamptz DEFAULT now(),
  last_seen  timestamptz DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS taxonomy_overlap_signal_pair ON taxonomy_overlap_signal (handle_a, handle_b);`);
}

const sqlLit = (s) => "'" + String(s == null ? "" : s).replace(/'/g, "''") + "'";

/**
 * recordOverlap — salvesta/suurenda üks kattuvus-paar. Paar normaliseeritakse (a<b) → sümmeetriline dedup.
 * q = SQL-runner. rec = { handleA, handleB, nameA, nameB, example:{product_id,title,judge_target,ref_target}, source }.
 * Tagastab false, kui handle'id puuduvad/võrdsed (pole paari).
 */
export function recordOverlap(q, { handleA, handleB, nameA, nameB, example, source = "calibration" }) {
  if (!handleA || !handleB || handleA === handleB) return false;
  // normaliseeri järjekord → (a,b) sama paar sõltumata, kumb oli kohtunik/referents
  let [a, b, na, nb] = handleA < handleB ? [handleA, handleB, nameA, nameB] : [handleB, handleA, nameB, nameA];
  const ex = JSON.stringify(example || {});
  q(`
INSERT INTO taxonomy_overlap_signal (handle_a, handle_b, name_a, name_b, hits, examples, source, last_seen)
VALUES (${sqlLit(a)}, ${sqlLit(b)}, ${sqlLit(na)}, ${sqlLit(nb)}, 1,
        jsonb_build_array(${sqlLit(ex)}::jsonb), ${sqlLit(source)}, now())
ON CONFLICT (handle_a, handle_b) DO UPDATE SET
  hits = taxonomy_overlap_signal.hits + 1,
  last_seen = now(),
  -- hoia kuni 5 näidet (ära paisu lõputult)
  examples = (
    SELECT jsonb_agg(e) FROM (
      SELECT e FROM jsonb_array_elements(taxonomy_overlap_signal.examples || jsonb_build_array(${sqlLit(ex)}::jsonb)) e LIMIT 5
    ) s
  );`);
  return true;
}
