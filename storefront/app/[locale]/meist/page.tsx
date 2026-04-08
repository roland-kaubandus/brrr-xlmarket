import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Meist — XLMARKET",
  description: "XLMARKET — kvaliteetsed tööriistad ja seadmed soodsa hinnaga. Suur valik, väike hind.",
}

export default async function MeistPage({ params }: { params: Promise<{ locale: string }> }) {
  return (
    <div className="max-w-[1280px] mx-auto px-[16px] sm:px-[24px] py-[32px] sm:py-[48px]">
      {/* Breadcrumb */}
      <nav
        className="text-[12px] font-[family-name:var(--font-dm-sans)] text-[#999999] mb-[32px]"
        aria-label="Leheasukoht"
      >
        <Link href={`/${(await params).locale}`} className="hover:text-[#D97706] transition-colors">
          Avaleht
        </Link>
        <span className="mx-[8px] text-[#E8E8E8]">/</span>
        <span className="text-[#777777]">Meist</span>
      </nav>

      <div className="max-w-[720px]">
        <h1 className="text-[28px] sm:text-[32px] font-[700] font-[family-name:var(--font-dm-sans)] text-[#1E293B] mb-[16px]">
          Meist
        </h1>
        <p className="text-[16px] text-[#555555] font-[family-name:var(--font-dm-sans)] leading-relaxed mb-[40px]">
          XLMARKET on Eesti e-pood, mis pakub kvaliteetseid tööriistu, seadmeid ja kodukaupa
          soodsa hinnaga. Meie eesmärk on muuta professionaalsed tööriistad kättesaadavaks igaühele.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-[16px] mb-[48px]">
          {[
            { num: "10 000+", label: "toodet kataloogis" },
            { num: "11", label: "tootekategooriat" },
            { num: "2a", label: "garantii kõigile toodetele" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="border border-[#E8E8E8] p-[20px] text-center"
            >
              <p className="text-[28px] font-[700] font-[family-name:var(--font-dm-sans)] text-[#E8650A] mb-[4px]">
                {stat.num}
              </p>
              <p className="text-[13px] text-[#777777] font-[family-name:var(--font-dm-sans)]">
                {stat.label}
              </p>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-[32px]">
          <div>
            <h2 className="text-[18px] font-[600] font-[family-name:var(--font-dm-sans)] text-[#1E293B] mb-[12px]">
              Mida me pakume
            </h2>
            <ul className="flex flex-col gap-[8px] text-[14px] text-[#555555] font-[family-name:var(--font-dm-sans)]">
              {[
                "Üle 10 000 toote 11 kategoorias",
                "Tööriistad ja seadmed professionaalile ja harrastajale",
                "Kodu- ja aiakaup",
                "Autovarustus ja garaaži tarvikud",
                "Spordi- ja vabaaja tarbed",
                "Elektroonika ja tööstusseadmed",
              ].map((item) => (
                <li key={item} className="flex items-start gap-[8px]">
                  <span className="text-[#E8650A] shrink-0 mt-[1px]">—</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="text-[18px] font-[600] font-[family-name:var(--font-dm-sans)] text-[#1E293B] mb-[12px]">
              Meie väärtused
            </h2>
            <div className="flex flex-col gap-[12px]">
              {[
                { title: "Soodne hind", desc: "Otsetarnimine tootjalt hoiab hinnad madalana." },
                { title: "Lai valik", desc: "Tuhanded tooted ühes kohas." },
                { title: "Usaldusväärne teenindus", desc: "14-päevane taganemisõigus ja 2 aasta garantii." },
              ].map((v) => (
                <div key={v.title} className="border border-[#E8E8E8] p-[16px]">
                  <p className="text-[14px] font-[600] font-[family-name:var(--font-dm-sans)] text-[#1E293B] mb-[4px]">
                    {v.title}
                  </p>
                  <p className="text-[13px] text-[#777777] font-[family-name:var(--font-dm-sans)]">
                    {v.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-[18px] font-[600] font-[family-name:var(--font-dm-sans)] text-[#1E293B] mb-[12px]">
              Ettevõte
            </h2>
            <p className="text-[14px] text-[#555555] font-[family-name:var(--font-dm-sans)] mb-[8px]">
              XLMARKET on Roland Kaubandus OÜ kaubamärk.
            </p>
            <Link
              href={`/${(await params).locale}/kontakt`}
              className="text-[14px] text-[#E8650A] hover:underline font-[family-name:var(--font-dm-sans)]"
            >
              Võtke meiega ühendust →
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
