#!/usr/bin/env node
/**
 * Translate taxonomy.yaml name_en → name_et (and description_en → description_et).
 *
 * Reads backend/src/data/taxonomy.yaml, walks every L1..L7 node, batches them
 * to claude `-p` with parent_path context, writes name_et back into the YAML
 * tree, then writes the file. After this runs, regenerate category-tree.generated.json:
 *   node scripts/gen-category-tree.mjs
 *
 * Usage:
 *   node scripts/translate-yaml-categories.mjs              # all pending
 *   node scripts/translate-yaml-categories.mjs --limit 50   # first 50 only
 *   node scripts/translate-yaml-categories.mjs --batch 30
 */
import { readFileSync, writeFileSync } from "fs"
import { execFile } from "child_process"
import path from "path"
import { fileURLToPath } from "url"
import yaml from "js-yaml"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, "..")
const YAML_PATH = path.join(ROOT, "backend/src/data/taxonomy.yaml")
const CLAUDE_BIN = "/usr/bin/claude"

const args = process.argv.slice(2)
const getArg = (name, fallback) => {
  const i = args.indexOf(name)
  return i >= 0 ? args[i + 1] : fallback
}
const hasFlag = (name) => args.includes(name)

const LIMIT = parseInt(getArg("--limit", "0"))
const BATCH_SIZE = parseInt(getArg("--batch", "30"))
const MODEL = getArg("--model", "sonnet")
const FALLBACK = getArg("--fallback-model", "haiku")
const DRY_RUN = hasFlag("--dry-run")

function log(msg) {
  console.log(`[${new Date().toISOString()}] [YAML-T] ${msg}`)
}

const PROMPT = (rows) => `Tõlgi XLMarket toote-kategooriate nimed inglise keelest eesti keelde.

EESMÄRK: kategooriapealkirjad professionaalse Eesti e-poe peamenüüsse — lühikesed, selged, mitmuses.

KRIITILISED REEGLID:
- Tagasta AINULT JSON: massiiv {"slug":"<sama-slug>","name_et":"<eesti>"}.
- Sama pikkus ja järjekord kui sisendis. Ära muuda "slug" välja.
- Brändid jäävad: VEVOR, XLMarket, HoReCa, B2B, AI, ATV, UTV, RV, GPS.
- Numbrid ja ühikud jäävad samaks (12V, 24kW, 230V, kg, L, mm, RPM).
- ÄRA jäta inglise sõnu: "Heavy Duty", "Brand New", "Portable", "Stainless", "Inch", "Feet", "Gauge", "Mini", "Pro", "Premium" — leia eesti vaste või kirjeldav fraas.

KONTEKSTI KASUTAMINE:
- Iga sisend sisaldab "parent_path" — vanemkategooriate ahelat (nt "HoReCa & Food Service > Small Kitchen Appliances > Coffee Equipment").
- See annab toote tüübi konteksti — kasuta seda õigeks vasteks.
- "Mops" parent="Cleaning" → "Põrandamopid" (mitte koeratõug)
- "Jacks" parent="Auto Tools" → "Tungrauad" (mitte mängukaardid)
- "Bits" parent="Drilling" → "Puuriotsikud"
- "Pumps" parent="Plumbing" → "Pumbad"; "Pumps" parent="Footwear" → "Naistekingad"
- "Mixers" parent="Audio" → "Helimikserid"; parent="Kitchen" → "Mikserid"

KEELATUD VEAD (eelmistest tõlgetest):
- "Mag puur bitid" → ÕIGE "Magnetpuuri otsikud"
- "Põrandastatív" → ÕIGE "Põrandastatiiv"
- "Dispenseer" → ÕIGE "Jaotur" / "Dosaator"
- "Kopp-laadur" (backhoe) → ÕIGE "Tagakopp"
- "Kanavõrkaed" (hardware cloth) → ÕIGE "Metallvõrk"
- "Tasanduskopa piik" (box blade) → ÕIGE "Tasanduslaba"
- "Vaatetornitelk" → ÕIGE "Vaatetorn-telk"
- "Gummipael" → ÕIGE "Kummipael"
- "Rotimeister" → ÕIGE "Rotihävitaja" või "Näriliste hävitaja"

EESTI E-KAUBANDUSE STIIL:
- Lühike, selge, mitmuses ("Mopid" mitte "Mopp")
- Erialane terminoloogia (mitte sõna-haupa otsetõlge)
- Kui ei saa elegantset 1-2 sõnalist tõlget, kasuta selget kirjeldavat fraasi

KONTROLLI ENNE VASTUST:
1. Iga "name_et" on eesti keeles, ilma inglise sõnadeta?
2. Sobib parent_path konteksti?
3. Kõlab loomulikult Eesti müüja kirjutatuna?

Tagasta ainult JSON-massiiv, ilma kommentaarideta või markdown-piirajateta.

Sisend:
${JSON.stringify(rows, null, 2)}`

