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

export default function ProductInfoAccordion({ locale: _locale = "en" }: { locale?: string }) {
  const items: AccordionItem[] = [
    {
      id: "shipping",
      icon: Truck,
      title: "Shipping & Delivery",
      content: (
        <div className="flex flex-col gap-1.5">
          <p><strong className="text-[#1E293B]">Free shipping</strong> on orders over 50€.</p>
          <p>Estimated delivery <strong className="text-[#1E293B]">5–15 business days</strong> to Estonia.</p>
          <p>Shipped via DPD, Omniva or DHL. Parcel locker delivery available.</p>
          <p className="text-[#64748B] text-xs mt-1">Orders are processed within 1–2 business days.</p>
        </div>
      ),
    },
    {
      id: "warranty",
      icon: Shield,
      title: "Warranty & Quality",
      content: (
        <div className="flex flex-col gap-1.5">
          <p><strong className="text-[#1E293B]">2-year warranty</strong> on all products.</p>
          <p>Warranty covers manufacturing defects and material faults. Does not cover mechanical damage or misuse.</p>
          <p>To file a warranty claim, contact us at <a href="mailto:info@xlmarket.eu" className="text-[#D97706] underline hover:text-[#B45309]">info@xlmarket.eu</a></p>
        </div>
      ),
    },
    {
      id: "returns",
      icon: RotateCcw,
      title: "Returns",
      content: (
        <div className="flex flex-col gap-1.5">
          <p><strong className="text-[#1E293B]">14-day return policy</strong> from the date of delivery.</p>
          <p>Product must be unused, in original packaging and with all accessories included.</p>
          <p>Return shipping costs are covered by the buyer (except for defective products).</p>
          <p>Refunds are processed within 14 business days after receiving the returned item.</p>
        </div>
      ),
    },
    {
      id: "payment",
      icon: CreditCard,
      title: "Payment Methods",
      content: (
        <div className="flex flex-col gap-1.5">
          <p>We accept: <strong className="text-[#1E293B]">credit/debit card, bank link, buy now pay later</strong>.</p>
          <p>All payments are encrypted and secured with SSL certificate.</p>
          <p>Buy now pay later provided by Indivy (0% interest up to 12 months on selected terms).</p>
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
