// Spec-EKSTRAKTSIOON kogu kataloogile (mall-cache'ist, resumable). Iga toode → LLM-parse
// description mall-väljadesse → metadata.specs. Guard: ühikud juba mallis (guarded).
// Käsk: node spec-backfill-extract.mjs [--limit-l3 N] [--concurrency 5]
import { execSync } from "node:child_process"
import fs from "node:fs"
const KEY = process.env.ANTHROPIC_API_KEY
if (!KEY) { console.error("ANTHROPIC_API_KEY puudub"); process.exit(1) }
const MODEL = "claude-haiku-4-5-20251001"
const arg = (n, d) => { const i = process.argv.indexOf(n); return i > 0 ? parseInt(process.argv[i + 1]) : d }
const LIMIT_L3 = arg("--limit-l3", Infinity)
const CONC = arg("--concurrency", 5)
// Redeploy-kindlus: container-nimi MUUTUB iga Coolify redeploy'ga (dokumenteeritud gotcha).
// Re-resolve iga write'i juures — muidu keset jooksu tehtud redeploy tapab kõik hilisemad writes.
const getDB = () => execSync("docker ps --format '{{.Names}}' | grep '^db-k33g' | head -1", { encoding: "utf8" }).trim()
let DB = getDB()
const REG_DIR = new URL("../reports/spec-mallid/", import.meta.url)
const RULES = `Ühiku-teisendus EU-metric: HP→W(×745,7), PSI→bar(÷14,504), Gallon(US)→L(×3,785), lbs→kg(×0,4536), tolli→mm(×25,4), CFM→L/min(×28,32).
"d" ALGAB metric-numbriga + tühik + ühik (nt "1491,4 W", "8 bar"); TÜHIK + sulgudes ORIGINAAL AINULT kui erineb (nt "1491,4 W (2 HP)"); kui sama → ilma. Müra "d" koos ≤. Tekstiväli = eesti string. Jäta väli välja kui pole.`
const isText = (k) => /maarimine|materjal|protsess|tuup|tyyp|type|kutus/i.test(k)

async function llm(prompt, maxTok) {
  const r = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "x-api-key": KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" }, body: JSON.stringify({ model: MODEL, max_tokens: maxTok, messages: [{ role: "user", content: prompt }] }) })
  const j = await r.json()
  if (!j.content) throw new Error("API " + JSON.stringify(j).slice(0, 100))
  return { txt: j.content.map(c => c.text || "").join(""), usage: j.usage }
}
const parseJson = (t) => { const m = t.match(/\{[\s\S]*\}/); return m ? JSON.parse(m[0]) : {} }
// Re-resolve container iga kutse; kui write kukub (stale nimi redeploy järel), resolve uuesti + retry 1×.
const psql = (sql) => {
  try { DB = getDB(); return execSync(`docker exec -i ${DB} psql -U xlmarket -d xlmarket -q -v ON_ERROR_STOP=1 -f -`, { input: sql, encoding: "utf8" }) }
  catch (e) { DB = getDB(); return execSync(`docker exec -i ${DB} psql -U xlmarket -d xlmarket -q -v ON_ERROR_STOP=1 -f -`, { input: sql, encoding: "utf8" }) }
}

// tooted ilma specita, L3-des (JSON-read)
const raw = execSync(`docker exec -i ${DB} psql -U xlmarket -d xlmarket -At -f -`, { encoding: "utf8", maxBuffer: 1 << 30, input: `
SELECT jsonb_build_object('id',p.id,'l3',pc.handle,'title',p.title,'desc',left(regexp_replace(p.description,E'[\\n\\r]+',' ','g'),1300))::text
FROM product p JOIN product_category_product pcp ON pcp.product_id=p.id JOIN product_category pc ON pc.id=pcp.product_category_id JOIN taxonomy_node_meta m ON m.node_id=pc.id
WHERE m.level=3 AND p.status='published' AND p.metadata->'specs' IS NULL ORDER BY pc.handle;` })
const byL3 = new Map()
for (const line of raw.trim().split("\n")) { if (!line) continue; let r; try { r = JSON.parse(line) } catch { continue }; if (!byL3.has(r.l3)) byL3.set(r.l3, []); byL3.get(r.l3).push(r) }

