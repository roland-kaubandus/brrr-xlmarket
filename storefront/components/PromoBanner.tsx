import Link from "next/link"

type Banner = {
  id: string
  title: string
  subtitle: string
  buttonText: string
  buttonLink: string
  bgColor: string
  textColor: string
  visible: boolean
  position: string
}

export default function PromoBanner({ banner }: { banner: Banner }) {
  if (!banner.visible) return null

  return (
    <div
      className="px-[24px] py-[24px] sm:py-[32px] text-center mb-[24px]"
      style={{ backgroundColor: banner.bgColor, color: banner.textColor }}
    >
      <p className="text-[18px] sm:text-[20px] font-[700] font-[family-name:var(--font-poppins)] mb-[4px]">{banner.title}</p>
      {banner.subtitle && (
        <p className="text-[14px] font-[family-name:var(--font-inter)] opacity-80 mb-[16px]">{banner.subtitle}</p>
      )}
      {banner.buttonText && banner.buttonLink && (
        <Link
          href={banner.buttonLink}
          className="inline-block px-[20px] py-[9px] text-[13px] font-[600] font-[family-name:var(--font-poppins)] border border-current hover:opacity-80 transition-opacity"
        >
          {banner.buttonText}
        </Link>
      )}
    </div>
  )
}
