import Link from "next/link"

type Props = {
  text: string
  link: string
  visible: boolean
}

export default function AnnouncementBar({ text, link, visible }: Props) {
  if (!visible || !text) return null

  const content = (
    <div className="bg-[#1A1A1A] text-white text-center py-[8px] px-[16px] text-[12px] font-[500] font-[family-name:var(--font-inter)] tracking-[0.02em]">
      {text}
    </div>
  )

  if (link) {
    return <Link href={link}>{content}</Link>
  }

  return content
}
