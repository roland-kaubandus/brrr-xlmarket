import { NextResponse } from "next/server"

// jsonCL — JSON-vastus EKSPLITSIITSE Content-Length'iga (MITTE chunked).
//
// Juur (2026-06-11, kogu cart+kategooria-bug'ide tegelik põhjus):
// Next.js standalone server vastab API-route'idel `Transfer-Encoding: chunked`
// (Content-Length PUUDUB). Traefik (coolify-proxy) kaotab vahelduvalt chunked-
// terminaatori (0-chunk) TAASKASUTATUD backend-keep-alive-ühendusel → ei saada
// kunagi HTTP/2 END_STREAM'i kliendile → brauseri fetch ripub kuni timeout
// (~10-25% päringutest). Sümptomid: "Failed to add to cart" (/api/cart),
// stuck-skeleton + "Oops" (/api/products). Medusa cart-workflow ISE on kiire
// (20/20 <0.2s) — vana "cart-workflow stall" diagnoos oli vale jälg.
//
// Content-Length annab Traefikule täpse keha-pikkuse → Traefik teab millal keha
// lõppeb sõltumata terminaator-chunki kadumisest → usaldusväärne END_STREAM ka
// taaskasutatud ühendusel. (keepAliveTimeout tõstmine tegi HULLEMAKS — pikem
// keep-alive = rohkem taaskasutust = rohkem ripumist; mõõdetud 2026-06-11.)
export function jsonCL(
  data: unknown,
  init?: { status?: number; headers?: Record<string, string> }
): NextResponse {
  const body = JSON.stringify(data)
  const headers = new Headers(init?.headers)
  headers.set("Content-Type", "application/json")
  headers.set("Content-Length", String(Buffer.byteLength(body)))
  return new NextResponse(body, { status: init?.status ?? 200, headers })
}
