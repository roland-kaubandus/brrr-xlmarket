import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Privacy Policy — XLMARKET",
  description: "XLMARKET privacy policy. How we collect, use, and protect your personal data.",
}

export default async function PrivacyPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = (await params).locale

  return (
    <div className="max-w-[1280px] mx-auto px-[16px] sm:px-[24px] py-[32px] sm:py-[48px]">
      <nav className="text-[12px] font-[family-name:var(--font-dm-sans)] text-[#999999] mb-[32px]" aria-label="Breadcrumb">
        <Link href={`/${locale}`} className="hover:text-[#D97706] transition-colors">Home</Link>
        <span className="mx-[8px] text-[#E8E8E8]">/</span>
        <span className="text-[#777777]">Privacy Policy</span>
      </nav>

      <h1 className="text-[28px] sm:text-[32px] font-[700] font-[family-name:var(--font-dm-sans)] text-[#1E293B] mb-[32px]">Privacy Policy</h1>

      <div className="max-w-[720px] text-[14px] font-[family-name:var(--font-dm-sans)] text-[#555555] leading-relaxed space-y-[16px]">
        <p>Effective from: 28 March 2026</p>

        <h2 className="text-[18px] font-[600] font-[family-name:var(--font-dm-sans)] text-[#1E293B] mt-[32px] mb-[12px]">1. Data Controller</h2>
        <p>
          Roland Kaubandus OU<br />
          Email: info@xlmarket.eu<br />
          Website: xlmarket.eu
        </p>

        <h2 className="text-[18px] font-[600] font-[family-name:var(--font-dm-sans)] text-[#1E293B] mt-[32px] mb-[12px]">2. Personal Data We Collect</h2>
        <p>We collect the data necessary for processing your order:</p>
        <ul className="list-disc pl-[20px] space-y-[6px] text-[14px] text-[#555555] font-[family-name:var(--font-dm-sans)]">
          <li>First and last name</li>
          <li>Email address</li>
          <li>Phone number</li>
          <li>Delivery address (street, city, postal code)</li>
          <li>Payment details (processed securely through Montonio)</li>
        </ul>

        <h2 className="text-[18px] font-[600] font-[family-name:var(--font-dm-sans)] text-[#1E293B] mt-[32px] mb-[12px]">3. Purpose of Data Collection</h2>
        <ul className="list-disc pl-[20px] space-y-[6px] text-[14px] text-[#555555] font-[family-name:var(--font-dm-sans)]">
          <li>Receiving and fulfilling orders</li>
          <li>Delivering goods</li>
          <li>Communicating with customers about orders</li>
          <li>Meeting accounting requirements</li>
        </ul>

        <h2 className="text-[18px] font-[600] font-[family-name:var(--font-dm-sans)] text-[#1E293B] mt-[32px] mb-[12px]">4. Data Retention</h2>
        <p>
          We retain personal data for as long as necessary to fulfill orders, and afterwards in
          accordance with accounting law (7 years). Data is deleted after the retention period expires.
        </p>

        <h2 className="text-[18px] font-[600] font-[family-name:var(--font-dm-sans)] text-[#1E293B] mt-[32px] mb-[12px]">5. Data Sharing</h2>
        <p>We share your data only with:</p>
        <ul className="list-disc pl-[20px] space-y-[6px] text-[14px] text-[#555555] font-[family-name:var(--font-dm-sans)]">
          <li>Courier service providers (for goods delivery)</li>
          <li>Payment service provider (Montonio)</li>
          <li>Accounting service provider</li>
        </ul>
        <p>We do not sell or share your data with third parties for marketing purposes.</p>

        <h2 className="text-[18px] font-[600] font-[family-name:var(--font-dm-sans)] text-[#1E293B] mt-[32px] mb-[12px]">6. Cookies</h2>
        <p>
          We use essential cookies for shopping cart and session management. Analytics cookies
          are used only with your consent. For details, see our{" "}
          <Link href={`/${locale}/kupsised`} className="text-[#E8650A] hover:text-[#CF5A08] underline">
            Cookie Policy
          </Link>
          .
        </p>

        <h2 className="text-[18px] font-[600] font-[family-name:var(--font-dm-sans)] text-[#1E293B] mt-[32px] mb-[12px]">7. Your Rights</h2>
        <p>You have the right to:</p>
        <ul className="list-disc pl-[20px] space-y-[6px] text-[14px] text-[#555555] font-[family-name:var(--font-dm-sans)]">
          <li>Request information about how your personal data is processed</li>
          <li>Request correction of inaccurate data</li>
          <li>Request deletion of data (where there is no legal basis for retention)</li>
          <li>File a complaint with the Estonian Data Protection Inspectorate (<a href="https://aki.ee" target="_blank" rel="noopener noreferrer" className="text-[#E8650A] hover:text-[#CF5A08] underline">aki.ee</a>)</li>
        </ul>

        <h2 className="text-[18px] font-[600] font-[family-name:var(--font-dm-sans)] text-[#1E293B] mt-[32px] mb-[12px]">8. Contact</h2>
        <p>
          For privacy-related questions, write to:{" "}
          <a href="mailto:info@xlmarket.eu" className="text-[#E8650A] hover:text-[#CF5A08] underline">
            info@xlmarket.eu
          </a>
        </p>
      </div>
    </div>
  )
}
