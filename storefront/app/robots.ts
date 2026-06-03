import type { MetadataRoute } from "next"

// Dünaamiline robots: staging keskkonnas (NEXT_PUBLIC_BASE_URL sisaldab "staging")
// blokeerib KOGU indekseerimise — staging on prod-andmete koopia, ei tohi Google'isse.
// Prod (xlmarket.ee) saab tavalised reeglid. (dev-workflow HANDBOOK §7)
export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_BASE_URL || "https://xlmarket.ee"
  const isStaging = base.includes("staging")

  if (isStaging) {
    return { rules: { userAgent: "*", disallow: "/" } }
  }

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/ostukorv", "/tellimus", "/api/", "/login", "/register", "/account"],
    },
    sitemap: `${base}/sitemap.xml`,
  }
}
