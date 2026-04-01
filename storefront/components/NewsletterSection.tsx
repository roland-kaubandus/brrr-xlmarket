"use client"

import { useState } from "react"

export default function NewsletterSection({ locale = "et" }: { locale?: string }) {
  const [email, setEmail] = useState("")
  const [submitted, setSubmitted] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (email.trim()) setSubmitted(true)
  }

  return (
    <section className="py-[64px] sm:py-[80px]">
      <div
        className="px-[32px] sm:px-[64px] py-[48px] sm:py-[56px] text-center"
        style={{ background: "#1A1A1A" }}
      >
        <p className="text-[12px] font-[600] font-[family-name:var(--font-poppins)] text-[#E8650A] tracking-[0.10em] uppercase mb-[12px]">
          Püsi kursis
        </p>
        <h2 className="text-[24px] sm:text-[32px] font-[700] font-[family-name:var(--font-poppins)] text-white mb-[12px] leading-tight">
          Saage pakkumisi enne teisi
        </h2>
        <p className="text-[14px] sm:text-[15px] text-white/60 font-[family-name:var(--font-jakarta)] mb-[32px] max-w-[420px] mx-auto leading-relaxed">
          Liituge uudiskirjaga ja saage esimesena teada uutest toodetest, eksklusiivsete
          pakkumistest ja allahindluskoodidest.
        </p>

        {submitted ? (
          <div className="flex items-center justify-center gap-[10px] text-white/80 text-[15px] font-[family-name:var(--font-jakarta)]">
            <span className="text-[#E8650A] text-[20px]">✓</span>
            Suurepärane! Oleme teid kirja pannud.
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="flex flex-col sm:flex-row gap-[10px] max-w-[440px] mx-auto"
          >
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Teie e-posti aadress"
              required
              className="flex-1 px-[16px] py-[12px] text-[14px] font-[family-name:var(--font-jakarta)] bg-white/10 text-white placeholder:text-white/40 border border-white/15 focus:outline-none focus:border-[#E8650A]/60"
            />
            <button
              type="submit"
              className="px-[24px] py-[12px] bg-[#E8650A] text-white text-[14px] font-[600] font-[family-name:var(--font-poppins)] hover:bg-[#CF5A08] active:scale-[0.98] transition-all shrink-0"
            >
              Liitu
            </button>
          </form>
        )}
        <p className="text-[12px] text-white/30 font-[family-name:var(--font-jakarta)] mt-[14px]">
          Ei mingit rämpsposti. Saate uudiskirjast igal ajal loobuda.
        </p>
      </div>
    </section>
  )
}
