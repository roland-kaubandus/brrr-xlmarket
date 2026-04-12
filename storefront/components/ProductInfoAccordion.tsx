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
    <div className="border-b border-[#E2E8F0] last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2.5 py-3.5 text-left group"
        aria-expanded={open}
      >
        <Icon size={16} strokeWidth={1.5} className="text-[#D97706] shrink-0" />
        <span className="flex-1 text-sm font-medium text-[#1E293B] group-hover:text-[#D97706] transition-colors duration-200">
          {item.title}
        </span>
        <ChevronDown
          size={16}
          strokeWidth={1.5}
          className={"text-[#64748B] transition-transform duration-300 " + (open ? "rotate-180" : "")}
        />
      </button>
      {open && (
        <div className="pb-4 pl-7 pr-1 text-sm text-[#64748B] leading-relaxed">
          {item.content}
        </div>
      )}
    </div>
  )
}

export default function ProductInfoAccordion({ locale = "et" }: { locale?: string }) {
  const et = locale === "et"
  const items: AccordionItem[] = [
    {
      id: "shipping",
      icon: Truck,
      title: et ? "Tarne ja kohaletoimetamine" : "Shipping & Delivery",
      content: (
        <div className="flex flex-col gap-1.5">
          <p><strong className="text-[#1E293B]">{et ? "Tasuta tarne" : "Free shipping"}</strong> {et ? "alates 50€ tellimustest." : "on orders over 50€."}</p>
          <p>{et ? "Eeldatav tarneaeg" : "Estimated delivery"} <strong className="text-[#1E293B]">{et ? "5–15 tööpäeva" : "5–15 business days"}</strong> {et ? "Eestisse." : "to Estonia."}</p>
          <p>{et ? "Tarne DPD, Omniva või DHL-iga. Pakiautomaati saadaval." : "Shipped via DPD, Omniva or DHL. Parcel locker delivery available."}</p>
          <p className="text-[#64748B] text-xs mt-1">{et ? "Tellimused töödeldakse 1–2 tööpäeva jooksul." : "Orders are processed within 1–2 business days."}</p>
        </div>
      ),
    },
    {
      id: "warranty",
      icon: Shield,
      title: et ? "Garantii ja kvaliteet" : "Warranty & Quality",
      content: (
        <div className="flex flex-col gap-1.5">
          <p><strong className="text-[#1E293B]">{et ? "2-aastane garantii" : "2-year warranty"}</strong> {et ? "kõikidele toodetele." : "on all products."}</p>
          <p>{et ? "Garantii katab tootmisdefekte ja materjalivigu. Ei kata mehaanilisi kahjustusi ega väärkasutust." : "Warranty covers manufacturing defects and material faults. Does not cover mechanical damage or misuse."}</p>
          <p>{et ? "Garantiinõude esitamiseks kirjutage" : "To file a warranty claim, contact us at"} <a href="mailto:info@xlmarket.eu" className="text-[#D97706] underline hover:text-[#B45309]">info@xlmarket.eu</a></p>
        </div>
      ),
    },
    {
      id: "returns",
      icon: RotateCcw,
      title: et ? "Tagastamine" : "Returns",
      content: (
        <div className="flex flex-col gap-1.5">
          <p><strong className="text-[#1E293B]">{et ? "14-päevane tagastusõigus" : "14-day return policy"}</strong> {et ? "alates kättesaamisest." : "from the date of delivery."}</p>
          <p>{et ? "Toode peab olema kasutamata, originaalpakendis ja kõigi lisatarvikutega." : "Product must be unused, in original packaging and with all accessories included."}</p>
          <p>{et ? "Tagastamise postikulud kannab ostja (v.a defektsete toodete puhul)." : "Return shipping costs are covered by the buyer (except for defective products)."}</p>
          <p>{et ? "Tagasimakse töödeldakse 14 tööpäeva jooksul pärast toote kättesaamist." : "Refunds are processed within 14 business days after receiving the returned item."}</p>
        </div>
      ),
    },
    {
      id: "payment",
      icon: CreditCard,
      title: et ? "Maksemeetodid" : "Payment Methods",
      content: (
        <div className="flex flex-col gap-1.5">
          <p>{et ? "Aktsepteerime:" : "We accept:"} <strong className="text-[#1E293B]">{et ? "pangakaart, pangalink, järelmaks" : "credit/debit card, bank link, buy now pay later"}</strong>.</p>
          <p>{et ? "Kõik maksed on krüpteeritud ja kaitstud SSL-sertifikaadiga." : "All payments are encrypted and secured with SSL certificate."}</p>
          <p>{et ? "Järelmaks Indivy kaudu (0% intress kuni 12 kuud valitud tingimustel)." : "Buy now pay later provided by Indivy (0% interest up to 12 months on selected terms)."}</p>
        </div>
      ),
    },
  ]

  return (
    <div className="mt-6 border border-[#E2E8F0] rounded-lg px-4">
      {items.map((item) => (
        <AccordionRow key={item.id} item={item} />
      ))}
    </div>
  )
}
