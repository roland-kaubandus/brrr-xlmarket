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
    <div className="border-b border-[#E5E5E5] last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2.5 py-3.5 text-left group"
        aria-expanded={open}
      >
        <Icon size={16} strokeWidth={1.5} className="text-[#FF6A00] shrink-0" />
        <span className="flex-1 text-sm font-medium text-[#222] group-hover:text-[#FF6A00] transition-colors duration-200">
          {item.title}
        </span>
        <ChevronDown
          size={16}
          strokeWidth={1.5}
          className={"text-[#666] transition-transform duration-300 " + (open ? "rotate-180" : "")}
        />
      </button>
      {open && (
        <div className="pb-4 pl-7 pr-1 text-sm text-[#666] leading-relaxed">
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
        <div className="flex flex-col gap-1.5">
          <p><strong className="text-[#222]">Tasuta tarne</strong>{" tellimustel alates 50\u20AC."}</p>
          <p>{"Tarne aeg "}<strong className="text-[#222]">{"5\u201315 t\u00F6\u00F6p\u00E4eva"}</strong>{" Eestisse."}</p>
          <p>{"Saadetakse DPD, Omniva v\u00F5i DHL kaudu. Pakiautomaati saatmine v\u00F5imalik."}</p>
          <p className="text-[#666] text-xs mt-1">{"Tellimused t\u00F6\u00F6deldakse 1\u20132 t\u00F6\u00F6p\u00E4eva jooksul."}</p>
        </div>
      ),
    },
    {
      id: "garantii",
      icon: Shield,
      title: "Garantii ja kvaliteet",
      content: (
        <div className="flex flex-col gap-1.5">
          <p><strong className="text-[#222]">2-aastane garantii</strong>{" k\u00F5igile toodetele."}</p>
          <p>{"Garantii katab tootmisdefektid ja materjalivead. Ei kata mehhaanilisi kahjustusi ega v\u00E4\u00E4rkasutust."}</p>
          <p>{"Garantiin\u00F5ude esitamiseks v\u00F5tke \u00FChendust: "}<a href="mailto:info@xlmarket.eu" className="text-[#FF6A00] underline hover:text-[#E55F00]">info@xlmarket.eu</a></p>
        </div>
      ),
    },
    {
      id: "tagastus",
      icon: RotateCcw,
      title: "Tagastamine",
      content: (
        <div className="flex flex-col gap-1.5">
          <p><strong className="text-[#222]">{"14 p\u00E4eva tagastus\u00F5igus"}</strong>{" alates kauba k\u00E4ttesaamisest."}</p>
          <p>{"Toode peab olema kasutamata, originaalpakendis ja t\u00E4ieliku komplektuuriga."}</p>
          <p>Tagastuskulud kannab ostja (v.a. defektse toote puhul).</p>
          <p>{"Raha tagastatakse 14 t\u00F6\u00F6p\u00E4eva jooksul p\u00E4rast kauba k\u00E4ttesaamist."}</p>
        </div>
      ),
    },
    {
      id: "makse",
      icon: CreditCard,
      title: "Makseviisid",
      content: (
        <div className="flex flex-col gap-1.5">
          <p>{"Aktsepteerime: "}<strong className="text-[#222]">{"pangakaart, pangalink, j\u00E4relmaks"}</strong>.</p>
          <p>{"K\u00F5ik maksed on kr\u00FCpteeritud SSL-sertifikaadiga kaitstud."}</p>
          <p>{"J\u00E4relmaksu teenust pakub Indivy (0% intress kuni 12 kuud teatud tingimustel)."}</p>
        </div>
      ),
    },
  ]

  return (
    <div className="mt-6 border border-[#E5E5E5] rounded-lg px-4">
      {items.map((item) => (
        <AccordionRow key={item.id} item={item} />
      ))}
    </div>
  )
}
