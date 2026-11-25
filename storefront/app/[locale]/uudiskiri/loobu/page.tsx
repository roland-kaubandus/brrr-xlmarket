import type { Metadata } from "next"
import Link from "@/components/SafeLink"
import { medusaProxy } from "@/lib/medusa-proxy"

export const metadata: Metadata = {
  title: "Uudiskirjast loobumine — XLmarket",
  description: "XLmarket newsletter unsubscribe.",
  robots: { index: false, follow: false },
}

// Loobumise kinnitusleht. Avatakse kirja lingist (?token=...). Teeb loobumise serveripoolel
// (idempotentne) ja kuvab tulemuse. Töötab alati, sõltumata kogumis-lipust.
export default async function UnsubscribePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ token?: string }>
}) {
  const locale = (await params).locale === "en" ? "en" : "et"
  const token = (await searchParams).token || ""
  const et = locale === "et"

  let state: "ok" | "unknown" | "missing" | "error" = "missing"
  if (token) {
    try {
      const r = await medusaProxy(`/store/newsletter/unsubscribe?token=${encodeURIComponent(token)}`, {
        method: "POST",
        body: JSON.stringify({ token }),
      })
      if (r.ok) state = "ok"
      else if (r.status === 404) state = "unknown"
      else state = "error"
    } catch {
      state = "error"
    }
  }

  const T = {
    ok: {
      h: et ? "Oled uudiskirjast loobunud" : "You've been unsubscribed",
      p: et
        ? "Sa ei saa meilt enam turunduskirju. Soovi korral saad end alati uuesti liita."
        : "You will no longer receive marketing emails from us. You can subscribe again anytime.",
    },
    unknown: {
      h: et ? "Link on aegunud või juba kasutatud" : "Link expired or already used",
      p: et
        ? "Tõenäoliselt oled juba loobunud. Kui saad meilt endiselt kirju, kirjuta info@xlmarket.ee."
        : "You have likely already unsubscribed. If you still receive emails, contact info@xlmarket.ee.",
    },
    missing: {
      h: et ? "Loobumise link puudub" : "Missing unsubscribe link",
      p: et
        ? "Ava loobumise link otse uudiskirjast. Abi saamiseks kirjuta info@xlmarket.ee."
        : "Please open the unsubscribe link directly from the newsletter. For help, contact info@xlmarket.ee.",
    },
    error: {
      h: et ? "Midagi läks valesti" : "Something went wrong",
      p: et
        ? "Proovi hiljem uuesti või kirjuta info@xlmarket.ee ja loobume sinu eest."
        : "Please try again later or contact info@xlmarket.ee and we'll unsubscribe you.",
    },
  }[state]

  return (
    <div className="max-w-[640px] mx-auto px-[16px] sm:px-[24px] py-[48px] sm:py-[80px]">
      <h1 className="text-[26px] sm:text-[30px] font-[700] font-[family-name:var(--font-dm-sans)] text-[#1a1a2e] mb-[12px]">
        {T.h}
      </h1>
      <p className="text-[14px] text-[#475569] leading-relaxed font-[family-name:var(--font-dm-sans)] mb-[28px]">
        {T.p}
      </p>
      <Link
        href={`/${locale}`}
        className="inline-flex items-center gap-2 text-[13px] font-[600] text-[#0b7d79] hover:text-[#0ea5a0] transition-colors"
      >
        ← {et ? "Tagasi avalehele" : "Back to homepage"}
      </Link>
    </div>
  )
}