function callClaude(prompt, timeoutMs = 180000) {
  return new Promise((resolve, reject) => {
    const child = execFile(
      CLAUDE_BIN,
      [
        "-p",
        "--output-format", "text",
        "--model", MODEL,
        "--fallback-model", FALLBACK,
        "--no-session-persistence",
        "--disable-slash-commands",
        "--dangerously-skip-permissions",
      ],
      { timeout: timeoutMs, maxBuffer: 10 * 1024 * 1024 },
      (err, stdout, stderr) => {
        if (err) return reject(new Error(`claude error: ${err.message.slice(0, 200)}\n${stderr.slice(0, 300)}`))
        resolve(stdout)
      }
    )
    child.stdin.end(prompt)
  })
}

function extractJsonArray(s) {
  let out = s.trim().replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "").trim()
  const start = out.indexOf("[")
  if (start === -1) return out
  let depth = 0, inStr = false, esc = false
  for (let i = start; i < out.length; i++) {
    const ch = out[i]
    if (esc) { esc = false; continue }
    if (ch === "\\") { esc = true; continue }
    if (ch === '"') { inStr = !inStr; continue }
    if (inStr) continue
    if (ch === "[") depth++
    else if (ch === "]") {
      depth--
      if (depth === 0) return out.slice(start, i + 1)
    }
  }
  return out.slice(start)
}

/**
 * Walk the YAML tree, collect every node that needs translation.
 * Each entry includes the node ref so we can mutate it in-place after batch.
 */
function collectNodes(yamlObj) {
  const out = []
  function walk(node, parentPath) {
    if (!Array.isArray(node)) return
    for (const child of node) {
      if (!child || typeof child !== "object") continue
      const slug = child.slug
      const nameEn = child.name_en
      if (!slug || !nameEn) continue
      out.push({
        slug,
        name_en: nameEn,
        parent_path: parentPath,
        node: child,
        already_translated: !!child.name_et,
      })
      if (Array.isArray(child.subs) && child.subs.length > 0) {
        const newPath = parentPath ? `${parentPath} > ${nameEn}` : nameEn
        walk(child.subs, newPath)
      }
    }
  }
  walk(yamlObj.l1 || [], "")
  return out
}

async function main() {
  log(`reading ${YAML_PATH}`)
  const raw = readFileSync(YAML_PATH, "utf8")
  const tree = yaml.load(raw)

  const all = collectNodes(tree)
  const pending = all.filter((n) => !n.already_translated)

  log(`total nodes: ${all.length}, already translated: ${all.length - pending.length}, pending: ${pending.length}`)

  let toProcess = pending
  if (LIMIT > 0) toProcess = pending.slice(0, LIMIT)

  let translated = 0
  let consecutiveFails = 0

  for (let i = 0; i < toProcess.length; i += BATCH_SIZE) {
    if (consecutiveFails >= 5) {
      log(`STOPPING: 5 consecutive batch failures`)
      break
    }

    const batch = toProcess.slice(i, i + BATCH_SIZE)
    const input = batch.map((n) => ({
      slug: n.slug,
      name_en: n.name_en,
      parent_path: n.parent_path,
    }))

    const t0 = Date.now()
    let raw
    try {
      raw = await callClaude(PROMPT(input))
    } catch (e) {
      log(`!! batch ${i / BATCH_SIZE} call FAILED: ${e.message.slice(0, 150)}`)
      consecutiveFails++
      continue
    }

    let parsed
    try {
      parsed = JSON.parse(extractJsonArray(raw))
    } catch (e) {
      log(`!! batch ${i / BATCH_SIZE} JSON parse FAILED: ${e.message}`)
      consecutiveFails++
      continue
    }

    if (!Array.isArray(parsed)) {
      log(`!! batch ${i / BATCH_SIZE} not an array`)
      consecutiveFails++
      continue
    }

    let applied = 0
    const bySlug = new Map()
    for (const out of parsed) {
      if (!out || typeof out.slug !== "string" || typeof out.name_et !== "string") continue
      bySlug.set(out.slug, out.name_et.trim())
    }

    for (const n of batch) {
      const nameEt = bySlug.get(n.slug)
      if (!nameEt || nameEt.length < 1) continue
      n.node.name_et = nameEt
      applied++
    }

    translated += applied
    consecutiveFails = applied > 0 ? 0 : consecutiveFails + 1
    log(`batch ${Math.floor(i / BATCH_SIZE) + 1}: ${applied}/${batch.length} applied (${Date.now() - t0}ms) — total ${translated}/${toProcess.length}`)

    // Persist after every batch (idempotent — can be killed mid-run safely)
    if (!DRY_RUN && applied > 0) {
      const yamlOut = yaml.dump(tree, { lineWidth: 200, noRefs: true, sortKeys: false })
      writeFileSync(YAML_PATH, yamlOut, "utf8")
    }
  }

  log(`DONE: translated ${translated} new nodes, total ${all.length - pending.length + translated}/${all.length}`)
  if (DRY_RUN) log(`(dry-run — no file written)`)
}

main().catch((e) => {
  console.error("FATAL:", e)
  process.exit(2)
})
