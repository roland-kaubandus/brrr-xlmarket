/**
 * carry-renamed-thumbs.mjs — kategooria-thumbnail liigub handle-muutusega KAASA (HARD RULE #5).
 *
 * PROBLEEM (juurpõhjus 2026-11-18): cat-thumb webp on seotud FAILINIMEGA = `${handle}.webp`.
 * Kui kategooria handle muutub (rename: A1 pere-scatter / FAAS 2 allika-cleanup / naabri-reparent /
 * iganädalane masin), siis vana `${vana}.webp` jääb orvuks ja uus handle on PILDITA → image_source=none
 * → INV-20/26 FAIL → blokeerib KÕIK järgnevad L3-loomed (globaalne --ci värav).
 *
 * LAHENDUS: FS-poolel "üks mehhanism", analoog migration 010 DB-triggerile (mis kirjutab slug_redirect
 * iga handle-muutuse peale AUTOMAATSELT). See funktsioon loeb slug_redirect reason='rename' kirjed ja
 * liigutab orvuks jäänud webp'i uue handle alla. Kutsuja (thumb-build / deploy / FAAS 2) käivitab selle —
 * ükski rename-kutsuja ei pea pilti ise liigutama, täpselt nagu nad ei pea redirect'i ise kirjutama.
 *
 * Omadused:
 *   - Idempotentne: uus webp juba olemas → vahele; vana orb puudub → vahele (pole mida liigutada).
 *   - Lossless: rename = sama sõlm, samad tooted → vana thumbnail on uuele endiselt esinduslik
 *     (vs Meili-regen, mis maksab + võib tumeda pildi / gatekeeper-vea taha kinni jääda).
 *   - onCarry callback: kutsuja saab liigutuse järel git-add'ida / docker cp'da (konteineri-sync).
 */
import { existsSync, renameSync } from "node:fs";
import path from "node:path";

/**
 * @param {Array<{from_slug:string,to_slug:string}>} renames  slug_redirect reason='rename' read
 * @param {string} dir  cat-thumbs kataloog (host-repo tõde)
 * @param {(from:string,to:string)=>void} [onCarry]  kutsutakse iga eduka liigutuse järel
 * @returns {{carried:string[], skipped:number}}
 */
export function carryRenamedThumbs(renames, dir, onCarry) {
  const carried = [];
  let skipped = 0;
  for (const r of renames || []) {
    const from = r?.from_slug, to = r?.to_slug;
    if (!from || !to || from === to) { skipped++; continue; }
    const toP = path.join(dir, `${to}.webp`);
    const fromP = path.join(dir, `${from}.webp`);
    if (existsSync(toP)) { skipped++; continue; }    // uus juba olemas (idempotent)
    if (!existsSync(fromP)) { skipped++; continue; } // vana orb puudub → pole mida kanda
    renameSync(fromP, toP);
    carried.push(`${from} → ${to}`);
    if (onCarry) { try { onCarry(from, to); } catch { /* best-effort sync */ } }
  }
  return { carried, skipped };
}

/** Parsib `psql -tA` tab-eraldatud "from<TAB>to" väljundi rename-objektideks. */
export function parseRenameRows(psqlOut) {
  return String(psqlOut || "").trim().split("\n").filter(Boolean).map((l) => {
    const [from_slug, to_slug] = l.split("\t");
    return { from_slug, to_slug };
  });
}
