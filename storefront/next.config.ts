import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
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
