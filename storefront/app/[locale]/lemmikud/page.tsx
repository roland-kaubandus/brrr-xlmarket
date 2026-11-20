import type { Metadata } from "next"
import WishlistPage from "@/components/WishlistPage"

export const metadata: Metadata = {
  title: "Lemmikud — XLmarket",
}

export default function Page() {
  return <WishlistPage />
}
