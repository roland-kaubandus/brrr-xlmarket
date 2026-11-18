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
import { existsSync, renameSync, readFileSync, writeFileSync } from "node:fs";
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

/**
 * Suunab taxonomy-image-aliases.yaml aliased ümber peale rename'i (HARD RULE #5 kaaslane carry'le).
 *
 * PROBLEEM: alias `key: vana-handle` tähendab "key'l pole oma webp'i → kasuta vana-handle pilti".
 * Kui vana-handle NIMETATAKSE ümber (slug_redirect reason='rename'), siis vana slug sureb ja carry
 * liigutab webp'i uue handle alla → alias-sihtmärk `vana` on nüüd PUUDU (ei legacy-json'is ega thumbs'is)
 * → INV-22 WARN → globaalne --ci värav exit 1 (WARN=fatal CI-s) → mootor rullis A2 tagasi (2026-11-18).
 *
 * LAHENDUS: sama rename-kirjete põhjal mida carry kasutab, suuna iga alias `* → vana` ümber `* → uus`
 * peale. Kui tulemus on self-alias (`uus: uus` — st VARIANT-B rename-alias, mille carry asendas direct
 * webp'iga), kustuta rida ülearusena. Rida-põhine (säilitab kommentaarid + mitte-alias read muutmata),
 * idempotentne (teistkordne jooks ei leia midagi), best-effort (ei viska kutsuja peale).
 *
 * @param {string} aliasYamlPath  backend/src/data/taxonomy-image-aliases.yaml
 * @param {Array<{from_slug:string,to_slug:string}>} renames  slug_redirect reason='rename' read
 * @returns {{retargeted:string[], dropped:string[]}}
 */
export function reconcileAliasesAfterCarry(aliasYamlPath, renames) {
  if (!aliasYamlPath || !existsSync(aliasYamlPath)) return { retargeted: [], dropped: [] };
  const remap = new Map(); // vana(from) → uus(to)
  for (const r of renames || []) {
    const from = r?.from_slug, to = r?.to_slug;
    if (from && to && from !== to) remap.set(from, to);
  }
  if (remap.size === 0) return { retargeted: [], dropped: [] };
  // transitiivne resolutsioon (vana→vahe→uus) tsükli-kaitsega
  const resolve = (v) => { let cur = v, seen = new Set(); while (remap.has(cur) && !seen.has(cur)) { seen.add(cur); cur = remap.get(cur); } return cur; };
  const lines = readFileSync(aliasYamlPath, "utf8").split("\n");
  const retargeted = [], dropped = [], out = [];
  for (const line of lines) {
    const m = line.match(/^([A-Za-z0-9][A-Za-z0-9._-]*):[ \t]+(\S.*?)[ \t]*$/);
    if (!m) { out.push(line); continue; }           // kommentaar / tühi / mitte-alias → muutmata
    const key = m[1], val = m[2];
    const newVal = resolve(val);
    if (newVal === val) { out.push(line); continue; } // sihtmärki ei nimetatud ümber → muutmata
    if (key === newVal) { dropped.push(`${key} → ${val}`); continue; } // self-alias → ülearune
    retargeted.push(`${key}: ${val} → ${newVal}`);
    out.push(`${key}: ${newVal}`);
  }
  if (retargeted.length || dropped.length) writeFileSync(aliasYamlPath, out.join("\n"));
  return { retargeted, dropped };
}

/** Parsib `psql -tA` tab-eraldatud "from<TAB>to" väljundi rename-objektideks. */
export function parseRenameRows(psqlOut) {
  return String(psqlOut || "").trim().split("\n").filter(Boolean).map((l) => {
    const [from_slug, to_slug] = l.split("\t");
    return { from_slug, to_slug };
  });
}
