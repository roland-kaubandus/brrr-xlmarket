import type { Metadata } from "next"
import Link from "@/components/SafeLink"

export const metadata: Metadata = {
  title: "Returns & Refunds — XLMARKET",
  description: "XLMARKET return policy. 14-day right of withdrawal on all orders.",
}

export default async function ReturnsPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = (await params).locale

  return (
    <div className="max-w-[1280px] mx-auto px-[16px] sm:px-[24px] py-[32px] sm:py-[48px]">
      <nav className="text-[12px] font-[family-name:var(--font-dm-sans)] text-[#999999] mb-[32px]" aria-label="Breadcrumb">
        <Link href={`/${locale}`} className="hover:text-[#D97706] transition-colors">Home</Link>
        <span className="mx-[8px] text-[#E8E8E8]">/</span>
        <span className="text-[#777777]">Returns</span>
      </nav>

      <h1 className="text-[28px] sm:text-[32px] font-[700] font-[family-name:var(--font-dm-sans)] text-[#1E293B] mb-[32px]">Returns &amp; Right of Withdrawal</h1>

      <div className="max-w-[720px] text-[14px] font-[family-name:var(--font-dm-sans)] text-[#555555] leading-relaxed space-y-[16px]">
        <h2 className="text-[18px] font-[600] font-[family-name:var(--font-dm-sans)] text-[#1E293B] mt-[32px] mb-[12px]">14-Day Right of Withdrawal</h2>
        <p>
          In accordance with the Estonian Consumer Protection Act, you have the right to withdraw
          from a purchase made online within 14 days of receiving the goods, without providing a reason.
        </p>

        <h2 className="text-[18px] font-[600] font-[family-name:var(--font-dm-sans)] text-[#1E293B] mt-[32px] mb-[12px]">Return Conditions</h2>
        <ul className="list-disc pl-[20px] space-y-[6px] text-[14px] text-[#555555] font-[family-name:var(--font-dm-sans)]">
          <li>The product must be unused and in its original packaging</li>
          <li>The packaging must not be damaged (except for opening to inspect the product)</li>
          <li>The returned product must be complete with all accessories</li>
          <li>Return shipping costs are borne by the buyer</li>
        </ul>

        <h2 className="text-[18px] font-[600] font-[family-name:var(--font-dm-sans)] text-[#1E293B] mt-[32px] mb-[12px]">How to Return</h2>
        <ol className="list-decimal pl-[20px] space-y-[10px] text-[14px] text-[#555555] font-[family-name:var(--font-dm-sans)]">
          <li>
            Send a withdrawal request to{" "}
            <a href="mailto:info@xlmarket.eu" className="text-[#E8650A] hover:text-[#CF5A08] underline">
              info@xlmarket.eu
            </a>{" "}
            within 14 days of receiving the goods.
          </li>
          <li>Include your order number and the products you wish to return.</li>
          <li>We will send you return instructions and the return address.</li>
          <li>Ship the goods back within 14 days of submitting the withdrawal request.</li>
        </ol>

        <h2 className="text-[18px] font-[600] font-[family-name:var(--font-dm-sans)] text-[#1E293B] mt-[32px] mb-[12px]">Refund</h2>
        <p>
          We will refund the amount paid for the goods (including original shipping costs) within
          14 days of receiving the returned items. The refund is issued using the same payment
          method used for the original purchase.
        </p>

        <h2 className="text-[18px] font-[600] font-[family-name:var(--font-dm-sans)] text-[#1E293B] mt-[32px] mb-[12px]">Filing a Complaint</h2>
        <p>
          If the goods do not conform to the contract terms (defective or damaged), you have
          the right to file a complaint within 2 years of receiving the goods. Contact us at{" "}
          <a href="mailto:info@xlmarket.eu" className="text-[#E8650A] hover:text-[#CF5A08] underline">
            info@xlmarket.eu
          </a>{" "}
          with your order number and a description of the issue.
        </p>

        <h2 className="text-[18px] font-[600] font-[family-name:var(--font-dm-sans)] text-[#1E293B] mt-[32px] mb-[12px]">Exceptions</h2>
        <p>The right of withdrawal does not apply to:</p>
        <ul className="list-disc pl-[20px] space-y-[6px] text-[14px] text-[#555555] font-[family-name:var(--font-dm-sans)]">
          <li>Products made to the consumer&apos;s specific requirements</li>
          <li>Perishable goods</li>
          <li>Sealed products that are not suitable for return due to health protection reasons</li>
        </ul>
      </div>
    </div>
  )
}
