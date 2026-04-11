#!/usr/bin/env node
/**
 * Local dashboard for VEVOR translation batch progress.
 *
 * Run from backend:
 *   node src/scripts/translation-dashboard.mjs
 * Open:
 *   http://localhost:5055
 *
 * Optional token budget env vars:
 *   XL_TOKEN_SESSION_LIMIT, XL_TOKEN_SESSION_USED
 *   XL_TOKEN_WEEKLY_LIMIT, XL_TOKEN_WEEKLY_USED
 */

import { createServer } from "http"
import { existsSync, readdirSync, readFileSync, statSync } from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const BACKEND_ROOT = path.resolve(__dirname, "../..")
const PORT = Number.parseInt(arg("--port", process.env.PORT || "5055"), 10)
const FEED_CACHE = path.resolve(arg("--feed-cache", path.join(BACKEND_ROOT, "data/feeds/vevor-feed-cache.json")))
const BATCH_DIR = path.resolve(arg("--batch-dir", path.join(BACKEND_ROOT, "data/translation-batches")))
const LOG_FILE = path.resolve(arg("--log", path.join(BATCH_DIR, "translation-run.log")))
const BATCH_SIZE = Number.parseInt(arg("--batch-size", "500"), 10)
const CHUNK_SIZE = Number.parseInt(arg("--chunk-size", "20"), 10)

function arg(name, fallback = null) {
  const idx = process.argv.indexOf(name)
  return idx === -1 ? fallback : process.argv[idx + 1] ?? fallback
}

function json(file, fallback) {
  try { return JSON.parse(readFileSync(file, "utf8")) } catch { return fallback }
}

function text(file, fallback = "") {
  try { return readFileSync(file, "utf8") } catch { return fallback }
}

function num(value, fallback = 0) {
  const n = Number.parseFloat(value)
  return Number.isFinite(n) ? n : fallback
}

function tokens(value) {
  return Math.ceil(String(value || "").length / 4)
}

function fmt(value) {
  return new Intl.NumberFormat("et-EE").format(Math.round(value || 0))
}

function pct(value) {
  return `${(value || 0).toFixed(1)}%`
}

function date(value) {
  if (!value) return "-"
  return new Intl.DateTimeFormat("et-EE", { dateStyle: "short", timeStyle: "medium" }).format(value)
}

function bytes(value) {
  if (!value) return "0 B"
  const units = ["B", "KB", "MB", "GB"]
  let size = value
  let idx = 0
  while (size >= 1024 && idx < units.length - 1) {
    size /= 1024
    idx++
  }
  return `${size.toFixed(idx ? 1 : 0)} ${units[idx]}`
}

function html(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;")
}

function isBatch(name) {
  return name.endsWith(".json") &&
    !name.includes("smoke") &&
    !name.includes("check") &&
    (name.startsWith("batch-") || name.startsWith("wo-codex-"))
}

function rowKey(row) {
  return String(row?.sku || row?.id || "").trim()
}

function feedRows() {
  const feed = json(FEED_CACHE, null)
  return Object.values(feed?.bySku || {}).map((row) => ({
    sku: String(row?.sku || ""),
    title: String(row?.title || ""),
    description: String(row?.descriptionText || ""),
    product_type: String(row?.productType || ""),
    selling_point_1: String(row?.sellingPoints?.[0] || ""),
    selling_point_2: String(row?.sellingPoints?.[1] || ""),
    selling_point_3: String(row?.sellingPoints?.[2] || ""),
    selling_point_4: String(row?.sellingPoints?.[3] || ""),
    selling_point_5: String(row?.sellingPoints?.[4] || ""),
  }))
}

function batchFiles() {
  if (!existsSync(BATCH_DIR)) return []
  return readdirSync(BATCH_DIR)
    .filter(isBatch)
    .map((name) => {
      const file = path.join(BATCH_DIR, name)
      const stat = statSync(file)
      const rows = json(file, [])
      const entries = Array.isArray(rows) ? rows : []
      return {
        name,
        file,
        entries: entries.length,
        uniqueEntries: new Set(entries.map(rowKey).filter(Boolean)).size,
        bytes: stat.size,
        outputTokens: tokens(JSON.stringify(entries)),
        modifiedAt: stat.mtime,
      }
    })
    .sort((a, b) => a.name.localeCompare(b.name))
}

