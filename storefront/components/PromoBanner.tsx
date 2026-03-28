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
      className="p-6 text-center mb-6"
      style={{ backgroundColor: banner.bgColor, color: banner.textColor }}
    >
      <p className="text-lg font-bold mb-1">{banner.title}</p>
      {banner.subtitle && <p className="text-sm opacity-90 mb-3">{banner.subtitle}</p>}
      {banner.buttonText && banner.buttonLink && (
        <Link
          href={banner.buttonLink}
          className="inline-block px-5 py-2 text-sm font-medium border border-current hover:opacity-80 transition"
        >
          {banner.buttonText}
        </Link>
      )}
    </div>
  )
}
