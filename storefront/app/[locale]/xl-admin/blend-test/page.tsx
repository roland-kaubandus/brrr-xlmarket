// TEST-LEHT (mitte rollout): VEVOR-stiil mix-blend-mode: multiply hall-efekt.
// Võrdleb ENNE (praegune valge #F4F4F5) vs PÄRAST (mix-blend multiply hallil #EBEBEB)
// äärmus-toodetel (hele kroom/valge = multiply-risk · tume · keskmine).
// Tarmo QA → otsus kas rollout VevorProductCard'i. Täielikult pööratav (kustuta see fail).

const norm = (u: string) => u.replace(/\/goods_img-/, "/original_img-")

const GROUPS: Array<{ label: string; note: string; items: Array<{ title: string; url: string }> }> = [
  {
    label: "HELE (kroom / valge / roostevaba) — multiply-RISK",
    note: "Kriitiline: kas hele toode 'kaob' hallile (valge×hall=hall)?",
    items: [
      { title: "Roostevaba töölaud (kroom)", url: norm("https://image.vevor.com/us%2FCFBXGGZTLCDJB9CR8V0%2Foriginal_img-v2%2Fstainless-steel-work-table-m100-1.2.jpg?timestamp=1718958056000") },
      { title: "Toidusoojendaja (roostevaba)", url: norm("https://image.vevor.com/us%2FSYSPBWQBLZK1LX9XV002V2%2Foriginal_img-v2%2Fcommercial-food-warmer-m100-1.2.jpg?timestamp=1754389492000") },
      { title: "Mini-split kate (valge PVC)", url: norm("https://image.vevor.com/us%2FBSKSQFTSKDGXAZ41JV0%2Foriginal_img-v3%2Fmini-split-line-set-cover-m100-1.2.jpg?timestamp=1744616646000") },
    ],
  },
  {
    label: "TUME (must / tume metall)",
    note: "Kas eristub paremini hallil?",
    items: [
      { title: "Lipumast (tume alumiinium)", url: norm("https://image.vevor.com/us%2FQGTJHS25YCTJXSTVWV0%2Foriginal_img-v1%2Fflagpole-kits-m100-1.2.jpg?timestamp=1720145456000") },
      { title: "Riiulikronstein (must)", url: norm("https://image.vevor.com/us%2FSJZJGBZJYGHWJF4D6V0%2Foriginal_img-v2%2Fshelf-brackets-m100-1.2.jpg?timestamp=1723192196000") },
    ],
  },
  {
    label: "KESKMINE (värviline)",
    note: "Kas OK?",
    items: [
      { title: "Liikluskoonused (oranž/punane)", url: norm("https://image.vevor.com/us%2FTCDZJTJSZHS40JI4U001V0%2Foriginal_img-v1%2Ftraffic-cones-m100-1.2.jpg?timestamp=1752832773000") },
      { title: "Rippuv puutelk (värviline)", url: norm("https://image.vevor.com/us%2FDCZPLSQFB0007C34AV9%2Fgoods_img-v2%2Fhanging-tree-tent-m100-1.2.jpg?timestamp=1730441699000") },
    ],
  },
]

function Card({ url, title, variant }: { url: string; title: string; variant: "enne" | "parast" }) {
  const bg = variant === "enne" ? "#F4F4F5" : "#EBEBEB"
  return (
    <div className="bg-white rounded-xl overflow-hidden border border-[#E2E8F0] w-full">
      <div className="aspect-square flex items-center justify-center overflow-hidden p-2 md:p-3" style={{ backgroundColor: bg }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt={title}
          className={"w-full h-full object-contain " + (variant === "parast" ? "mix-blend-multiply" : "")}
        />
      </div>
      <div className="p-3 text-[13px] text-[#334155] line-clamp-2 leading-snug">{title}</div>
    </div>
  )
}

export default function BlendTestPage() {
  return (
    <div className="max-w-[1100px] mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold text-[#1a1a2e] mb-2">Mix-blend test — VEVOR hall-efekt</h1>
      <p className="text-[14px] text-[#64748B] mb-1">
        <strong>ENNE</strong> = praegune (valge foto, hall <code>#F4F4F5</code> äär). <strong>PÄRAST</strong> ={" "}
        <code>mix-blend-mode: multiply</code> hallil <code>#EBEBEB</code> — valge foto-taust sulandub, toode hõljub.
      </p>
      <p className="text-[13px] text-[#DC2626] mb-8">
        ⚠️ TEST paaril tootel — mitte rollout. Vaata eriti HELE-tooteid: kas kroom/valge servad kaovad hallile?
      </p>

      {GROUPS.map((g) => (
        <section key={g.label} className="mb-10">
          <h2 className="text-[15px] font-bold text-[#1a1a2e]">{g.label}</h2>
          <p className="text-[13px] text-[#64748B] mb-4">{g.note}</p>
          <div className="space-y-6">
            {g.items.map((it) => (
              <div key={it.url} className="grid grid-cols-2 gap-4 items-start">
                <div>
                  <div className="text-[11px] font-semibold text-[#94A3B8] mb-1.5 uppercase tracking-wide">Enne (valge)</div>
                  <Card url={it.url} title={it.title} variant="enne" />
                </div>
                <div>
                  <div className="text-[11px] font-semibold text-[#0b7d79] mb-1.5 uppercase tracking-wide">Pärast (mix-blend hall)</div>
                  <Card url={it.url} title={it.title} variant="parast" />
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
