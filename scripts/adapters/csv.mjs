/**
 * scripts/adapters/csv.mjs — CSV feed-draiver (sõltuvuseta)
 * RFC-4180-lähedane: jutumärgistatud väljad, "" = escaped ", CR/LF reavahetus.
 * Eraldaja auto-tuvasta (koma vs semikoolon — PL/EU feedid kasutavad sageli ;).
 * Tagastab toorread (objektid päise järgi). Normaliseerimine index.mjs-is.
 */
import { readFileSync } from "fs";

function detectDelimiter(headerLine) {
  const c = (headerLine.match(/,/g) || []).length;
  const s = (headerLine.match(/;/g) || []).length;
  const t = (headerLine.match(/\t/g) || []).length;
  if (t >= c && t >= s) return "\t";
  return s > c ? ";" : ",";
}

function parseCsvText(text, delim) {
  const rows = [];
  let field = "";
  let record = [];
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += ch;
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === delim) {
      record.push(field); field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      record.push(field); field = "";
      if (record.length > 1 || record[0] !== "") rows.push(record);
      record = [];
    } else field += ch;
  }
  if (field !== "" || record.length) { record.push(field); rows.push(record); }
  return rows;
}

export function parse(filePath, _fieldMap) {
  let text = readFileSync(filePath, "utf8");
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1); // strip BOM
  const firstLine = text.slice(0, text.indexOf("\n"));
  const delim = detectDelimiter(firstLine);
  const rows = parseCsvText(text, delim);
  if (!rows.length) return [];
  const header = rows[0].map((h) => h.trim());
  return rows.slice(1).map((r) => {
    const o = {};
    header.forEach((h, idx) => { o[h] = r[idx] ?? ""; });
    return o;
  });
}
