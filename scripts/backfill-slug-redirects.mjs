#!/usr/bin/env node
/**
 * backfill-slug-redirects.mjs — ühekordne backfill (HARD RULE #5 backfill-pool; hook = trigger 010).
 *
 * PROBLEEM: osa kategooria-handle'id KADUSID ETAPP/okt-muutustes ENNE kui auto-trigger (migration 010)
 * olemas oli → slug_redirect neid ei kata → cutover'il 404 (Google-indekseeritud vanad URL-id).
 *
 * DIFF-MEETOD (2026-10-13): handle'id baseline category-tree.generated.json @7356032f (pre-okt-ETAPP)
 * vs HEAD, MIINUS elavad DB-handle'id, MIINUS olemas slug_redirect.from_slug = 3 kadunud handle't:
 *   - v4-outlet-defektiga-toode            → kadus ETAPP2-s (loodi 15c147c0, eemaldati 7a75d980)
 *   - v4-outlet-leiunurk                   → sama
 *   - v4-...-cnc-paindvolliga-lihvimismasinad → soft-deleted e9cf9cb8 (kontseptsiooni-värava revert, dup-L3)
 *
 * SIHID: outlet-leaf'id → vanem v4-outlet (merge); dup-L3 → vanem L2 (deprecate). Iga siht
 * KONTROLLITAKSE elavaks enne kirjutamist (DUP-värav — redirect EI tohi osutada teise 404-sse).
 *
 * STACK-LUKK: standalone DB-write → võtab luku ISE (HARD RULE #9).
 * DRY vaikimisi; --execute kirjutab.
 */
import { withStackLock } from "./lib/stack-lock.mjs";
import { recordCategoryRedirect } from "./lib/slug-redirect.mjs";
import { execFileSync } from "node:child_process";

const execute = process.argv.includes("--execute");
const DB_CONTAINER = process.env.XL_DB_CONTAINER || "db-k33g510dw19uyjau3ca7dqpi-125024036014";

// Diff'ist tuletatud (2026-10-13). Iga siht valideeritakse elavaks enne kirjutamist.
const BACKFILL = [
  { from: "v4-outlet-defektiga-toode", to: "v4-outlet", reason: "merge" },
  { from: "v4-outlet-leiunurk", to: "v4-outlet", reason: "merge" },
  {
    from: "v4-reklaami-truki-ja-graveerimisseadmed-laser-graveerimine-ja-cnc-paindvolliga-lihvimismasinad",
    to: "v4-reklaami-truki-ja-graveerimisseadmed-laser-graveerimine-ja-cnc",
    reason: "deprecate",
  },
];

// Loeme DB-d docker exec psql kaudu (k33g = parooli-vaba; pg-klient vajaks PGPASSWORD-i, mida hostil pole).
function psql(sql) {
  return execFileSync(
    "docker",
    ["exec", DB_CONTAINER, "psql", "-U", "xlmarket", "-d", "xlmarket", "-tA", "-F", "\t", "-c", sql],
    { encoding: "utf8" },
  );
}

async function main() {
  // DUP-värav: iga siht peab olema ELAV kategooria
  const live = new Set(
    psql("SELECT handle FROM product_category WHERE deleted_at IS NULL")
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean),
  );
  // Olemas redirect'id (ära kirjuta üle, kui juba kaetud)
  const existing = new Set(
    psql("SELECT from_slug FROM slug_redirect")
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean),
  );

  const plan = [];
  for (const b of BACKFILL) {
    if (!live.has(b.to)) {
      console.error(`❌ SIHT PUUDUB (elav): '${b.to}' — JÄTAN VAHELE (${b.from})`);
      continue;
    }
    if (live.has(b.from)) {
      console.error(`⚠️  '${b.from}' on ELAV kategooria — redirect pole vajalik, jätan vahele`);
      continue;
    }
    if (existing.has(b.from)) {
      console.error(`ℹ️  '${b.from}' juba slug_redirect-is — jätan vahele`);
      continue;
    }
    plan.push(b);
  }

  console.log(`Plaan: ${plan.length}/${BACKFILL.length} redirect'i.`);
  for (const p of plan) console.log(`  ${p.from}\n    → ${p.to}  [${p.reason}]`);

  if (!execute) {
    console.log("\nDRY RUN — lisa --execute kirjutamiseks.");
    return;
  }
  if (plan.length === 0) {
    console.log("Midagi kirjutada pole.");
    return;
  }

  // Kirjutame pg-kliendiga (recordCategoryRedirect töötab pg client peal). PGPASSWORD vajalik
  // AINULT execute-haruks; kui puudub, langeme docker exec INSERT-ile (sama ON CONFLICT loogika).
  const pw = process.env.PGPASSWORD;
  if (pw) {
    const pg = (await import("pg")).default;
    const client = new pg.Client({ host: "localhost", port: 5435, user: "xlmarket", password: pw, database: "xlmarket" });
    await client.connect();
    try {
      await client.query("BEGIN");
      for (const p of plan) await recordCategoryRedirect(client, { fromSlug: p.from, toSlug: p.to, reason: p.reason });
      await client.query("COMMIT");
    } catch (e) {
      try { await client.query("ROLLBACK"); } catch {}
      throw e;
    } finally {
      await client.end();
    }
  } else {
    // docker exec fallback: üks transaktsioon, sama ON CONFLICT + chain-collapse loogika kui helper
    const stmts = ["BEGIN;"];
    for (const p of plan) {
      const f = p.from.replace(/'/g, "''");
      const t = p.to.replace(/'/g, "''");
      const r = p.reason.replace(/'/g, "''");
      stmts.push(
        `INSERT INTO slug_redirect (from_slug,to_slug,reason) VALUES ('${f}','${t}','${r}') ` +
          `ON CONFLICT (from_slug) DO UPDATE SET to_slug=EXCLUDED.to_slug,reason=EXCLUDED.reason,created_at=NOW();`,
        `UPDATE slug_redirect SET to_slug='${t}' WHERE to_slug='${f}' AND from_slug<>'${t}';`,
      );
    }
    stmts.push("DELETE FROM slug_redirect WHERE from_slug=to_slug;", "COMMIT;");
    execFileSync(
      "docker",
      ["exec", "-i", DB_CONTAINER, "psql", "-U", "xlmarket", "-d", "xlmarket", "-v", "ON_ERROR_STOP=1"],
      { input: stmts.join("\n"), encoding: "utf8", stdio: ["pipe", "inherit", "inherit"] },
    );
  }
  console.log(`✅ ${plan.length} redirect'i kirjutatud.`);
}

await withStackLock({ holder: "backfill-slug-redirects" }, main);
