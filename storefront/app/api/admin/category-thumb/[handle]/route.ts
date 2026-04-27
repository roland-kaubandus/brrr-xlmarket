import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { promises as fs } from "node:fs"
import path from "node:path"
import { spawn } from "node:child_process"
import sharp from "sharp"
import { readAdminSession } from "@/lib/admin-session"
import { getNode } from "@/lib/category-tree"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"
export const maxDuration = 30

// Resolve runtime paths lazily so Turbopack's static analysis doesn't try to
// treat them as module imports.
function resolvePaths() {
  const cwd = /* turbopackIgnore: true */ process.cwd()
  const repoRoot = path.resolve(cwd, "..")
  return {
    THUMB_DIR: path.join(cwd, "public", "cat-thumbs"),
    ALIAS_YAML: path.join(repoRoot, "backend", "src", "data", "taxonomy-image-aliases.yaml"),
    GEN_SCRIPT: path.join(repoRoot, "scripts", "gen-category-tree.mjs"),
    REPO_ROOT: repoRoot,
  }
}

const HANDLE_RE = /^[a-z0-9][a-z0-9-]{0,80}$/
const MAX_BYTES = 5 * 1024 * 1024 // 5 MB upload cap (sharp will resize anyway)

async function removeAliasIfPresent(handle: string, aliasYaml: string): Promise<boolean> {
  let raw: string
  try {
    raw = await fs.readFile(aliasYaml, "utf8")
  } catch {
    return false
  }
  // Match the line "<handle>: <something>" (yaml key:value, possibly indented)
  const re = new RegExp(`(^|\\n)([ \\t]*)${escapeRegex(handle)}\\s*:[^\\n]*\\n?`, "m")
  if (!re.test(raw)) return false
  const next = raw.replace(re, "$1")
  if (next === raw) return false
  await fs.writeFile(aliasYaml, next, "utf8")
  return true
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function regenerateSnapshot(genScript: string, repoRoot: string): Promise<{ ok: boolean; stderr: string }> {
  return new Promise((resolve) => {
    const child = spawn("node", [genScript], { cwd: repoRoot })
    let stderr = ""
    child.stderr.on("data", (d) => (stderr += d.toString()))
    child.on("close", (code) => resolve({ ok: code === 0, stderr }))
    child.on("error", () => resolve({ ok: false, stderr: "spawn failed" }))
    setTimeout(() => {
      child.kill("SIGKILL")
      resolve({ ok: false, stderr: "timeout" })
    }, 20_000).unref()
  })
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ handle: string }> }
) {
  const session = await readAdminSession()
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }

  const { handle } = await params
  if (!HANDLE_RE.test(handle)) {
    return NextResponse.json({ ok: false, error: "Invalid handle" }, { status: 400 })
  }
  if (!getNode(handle)) {
    return NextResponse.json({ ok: false, error: "Unknown category handle" }, { status: 404 })
  }

  const formData = await req.formData().catch(() => null)
  if (!formData) {
    return NextResponse.json({ ok: false, error: "Expected multipart/form-data" }, { status: 400 })
  }
  const file = formData.get("image")
  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, error: "Missing 'image' file field" }, { status: 400 })
  }
  if (file.size === 0) {
    return NextResponse.json({ ok: false, error: "Empty file" }, { status: 400 })
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ ok: false, error: "File too large (max 5MB)" }, { status: 400 })
  }
  if (!/^image\/(jpeg|png|webp|avif|gif)$/.test(file.type)) {
    return NextResponse.json({ ok: false, error: "Unsupported image format" }, { status: 400 })
  }

  const { THUMB_DIR, ALIAS_YAML, GEN_SCRIPT, REPO_ROOT } = resolvePaths()
  const buf = Buffer.from(await file.arrayBuffer())

  let webp: Buffer
  try {
    webp = await sharp(buf, { failOn: "error" })
      .rotate()
      .resize(400, 400, { fit: "cover", position: "center" })
      .webp({ quality: 80 })
      .toBuffer()
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: "Image processing failed: " + (err instanceof Error ? err.message : "unknown") },
      { status: 400 }
    )
  }

  const dest = path.join(THUMB_DIR, `${handle}.webp`)
  try {
    await fs.mkdir(THUMB_DIR, { recursive: true })
    await fs.writeFile(dest, webp)
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: "Write failed: " + (err instanceof Error ? err.message : "unknown") },
      { status: 500 }
    )
  }

  const aliasRemoved = await removeAliasIfPresent(handle, ALIAS_YAML).catch(() => false)
  const regen = await regenerateSnapshot(GEN_SCRIPT, REPO_ROOT)

  // Try to bust the obvious paths (these affect dev server immediately and hint
  // the production reverse-cache; production also needs the redeploy step).
  try {
    revalidatePath(`/et/kategooriad/${handle}`)
    revalidatePath(`/en/kategooriad/${handle}`)
    revalidatePath("/et/kategooriad")
    revalidatePath("/en/kategooriad")
    revalidatePath("/et")
    revalidatePath("/en")
  } catch {
    // non-fatal
  }

  return NextResponse.json({
    ok: true,
    actor: session.email,
    handle,
    bytes: webp.length,
    image_url: `/cat-thumbs/${handle}.webp?v=${Date.now()}`,
    alias_removed: aliasRemoved,
    snapshot_regenerated: regen.ok,
    regen_error: regen.ok ? null : regen.stderr.slice(0, 300),
    redeploy_required_in_production: true,
  })
}
