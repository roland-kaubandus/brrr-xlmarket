import type { ReactElement } from "react"
import SafeLink from "@/components/SafeLink"

/**
 * StockBoard — homepage row replacing the previous photo-tile promo grid.
 *
 * Eight (or fewer) real, in-stock SKUs from across the catalogue. Live
 * category badges, tabular prices, click-through goes straight to the
 * product page.
 *
 * Pure presentational component. Data is fetched in
 * `lib/stock-board-data.ts` and passed in by the server-rendered page.
 */

export interface StockBoardRow {
  handle: string
  catLabel: string
  name: string
  price: number
}

interface StockBoardProps {
  locale: string
  rows: StockBoardRow[]
  updatedAt: string
}

function formatPrice(price: number): string {
  if (!price) return "—"
  return `€${price.toLocaleString("en-GB", { maximumFractionDigits: 0 })}`
}

export default function StockBoard({ locale, rows, updatedAt }: StockBoardProps): ReactElement | null {
  if (rows.length < 4) return null

  return (
    <section className="stock-board">
      <header className="stock-board-head">
        <div className="stock-board-head-l">
          <span className="stock-board-lamp" aria-hidden="true" />
          <span className="stock-board-status">Live stock · updated {updatedAt}</span>
          <h2 className="stock-board-title">Eight of seventeen thousand.</h2>
        </div>
        <span className="stock-board-meta">Tallinn warehouse · VAT incl · ships 10 days</span>
      </header>

      <div className="stock-board-cols" aria-hidden="true">
        <span>Category</span>
        <span>Product</span>
        <span>Price</span>
        <span>Stock</span>
        <span></span>
      </div>

      <div className="stock-board-rows">
        {rows.map((row) => (
          <SafeLink key={row.handle} href={`/${locale}/toode/${row.handle}`} className="stock-board-row">
            <span className="stock-board-cat">{row.catLabel}</span>
            <span className="stock-board-name">{row.name}</span>
            <span className="stock-board-price">{formatPrice(row.price)}</span>
            <span className="stock-board-stock">
              <span className="stock-board-dot" aria-hidden="true" />
              In stock
            </span>
            <span className="stock-board-go" aria-hidden="true">
              →
            </span>
          </SafeLink>
        ))}
      </div>

      <footer className="stock-board-foot">
        <span>Rotating selection · refreshed each visit</span>
        <SafeLink href={`/${locale}/otsing`} className="stock-board-foot-link">
          See all 17,000 SKUs →
        </SafeLink>
      </footer>
    </section>
  )
}
