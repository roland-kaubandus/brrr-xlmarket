import type { Metadata } from "next"
import Link from "@/components/SafeLink"

export const metadata: Metadata = {
  title: "Terms & Conditions — XLMARKET",
  description: "XLMARKET terms and conditions. Ordering, payment, shipping, and return policies.",
}

export default async function TermsPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = (await params).locale

  return (
    <div className="max-w-[1280px] mx-auto px-[16px] sm:px-[24px] py-[32px] sm:py-[48px]">
      <nav className="text-[12px] font-[family-name:var(--font-dm-sans)] text-[#999999] mb-[32px]" aria-label="Breadcrumb">
        <Link href={`/${locale}`} className="hover:text-[#D97706] transition-colors">Home</Link>
        <span className="mx-[8px] text-[#E8E8E8]">/</span>
        <span className="text-[#777777]">Terms &amp; Conditions</span>
      </nav>

      <h1 className="text-[28px] sm:text-[32px] font-[700] font-[family-name:var(--font-dm-sans)] text-[#1E293B] mb-[32px]">Terms &amp; Conditions</h1>

      <div className="max-w-[720px] text-[14px] font-[family-name:var(--font-dm-sans)] text-[#555555] leading-relaxed space-y-[16px]">
        <p>Effective from: 28 March 2026</p>

        <h2 className="text-[18px] font-[600] font-[family-name:var(--font-dm-sans)] text-[#1E293B] mt-[32px] mb-[12px]">1. General</h2>
        <p>
          The online store xlmarket.eu is owned and operated by Roland Kaubandus OU (hereinafter &quot;Seller&quot;).
          These terms apply to all purchases made through xlmarket.eu.
        </p>

        <h2 className="text-[18px] font-[600] font-[family-name:var(--font-dm-sans)] text-[#1E293B] mt-[32px] mb-[12px]">2. Prices</h2>
        <p>
          All prices include VAT (24%). Prices are in euros (EUR). The Seller reserves the right
          to change prices at any time without prior notice. The price at the time of order placement is binding.
        </p>

        <h2 className="text-[18px] font-[600] font-[family-name:var(--font-dm-sans)] text-[#1E293B] mt-[32px] mb-[12px]">3. Ordering</h2>
        <ul className="list-disc pl-[20px] space-y-[6px] text-[14px] text-[#555555] font-[family-name:var(--font-dm-sans)]">
          <li>Add the desired products to your shopping cart</li>
          <li>Enter your delivery address and contact details</li>
          <li>Select a shipping method</li>
          <li>Complete the payment</li>
          <li>An order confirmation will be sent to your email</li>
        </ul>
        <p>
          The sales contract is considered concluded upon receipt of payment.
        </p>

        <h2 className="text-[18px] font-[600] font-[family-name:var(--font-dm-sans)] text-[#1E293B] mt-[32px] mb-[12px]">4. Payment</h2>
        <p>
          Payments are processed through the Montonio payment service. Supported payment methods:
          Swedbank, SEB, LHV, Luminor, and Coop bank links, as well as card payments (Visa, Mastercard).
        </p>

        <h2 className="text-[18px] font-[600] font-[family-name:var(--font-dm-sans)] text-[#1E293B] mt-[32px] mb-[12px]">5. Shipping</h2>
        <p>
          Delivery time is 5-15 business days. We ship across Estonia. For more details, see our{" "}
          <Link href={`/${locale}/tarne`} className="text-[#E8650A] hover:text-[#CF5A08] underline">
            Shipping Info
          </Link>
          .
        </p>

        <h2 className="text-[18px] font-[600] font-[family-name:var(--font-dm-sans)] text-[#1E293B] mt-[32px] mb-[12px]">6. Right of Withdrawal</h2>
        <p>
          Consumers have the right to return goods within 14 days of receipt without
          providing a reason. For more details, see our{" "}
          <Link href={`/${locale}/tagastamine`} className="text-[#E8650A] hover:text-[#CF5A08] underline">
            Returns Policy
          </Link>
          .
        </p>

        <h2 className="text-[18px] font-[600] font-[family-name:var(--font-dm-sans)] text-[#1E293B] mt-[32px] mb-[12px]">7. Warranty</h2>
        <p>
          The Seller is responsible for the conformity of sold goods to the contract terms.
          Consumers have the right to file complaints within 2 years from the date of delivery.
        </p>

        <h2 className="text-[18px] font-[600] font-[family-name:var(--font-dm-sans)] text-[#1E293B] mt-[32px] mb-[12px]">8. Dispute Resolution</h2>
        <p>
          Please send complaints to{" "}
          <a href="mailto:info@xlmarket.eu" className="text-[#E8650A] hover:text-[#CF5A08] underline">info@xlmarket.eu</a>.
          We will resolve complaints within 15 days. In case of a dispute, the consumer has the right
          to contact the Estonian Consumer Protection and Technical Regulatory Authority (TTJA):{" "}
          <a href="https://ttja.ee" target="_blank" rel="noopener noreferrer" className="text-[#E8650A] hover:text-[#CF5A08] underline">ttja.ee</a>.
        </p>

        <h2 className="text-[18px] font-[600] font-[family-name:var(--font-dm-sans)] text-[#1E293B] mt-[32px] mb-[12px]">9. Contact</h2>
        <p>
          Roland Kaubandus OU<br />
          Email:{" "}
          <a href="mailto:info@xlmarket.eu" className="text-[#E8650A] hover:text-[#CF5A08] underline">
            info@xlmarket.eu
          </a>
        </p>
      </div>
    </div>
  )
}
