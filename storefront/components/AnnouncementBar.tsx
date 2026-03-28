import Link from "next/link"

type Props = {
  text: string
  link: string
  visible: boolean
}

export default function AnnouncementBar({ text, link, visible }: Props) {
  if (!visible || !text) return null

  const content = (
    <div className="bg-brand-600 text-white text-center py-2 px-4 text-sm font-medium">
      {text}
    </div>
  )

  if (link) {
    return <Link href={link}>{content}</Link>
  }

  return content
}
