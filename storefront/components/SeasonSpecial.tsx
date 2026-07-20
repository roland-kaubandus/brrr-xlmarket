import type { ReactElement } from "react"
import SafeLink from "@/components/SafeLink"
import type { SeasonSpecialData, SeasonItem } from "@/lib/season-special-data"

/**
 * SeasonSpecial — homepage band replacing the previous hero + stock board.
 *
 * Aesthetic direction: Estonian fairground broadsheet. Festival season is
 * about to open; the band is dressed as a market-day announcement: a
 * marquee-style ticker of upcoming events at the top, an oversized
 * editorial headline on the left, two giant star deals (waffle + ice
 * cream) sitting confidently in the middle, and a strip of smaller
 * outdoor-catering machines beneath them.
 *
 * Brand palette honored: amber #0ea5a0 is the only chromatic accent;
 * navy #0F1B2D is the dark register; #FAF7F1 paper-cream is the warm
 * register. No generic e-commerce gradients, no card-grid mediocrity.
 *
 * Display type: Barlow Condensed at the headline tier — already loaded
 * by the rest of the homepage. Mono numerals + IBM Plex Mono labels.
 */

interface SeasonSpecialProps {
  locale: string
  data: SeasonSpecialData
}

// Estonian outdoor-event calendar — handcurated. Update at the top of
// each season; today's set covers May–Aug 2026.
const EVENTS: Array<{ when: string; name: string }> = [
  { when: "May 17–19", name: "Türi Lillelaat" },
  { when: "May 31", name: "Tartu Hansapäevad" },
  { when: "Jun 06–08", name: "Pärnu Hansapäevad" },
  { when: "Jun 21–23", name: "Saaremaa Õllemaja" },
  { when: "Jul 03–06", name: "Õllesummer · Tallinn" },
  { when: "Jul 12–14", name: "Türi Lillelaat (suvi)" },
  { when: "Jul 25–28", name: "Viljandi Pärimusmuusika Festival" },
  { when: "Aug 02–04", name: "Toila Beach Festival" },
  { when: "Aug 09–11", name: "Pirita Kuhilad" },
  { when: "Aug 23–25", name: "Vana Tallinna Laat" },
]

function formatPrice(price: number): string {
  if (!price) return "—"
  return `€${price.toLocaleString("en-GB", { maximumFractionDigits: 0 })}`
}

function StarCard({ item, locale, kicker }: { item: SeasonItem; locale: string; kicker: string }): ReactElement {
  return (
    <SafeLink href={`/${locale}/toode/${item.handle}`} className="ss-star">
      <div className="ss-star-media">
        {item.thumbnail ? <img src={item.thumbnail} alt="" /> : null}
      </div>
      <div className="ss-star-body">
        <span className="ss-star-kicker">{kicker}</span>
        <h3 className="ss-star-name">{item.shortName}</h3>
        <p className="ss-star-caption">{item.caption}</p>
        <div className="ss-star-foot">
          <span className="ss-star-price">{formatPrice(item.price)}</span>
          <span className="ss-star-cta">See it →</span>
        </div>
      </div>
    </SafeLink>
  )
}

function StripItem({ item, locale }: { item: SeasonItem; locale: string }): ReactElement {
  return (
    <SafeLink href={`/${locale}/toode/${item.handle}`} className="ss-strip-item">
      <div className="ss-strip-thumb">
        {item.thumbnail ? <img src={item.thumbnail} alt="" /> : null}
      </div>
      <div className="ss-strip-text">
        <span className="ss-strip-name">{item.shortName}</span>
        <span className="ss-strip-cap">{item.caption}</span>
      </div>
      <span className="ss-strip-price">{formatPrice(item.price)}</span>
    </SafeLink>
  )
}

export default function SeasonSpecial({ locale, data }: SeasonSpecialProps): ReactElement | null {
  const { stars, strip } = data
  if (stars.length < 2) return null

  // Duplicate event list so the marquee loop is seamless
  const tickerEvents = [...EVENTS, ...EVENTS]

  return (
    <section className="season-special" aria-label="Festival season special">

      {/* ── Top ticker ── */}
      <div className="ss-ticker" role="region" aria-label="Upcoming Estonian events">
        <span className="ss-ticker-label">Up next ·</span>
        <div className="ss-ticker-track">
          {tickerEvents.map((e, i) => (
            <span className="ss-ticker-item" key={i}>
              <span className="ss-ticker-when">{e.when}</span>
              <span className="ss-ticker-name">{e.name}</span>
              <span className="ss-ticker-dot" aria-hidden="true">•</span>
            </span>
          ))}
        </div>
      </div>

      {/* ── Main grid: statement | star1 | star2 ── */}
      <div className="ss-grid">

        <header className="ss-statement">
          <span className="ss-eyebrow">Season Special · Week 17 / 2026</span>
          <h2 className="ss-headline">
            Festival season opens in <span className="ss-amber">six weeks.</span>
          </h2>
          <p className="ss-sub">
            Two star machines and the rest of the outdoor-catering kit, in stock in Tallinn,
            shipping in 10 business days. Set up by Türi Lillelaat, break even by Pärnu Hansapäevad.
          </p>
          <SafeLink href={`/${locale}/kategooriad/outdoor-cooking`} className="ss-cta">
            See the full season set →
          </SafeLink>

          <ul className="ss-trust">
            <li><strong>10</strong> business days · pallet delivery</li>
            <li><strong>2-year</strong> warranty · serviced from Tallinn</li>
            <li><strong>Net-30</strong> for B2B · Pay-in-3 for cards</li>
          </ul>
        </header>

        <StarCard item={stars[0]} locale={locale} kicker="Star deal · 01" />
        <StarCard item={stars[1]} locale={locale} kicker="Star deal · 02" />

      </div>

      {/* ── Strip of supporting machines ── */}
      {strip.length > 0 ? (
        <div className="ss-strip-wrap">
          <div className="ss-strip-head">
            <span className="ss-strip-eyebrow">Round out the stand</span>
            <span className="ss-strip-meta">Six more machines, same delivery, same warranty</span>
          </div>
          <div className="ss-strip">
            {strip.map((item) => (
              <StripItem key={item.handle} item={item} locale={locale} />
            ))}
          </div>
        </div>
      ) : null}

    </section>
  )
}
