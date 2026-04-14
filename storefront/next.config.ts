import type { NextConfig } from "next"

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
      { source: "/:locale/cart", destination: "/:locale/ostukorv", permanent: true },
      { source: "/:locale/tarnetingimused", destination: "/:locale/tarne", permanent: true },
      { source: "/:locale/categories/:handle", destination: "/:locale/kategooriad/:handle", permanent: true },
      { source: "/:locale/categories", destination: "/:locale/kategooriad", permanent: true },
    ]
  },
}

export default nextConfig
