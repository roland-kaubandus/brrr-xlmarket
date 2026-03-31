import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  images: {
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
}

export default nextConfig
