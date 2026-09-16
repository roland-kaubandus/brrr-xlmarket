#!/usr/bin/env node
/**
 * build-cat-thumbs-l3.mjs — genereeri kategooria-thumbnailid AINULT L3-lehtedele.
 *
 * Miks L3-only: heuristika (Meili otsing kat-nime järgi) on kitsal L3-l esinduslik,
 * laial L1/L2-l valib niši-toote. L1/L2 PÄRIVAD pildi lapselt gen-category-tree.mjs
 * post-pass'is (firstDescendantImage) — nii väldime niši-praaki.
 *
 * Voog: Meili (skoori kõrgeim L3-toode) → download image.vevor.com → sharp → webp.
 * EI kasuta katkist fetch-category-thumbnails.mjs ega surnud category-images.json (CDN-URL).
 *
 * Idempotentne: olemas-webp jäetakse vahele (re-run täidab AINULT puuduvad — CDN-maas-kindel).
 * Fail-loud: download-kukkumine (404/timeout) → skip + loenda, EI peata kõike.
 *
 * Usage (storefront-konteineris, kus on sharp + Meili-env + CDN-internet):
 *   MEILISEARCH_HOST=... MEILISEARCH_KEY=... \
 *   node build-cat-thumbs-l3.mjs --tree <tree.json> --out <cat-thumbs-dir> [--only h1,h2] [--limit N]
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from "node:fs"
import path from "node:path"
import sharp from "sharp"

const args = process.argv.slice(2)
const getArg = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null }
const TREE_PATH = getArg("--tree")
const OUT_DIR = getArg("--out")
const ONLY = getArg("--only") ? new Set(getArg("--only").split(",")) : null
const LIMIT = getArg("--limit") ? parseInt(getArg("--limit"), 10) : null
const PRODUCTLESS_OUT = getArg("--productless")  // kuhu kirjutada tootetute-L3 loend (INV-20 aktsepteerib ikoon-fallbacki)
const MEILI_HOST = process.env.MEILISEARCH_HOST
const MEILI_KEY = process.env.MEILISEARCH_KEY

if (!TREE_PATH || !OUT_DIR) { console.error("FAIL: --tree ja --out kohustuslikud"); process.exit(2) }
if (!MEILI_HOST || !MEILI_KEY) { console.error("FAIL: MEILISEARCH_HOST/KEY env puudub"); process.exit(2) }
if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true })

// ── Meili otsing (identne smart-heuristikaga: nimi=päring, filter category_handles) ──
async function meiliSearch(query, handle, limit = 20) {
  const res = await fetch(`${MEILI_HOST}/indexes/products/search`, {
    method: "POST",
    headers: { Authorization: `Bearer ${MEILI_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      q: query, limit, filter: [`category_handles = "${handle}"`],
      attributesToRetrieve: ["id", "title", "thumbnail", "price"], attributesToHighlight: [],
    }),
  })
  if (!res.ok) throw new Error(`Meili HTTP ${res.status}`)
  return (await res.json()).hits || []
}

function scoreProduct(hit, idx, total, ps) {
  let score = Math.max(0, 50 - (idx / total) * 50)
  if (!hit.thumbnail) return -1
  if (ps.range > 0 && hit.price > 0) {
    const p = (hit.price - ps.min) / ps.range
    score += 25 * Math.exp(-Math.pow((p - 0.4) / 0.3, 2))
  }
  if (hit.thumbnail.includes("original_img")) score += 10
  if (hit.thumbnail.includes("m100-1.2")) score += 5
  return score
}

// Vali esinduslik toode → tema thumbnail-URL (või null)
async function pickThumb(handle, name) {
  let hits = await meiliSearch(name, handle, 20)
  // Nimi-päring võib anda 0 (ET kat-nimi ei matchi EN toote-title'i; "-" = Meili negatsiooni-operaator,
  // nt "Betoonisilurid ja -hõõrutid" välistab "hõõrutid"). Fallback: tühi päring → kogu kategooria,
  // skoori parim (hind + pildi-kvaliteet). 1430 juba-olemas jäetakse vahele (idempotentne), muutub AINULT
  // katteta L3-de käitumine.
  if (!hits.length) hits = await meiliSearch("", handle, 20)
  if (!hits.length) return { url: null, title: null, reason: "noProducts" }
  const prices = hits.map((h) => h.price).filter((p) => p > 0)
  const ps = { min: Math.min(...prices), max: Math.max(...prices), range: prices.length > 1 ? Math.max(...prices) - Math.min(...prices) : 0 }
  const scored = hits.map((h, i) => ({ h, s: scoreProduct(h, i, hits.length, ps) })).filter((x) => x.s >= 0).sort((a, b) => b.s - a.s)
  if (!scored.length) return { url: null, title: null, reason: "noImage" }
  return { url: scored[0].h.thumbnail, title: scored[0].h.title, reason: "found" }
}

// Download → sharp → webp (400x400 inside, valge taust). Fail → throw.
async function downloadWebp(url, dest) {
  const res = await fetch(url, { signal: AbortSignal.timeout(20000) })
  if (!res.ok) throw new Error(`CDN HTTP ${res.status}`)
  const buf = Buffer.from(await res.arrayBuffer())
  await sharp(buf)
    .resize(400, 400, { fit: "inside", withoutEnlargement: true, background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .flatten({ background: { r: 255, g: 255, b: 255 } })
    .webp({ quality: 82 })
    .toFile(dest)
}

async function main() {
  const tree = JSON.parse(readFileSync(TREE_PATH, "utf8"))
  const nodes = tree.nodes || {}
  let l3 = Object.values(nodes).filter((n) => n.level === 3)
  if (ONLY) l3 = l3.filter((n) => ONLY.has(n.handle))
  if (LIMIT) l3 = l3.slice(0, LIMIT)

  const existing = new Set(readdirSync(OUT_DIR).filter((f) => f.endsWith(".webp")).map((f) => f.replace(/\.webp$/, "")))
  let found = 0, skippedExist = 0, noProduct = 0, dlFail = 0, wrote = 0
  const samples = []
  const productless = []  // L3-lehed, mis jäid ilma tooteta (Meilis 0 live-toodet) → ikoon-fallback

  for (const n of l3) {
    if (existing.has(n.handle)) { skippedExist++; continue }  // idempotent: olemas → vahele
    let pick
    try { pick = await pickThumb(n.handle, n.name_et || n.name_en || n.handle) }
    catch (e) { console.error(`[MEILI-FAIL] ${n.handle}: ${e.message}`); dlFail++; continue }
    if (pick.reason !== "found") { noProduct++; productless.push(n.handle); continue }
    found++
    const dest = path.join(OUT_DIR, `${n.handle}.webp`)
    try {
      await downloadWebp(pick.url, dest)
      wrote++
      if (samples.length < 40) samples.push({ handle: n.handle, name: n.name_et, product: pick.title, url: pick.url })
    } catch (e) {
      console.error(`[DL-FAIL] ${n.handle} <- ${pick.url}: ${e.message}`)  // FAIL-LOUD, skip+jätka
      dlFail++
    }
  }

  // Tootetute-loend on täielik AINULT täis-jooksul (ilma --only/--limit). Osalisel jooksul jäta kirjutamata,
  // et mitte kirjutada üle poolikut loendit (iseparanduse eeldus: sama Meili-snapshot kui pildid).
  if (PRODUCTLESS_OUT && !ONLY && !LIMIT) {
    const payload = {
      generated_at: new Date().toISOString(),
      source: "build-cat-thumbs-l3.mjs — L3-lehed, millel Meilis 0 live-toodet → ikoon-fallback (INV-20 aktsepteerib)",
      note: "Iseparanduv: uueneb iga täis-jooksuga. EI ole käsitsi-loend.",
      count: productless.length,
      handles: productless.sort(),
    }
    writeFileSync(PRODUCTLESS_OUT, JSON.stringify(payload, null, 2))
  }

  console.log(JSON.stringify({
    l3_total: l3.length, found, wrote, skippedExist, noProduct, dlFail,
    productless_written: PRODUCTLESS_OUT && !ONLY && !LIMIT ? productless.length : null, samples,
  }))
}

main().catch((e) => { console.error("FATAL:", e.message); process.exit(1) })
