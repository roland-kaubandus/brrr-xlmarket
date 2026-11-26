import type { Metadata } from "next"
import NewsletterConfirm from "@/components/NewsletterConfirm"

export const metadata: Metadata = {
  title: "Uudiskirja kinnitamine — XLmarket",
  description: "XLmarket newsletter confirmation.",
  robots: { index: false, follow: false },
}

// Double opt-in kinnitusleht. Avatakse kirja lingist (?token=...). EI kinnita automaatselt lehe
// laadimisel (skänneri-eellaadimise kaitse) — klient-komponent näitab nuppu, mille klõps POST-ib
// kinnituse. Vt NewsletterConfirm.tsx + [[uudiskiri-nousolek-plaan]].
export default async function ConfirmPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ token?: string }>
}) {
  const locale = (await params).locale === "en" ? "en" : "et"
  const token = (await searchParams).token || ""
  return <NewsletterConfirm token={token} locale={locale} />
}
