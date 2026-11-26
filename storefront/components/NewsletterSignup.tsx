"use client"

import { useState } from "react"
import { isValidEmail } from "@/lib/validation"

// Jaluse uudiskirja-vorm (GO #2, double opt-in). Saadab /api/newsletter/subscribe → backend loob
// pending rea + kinnituskirja. Edu korral: "kontrolli e-posti". Honeypot "website" = peidetud väli
// (näeb ainult bot); inimene jätab tühjaks.
//
// NÄHTAVUS-GATE SIIN (KLIENT-komponent): Next.js inline'ib NEXT_PUBLIC_* klient-bundlisse
// build-ajal DefinePlugin'iga usaldusväärselt. Lippu küpsetatakse build-arg'ist
// (coolify-env-set → is_buildtime=true); väärtuse muutmine nõuab storefront'i REBUILD'i.
// Vt [[uudiskiri-nousolek-plaan]].
const NEWSLETTER_ENABLED = process.env.NEXT_PUBLIC_NEWSLETTER_ENABLED === "true"

export default function NewsletterSignup({ locale = "et" }: { locale?: string }) {
  const et = locale === "et"

  // Lipp maas → endine "Peagi saadaval" (ei eksita külastajat katkise vormiga).
  if (!NEWSLETTER_ENABLED) {
    return (
      <p className="text-[13px] text-[#64748B] italic leading-relaxed">
        {et ? "Peagi saadaval." : "Coming soon."}
      </p>
    )
  }
  const [email, setEmail] = useState("")
  const [website, setWebsite] = useState("") // honeypot
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle")

  const T = {
    placeholder: et ? "Sinu e-post" : "Your email",
    submit: et ? "Telli" : "Subscribe",
    sending: et ? "Saadan…" : "Sending…",
    done: et
      ? "Peaaegu valmis! Kontrolli oma e-posti ja kinnita tellimus."
      : "Almost there! Check your email and confirm your subscription.",
    error: et
      ? "Midagi läks valesti. Proovi hiljem uuesti."
      : "Something went wrong. Please try again later.",
    invalid: et ? "Sisesta kehtiv e-posti aadress." : "Please enter a valid email address.",
    aria: et ? "E-posti aadress uudiskirja jaoks" : "Email address for newsletter",
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (state === "sending") return
    if (!isValidEmail(email)) {
      setState("error")
      return
    }
    setState("sending")
    try {
      const r = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, locale, website }),
      })
      // Geneeriline edu: 200 → done. 429/403/5xx → error (ei leki detaili).
      setState(r.ok ? "done" : "error")
    } catch {
      setState("error")
    }
  }

  if (state === "done") {
    return (
      <p className="text-[13px] text-[#0ea5a0] leading-relaxed" role="status">
        {T.done}
      </p>
    )
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-2.5">
      {/* Honeypot: peidetud botile-söödaks. aria-hidden + tabIndex -1 + autoComplete off. */}
      <div aria-hidden="true" style={{ position: "absolute", left: "-9999px", width: 1, height: 1, overflow: "hidden" }}>
        <label htmlFor="nl_website">Website</label>
        <input
          id="nl_website"
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
        />
      </div>

      <div className="flex gap-2">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => {
            setEmail(e.target.value)
            if (state === "error") setState("idle")
          }}
          placeholder={T.placeholder}
          aria-label={T.aria}
          className="flex-1 min-w-0 rounded-md bg-white/[.06] border border-white/[.12] px-3 py-2 text-[13px] text-white placeholder:text-[#64748B] focus:outline-none focus:border-[#0ea5a0] focus:bg-white/[.09] transition-colors"
        />
        <button
          type="submit"
          disabled={state === "sending"}
          className="shrink-0 rounded-md bg-[#0ea5a0] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[#0b7d79] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {state === "sending" ? T.sending : T.submit}
        </button>
      </div>

      {state === "error" && (
        <p className="text-[12px] text-[#fca5a5]" role="alert">
          {T.error}
        </p>
      )}
    </form>
  )
}
