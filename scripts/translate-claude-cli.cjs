// Iseseisev tõlke-runner: prod tooted EN->ET claude CLI kaudu.
// Kirjutab metadata.title_et/description_et/selling_point_N_et + translated=true.
// Kasutus: DATABASE_URL=... node translate.cjs --limit 50 --chunk 5
const { Client } = require("pg")
const { spawnSync } = require("node:child_process")

const arg = (k, d) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : d }
const LIMIT = parseInt(arg("--limit", "20"), 10)
const CHUNK = parseInt(arg("--chunk", "5"), 10)
const MODEL = arg("--model", "claude-haiku-4-5-20251001")
const DB_URL = process.env.DATABASE_URL
if (!DB_URL) { console.error("DATABASE_URL puudub"); process.exit(1) }

const TERMS = `Standardterminid: Meat Grinder->Hakklihamasin, Food Dehydrator->Toidukuivati, Work Table->Töölaud, Air Heater->Õhksoojendaja, Pressure Washer->Survepesur, Hydraulic Jack->Hüdrauliline tungraud, Welding Machine->Keevitusaparaat, Chainsaw->Kettsaag.`

function makePrompt(chunk) {
  return [
    "Tõlgi järgmised VEVOR tooted inglise keelest eesti keelde.",
    "Reeglid: VEVOR bränd jääb muutmata. Title = loomulik eestikeelne tootenimi (mitte sõnasõnaline). Säilita numbrid/mõõdud/võimsused/mudelid. Tollimõõdud kohmakuse korral teisenda sentimeetriteks. Description informatiivne+müüv, HTML säilita. Selling point formaat 'Pealkiri: selgitus'; kui lähe puudub, tagasta tühi string.",
    TERMS,
    'Vasta AINULT kehtiva JSON-ina: {"translations":[{"id","sku","title_et","description_et","selling_point_1_et",...,"selling_point_5_et"}]} ilma lisatekstita.',
    JSON.stringify(chunk, null, 2),
  ].join("\n")
}

function callClaude(prompt) {
  const r = spawnSync("claude", ["-p", prompt, "--model", MODEL, "--output-format", "text"],
    { encoding: "utf8", timeout: 180000, maxBuffer: 50 * 1024 * 1024 })
  if (r.status !== 0 || !r.stdout) throw new Error(`claude CLI viga: status=${r.status} ${(r.stderr || "").slice(0, 200)}`)
  const m = r.stdout.match(/\{[\s\S]*"translations"[\s\S]*\}/)
  if (!m) throw new Error("vastuses pole translations JSON-i")
  return JSON.parse(m[0]).translations
}

async function main() {
  const client = new Client({ connectionString: DB_URL })
  await client.connect()
  const { rows } = await client.query(`
    SELECT id, COALESCE(metadata->>'vevor_sku','') sku, title, COALESCE(description,'') description,
      metadata->>'selling_point_1' selling_point_1, metadata->>'selling_point_2' selling_point_2,
      metadata->>'selling_point_3' selling_point_3, metadata->>'selling_point_4' selling_point_4,
      metadata->>'selling_point_5' selling_point_5
    FROM product
    WHERE status='published' AND deleted_at IS NULL
      AND (metadata->>'title_et' IS NULL OR metadata->>'title_et'='')
    ORDER BY id LIMIT $1`, [LIMIT])
  console.log(`Laetud ${rows.length} tõlkimata toodet (limit ${LIMIT}, chunk ${CHUNK})`)
  if (!rows.length) { await client.end(); return }

  let done = 0, failed = 0
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK)
    try {
      const tr = callClaude(makePrompt(chunk))
      const byId = new Map(tr.map((t) => [String(t.id), t]))
      for (const src of chunk) {
        const t = byId.get(String(src.id))
        if (!t || !t.title_et || !t.title_et.trim()) { failed++; console.log(`  ✗ ${src.id} puudub title_et`); continue }
        await client.query(
          `UPDATE product SET metadata = COALESCE(metadata,'{}'::jsonb) || $2::jsonb WHERE id=$1`,
          [src.id, JSON.stringify({
            title_et: t.title_et.trim(),
            description_et: (t.description_et || "").trim(),
            selling_point_1_et: (t.selling_point_1_et || "").trim(),
            selling_point_2_et: (t.selling_point_2_et || "").trim(),
            selling_point_3_et: (t.selling_point_3_et || "").trim(),
            selling_point_4_et: (t.selling_point_4_et || "").trim(),
            selling_point_5_et: (t.selling_point_5_et || "").trim(),
            translated: true,
          })])
        done++
      }
      console.log(`  chunk ${i / CHUNK + 1}: ${chunk.length} toodet → ${done} kokku`)
    } catch (e) {
      failed += chunk.length
      console.log(`  ✗ chunk ${i / CHUNK + 1} viga: ${e.message}`)
    }
  }
  console.log(`VALMIS: ${done} tõlgitud, ${failed} ebaõnnestus`)
  await client.end()
}
main().catch((e) => { console.error("FATAL:", e.message); process.exit(1) })
