/**
 * Minimal markdown renderer for CMS-managed legal/plain pages.
 * Supports: ## headings, paragraphs, - lists, **bold**, [text](url), tables,
 * inline links. Plain text only — no HTML injection allowed.
 *
 * Input is admin-authored content from the CMS DB; treat as trusted but still
 * escape any stray angle brackets to be safe.
 */
import Link from "@/components/SafeLink"

type Block =
  | { type: "h2"; text: string }
  | { type: "h3"; text: string }
  | { type: "p"; spans: Span[] }
  | { type: "ul"; items: Span[][] }
  | { type: "table"; headers: string[]; rows: string[][] }

type Span =
  | { kind: "text"; value: string }
  | { kind: "bold"; value: string }
  | { kind: "link"; text: string; href: string }

function parseInline(text: string): Span[] {
  const spans: Span[] = []
  let cursor = 0
  // Match either **bold** or [text](href), greedy-first
  const re = /\*\*([^*]+?)\*\*|\[([^\]]+?)\]\(([^)]+?)\)/g
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    if (m.index > cursor) spans.push({ kind: "text", value: text.slice(cursor, m.index) })
    if (m[1] !== undefined) {
      spans.push({ kind: "bold", value: m[1] })
    } else if (m[2] !== undefined && m[3] !== undefined) {
      spans.push({ kind: "link", text: m[2], href: m[3] })
    }
    cursor = re.lastIndex
  }
  if (cursor < text.length) spans.push({ kind: "text", value: text.slice(cursor) })
  return spans
}

function parse(md: string): Block[] {
  const blocks: Block[] = []
  const lines = md.split(/\r?\n/)
  let i = 0

  while (i < lines.length) {
    const line = lines[i]
    // Empty line
    if (!line.trim()) { i++; continue }

    // h2/h3
    if (line.startsWith("### ")) { blocks.push({ type: "h3", text: line.slice(4) }); i++; continue }
    if (line.startsWith("## "))  { blocks.push({ type: "h2", text: line.slice(3) }); i++; continue }

    // Unordered list — collect consecutive "- " lines
    if (line.startsWith("- ")) {
      const items: Span[][] = []
      while (i < lines.length && lines[i].startsWith("- ")) {
        items.push(parseInline(lines[i].slice(2)))
        i++
      }
      blocks.push({ type: "ul", items })
      continue
    }

    // Table — pipe-delimited with a header separator on the second line
    if (line.includes("|") && i + 1 < lines.length && /^\s*\|?\s*-+/.test(lines[i + 1])) {
      const headers = line.split("|").map((s) => s.trim()).filter(Boolean)
      i += 2 // skip separator
      const rows: string[][] = []
      while (i < lines.length && lines[i].includes("|")) {
        rows.push(lines[i].split("|").map((s) => s.trim()).filter(Boolean))
        i++
      }
      blocks.push({ type: "table", headers, rows })
      continue
    }

    // Paragraph — collect consecutive non-empty non-special lines
    const paragraphLines: string[] = []
    while (i < lines.length && lines[i].trim() && !lines[i].startsWith("#") && !lines[i].startsWith("- ")) {
      paragraphLines.push(lines[i])
      i++
    }
    blocks.push({ type: "p", spans: parseInline(paragraphLines.join(" ")) })
  }

  return blocks
}

function renderSpan(span: Span, idx: number) {
  if (span.kind === "bold") return <strong key={idx}>{span.value}</strong>
  if (span.kind === "link") {
    const isExternal = /^https?:\/\//.test(span.href)
    if (isExternal) {
      return <a key={idx} href={span.href} target="_blank" rel="noopener noreferrer" className="text-[#E8650A] hover:text-[#CF5A08] underline">{span.text}</a>
    }
    return <Link key={idx} href={span.href} className="text-[#E8650A] hover:text-[#CF5A08] underline">{span.text}</Link>
  }
  return <span key={idx}>{span.value}</span>
}

export function CmsMarkdown({ body }: { body: string }) {
  const blocks = parse(body)
  return (
    <div className="max-w-[720px] text-[14px] font-[family-name:var(--font-dm-sans)] text-[#555555] leading-relaxed space-y-[16px]">
      {blocks.map((block, i) => {
        if (block.type === "h2") {
          return (
            <h2 key={i} className="text-[18px] font-[600] font-[family-name:var(--font-dm-sans)] text-[#1E293B] mt-[32px] mb-[12px]">
              {block.text}
            </h2>
          )
        }
        if (block.type === "h3") {
          return (
            <h3 key={i} className="text-[15px] font-[600] font-[family-name:var(--font-dm-sans)] text-[#1E293B] mt-[24px] mb-[8px]">
              {block.text}
            </h3>
          )
        }
        if (block.type === "p") {
          return <p key={i}>{block.spans.map(renderSpan)}</p>
        }
        if (block.type === "ul") {
          return (
            <ul key={i} className="list-disc pl-[20px] space-y-[6px] text-[14px] text-[#555555]">
              {block.items.map((item, j) => (
                <li key={j}>{item.map(renderSpan)}</li>
              ))}
            </ul>
          )
        }
        if (block.type === "table") {
          return (
            <div key={i} className="overflow-x-auto mt-[12px]">
              <table className="w-full text-[13px] border-collapse">
                <thead>
                  <tr>
                    {block.headers.map((h, j) => (
                      <th key={j} className="text-left border-b border-[#E2E8F0] py-[8px] pr-[16px] font-[600] text-[#1E293B] whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {block.rows.map((row, j) => (
                    <tr key={j}>
                      {row.map((cell, k) => (
                        <td key={k} className="border-b border-[#F1F5F9] py-[8px] pr-[16px]">{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        }
        return null
      })}
    </div>
  )
}
