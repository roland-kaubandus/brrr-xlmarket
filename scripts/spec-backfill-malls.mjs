// Mall-backfill KÕIGILE L3-dele (mall-only, resumable). Tuletab + cache'ib per-L3 kanoonilise
// skeemi registry-sse (reports/spec-mallid/). Guard-parandab ühikud. Ei ekstrakti (see = eraldi).
// Käsk: node spec-backfill-malls.mjs [--limit N]
import { execSync } from "node:child_process"
import fs from "node:fs"
const KEY = process.env.ANTHROPIC_API_KEY
if (!KEY) { console.error("ANTHROPIC_API_KEY puudub"); process.exit(1) }
const MODEL = "claude-haiku-4-5-20251001"
const LIMIT = process.argv.includes("--limit") ? parseInt(process.argv[process.argv.indexOf("--limit") + 1]) : Infinity
const DB = execSync("docker ps --format '{{.Names}}' | grep '^db-k33g' | head -1", { encoding: "utf8" }).trim()
const REG_DIR = new URL("../reports/spec-mallid/", import.meta.url)
fs.mkdirSync(REG_DIR, { recursive: true })

const UNIT_GUARD = { voimsus: "W", pinge: "V", kaal: "kg", myra: "dB", poorlemiskiirus: "RPM", keevitusvool: "A", ketta_labamoot: "mm", ohuvool: "L/min", vooluhulk: "L/min", tuulekiirus: "m/s", tuulekiirus_algus: "m/s", tuulekiirus_startup: "m/s", tuulekiirus_nimitootmine: "m/s", aku_maht: "Wh" }
const VOCAB = `JAGATUD kanooniline sõnavara (kasuta NEID võtmeid kõigil tüüpidel kus asjakohane): voimsus(W)·pinge(V)·kaal(kg)·poorlemiskiirus(RPM)·rohk(bar)·maht(L)·ohuvool(Lmin)·myra(dB)·maarimine·materjal·ketta_labamoot(mm)·keevitusvool(A)·tuulekiirus(ms)·vooluhulk(Lmin)·aku_maht(Wh). Type-specific: lisa oma snake_case-võti vajadusel.`

async function llm(prompt, maxTok) {
  const r = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "x-api-key": KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" }, body: JSON.stringify({ model: MODEL, max_tokens: maxTok, messages: [{ role: "user", content: prompt }] }) })
  const j = await r.json()
  if (!j.content) throw new Error("API " + JSON.stringify(j).slice(0, 120))
  return { txt: j.content.map(c => c.text || "").join(""), usage: j.usage }
}
const parseJson = (t) => { const m = t.match(/\{[\s\S]*\}/); return m ? JSON.parse(m[0]) : {} }

// üks päring: per-L3 kuni 12 toodet (JSON-read, väldib delimiter-probleemi)
const raw = execSync(`docker exec -i ${DB} psql -U xlmarket -d xlmarket -At -f -`, { encoding: "utf8", maxBuffer: 1 << 30, input: `
SELECT jsonb_build_object('handle',handle,'name',name,'title',title,'ldesc',ldesc)::text FROM (
  SELECT pc.handle, pc.name, p.title, left(regexp_replace(p.description,E'[\\n\\r]+',' ','g'),600) AS ldesc,
    row_number() OVER (PARTITION BY pc.id ORDER BY p.id) AS rn
  FROM product_category pc JOIN taxonomy_node_meta m ON m.node_id=pc.id
  JOIN product_category_product pcp ON pcp.product_category_id=pc.id
  JOIN product p ON p.id=pcp.product_id AND p.status='published'
  WHERE m.level=3
) t WHERE rn <= 12 ORDER BY handle;` })
const byL3 = new Map()
for (const line of raw.trim().split("\n")) { if (!line) continue; let r; try { r = JSON.parse(line) } catch { continue }; if (!byL3.has(r.handle)) byL3.set(r.handle, { name: r.name, prods: [] }); byL3.get(r.handle).prods.push({ title: r.title, ldesc: r.ldesc }) }

const all = [...byL3.entries()]
console.log(`L3 toodetega: ${all.length}`)
let done = 0, derived = 0, cached = 0, fails = 0, inTok = 0, outTok = 0, guardFixes = 0, processed = 0
for (const [handle, { name, prods }] of all) {
  if (processed >= LIMIT) break
  processed++
  const regPath = new URL(`${handle}.json`, REG_DIR)
  if (fs.existsSync(regPath)) { cached++; done++; continue }
  const sample = prods.slice(0, 12).map((p, i) => `${i + 1}. ${p.title}\n${p.ldesc}`).join("\n\n")
  const prompt = `Toote-kategooria "${name}" spec-analüütik. Tuleta VÕRDLUS-KRIITILINE kanooniline spec-skeem (4-8 välja mida ostja võrdleks). Väljasta AINULT JSON: {"fields":[{"key":"<snake_case>","label_et":"<ET>","unit":"<EU-metric>"}]}\n${VOCAB}\nEelista jagatud sõnavara.\n\nTOOTED:\n${sample}`
  try {
    const mr = await llm(prompt, 500); inTok += mr.usage.input_tokens; outTok += mr.usage.output_tokens
    const mall = parseJson(mr.txt)
    for (const f of (mall.fields || [])) { const g = UNIT_GUARD[f.key]; if (g && f.unit !== g) { f.unit_orig = f.unit; f.unit = g; guardFixes++ } }
    fs.writeFileSync(regPath, JSON.stringify({ l3: handle, name, fields: mall.fields || [] }, null, 1) + "\n")
    derived++; done++
  } catch (e) { fails++; process.stderr.write(`\nFAIL ${handle}: ${e.message.slice(0, 60)}`) }
  if (done % 50 === 0) { const cost = inTok / 1e6 + outTok / 1e6 * 5; console.log(`  ${done}/${all.length} (tuletatud ${derived}, cache ${cached}, fail ${fails}, guard-fix ${guardFixes}) $${cost.toFixed(2)}`) }
}
const cost = inTok / 1e6 + outTok / 1e6 * 5
console.log(`\nVALMIS: ${done} L3 | tuletatud ${derived} | cache ${cached} | fail ${fails} | guard-fix ${guardFixes} | kulu $${cost.toFixed(2)}`)
