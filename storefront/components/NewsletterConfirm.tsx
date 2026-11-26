"use client"

import { useState } from "react"
import Link from "@/components/SafeLink"

// Double opt-in kinnituse klient-komponent. Nupp POST-ib /api/newsletter/confirm → backend.
// MIKS nupp, mitte auto-kinnitus lehe-laadimisel: e-posti-skännerid eellaevad GET-linke → auto-
// kinnitus lammutaks double opt-in'i (tõend, et INIMENE klõpsas). POST + nupp = inimese tahe.
export default function NewsletterConfirm({ token, locale = "et" }: { token: string; locale?: string }) {
  const et = locale === "et"
  const [state, setState] = useState<"idle" | "sending" | "ok" | "unknown" | "error" | "missing">(
    token ? "idle" : "missing"
  )

  const T = {
    idle: {
      h: et ? "Kinnita oma tellimus" : "Confirm your subscription",
      p: et
        ? "Klõpsa nupule, et lõpetada uudiskirja tellimus."
        : "Click the button to complete your newsletter subscription.",
    },
    sending: { h: et ? "Kinnitan…" : "Confirming…", p: "" },
    ok: {
      h: et ? "Tellimus kinnitatud" : "Subscription confirmed",
      p: et
        ? "Aitäh! Oled nüüd uudiskirja tellinud. Saad igal ajal loobuda iga kirja jaluses."
        : "Thank you! You're now subscribed. You can unsubscribe anytime via the link in any email.",
    },
    unknown: {
      h: et ? "Link on aegunud või juba kasutatud" : "Link expired or already used",
      p: et
        ? "Võimalik, et oled juba kinnitanud. Abi saamiseks kirjuta info@xlmarket.ee."
        : "You may have already confirmed. For help, contact info@xlmarket.ee.",
    },
    error: {
      h: et ? "Midagi läks valesti" : "Something went wrong",
      p: et
        ? "Proovi hiljem uuesti või kirjuta info@xlmarket.ee."
        : "Please try again later or contact info@xlmarket.ee.",
    },
    missing: {
      h: et ? "Kinnituslink puudub" : "Missing confirmation link",
      p: et
        ? "Ava kinnituslink otse kirjast. Abi saamiseks kirjuta info@xlmarket.ee."
        : "Please open the confirmation link directly from the email. For help, contact info@xlmarket.ee.",
    },
  }[state]

  async function onConfirm() {
    if (state === "sending") return
    setState("sending")
    try {
      const r = await fetch("/api/newsletter/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      })
      if (r.ok) setState("ok")
      else if (r.status === 404) setState("unknown")
      else setState("error")
    } catch {
      setState("error")
    }
  }

  return (
    <div className="max-w-[640px] mx-auto px-[16px] sm:px-[24px] py-[48px] sm:py-[80px]">
      <h1 className="text-[26px] sm:text-[30px] font-[700] font-[family-name:var(--font-dm-sans)] text-[#1a1a2e] mb-[12px]">
        {T.h}
      </h1>
      {T.p && (
        <p className="text-[14px] text-[#475569] leading-relaxed font-[family-name:var(--font-dm-sans)] mb-[28px]">
          {T.p}
        </p>
      )}

      {(state === "idle" || state === "sending") && (
        <button
          type="button"
          onClick={onConfirm}
          disabled={state === "sending"}
          className="inline-flex items-center rounded-md bg-[#0ea5a0] px-6 py-3 text-[14px] font-semibold text-white hover:bg-[#0b7d79] disabled:opacity-50 disabled:cursor-not-allowed transition-colors mb-[28px]"
        >
          {state === "sending"
            ? et
              ? "Kinnitan…"
              : "Confirming…"
            : et
              ? "Kinnita tellimus"
              : "Confirm subscription"}
        </button>
      )}

      <div>
        <Link
          href={`/${locale}`}
          className="inline-flex items-center gap-2 text-[13px] font-[600] text-[#0b7d79] hover:text-[#0ea5a0] transition-colors"
        >
          ← {et ? "Tagasi avalehele" : "Back to homepage"}
        </Link>
      </div>
    </div>
  )
}