// concurrency-pool
async function pool(items, fn, n) { const out = []; let i = 0; const workers = Array.from({ length: n }, async () => { while (i < items.length) { const k = i++; out[k] = await fn(items[k], k) } }); await Promise.all(workers); return out }

const l3s = [...byL3.keys()]
console.log(`L3 ekstraktimiseks: ${l3s.length} | tooteid: ${[...byL3.values()].reduce((a, b) => a + b.length, 0)}`)
let doneL3 = 0, doneP = 0, specced = 0, empty = 0, fails = 0, inTok = 0, outTok = 0, noMall = 0
const anomalies = []
for (const l3 of l3s) {
  if (doneL3 >= LIMIT_L3) break
  const regPath = new URL(`${l3}.json`, REG_DIR)
  if (!fs.existsSync(regPath)) { noMall++; continue }  // 8 fail-L3 = jäta specita
  const mall = JSON.parse(fs.readFileSync(regPath, "utf8"))
  const fieldsDesc = (mall.fields || []).map(f => isText(f.key) ? `"${f.key}": "<ET string>"` : `"${f.key}": {"v": <metric arv>, "d": "<metric arv> ${f.unit}"}`).join(", ")
  if (!fieldsDesc) { noMall++; continue }
  const prods = byL3.get(l3)
  const results = await pool(prods, async (p) => {
    const prompt = `Ekstrakti "${mall.name}" toote võrreldavad specid. Väljasta AINULT JSON {${fieldsDesc}}.\n${RULES}\nTOODE:\ntitle: ${p.title}\nkirjeldus: ${(p.desc || "").slice(0, 1300)}`
    try { const er = await llm(prompt, 450); inTok += er.usage.input_tokens; outTok += er.usage.output_tokens; return { id: p.id, specs: parseJson(er.txt) } }
    catch (e) { fails++; return { id: p.id, specs: {}, err: e.message } }
  }, CONC)
  // batch-write
  const sql = ["BEGIN;"]
  for (const r of results) {
    doneP++
    if (!r.specs || !Object.keys(r.specs).length) { empty++; if (anomalies.length < 40) anomalies.push(l3 + "/" + r.id + (r.err ? " ERR" : " tühi")); continue }
    specced++
    const j = JSON.stringify(r.specs).replace(/\$/g, "")
    sql.push(`UPDATE product SET metadata=metadata||jsonb_build_object(${"$"}S${"$"}specs${"$"}S${"$"},${"$"}S${"$"}${j}${"$"}S${"$"}::jsonb),updated_at=now() WHERE id=${"$"}S${"$"}${r.id}${"$"}S${"$"};`)
  }
  sql.push("COMMIT;")
  if (sql.length > 2) { try { psql(sql.join("\n")) } catch (e) { console.error("SQL-fail " + l3 + ": " + e.message.slice(0, 80)) } }
  doneL3++
  if (doneL3 % 25 === 0 || doneL3 <= 5) { const cost = inTok / 1e6 + outTok / 1e6 * 5; console.log(`  L3 ${doneL3}/${l3s.length} | tooteid ${doneP} (spec ${specced}, tühi ${empty}, fail ${fails}) $${cost.toFixed(2)} | ${mall.name.slice(0, 24)}`) }
}
const cost = inTok / 1e6 + outTok / 1e6 * 5
fs.writeFileSync("/tmp/extract-anomalies.txt", anomalies.join("\n"))
console.log(`\nVALMIS: L3 ${doneL3} | tooteid ${doneP} | specced ${specced} | tühi ${empty} | fail ${fails} | mall-puudu-L3 ${noMall} | kulu $${cost.toFixed(2)}`)
