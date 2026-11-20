// Jooksuta: node --test scripts/dockerfile-copy-coverage.test.mjs   (backend/ juurest)
//
// MIKS: backend/Dockerfile runtime-stage EI kopeeri scripts/-i tervikuna (COPY . . on AINULT
// builderis). Iga konteineris jooksev skript + iga selle lokaalne lib-import on ERALDI
// `COPY --from=builder /app/scripts/X ./scripts/X` rida. Kui lisad skripti uue
// `import "./lib/foo.mjs"` AGA unustad COPY-rea → build õnnestub, aga RUNTIME kukub
// ERR_MODULE_NOT_FOUND alles skripti käivitusel (nt öine 03:00 reindeks = pime-ala).
// Juhtus 2026-11-20 (brand-derive.mjs). SEE TEST püüab klassi enne deploy'd.
//
// MIDA: parsib runtime-stage COPY-read → "runtime-image's saadaolevate teede" hulk (failid + dir'id).
// Siis BFS igast kopeeritud konteineri-JS-skriptist läbi selle ./ ja ../ relatiivsete importide
// (transitiivselt) ja nõuab, et iga scripts/- või src/-alune imporditud fail oleks KAETUD.
import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync, existsSync, statSync } from "node:fs"
import path from "node:path"

const BACKEND_ROOT = path.dirname(import.meta.dirname) // scripts/ -> backend/
const DOCKERFILE = path.join(BACKEND_ROOT, "Dockerfile")

const abs = (rel) => path.join(BACKEND_ROOT, rel)
const isFile = (rel) => { try { return statSync(abs(rel)).isFile() } catch { return false } }
const isDir = (rel) => { try { return statSync(abs(rel)).isDirectory() } catch { return false } }
const JS_EXT = [".mjs", ".js", ".cjs"]
const isJs = (rel) => JS_EXT.some((e) => rel.endsWith(e))
const isTest = (rel) => /\.test\.(mjs|js|cjs)$/.test(rel)

// --- 1. Parsi runtime-stage COPY-read ---
function parseRuntimeCopies() {
  const lines = readFileSync(DOCKERFILE, "utf8").split("\n")
  const runnerIdx = lines.findIndex((l) => /^FROM\s+.*\bAS\s+runner\b/.test(l))
  assert.ok(runnerIdx >= 0, "Dockerfile'ist ei leitud 'AS runner' stage'i")
  const copies = [] // { src: repo-rel, dest: repo-rel }
  for (const line of lines.slice(runnerIdx + 1)) {
    if (/^FROM\b/.test(line)) break // järgmine stage (pole praegu, aga ohutu)
    const t = line.trim()
    if (!t.startsWith("COPY") || !t.includes("--from=builder")) continue
    const toks = t.split(/\s+/)
    const i = toks.findIndex((x) => x.startsWith("/app/"))
    if (i < 0 || !toks[i + 1]) continue
    const src = toks[i].slice("/app/".length).replace(/\/+$/, "")
    copies.push({ src })
  }
  return copies
}

// --- 2. Ehita kaetud-hulk AINULT scripts/ + src/ COPY'dest (NODE_MODULES / .medusa/server
//        blob EI loe — scriptid kopeeritakse just SEEPÄRAST eraldi, et server-blob neid ei sisalda) ---
function buildCoverage(copies) {
  const files = new Set()
  const dirs = []
  for (const { src } of copies) {
    if (!(src.startsWith("scripts/") || src === "scripts" || src.startsWith("src/") || src === "src")) continue
    if (isDir(src)) dirs.push(src)
    else files.add(src)
  }
  return { files, dirs }
}
const makeIsCovered = ({ files, dirs }) => (rel) =>
  files.has(rel) || dirs.some((d) => rel === d || rel.startsWith(d + "/"))

