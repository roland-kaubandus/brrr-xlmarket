#!/usr/bin/env node
/**
 * otsing-regress-check.mjs — Eesti liitsõna-otsing KIHT 1 PÜSIV regressioonitest.
 *
 * Iga sõna failist `reports/otsing-regress-sonad.txt` PEAB leidma >= min toodet storefront'i
 * REAALSE /api/search kaudu (locale=et). See testib KOGU päringu-teed (lemma-normaliseerimine +
 * põhisõna-fallback + Meili morph_et indeks) — EI triivi, sest kasutab sama koodi mis klient.
 *
 * Jookseb öise import-pipeline.sh [7] reindeksi JÄREL. Kukkumisel → Telegram (fail-loud, HARD RULE #5).
 * Lävi SUHTELINE (>= min, vaikimisi 1), MITTE fikseeritud tootearv (CLAUDE.md: väravates ei fikseeri numbreid).
 *
 * Kasutus:  node scripts/otsing-regress-check.mjs [--notify]
 *   --notify → Telegram-teade kukkumisel (scripts/lib/notify-telegram.sh). Ilma = ainult stdout + exit-kood.
 * READ-ONLY (ainult otsingu-päringud) → EI võta stack-lukku.
 */
import { spawnSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const WORDS_FILE = path.join(ROOT, "reports", "otsing-regress-sonad.txt");
const NOTIFY = path.join(ROOT, "scripts", "lib", "notify-telegram.sh");
const DO_NOTIFY = process.argv.includes("--notify");

function sh(cmd, args) {
  const r = spawnSync(cmd, args, { encoding: "utf8", maxBuffer: 1 << 28 });
  if (r.status !== 0) throw new Error(`${cmd} ${args.join(" ")} rc=${r.status}\n${(r.stderr || "").slice(0, 500)}`);
  return r.stdout;
}

function storefrontContainer() {
  // AINULT k33g (staging). uo28 = PROD — EI puutu (HARD RULE #12).
  const names = sh("docker", ["ps", "--format", "{{.Names}}"]).split("\n").map(s => s.trim());
  const s = names.find(n => n.startsWith("storefront-k33g"));
  if (!s) throw new Error("storefront-k33g konteinerit ei leitud (docker ps)");
  return s;
}

function parseWords() {
  const out = [];
  for (const raw of readFileSync(WORDS_FILE, "utf8").split("\n")) {
    const line = raw.replace(/\r$/, "");
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const m = t.split("\t");
    const word = m[0].trim();
    const min = m[1] ? parseInt(m[1].trim(), 10) || 1 : 1;
    if (word) out.push({ word, min });
  }
  return out;
}

function queryHits(container, word) {
  const q = encodeURIComponent(word);
  const url = `http://127.0.0.1:3030/api/search?q=${q}&limit=24&locale=et`;
  const out = sh("docker", ["exec", container, "wget", "-qO-", url]);
  const j = JSON.parse(out);
  return j.totalHits ?? 0;
}

function main() {
  if (!existsSync(WORDS_FILE)) throw new Error(`puudub: ${WORDS_FILE}`);
  const container = storefrontContainer();
  const words = parseWords();
  const failures = [];
  for (const { word, min } of words) {
    let hits = 0;
    try {
      hits = queryHits(container, word);
    } catch (e) {
      failures.push({ word, min, hits: `VIGA: ${e.message.slice(0, 80)}` });
      continue;
    }
    if (hits < min) failures.push({ word, min, hits });
  }

  console.log(`[otsing-regress] ${words.length} sõna · ${failures.length} kukkus · storefront=${container}`);
  if (failures.length === 0) {
    console.log("✅ KÕIK leidsid tooteid (KIHT 1 otsing terve).");
    return 0;
  }
  console.error("❌ REGRESSIOON — järgmised sõnad EI leidnud oodatud tooteid:");
  for (const f of failures) console.error(`   ${f.word}  (ootas >=${f.min}, sai ${f.hits})`);

  if (DO_NOTIFY && existsSync(NOTIFY)) {
    const list = failures.slice(0, 15).map(f => `${f.word}=${f.hits}`).join(", ");
    const msg = `❌ XLM otsingu-regressioon: ${failures.length}/${words.length} sõna ei leidnud tooteid (${list}). ` +
      `KIHT 1 liitsõna-otsing katki? Kontrolli morph_et indeksit + qmap + reindeksit.`;
    spawnSync("sh", [NOTIFY, msg], { encoding: "utf8" });
  }
  return 1;
}

process.exit(main());
