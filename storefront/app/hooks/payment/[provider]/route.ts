import { NextRequest, NextResponse } from "next/server"

// Avalik proxy Montonio (jt) makse-webhook'idele → sisemine Medusa /hooks/payment/[provider].
// TURVAPOSTURE (post-Risto, minimaalne pind): eksponeerib AVALIKULT AINULT seda rada;
// Medusa admin/store API jäävad Docker-sisevõrku (medusa:9000, väljast kättesaamatu).
// Montonio webhook'i autentsus valideeritakse Medusa montonio-moodulis (verifyWebhookToken,
// HS256 JWT secretKey'ga) — proxy ainult edastab, ei usalda midagi.
const MEDUSA_URL = process.env.NEXT_PUBLIC_MEDUSA_URL || "http://medusa:9000"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params
  // Ainult tähed/numbrid/alakriips — väldi path-traversal'i / suvalist medusa-rada.
  if (!/^[a-z0-9_]+$/i.test(provider)) {
    return NextResponse.json({ error: "Invalid provider" }, { status: 400 })
  }

  const body = await req.text()
  try {
    const res = await fetch(`${MEDUSA_URL}/hooks/payment/${provider}`, {
      method: "POST",
      headers: { "Content-Type": req.headers.get("content-type") || "application/json" },
      body,
    })
    const text = await res.text()
    return new NextResponse(text, {
      status: res.status,
      headers: { "Content-Type": res.headers.get("content-type") || "text/plain" },
    })
  } catch {
    return NextResponse.json({ error: "Webhook proxy failed" }, { status: 502 })
  }
}