function actualTokenUsage(lines) {
  const usage = { chunks: 0, input: 0, output: 0, total: 0, cached: 0 }
  for (const line of lines) {
    const match = line.match(/TOKENS\b.*?\binput=(\d+)\b.*?\boutput=(\d+)\b.*?\btotal=(\d+)\b.*?\bcached=(\d+)/i)
    if (!match) continue
    usage.chunks += 1
    usage.input += Number.parseInt(match[1], 10)
    usage.output += Number.parseInt(match[2], 10)
    usage.total += Number.parseInt(match[3], 10)
    usage.cached += Number.parseInt(match[4], 10)
  }
  return usage
}

function logInfo() {
  const raw = text(LOG_FILE)
  const lines = raw.split(/\r?\n/).filter(Boolean)
  const reverse = [...lines].reverse()
  const currentBatch = reverse.find((line) => /BATCH\s+batch-\d+/i.test(line)) || ""
  const currentChunk = reverse.find((line) => /chunk\s+\d+\/\d+/i.test(line)) || ""
  const failed = reverse.find((line) => /FAILED|Error|❌/i.test(line)) || ""
  const done = reverse.find((line) => /^DONE\b/i.test(line)) || ""
  const stat = existsSync(LOG_FILE) ? statSync(LOG_FILE) : null
  return {
    exists: existsSync(LOG_FILE),
    currentBatch,
    currentChunk,
    failed,
    done,
    modifiedAt: stat?.mtime || null,
    fresh: stat ? Date.now() - stat.mtime.getTime() < 5 * 60 * 1000 : false,
    actualTokens: actualTokenUsage(lines),
    tail: lines.slice(-80),
  }
}

function budget(name, usedEstimate) {
  const upper = name.toUpperCase()
  const limit = num(process.env[`XL_TOKEN_${upper}_LIMIT`], 0)
  const manual = num(process.env[`XL_TOKEN_${upper}_USED`], 0)
  return {
    configured: limit > 0,
    limit,
    used: manual + usedEstimate,
    remaining: limit > 0 ? Math.max(limit - manual - usedEstimate, 0) : null,
  }
}

function stats() {
  const feed = feedRows()
  const batches = batchFiles()
  const log = logInfo()
  const translated = new Set()
  for (const batch of batches) {
    const rows = json(batch.file, [])
    if (!Array.isArray(rows)) continue
    for (const row of rows) {
      const key = rowKey(row)
      if (key) translated.add(key)
    }
  }

  const total = feed.length
  const done = translated.size
  const sourceTokens = feed.reduce((sum, row) => sum + tokens(JSON.stringify(row)), 0)
  const outputTokens = batches.reduce((sum, batch) => sum + batch.outputTokens, 0)
  const avgSource = total ? sourceTokens / total : 0
  const avgOutput = done ? outputTokens / done : avgSource * 0.9
  const promptOverhead = 900
  const usedEstimate = done * (avgSource + avgOutput) + Math.ceil(done / CHUNK_SIZE) * promptOverhead
  const totalEstimate = total * (avgSource + avgOutput) + Math.ceil(total / CHUNK_SIZE) * promptOverhead

  return {
    generatedAt: new Date(),
    paths: { feedCache: FEED_CACHE, batchDir: BATCH_DIR, logFile: LOG_FILE },
    progress: {
      total,
      done,
      remaining: Math.max(total - done, 0),
      percent: total ? done / total * 100 : 0,
      totalBatches: Math.ceil(total / BATCH_SIZE),
      completedBatchFiles: batches.filter((batch) => batch.name.startsWith("batch-")).length,
      batchSize: BATCH_SIZE,
      chunkSize: CHUNK_SIZE,
    },
    batches,
    log,
    tokens: {
      sourceTokens,
      outputTokens,
      usedEstimate,
      totalEstimate,
      remainingEstimate: Math.max(totalEstimate - usedEstimate, 0),
      actual: log.actualTokens,
      session: budget("session", usedEstimate),
      weekly: budget("weekly", usedEstimate),
    },
  }
}

