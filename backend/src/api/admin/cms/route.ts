import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import fs from "fs"
import path from "path"

const CMS_PATH = path.join(process.cwd(), "../data/cms/content.json")

function readCms() {
  try {
    return JSON.parse(fs.readFileSync(CMS_PATH, "utf-8"))
  } catch {
    return { hero: {}, announcement: {}, banners: [], campaigns: [] }
  }
}

function writeCms(data: Record<string, unknown>) {
  fs.mkdirSync(path.dirname(CMS_PATH), { recursive: true })
  fs.writeFileSync(CMS_PATH, JSON.stringify(data, null, 2))
}

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const content = readCms()
  res.json({ content })
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const current = readCms()
  const updates = req.body as Record<string, unknown>

  const merged = { ...current, ...updates, updatedAt: new Date().toISOString(), updatedBy: "admin" }
  writeCms(merged)

  res.json({ content: merged })
}
