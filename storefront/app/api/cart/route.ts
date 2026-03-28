import { NextResponse } from "next/server"

const MEDUSA_URL = process.env.NEXT_PUBLIC_MEDUSA_URL || "http://127.0.0.1:9001"
const API_KEY = process.env.NEXT_PUBLIC_MEDUSA_KEY || "pk_d8dce98ddbea51a05856fe088fd0af77fab4675ccc4f03773d064dd4f6d203b3"
const REGION_ID = process.env.NEXT_PUBLIC_REGION_ID || "reg_01KMRXWSNXSYE4530A3K2BK86W"

export async function POST() {
  const res = await fetch(`${MEDUSA_URL}/store/carts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-publishable-api-key": API_KEY,
    },
    body: JSON.stringify({ region_id: REGION_ID }),
  })
  const data = await res.json()
  return NextResponse.json(data)
}
