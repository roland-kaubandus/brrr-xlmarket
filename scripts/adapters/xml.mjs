/**
 * scripts/adapters/xml.mjs — XML feed-draiver (sõltuvuseta, flat-record)
 *
 * Katab TAVALISE tootefeedi-mustri: korduvad kirje-elemendid
 * (<item> / <product> / <entry> / <offer> / <g:...>) lameda lapse-tag'idega
 * — nt Google Merchant / RSS-tüüpi feed. Iga kirje-element → objekt {tag: tekst}.
 *
 * ⚠️ AUS PIIR: sügavalt pesastatud või atribuudi-põhine XML vajab päris parserit
 * (fast-xml-parser). Kui see draiver ei leia kirjeid → selge viga (mitte vaikne 0).
 * Eksootiline struktuur = isoleeritud adapter scripts/adapters/<supplier>.mjs.
 */
import { readFileSync } from "fs";

const RECORD_TAGS = ["item", "product", "entry", "offer", "record", "row"];

function decodeEntities(s) {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
    .replace(/&amp;/g, "&")
    .trim();
}

function pickRecordTag(xml) {
  let best = null, bestCount = 0;
  for (const t of RECORD_TAGS) {
    const count = (xml.match(new RegExp(`<${t}[\\s>]`, "gi")) || []).length;
    if (count > bestCount) { best = t; bestCount = count; }
  }
  return best;
}

export function parse(filePath, _fieldMap) {
  const xml = readFileSync(filePath, "utf8");
  const recTag = pickRecordTag(xml);
  if (!recTag) {
    throw new Error(
      "XML-adapter: ei leidnud kirje-elementi (item/product/entry/offer). " +
      "Sügav/atribuudi-põhine XML → lisa isoleeritud adapter või installi fast-xml-parser."
    );
  }
  const recRe = new RegExp(`<${recTag}[^>]*>([\\s\\S]*?)</${recTag}>`, "gi");
  const childRe = /<([\w:.-]+)[^>]*>([\s\S]*?)<\/\1>/g;
  const out = [];
  let m;
  while ((m = recRe.exec(xml)) !== null) {
    const body = m[1];
    const o = {};
    let c;
    childRe.lastIndex = 0;
    while ((c = childRe.exec(body)) !== null) {
      const tag = c[1].replace(/^.*:/, ""); // g:price → price
      o[tag] = decodeEntities(c[2]);
    }
    if (Object.keys(o).length) out.push(o);
  }
  return out;
}
