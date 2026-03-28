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
  i18n: {
    locales: ["et", "lv", "lt"],
    defaultLocale: "et",
  },
}

export default nextConfig
