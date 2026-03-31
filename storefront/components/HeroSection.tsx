import Link from "next/link"
import { ArrowRight } from "lucide-react"
import HeroFloatingProducts from "./HeroFloatingProducts"

export default function HeroSection() {
  return (
    <section
      className="relative overflow-hidden"
      style={{
        background:
          "linear-gradient(160deg, #FFF5EE 0%, #FFF9F5 35%, #FFFFFF 65%, #F7F7F7 100%)",
      }}
    >
      {/* Ambient orbs */}
      <div
        className="absolute top-[-160px] right-[-120px] w-[520px] h-[520px] rounded-full pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, rgba(232,101,10,0.08) 0%, transparent 65%)",
        }}
      />
      <div
        className="absolute bottom-[-100px] left-[-80px] w-[340px] h-[340px] rounded-full pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, rgba(232,101,10,0.05) 0%, transparent 70%)",
        }}
      />

      <div className="relative max-w-[1400px] mx-auto px-[16px] sm:px-[24px] pt-[72px] pb-[64px] sm:pt-[96px] sm:pb-[80px] lg:pt-[112px] lg:pb-[96px]">
        <div className="flex flex-col lg:flex-row lg:items-center gap-[48px] lg:gap-[64px]">
          {/* LEFT */}
          <div className="lg:w-[55%] shrink-0">
            <h1
              className="font-[800] font-[family-name:var(--font-outfit)] text-[#1A1A1A] leading-[1.08] tracking-[-0.03em] mb-[20px]"
              style={{
                fontSize: "clamp(36px, 5.5vw, 60px)",
                textWrap: "balance",
              } as React.CSSProperties}
            >
              {"14\u00a0000+ toodet."}
              <br />
              <span className="text-[#E8650A]">{"Nagu p\u00e4ris poes,"}</span>
              <br />
              {"ainult kiiremini."}
            </h1>

            <p className="text-[16px] sm:text-[18px] font-[family-name:var(--font-jakarta)] text-[#555555] leading-[1.7] mb-[36px] max-w-[520px]">
              {"Sirvi kategooriaid, otsi m\u00e4rks\u00f5naga v\u00f5i lase m\u00fc\u00fcjal aidata. Ehitusest elektroonikani, kodust autosse \u2014 k\u00f5ik \u00fchest kohast."}
            </p>

            <div className="flex flex-wrap gap-[12px]">
              <Link
                href="/kategooriad"
                className="group inline-flex items-center gap-[8px] bg-[#E8650A] text-white px-[24px] py-[14px] text-[15px] font-[600] font-[family-name:var(--font-poppins)] rounded-xl hover:bg-[#CF5A08] active:scale-[0.98]"
                style={{
                  boxShadow: "0 4px 20px rgba(232,101,10,0.28), 0 1px 0 rgba(255,255,255,0.12) inset",
                  transition: "all 0.25s cubic-bezier(0.32,0.72,0,1)",
                }}
              >
                Sirvi tooteid
                <ArrowRight size={16} strokeWidth={2} className="group-hover:translate-x-[2px] transition-transform duration-[200ms]" />
              </Link>
              <Link
                href="#kuidas-see-tootab"
                className="group inline-flex items-center gap-[8px] px-[24px] py-[14px] text-[15px] font-[600] font-[family-name:var(--font-poppins)] rounded-xl border border-[#E0E0E0] text-[#555555] hover:border-[#E8650A]/30 hover:text-[#E8650A] hover:bg-[#FFF5EE]"
                style={{ transition: "all 0.25s cubic-bezier(0.32,0.72,0,1)" }}
              >
                {"Kuidas see t\u00f6\u00f6tab?"}
              </Link>
            </div>
          </div>

          {/* RIGHT — floating product cards (client-side interactive) */}
          <div className="hidden lg:flex lg:w-[45%] relative items-center justify-center min-h-[420px]">
            <div
              className="absolute top-[20%] left-[10%] w-[200px] h-[200px] rounded-full pointer-events-none"
              style={{ background: "radial-gradient(circle, rgba(232,101,10,0.12) 0%, transparent 70%)", filter: "blur(40px)" }}
            />
            <div
              className="absolute bottom-[15%] right-[5%] w-[160px] h-[160px] rounded-full pointer-events-none"
              style={{ background: "radial-gradient(circle, rgba(232,101,10,0.10) 0%, transparent 70%)", filter: "blur(30px)" }}
            />

            <HeroFloatingProducts />
          </div>
        </div>
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes heroFloat1 {
              0%, 100% { transform: translateY(0px) rotate(0deg); }
              50% { transform: translateY(-18px) rotate(1.5deg); }
            }
            @keyframes heroFloat2 {
              0%, 100% { transform: translateY(0px) rotate(0deg); }
              50% { transform: translateY(-14px) rotate(-1deg); }
            }
            @keyframes heroFloat3 {
              0%, 100% { transform: translateY(0px) rotate(0deg); }
              50% { transform: translateY(-20px) rotate(0.8deg); }
            }
          `,
        }}
      />
    </section>
  )
}