function budgetCard(title, item) {
  if (!item.configured) {
    return `<div class="card soft"><span>${title}</span><b>limiit seadistamata</b><p>Lisa env XL_TOKEN_${title.toUpperCase()}_LIMIT ja vajadusel XL_TOKEN_${title.toUpperCase()}_USED.</p></div>`
  }
  const usedPct = item.limit ? Math.min(item.used / item.limit * 100, 100) : 0
  return `<div class="card"><span>${title}</span><b>${fmt(item.remaining)} alles</b><div class="bar"><i style="width:${usedPct}%"></i></div><p>${fmt(item.used)} / ${fmt(item.limit)} hinnanguliselt kasutatud</p></div>`
}

function page(data) {
  const status = data.log.failed ? "bad" : data.log.fresh ? "good" : "warn"
  const statusText = data.log.failed ? "Viga logis" : data.log.fresh ? "Jooks aktiivne" : "Jooks ei paista aktiivne"
  const rows = data.batches.map((batch) => `<tr><td>${html(batch.name)}</td><td>${fmt(batch.entries)}</td><td>${bytes(batch.bytes)}</td><td>${fmt(batch.outputTokens)}</td><td>${date(batch.modifiedAt)}</td></tr>`).join("")
  const log = data.log.tail.map((line) => `<div>${html(line)}</div>`).join("")
  const actual = data.tokens.actual?.chunks
    ? `Reaalne OpenAI usage logis: ${fmt(data.tokens.actual.total)} total, ${fmt(data.tokens.actual.input)} input, ${fmt(data.tokens.actual.output)} output (${fmt(data.tokens.actual.chunks)} chunk'i).`
    : "Reaalset OpenAI usage infot pole veel logis. See tekib ainult OPENAI_API_KEY jooksuga."
  return `<!doctype html><html lang="et"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="refresh" content="15"><title>XL Market tõlkedashboard</title><style>
:root{--bg:#f4efe6;--panel:#fffaf1;--ink:#1d2521;--muted:#6d716b;--line:#ded2bf;--accent:#b3531a;--green:#163f34;--good:#1f7a4d;--warn:#b7791f;--bad:#b42318}*{box-sizing:border-box}body{margin:0;color:var(--ink);background:radial-gradient(circle at top left,rgba(179,83,26,.18),transparent 32rem),linear-gradient(135deg,#f8f1e5,#efe4d0);font-family:Georgia,'Times New Roman',serif}main{max-width:1240px;margin:0 auto;padding:32px 20px 48px}header{display:flex;justify-content:space-between;gap:18px;align-items:flex-end;margin-bottom:24px}h1{margin:0;font-size:clamp(34px,5vw,68px);line-height:.92;letter-spacing:-.05em}h2{margin:0 0 14px;font-size:22px}p{color:var(--muted);margin:8px 0 0;line-height:1.45}code{background:rgba(22,63,52,.08);padding:2px 5px;border-radius:6px}.grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}.two{grid-template-columns:repeat(2,minmax(0,1fr))}.card{background:rgba(255,250,241,.9);border:1px solid rgba(94,73,45,.16);border-radius:24px;box-shadow:0 18px 60px rgba(66,45,22,.12);padding:20px}.card span{display:block;color:var(--accent);font:700 12px/1 'Trebuchet MS',sans-serif;letter-spacing:.12em;text-transform:uppercase;margin-bottom:10px}.card b{display:block;font-size:30px;letter-spacing:-.04em}.soft{opacity:.78}.bar{overflow:hidden;height:14px;margin:14px 0 8px;border-radius:999px;background:#e2d4bf}.bar i{display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,var(--accent),var(--green))}.status{display:inline-flex;padding:8px 12px;border-radius:999px;color:white;font:700 13px/1 'Trebuchet MS',sans-serif}.good{background:var(--good)}.warn{background:var(--warn)}.bad{background:var(--bad)}section{margin-top:16px}table{width:100%;border-collapse:collapse;font-family:'Trebuchet MS',sans-serif;font-size:14px}th,td{padding:12px 10px;border-bottom:1px solid var(--line);text-align:left}th{color:var(--green);font-size:12px;text-transform:uppercase;letter-spacing:.08em}.log{max-height:360px;overflow:auto;padding:14px;border-radius:16px;background:#1d2521;color:#f8f1e5;font:12px/1.55 Consolas,'Courier New',monospace}.paths{display:grid;gap:8px;overflow-wrap:anywhere;font-family:'Trebuchet MS',sans-serif;font-size:13px}.updated{text-align:right;color:var(--muted);font-family:'Trebuchet MS',sans-serif;font-size:13px}@media(max-width:900px){header{display:block}.updated{text-align:left;margin-top:14px}.grid,.two{grid-template-columns:1fr}}
</style></head><body><main><header><div><span class="card span">XL Market</span><h1>Tõlkedashboard</h1><p>Autorefresh iga 15 sekundi järel. Andmed loetakse feed-cache'ist, batch JSON failidest ja logifailist.</p></div><div class="updated"><div>${date(data.generatedAt)}</div><div class="status ${status}">${statusText}</div></div></header><section class="grid"><div class="card"><span>Valmis</span><b>${fmt(data.progress.done)}</b><p>${fmt(data.progress.total)} tootest</p></div><div class="card"><span>Progress</span><b>${pct(data.progress.percent)}</b><div class="bar"><i style="width:${data.progress.percent}%"></i></div></div><div class="card"><span>Tegemata</span><b>${fmt(data.progress.remaining)}</b><p>${fmt(data.progress.totalBatches)} batchi kokku, ${fmt(data.progress.completedBatchFiles)} batch-*.json faili olemas</p></div><div class="card"><span>Praegune jooks</span><b>${html(data.log.currentChunk || "-")}</b><p>${html(data.log.currentBatch || "batch infot pole")}</p></div></section><section class="grid two"><div class="card"><span>Tokenid hinnanguliselt</span><b>${fmt(data.tokens.remainingEstimate)} alles</b><p>Kokku ${fmt(data.tokens.totalEstimate)}, kasutatud ${fmt(data.tokens.usedEstimate)}. ${html(actual)}</p></div><div class="card"><span>Generated output</span><b>${fmt(data.tokens.outputTokens)}</b><p>Tokenihinnang juba loodud batch JSON failidest.</p></div></section><section class="grid two">${budgetCard("session", data.tokens.session)}${budgetCard("weekly", data.tokens.weekly)}</section><section class="card"><h2>Batch failid</h2><table><thead><tr><th>Fail</th><th>Kirjeid</th><th>Suurus</th><th>Output tokenid</th><th>Muudetud</th></tr></thead><tbody>${rows || '<tr><td colspan="5">Batch-faile pole veel.</td></tr>'}</tbody></table></section><section class="card"><h2>Logi saba</h2><div class="log">${log || "Logi pole veel."}</div></section><section class="card"><h2>Allikad</h2><div class="paths"><div><b>Feed:</b> ${html(data.paths.feedCache)}</div><div><b>Batchid:</b> ${html(data.paths.batchDir)}</div><div><b>Logi:</b> ${html(data.paths.logFile)}</div></div></section></main></body></html>`
}

const server = createServer((req, res) => {
  const data = stats()
  if (req.url === "/api/status") {
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" })
    res.end(JSON.stringify(data, null, 2))
    return
  }
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" })
  res.end(page(data))
})

server.listen(PORT, () => {
  console.log(`Translation dashboard: http://localhost:${PORT}`)
  console.log(`Feed cache: ${FEED_CACHE}`)
  console.log(`Batch dir: ${BATCH_DIR}`)
})
