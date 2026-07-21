import fs from "node:fs"
const KEY = process.env.ANTHROPIC_API_KEY
if (!KEY) { console.error("ANTHROPIC_API_KEY puudub"); process.exit(1) }
const IN = process.argv[2], OUT = process.argv[3]
const MODEL = "claude-haiku-4-5-20251001"

const SCHEMA = `{
  "voimsus": {"v": <arv W>, "d": "<W> W (<originaal>)"},
  "max_rohk": {"v": <arv bar>, "d": "<bar> bar (<originaal>)"},
  "paagi_maht": {"v": <arv L>, "d": "<L> L (<originaal>)"},
  "ohuvool": {"v": <arv L/min>, "d": "<L/min> L/min (<originaal>)"},
  "myra": {"v": <arv dB>, "d": "<originaal, nt ≤80 dB>"},
  "maarimine": "õlivaba" | "õliga",
  "rpm": {"v": <arv>, "d": "<arv> RPM"},
  "pinge": {"d": "<nt 230 V / 50 Hz>"},
  "materjal": {"d": "<eesti, nt teras>"}
}`
const RULES = `Reeglid:
- Ühiku-teisendus EU-metric: HP→W (×745,7), PSI→bar (÷14,504), US Gallon→L (×3,785), CFM→L/min (×28,32). Kui originaalis mõlemad (nt "8 Bar/115 PSI"), kasuta metric otse.
- "d" = metric ümardatud (1 koht) + sulgudes originaal, koma kümnend-eraldaja tekstis (nt "8,3 bar (120 PSI)"). "v" = number PUNKT-eraldajaga võrdluseks.
- Jäta väli VÄLJA kui andmet pole. maarimine ainult kui selge (oil-free/oilless=õlivaba). materjal eesti keeles (Steel=teras).
- Müra "v" = number ilma ≤ (nt 80), "d" originaal koos ≤.
- Väljasta AINULT JSON, mitte midagi muud.`

async function extract(item) {
  const body = {
    model: MODEL,
    max_tokens: 700,
    messages: [{ role: "user", content:
      `Ekstrakti õhukompressori võrreldavad tehnilised näitajad. Väljasta AINULT kehtiv JSON skeemis:\n${SCHEMA}\n${RULES}\n\nTOODE:\ntitle: ${item.title}\nkirjeldus: ${(item.desc||"").slice(0,1500)}` }],
  }
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify(body),
  })
  const j = await r.json()
  if (!j.content) throw new Error("API: " + JSON.stringify(j).slice(0, 200))
  const txt = j.content.map(c => c.text || "").join("")
  const m = txt.match(/\{[\s\S]*\}/)
  const specs = m ? JSON.parse(m[0]) : {}
  return { specs, usage: j.usage }
}

const lines = fs.readFileSync(IN, "utf8").trim().split("\n").filter(Boolean)
const out = []
let inTok = 0, outTok = 0, fails = 0
for (const ln of lines) {
  const item = JSON.parse(ln)
  try {
    const { specs, usage } = await extract(item)
    inTok += usage.input_tokens; outTok += usage.output_tokens
    out.push({ id: item.id, title: item.title, specs })
    process.stdout.write(".")
  } catch (e) { fails++; out.push({ id: item.id, title: item.title, specs: {}, error: e.message }); process.stdout.write("x") }
}
fs.writeFileSync(OUT, out.map(o => JSON.stringify(o)).join("\n"))
console.log(`\n${out.length} toodet | fails ${fails} | tokenid: in ${inTok} out ${outTok}`)
// Haiku 4.5: $1/1M in, $5/1M out
const cost = inTok/1e6*1 + outTok/1e6*5
console.log(`kulu (Haiku): $${cost.toFixed(4)} | per-toode $${(cost/out.length).toFixed(5)} | 17k-ekstrapolatsioon $${(cost/out.length*17000).toFixed(1)}`)
