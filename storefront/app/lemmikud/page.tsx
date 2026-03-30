import type { Metadata } from "next"
import WishlistPage from "@/components/WishlistPage"

export const metadata: Metadata = {
  title: "Lemmikud — XLMARKET",
}

export default function Page() {
  return <WishlistPage />
}
