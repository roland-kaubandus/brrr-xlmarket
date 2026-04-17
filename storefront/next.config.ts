import type { NextConfig } from "next"

// Old Medusa category handles → taxonomy-v3 L1 slugs.
// Keep this map until ≥12 months have passed since the v3 migration
// (2026-04-17) to preserve any external links still pointing to the
// old pre-v3 category URLs.
const CATEGORY_V3_REDIRECTS: Record<string, string> = {
  appliances: "horeca-food-service",
  automotive: "automotive-workshop",
  bath: "plumbing-water-systems",
  "building-materials": "construction-building",
  cleaning: "cleaning-janitorial",
  "doors-windows": "construction-building",
  electrical: "electrical-energy",
  flooring: "construction-building",
  furniture: "office-commercial-interiors",
  hardware: "hand-power-tools",
  "health-and-wellness": "health-medical-supply",
  "heating-venting-cooling": "hvac-climate-control",
  "holiday-decorations": "office-commercial-interiors",
  "home-decor": "office-commercial-interiors",
  "industrial-scientific": "hand-power-tools",
  kitchen: "horeca-food-service",
  lighting: "electrical-energy",
  "lumber-composites": "construction-building",
  "musical-instruments": "music-entertainment",
  outdoors: "outdoor-power-landscaping",
  paint: "construction-building",
  // NB: "playground-sets" eemaldatud 2026-04-18 — see on nüüd v3 subSlug
  // (taxonomy-v3.ts) ja redirect tekitas kollisiooni (MegaMenu → 308 → vale L1).
  plumbing: "plumbing-water-systems",
  "safety-equipment": "safety-security-workwear",
  "smart-home": "electrical-energy",
  "sports-outdoors": "fitness-sports-recreation",
  "storage-organization": "warehousing-material-handling",
  tools: "hand-power-tools",
  "window-treatments": "office-commercial-interiors",
  workwear: "safety-security-workwear",
  // Legacy Estonian handles (pre-English rename)
  elektroonika: "electrical-energy",
  "kodu-ja-aed": "outdoor-power-landscaping",
  "kunst-ja-kasitoo": "printing-packaging-signage",
  "toitlustus-ja-kook": "horeca-food-service",
  "ehitus-ja-remont": "construction-building",
  "auto-ja-garaaz": "automotive-workshop",
  "toostus-ja-seadmed": "hand-power-tools",
  "kontor-ja-ladustamine": "office-commercial-interiors",
  "sport-ja-vaba-aeg": "fitness-sports-recreation",
  "lemmikloomad": "health-medical-supply",
  "meditsiin-ja-tervishoid": "health-medical-supply",
}

function categoryRedirects() {
  return Object.entries(CATEGORY_V3_REDIRECTS).flatMap(([from, to]) => [
    {
      source: `/:locale(et|en)/kategooriad/${from}`,
      destination: `/:locale/kategooriad/${to}`,
      permanent: true,
    },
    {
      source: `/:locale(et|en)/haru/${from}`,
      destination: `/:locale/haru/${to}`,
      permanent: true,
    },
  ])
}

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "xlmarket.store",
        pathname: "/media/**",
      },
      {
        protocol: "http",
        hostname: "100.93.186.17",
        port: "8091",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "image.vevor.com",
        pathname: "/**",
      },
    ],
  },
  // i18n handled via App Router [locale] segments (WO-XLM-010)
  async redirects() {
    return [
      { source: "/:locale(et|en)/cart", destination: "/:locale/ostukorv", permanent: true },
      { source: "/:locale(et|en)/checkout", destination: "/:locale/tellimus", permanent: true },
      { source: "/:locale(et|en)/tarnetingimused", destination: "/:locale/tarne", permanent: true },
      { source: "/:locale(et|en)/categories/:handle", destination: "/:locale/kategooriad/:handle", permanent: true },
      { source: "/:locale(et|en)/categories", destination: "/:locale/kategooriad", permanent: true },
      ...categoryRedirects(),
    ]
  },
}

export default nextConfig
