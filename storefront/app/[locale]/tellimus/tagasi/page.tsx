"use client"

import Link from "@/components/SafeLink"
import { useEffect, useState, useRef } from "react"
import { usePathname } from "next/navigation"
import posthog from "posthog-js"

/**
 * Montonio (vm muu redirect-provideri) tagasi-leht.
 *
 * Voog: checkout → Montonio pangalink → makse → Montonio suunab siia
 *   (returnUrl `${store}/et/tellimus/tagasi?session=...`).
 * Makse autoriseeritakse Montonio juures; webhook (notificationUrl) teavitab
 * backendi server-to-server → payment session AUTHORIZED. Siin proovime
 * ostukorvi complete'ida — kui webhook hilineb, kordame paar korda.
 */

type Status = "checking" | "done" | "pending" | "failed"

const RETRIES = 6 // ~6 katset, kasvav viivitus (webhook tavaliselt sekundi(te)ga)

export default function PaymentReturnPage() {
  const pathname = usePathname()
  const locale = pathname?.split("/")[1] === "et" ? "et" : "en"
  const [status, setStatus] = useState<Status>("checking")
  const [orderId, setOrderId] = useState<string | null>(null)
  const [email, setEmail] = useState<string | null>(null)
  const started = useRef(false)

  const t =
    locale === "et"
      ? {
          checking: "Kinnitame makset…",
          checkingSub: "Palun oota, see võtab hetke.",
          doneTitle: "Tellimus kinnitatud!",
          doneSub: "Täname ostu eest. Saadame kinnituse aadressile",
          order: "Tellimuse number:",
          home: "Tagasi avalehele",
          pendingTitle: "Makse on töötlemisel",
          pendingSub:
            "Makse võib veel kinnitamisel olla. Kui raha läks maha, saadame kinnituse e-postiga. Vajadusel kontrolli oma ostukorvi.",
          failedTitle: "Makse ei õnnestunud",
          failedSub: "Makset ei kinnitatud. Palun proovi uuesti.",
          retry: "Tagasi ostukorvi",
        }
      : {
          checking: "Confirming your payment…",
          checkingSub: "Please wait, this only takes a moment.",
          doneTitle: "Order Confirmed!",
          doneSub: "Thank you for your purchase. We will send a confirmation to",
          order: "Order number:",
          home: "Back to Home",
          pendingTitle: "Payment is being processed",
          pendingSub:
            "Your payment may still be confirming. If you were charged, we'll email your confirmation. Otherwise, check your cart.",
          failedTitle: "Payment failed",
          failedSub: "Your payment was not confirmed. Please try again.",
          retry: "Back to Cart",
        }

  useEffect(() => {
    if (started.current) return
    started.current = true

    const cartId =
      typeof window !== "undefined" ? localStorage.getItem("xlmarket_cart_id") : null
    const storedEmail =
      typeof window !== "undefined"
        ? localStorage.getItem("xlmarket_checkout_email")
        : null
    setEmail(storedEmail)

    if (!cartId) {
      setStatus("pending")
      return
    }

    let cancelled = false

    async function tryComplete(attempt: number): Promise<void> {
      if (cancelled) return
      try {
        const res = await fetch("/api/cart/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cart_id: cartId }),
        })
        const data = await res.json().catch(() => ({}))

        // Medusa: type:"order" õnnestumisel, type:"cart" kui makse veel autoriseerimata
        const succeeded =
          res.ok && data.type !== "cart" && (data.order || data.id)

        if (succeeded) {
          const resolvedId = data.order?.id || data.id || null
          setOrderId(resolvedId)
          setStatus("done")
          posthog.capture("order_completed", {
            order_id: resolvedId,
            cart_id: cartId,
            via: "montonio_return",
          })
          localStorage.removeItem("xlmarket_cart_id")
          localStorage.removeItem("xlmarket_checkout_email")
          return
        }

        // Makse veel autoriseerimata → webhook võib hilineda, kordame
        if (attempt < RETRIES) {
          const delay = Math.min(1000 * Math.pow(1.5, attempt), 5000)
          setTimeout(() => tryComplete(attempt + 1), delay)
        } else {
          setStatus("pending")
        }
      } catch {
        if (attempt < RETRIES) {
          setTimeout(() => tryComplete(attempt + 1), 2000)
        } else {
          setStatus("failed")
        }
      }
    }

    tryComplete(0)
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-[720px] mx-auto px-4 sm:px-6 py-12">
        <div className="flex flex-col items-center justify-center py-16 bg-white border border-[#E2E8F0] rounded-lg text-center">
          {status === "checking" && (
            <>
              <div className="w-14 h-14 rounded-full border-4 border-[#E2E8F0] border-t-[#0ea5a0] animate-spin mb-5" />
              <h1 className="text-xl font-semibold text-[#1a1a2e] mb-2">{t.checking}</h1>
              <p className="text-[14px] text-[#64748B]">{t.checkingSub}</p>
            </>
          )}

          {status === "done" && (
            <>
              <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mb-5">
                <span className="text-[#059669] text-[28px]">&#10003;</span>
              </div>
              <h1 className="text-xl font-semibold text-[#1a1a2e] mb-4">{t.doneTitle}</h1>
              <p className="text-[14px] text-[#64748B] mb-2">
                {t.doneSub}
                {email ? (
                  <>
                    {" "}
                    <strong className="text-[#1a1a2e]">{email}</strong>.
                  </>
                ) : (
                  "."
                )}
              </p>
              {orderId && (
                <p className="text-[14px] text-[#64748B] mb-8">
                  {t.order} <span className="font-medium text-[#1a1a2e]">{orderId}</span>
                </p>
              )}
              <Link
                href={`/${locale}`}
                className="inline-flex items-center bg-[#0ea5a0] text-white px-6 py-3 text-[15px] font-semibold rounded-lg hover:bg-[#0b7d79] transition-colors"
              >
                {t.home}
              </Link>
            </>
          )}

          {status === "pending" && (
            <>
              <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center mb-5">
                <span className="text-[#0ea5a0] text-[28px]">&#8987;</span>
              </div>
              <h1 className="text-xl font-semibold text-[#1a1a2e] mb-4">{t.pendingTitle}</h1>
              <p className="text-[14px] text-[#64748B] mb-8 max-w-[420px]">{t.pendingSub}</p>
              <Link
                href={`/${locale}`}
                className="inline-flex items-center bg-[#0ea5a0] text-white px-6 py-3 text-[15px] font-semibold rounded-lg hover:bg-[#0b7d79] transition-colors"
              >
                {t.home}
              </Link>
            </>
          )}

          {status === "failed" && (
            <>
              <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mb-5">
                <span className="text-[#DC2626] text-[28px]">&#10005;</span>
              </div>
              <h1 className="text-xl font-semibold text-[#1a1a2e] mb-4">{t.failedTitle}</h1>
              <p className="text-[14px] text-[#64748B] mb-8">{t.failedSub}</p>
              <Link
                href={`/${locale}/ostukorv`}
                className="inline-flex items-center bg-[#0ea5a0] text-white px-6 py-3 text-[15px] font-semibold rounded-lg hover:bg-[#0b7d79] transition-colors"
              >
                {t.retry}
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
