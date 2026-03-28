import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import fs from "fs"
import path from "path"

const CMS_PATH = path.join(process.cwd(), "../data/cms/content.json")

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const content = JSON.parse(fs.readFileSync(CMS_PATH, "utf-8"))
    res.json({ content })
  } catch {
    res.json({ content: { hero: {}, announcement: {}, banners: [], campaigns: [] } })
  }
}