// --- 3. Lahenda relatiivne import repo-suhteliseks reaalseks failiks (laiend-fallback) ---
function resolveImport(fromRel, spec) {
  const base = path.posix.normalize(path.posix.join(path.posix.dirname(fromRel), spec))
  if (base.startsWith("..")) return null // väljaspool backend-juurt → bare-laadne, eira
  if (isFile(base)) return base
  for (const e of JS_EXT) if (isFile(base + e)) return base + e
  for (const e of JS_EXT) if (isFile(path.posix.join(base, "index" + e))) return path.posix.join(base, "index" + e)
  return base // ei lahene reaalseks failiks → tagasta "oodatav" tee (märgitakse puuduvaks)
}

// --- 4. Ekstraktida ./ ja ../ relatiivsed import-spetsifikaatorid (kommentaarid eemaldatud) ---
function relativeSpecifiers(source) {
  const noBlock = source.replace(/\/\*[\s\S]*?\*\//g, "")          // /* ... */ (sh JSDoc @example)
  const clean = noBlock.replace(/(^|[^:])\/\/[^\n]*/g, "$1")        // // rea-komm (väldi ://)
  const specs = new Set()
  const re = /(?:\bfrom|\bimport|\brequire)\s*\(?\s*['"](\.\.?\/[^'"]+)['"]/g
  let m
  while ((m = re.exec(clean)) !== null) specs.add(m[1])
  return [...specs]
}

test("Dockerfile COPY katab kõik konteineri-skriptide lokaalsed impordid", () => {
  const copies = parseRuntimeCopies()
  const cov = buildCoverage(copies)
  const isCovered = makeIsCovered(cov)

  // Juured = kopeeritud konteineri-JS-skriptid scripts/-s (v.a *.test.*)
  const roots = [...cov.files].filter((f) => f.startsWith("scripts/") && isJs(f) && !isTest(f))
  assert.ok(roots.length > 0, "Ühtegi kopeeritud scripts/*.mjs juurt ei leitud — parser katki?")

  const missing = [] // { from, spec, resolved }
  const notOnDisk = []
  const visited = new Set()
  const queue = [...roots]
  while (queue.length) {
    const file = queue.shift()
    if (visited.has(file)) continue
    visited.add(file)
    if (!isFile(file)) continue
    for (const spec of relativeSpecifiers(readFileSync(abs(file), "utf8"))) {
      const resolved = resolveImport(file, spec)
      if (resolved === null) continue // väljaspool juurt
      // Huvitavad AINULT scripts/ + src/ alused (nimekaupa-kopeeritav tsoon)
      if (!(resolved.startsWith("scripts/") || resolved.startsWith("src/"))) continue
      if (!isFile(resolved)) notOnDisk.push({ from: file, spec, resolved })
      else if (!isCovered(resolved)) missing.push({ from: file, spec, resolved })
      if (isJs(resolved) && !visited.has(resolved)) queue.push(resolved)
    }
  }

  // .sh skriptid: `node scripts/X` väljakutsed peavad samuti kaetud olema
  const shMissing = []
  for (const f of [...cov.files].filter((x) => x.startsWith("scripts/") && x.endsWith(".sh"))) {
    const re = /node\s+(scripts\/[A-Za-z0-9._\-\/]+\.(?:mjs|js|cjs))/g
    let m
    while ((m = re.exec(readFileSync(abs(f), "utf8"))) !== null) {
      if (!isCovered(m[1])) shMissing.push({ from: f, invokes: m[1] })
    }
  }

  const fmt = (arr) => arr.map((x) => `  ${x.from}  →  "${x.spec ?? x.invokes}"  (${x.resolved ?? "pole COPY'tud"})`).join("\n")
  assert.equal(
    notOnDisk.length, 0,
    `Import ei lahene reaalseks failiks (katkine import):\n${fmt(notOnDisk)}`,
  )
  assert.equal(
    missing.length, 0,
    `PUUDUV Dockerfile COPY-rida (runtime ERR_MODULE_NOT_FOUND oht):\n${fmt(missing)}\n` +
    `→ Lisa backend/Dockerfile runner-stage'i: COPY --from=builder --chown=medusa:medusa /app/<tee> ./<tee>`,
  )
  assert.equal(
    shMissing.length, 0,
    `.sh käivitab COPY'mata node-skripti:\n${fmt(shMissing)}`,
  )
})
