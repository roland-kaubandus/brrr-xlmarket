/**
 * scripts/adapters/xlsx.mjs — XLSX feed-draiver (VEVOR)
 * Tagastab toorread (objektid päise-veergudega). Normaliseerimine index.mjs-is.
 */
import XLSX from "xlsx";

export function parse(filePath, _fieldMap) {
  const wb = XLSX.readFile(filePath);
  const ws = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json(ws, { defval: "" });
}
