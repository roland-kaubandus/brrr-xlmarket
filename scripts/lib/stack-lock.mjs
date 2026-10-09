#!/usr/bin/env node
/**
 * stack-lock.mjs — ÜKS globaalne mutex k33g-stacki kaitseks (Tarmo 2026-10-09, item 1).
 *
 * PROBLEEM (tõestatud 2026-10-09): Task 1c `classifier-undo --deploy` kutsus `coolify-deploy.sh`
 * (ASÜNKROONE Coolify redeploy = `docker compose up` → recreate KÕIK k33g-konteinerid). API vastas
 * 200 kohe, Task 1c lõppes, käivitasin neighbor-execute — ja Coolify recreate'is db-k33g konteineri
 * KESKEL naabrite DB-transaktsiooni → `docker exec` vana konteineri-ID vastu suri (exit 1).
 *
 * LAHENDUS: üks advisory-lukk (PID-fail), mille VÕTAVAD nii:
 *   - KÕIK DB-kirjutavad tööd (öine pipeline, ETAPP/l3-create-engine, naabrid, classifier-undo, audit-execute)
 *   - deploy (coolify-deploy.sh, mis hoiab luku KUNI stack on tagasi healthy)
 * → kaks ei saa kunagi korraga käia. DB-write ootab kui deploy käib; deploy ootab kui DB-write käib.
 *
 * INTEROP: sama PID-faili skeem bash-versioonis (scripts/lib/stack-lock.sh) — fail-olemasolu = lukk,
 * mõlemad hostil samas pid-ruumis. STALE: kui hoidja-pid on surnud (või > STALE_MS) → varasta lukk.
 *
 * KASUTUS (node):
 *   import { withStackLock } from "./lib/stack-lock.mjs";
 *   await withStackLock({ holder: "neighbor-execute" }, async () => { ...DB-transaktsioon... });
 * või madal-tasand: const rel = acquireStackLock({holder,waitMs}); try{...}finally{ rel(); }
 */
import fs from "node:fs";
import os from "node:os";

const LOCK_DIR = process.env.XL_LOCK_DIR || "/opt/eumotors-tasks/locks";
const LOCKFILE = `${LOCK_DIR}/xl-stack-write.lock`;
const STALE_MS = 45 * 60 * 1000; // backstop: surnud-pid on primaarne kontroll, see on varuvõrk

const alive = (pid) => {
  if (!pid || pid <= 0) return false;
  try { process.kill(pid, 0); return true; } // ESRCH → surnud; EPERM → elus (mitte meie oma)
  catch (e) { return e.code === "EPERM"; }
};

const readLock = () => {
  try { return JSON.parse(fs.readFileSync(LOCKFILE, "utf8")); }
  catch { return null; }
};

const isStale = (info) => {
  if (!info) return true;
  if (!alive(info.pid)) return true;
  if (info.ts && Date.now() - info.ts > STALE_MS) return true;
  return false;
};

// RE-ENTRANTSUS sama protsessi sees: createL3Batch kutsutakse runL3Batches seest → teine acquire
// EI tohi iseennast deadlock'ida. Ref-count: fail-lukk võetakse ainult 1. korral, vabastatakse kui 0.
let _heldCount = 0;
let _heldFileRelease = null;

/** Hangi lukk. waitMs = kui kaua ootab enne keeldumist. Tagastab release()-funktsiooni. Viskab kui ei saa. */
export function acquireStackLock({ holder = "unknown", waitMs = 60_000, pollMs = 2_000 } = {}) {
  if (_heldCount > 0) { // juba meie protsessi käes → re-entrant no-op
    _heldCount++;
    let done = false;
    return () => { if (!done) { done = true; _heldCount--; if (_heldCount === 0 && _heldFileRelease) { _heldFileRelease(); _heldFileRelease = null; } } };
  }
  fs.mkdirSync(LOCK_DIR, { recursive: true });
  const me = { pid: process.pid, holder, host: os.hostname(), ts: Date.now() };
  const deadline = Date.now() + waitMs;
  let warned = false;
  for (;;) {
    try {
      const fd = fs.openSync(LOCKFILE, "wx"); // atomaarne: õnnestub AINULT kui faili pole
      fs.writeSync(fd, JSON.stringify(me));
      fs.closeSync(fd);
      break; // lukk käes
    } catch (e) {
      if (e.code !== "EEXIST") throw e;
      const cur = readLock();
      if (isStale(cur)) {
        // varasta surnud/aegunud lukk
        try { fs.unlinkSync(LOCKFILE); } catch {}
        continue;
      }
      if (!warned) {
        console.error(`🔒 stack-lukk hõivatud: holder=${cur?.holder} pid=${cur?.pid} (ootan kuni ${Math.round(waitMs / 1000)}s)…`);
        warned = true;
      }
      if (Date.now() >= deadline) {
        const err = new Error(`stack-lukk hõivatud (holder=${cur?.holder} pid=${cur?.pid}) — ei vabanenud ${Math.round(waitMs / 1000)}s jooksul`);
        err.code = "ELOCKBUSY"; err.holder = cur?.holder; throw err;
      }
      const t = Date.now();
      while (Date.now() - t < pollMs) { /* busy-wait väike (execSync-maailm, pole event-loopi) */ }
    }
  }
  let released = false;
  const fileRelease = () => {
    if (released) return; released = true;
    try { const cur = readLock(); if (cur && cur.pid === process.pid) fs.unlinkSync(LOCKFILE); } catch {}
  };
  _heldCount = 1;
  _heldFileRelease = fileRelease;
  const release = () => { if (_heldCount > 0) { _heldCount--; if (_heldCount === 0) { fileRelease(); _heldFileRelease = null; } } };
  // vabasta krahhi/katkestuse korral (PID-fail jääks muidu rippuma → järgmine steal'ib alles STALE_MS järel).
  // Krahhil vabastame FAILI otse (ref-count ei loe enam) — muidu rippuv lukk blokeeriks järgmised tööd.
  process.once("exit", () => fileRelease());
  process.once("SIGINT", () => { fileRelease(); process.exit(130); });
  process.once("SIGTERM", () => { fileRelease(); process.exit(143); });
  process.once("uncaughtException", (e) => { fileRelease(); console.error(e); process.exit(1); });
  return release;
}

/** Mähis: hangi lukk → jooksuta fn → vabasta (ka vea korral). */
export async function withStackLock(opts, fn) {
  const release = acquireStackLock(opts);
  try { return await fn(); }
  finally { release(); }
}

export const STACK_LOCKFILE = LOCKFILE;
