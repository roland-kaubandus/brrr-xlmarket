#!/usr/bin/env node
/**
 * Watchdog runner for VEVOR translation batches.
 *
 * Runs translate-claude.mjs in a supervised loop, skips completed batch files,
 * appends progress to translation-run.log, and retries failed batches.
 */

import { spawn } from "child_process"
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const BACKEND_DIR = path.resolve(__dirname, "../..")
const REPO_DIR = path.resolve(BACKEND_DIR, "..")
const BATCH_DIR = path.resolve(BACKEND_DIR, "data/translation-batches")
const FEED_CACHE_PATH = path.resolve(BACKEND_DIR, "data/feeds/vevor-feed-cache.json")
const TRANSLATE_SCRIPT = path.resolve(__dirname, "translate-claude.mjs")
const LOG_FILE = path.resolve(BATCH_DIR, "translation-run.log")

function getArg(name, fallback = null) {
  const index = process.argv.indexOf(name)
  if (index === -1) return fallback
  return process.argv[index + 1] ?? fallback
}

function hasFlag(name) {
  return process.argv.includes(name)
}

function numberArg(name, fallback) {
  const value = Number.parseInt(getArg(name, String(fallback)), 10)
  if (!Number.isFinite(value)) return fallback
  return value
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function appendLog(message) {
  mkdirSync(BATCH_DIR, { recursive: true })
  writeFileSync(LOG_FILE, `${message}\n`, { flag: "a", encoding: "utf8" })
}

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return

  const lines = readFileSync(filePath, "utf8").split(/\r?\n/)
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue

    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)
    if (!match) continue

    const [, key, rawValue] = match
    if (process.env[key]) continue

    process.env[key] = rawValue.replace(/^['"]|['"]$/g, "")
  }
}

function loadLocalEnv() {
  for (const file of [
    path.join(REPO_DIR, ".env"),
    path.join(REPO_DIR, ".env.local"),
    path.join(BACKEND_DIR, ".env"),
    path.join(BACKEND_DIR, ".env.local"),
  ]) {
    loadEnvFile(file)
  }
}

function countFeedProducts() {
  const raw = JSON.parse(readFileSync(FEED_CACHE_PATH, "utf8"))
  return Object.keys(raw.bySku || {}).length
}

function isCompletedBatch(filePath, expectedLimit) {
  if (!existsSync(filePath)) return false

  try {
    const rows = JSON.parse(readFileSync(filePath, "utf8"))
    if (!Array.isArray(rows) || rows.length === 0) return false
    return rows.length <= expectedLimit
  } catch {
    return false
  }
}

function killProcessTree(pid) {
  if (process.platform === "win32") {
    spawn("taskkill", ["/pid", String(pid), "/t", "/f"], { stdio: "ignore" })
    return
  }

  try {
    process.kill(-pid, "SIGTERM")
  } catch {
    try { process.kill(pid, "SIGTERM") } catch {}
  }
}

function runBatch({ batchId, offset, limit, source, chunkSize, timeoutMs }) {
  return new Promise((resolve) => {
    const args = [
      TRANSLATE_SCRIPT,
      "--limit",
      String(limit),
      "--offset",
      String(offset),
      "--batch-id",
      batchId,
      "--source",
      source,
      "--chunk-size",
      String(chunkSize),
      "--compact-output",
    ]

    const startedAt = new Date()
    appendLog(`BATCH ${batchId} offset=${offset} START ${startedAt.toISOString()}`)

    const child = spawn(process.execPath, args, {
      cwd: BACKEND_DIR,
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
      detached: process.platform !== "win32",
    })

    let timedOut = false
    const timer = setTimeout(() => {
      timedOut = true
      appendLog(`BATCH ${batchId} TIMEOUT ${new Date().toISOString()}`)
      killProcessTree(child.pid)
    }, timeoutMs)

    child.stdout.on("data", (data) => appendLog(data.toString()))
    child.stderr.on("data", (data) => appendLog(data.toString()))

    child.on("close", (code, signal) => {
      clearTimeout(timer)
      const durationSeconds = Math.round((Date.now() - startedAt.getTime()) / 1000)
      if (timedOut) {
        resolve({ ok: false, code, signal, durationSeconds, timedOut })
        return
      }

      appendLog(`BATCH ${batchId} EXIT code=${code} signal=${signal || "-"} duration=${durationSeconds}s`)
      resolve({ ok: code === 0, code, signal, durationSeconds, timedOut })
    })
  })
}

async function main() {
  loadLocalEnv()

  const limit = numberArg("--limit", 500)
  const startBatch = numberArg("--start-batch", 2)
  const startOffset = numberArg("--start-offset", 0)
  const source = getArg("--source", "feed-cache")
  const chunkSize = numberArg("--chunk-size", process.env.OPENAI_API_KEY ? 20 : 5)
  const retryDelaySeconds = numberArg("--retry-delay-seconds", 60)
  const maxRetries = numberArg("--max-retries", 999999)
  const timeoutMinutes = numberArg("--timeout-minutes", process.env.OPENAI_API_KEY ? 90 : 180)
  const once = hasFlag("--once")
  const totalProducts = source === "feed-cache" ? countFeedProducts() : numberArg("--total-products", limit)
  const totalBatches = Math.ceil(Math.max(totalProducts - startOffset, 0) / limit)
  const endBatch = numberArg("--end-batch", startBatch + totalBatches - 1)

  mkdirSync(BATCH_DIR, { recursive: true })
  appendLog(`LOOP START ${new Date().toISOString()}`)
  appendLog(`OPENAI_API_KEY=${process.env.OPENAI_API_KEY ? "present" : "missing"} model=${process.env.OPENAI_MODEL || "gpt-5.4-mini"}`)
  appendLog(`CONFIG source=${source} limit=${limit} chunkSize=${chunkSize} startBatch=${startBatch} endBatch=${endBatch}`)

  for (let batchNumber = startBatch; batchNumber <= endBatch; batchNumber++) {
    const batchIndex = batchNumber - startBatch
    const offset = startOffset + batchIndex * limit
    const batchId = `batch-${String(batchNumber).padStart(3, "0")}`
    const outputFile = path.join(BATCH_DIR, `${batchId}.json`)

    if (isCompletedBatch(outputFile, limit)) {
      const size = statSync(outputFile).size
      appendLog(`BATCH ${batchId} SKIP existing bytes=${size}`)
      continue
    }

    let attempt = 0
    while (attempt < maxRetries) {
      attempt += 1
      appendLog(`BATCH ${batchId} ATTEMPT ${attempt}/${maxRetries}`)
      const result = await runBatch({
        batchId,
        offset,
        limit,
        source,
        chunkSize,
        timeoutMs: timeoutMinutes * 60 * 1000,
      })

      if (result.ok && isCompletedBatch(outputFile, limit)) {
        appendLog(`BATCH ${batchId} DONE ${new Date().toISOString()}`)
        break
      }

      appendLog(`BATCH ${batchId} RETRY code=${result.code} timedOut=${result.timedOut}`)
      if (once) break
      await sleep(retryDelaySeconds * 1000)
    }

    if (once) break
  }

  appendLog(`LOOP END ${new Date().toISOString()}`)
}

main().catch((error) => {
  appendLog(`LOOP FATAL ${error.stack || error.message}`)
  console.error(error)
  process.exit(1)
})
