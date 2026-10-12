import type { ReactNode } from "react"
import type { GlobalContent } from "@/lib/cms"

/**
 * Ettevõtte andmete plokk — ÜKS SSoT-render (CMS "global").
 * Kasutajad: Meist (meist/page.tsx), Kontakt (kontakt/page.tsx).
 * Jalus renderdab oma kompaktse rea otse (teine paigutus), sama SSoT-st.
 * Andmed EI ole siin kõvakodeeritud — tulevad getGlobalCms()-ist (HARD RULE #5: üks allikas, mitu kutsujat).
 */
export function CompanyInfoBlock({ g, locale }: { g: GlobalContent; locale: string }) {
  const et = locale === "et"
  const rows: Array<[string, ReactNode]> = []
  if (g.address) rows.push([et ? "Aadress" : "Address", g.address])
  if (g.phone)
    rows.push([
      et ? "Telefon" : "Phone",
      <a key="tel" href={`tel:${g.phone.replace(/\s/g, "")}`} className="hover:text-[#0b7d79] transition-colors">{g.phone}</a>,
    ])
  if (g.email_info)
    rows.push([
      et ? "E-post" : "Email",
      <a key="em" href={`mailto:${g.email_info}`} className="hover:text-[#0b7d79] transition-colors">{g.email_info}</a>,
    ])
  if (g.email_b2b)
    rows.push([
      et ? "Ärikliendid" : "B2B",
      <a key="b2b" href={`mailto:${g.email_b2b}`} className="hover:text-[#0b7d79] transition-colors">{g.email_b2b}</a>,
    ])
  if (g.reg_number) rows.push([et ? "Registrikood" : "Reg. no", g.reg_number])
  if (g.vat_number) rows.push([et ? "KMKR nr" : "VAT no", g.vat_number])

  return (
    <div className="mt-[32px] max-w-[720px] rounded-[12px] border border-[#E2E8F0] bg-[#F8FAFC] p-[20px] sm:p-[24px] font-[family-name:var(--font-dm-sans)]">
      <div className="text-[16px] font-[700] text-[#1a1a2e] mb-[14px]">{g.company_name}</div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-[16px] gap-y-[8px] text-[14px] text-[#555555]">
        {rows.map(([label, value], i) => (
          <div key={i} className="contents">
            <dt className="font-[600] text-[#1a1a2e] whitespace-nowrap">{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
