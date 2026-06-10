import type { NextConfig } from "next"

// Category slug redirects (legacy -> v3 L1) moved to DB table `slug_redirect`
// and served by storefront/middleware.ts (Redis-cached).
// Spec: docs/superpowers/specs/2026-04-18-taxonomy-final-design.md §7.
// Seed script: scripts/seed-slug-redirects.mjs.

const nextConfig: NextConfig = {
  output: "standalone",
  // Allow public-IP origins for `next dev` HMR (no effect in prod).
  // 65.109.86.254 (Risto-era) eemaldatud 2026-06-10.
  allowedDevOrigins: ["xlmarket.ee"],
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "xlmarket.ee",
        pathname: "/media/**",
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
      // Category slug redirects now handled by middleware.ts (DB-backed).
    ]
  },
}

export default nextConfig
