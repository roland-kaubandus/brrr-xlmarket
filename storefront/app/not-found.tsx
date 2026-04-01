import Link from "next/link"

export default function NotFound() {
  return (
    <div className="max-w-[1280px] mx-auto px-[16px] sm:px-[24px] py-[80px] sm:py-[120px] text-center">
      <p className="text-[13px] font-[600] font-[family-name:var(--font-poppins)] text-[#E8650A] tracking-[0.10em] uppercase mb-[16px]">
        Viga 404
      </p>
      <h1 className="text-[64px] sm:text-[96px] font-[800] font-[family-name:var(--font-poppins)] text-[#E8E8E8] leading-none mb-[16px]">
        404
      </h1>
      <p className="text-[18px] sm:text-[20px] font-[600] font-[family-name:var(--font-poppins)] text-[#1A1A1A] mb-[8px]">
        Lehte ei leitud
      </p>
      <p className="text-[14px] font-[family-name:var(--font-jakarta)] text-[#999999] mb-[36px]">
        Otsitav leht on kustutatud või aadress on muutunud.
      </p>
      <div className="flex flex-col sm:flex-row items-center justify-center gap-[12px]">
        <Link
          href="/et/"
          className="inline-flex items-center gap-[8px] bg-[#E8650A] text-white px-[24px] py-[12px] text-[15px] font-[600] font-[family-name:var(--font-poppins)] hover:bg-[#CF5A08] transition-colors"
        >
          Tagasi avalehele
        </Link>
        <Link
          href="/et/kategooriad"
          className="inline-flex items-center gap-[8px] border border-[#E8E8E8] text-[#555555] px-[24px] py-[12px] text-[15px] font-[500] font-[family-name:var(--font-poppins)] hover:border-[#E8650A] hover:text-[#E8650A] transition-colors"
        >
          Vaata kategooriaid
        </Link>
      </div>
    </div>
  )
}
