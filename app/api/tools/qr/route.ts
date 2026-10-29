import { NextResponse } from "next/server"
import { grantReferralFirstUseReward } from "@/lib/market/referrals"

export const runtime = "nodejs"

function sanitizeHex(input: string | null, fallback: string) {
  const normalized = String(input || "").trim().replace("#", "")
  return /^[0-9a-fA-F]{6}$/.test(normalized) ? normalized : fallback
}

function sanitizeSize(input: string | null) {
  const parsed = Number.parseInt(String(input || "256"), 10)
  if (!Number.isFinite(parsed)) return 256
  return Math.max(128, Math.min(1024, parsed))
}

function sanitizeEcc(input: string | null): "L" | "M" | "Q" | "H" {
  const value = String(input || "M").toUpperCase()
  if (value === "L" || value === "M" || value === "Q" || value === "H") {
    return value
  }
  return "M"
}

export async function GET(request: Request) {
  try {
    const requestUserId = String(request.headers.get("x-user-id") || "").trim()
    const { searchParams } = new URL(request.url)
    const data = String(searchParams.get("data") || "").trim()

    if (!data) {
      return NextResponse.json({ success: false, error: "data is required" }, { status: 400 })
    }

    const size = sanitizeSize(searchParams.get("size"))
    const ecc = sanitizeEcc(searchParams.get("ecc"))
    const dark = sanitizeHex(searchParams.get("dark"), "000000")
    const light = sanitizeHex(searchParams.get("light"), "ffffff")

    const providers = [
      `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&format=png&ecc=${ecc}&color=${dark}&bgcolor=${light}&data=${encodeURIComponent(data)}`,
      `https://quickchart.io/qr?size=${size}&ecLevel=${ecc}&dark=${dark}&light=${light}&text=${encodeURIComponent(data)}`,
    ]

    for (const endpoint of providers) {
      try {
        const response = await fetch(endpoint, { cache: "no-store" })
        if (!response.ok) continue

        const contentType = response.headers.get("content-type") || "image/png"
        if (!contentType.startsWith("image/")) continue

        const bytes = await response.arrayBuffer()

        if (requestUserId) {
          await grantReferralFirstUseReward({
            invitedUserId: requestUserId,
            toolId: "qr-generator",
          }).catch(() => null)
        }

        return new Response(bytes, {
          status: 200,
          headers: {
            "Content-Type": contentType,
            "Cache-Control": "no-store",
          },
        })
      } catch {
        continue
      }
    }

    return NextResponse.json(
      { success: false, error: "Failed to generate QR with providers" },
      { status: 502 }
    )
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "QR generation failed" },
      { status: 500 }
    )
  }
}
