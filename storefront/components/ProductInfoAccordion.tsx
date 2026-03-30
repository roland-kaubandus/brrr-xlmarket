"use client"

import { useState } from "react"
import { ChevronDown, Truck, Shield, RotateCcw, CreditCard } from "lucide-react"

type AccordionItem = {
  id: string
  icon: React.ElementType
  title: string
  content: React.ReactNode
}

function AccordionRow({ item }: { item: AccordionItem }) {
  const [open, setOpen] = useState(false)
  const Icon = item.icon
  return (
    <div className="border-b border-[#E8E8E8] last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-[10px] py-[14px] text-left group"
        aria-expanded={open}
      >
        <Icon size={16} strokeWidth={1.5} className="text-[#E8650A] shrink-0" />
        <span className="flex-1 text-[14px] font-[500] font-[family-name:var(--font-poppins)] text-[#1A1A1A] group-hover:text-[#E8650A] transition-colors">
          {item.title}
        </span>
        <ChevronDown
          size={16}
          strokeWidth={1.5}
          className={"text-[#999999] transition-transform duration-[200ms] " + (open ? "rotate-180" : "")}
        />
      </button>
      {open && (
        <div className="pb-[16px] pl-[26px] pr-[4px] text-[13px] font-[family-name:var(--font-inter)] text-[#555555] leading-[1.7]">
          {item.content}
        </div>
      )}
    </div>
  )
}

export default function ProductInfoAccordion() {
  const items: AccordionItem[] = [
    {
      id: "tarne",
      icon: Truck,
      title: "Tarne ja tarneaeg",
      content: (
        <div className="flex flex-col gap-[6px]">
          <p><strong className="text-[#1A1A1A]">Tasuta tarne</strong> tellimustel alates 50€.</p>
          <p>Tarne aeg <strong className="text-[#1A1A1A]">5–15 tööpäeva</strong> Eestisse.</p>
          <p>Saadetakse DPD, Omniva või DHL kaudu. Pakiautomaati saatmine võimalik.</p>
          <p className="text-[#999999] text-[12px] mt-[4px]">Tellimused töödeldakse 1–2 tööpäeva jooksul.</p>
        </div>
      ),
    },
    {
      id: "garantii",
      icon: Shield,
      title: "Garantii ja kvaliteet",
      content: (
        <div className="flex flex-col gap-[6px]">
          <p><strong className="text-[#1A1A1A]">2-aastane garantii</strong> kõigile toodetele.</p>
          <p>Garantii katab tootmisdefektid ja materjalivead. Ei kata mehhaanilisi kahjustusi ega väärkasutust.</p>
          <p>Garantiinõude esitamiseks võtke ühendust: <a href="mailto:info@xlmarket.eu" className="text-[#E8650A] underline">info@xlmarket.eu</a></p>
        </div>
      ),
    },
    {
      id: "tagastus",
      icon: RotateCcw,
      title: "Tagastamine",
      content: (
        <div className="flex flex-col gap-[6px]">
          <p><strong className="text-[#1A1A1A]">14 päeva tagastusõigus</strong> alates kauba kättesaamisest.</p>
          <p>Toode peab olema kasutamata, originaalpakendis ja täieliku komplektuuriga.</p>
          <p>Tagastuskulud kannab ostja (v.a. defektse toote puhul).</p>
          <p>Raha tagastatakse 14 tööpäeva jooksul pärast kauba kättesaamist.</p>
        </div>
      ),
    },
    {
      id: "makse",
      icon: CreditCard,
      title: "Makseviisid",
      content: (
        <div className="flex flex-col gap-[6px]">
          <p>Aktsepteerime: <strong className="text-[#1A1A1A]">pangakaart, pangalink, järelmaks</strong>.</p>
          <p>Kõik maksed on krüpteeritud SSL-sertifikaadiga kaitstud.</p>
          <p>Järelmaksu teenust pakub Indivy (0% intress kuni 12 kuud teatud tingimustel).</p>
        </div>
      ),
    },
  ]

  return (
    <div className="mt-[24px] border border-[#E8E8E8] px-[16px]">
      {items.map((item) => (
        <AccordionRow key={item.id} item={item} />
      ))}
    </div>
  )
}
