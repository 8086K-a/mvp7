import { NextRequest, NextResponse } from "next/server"
import { recordAdClick, type AdRegion, validatePlacement } from "@/lib/ads/repository"
import { resolveDeploymentRegion } from "@/lib/config/deployment-region"

export const runtime = "nodejs"

function normalizeRegion(value?: string | null): AdRegion {
  const v = String(value || "").toUpperCase()
  if (v === "INTL") return "INTL"
  if (v === "CN") return "CN"
  return resolveDeploymentRegion()
}

function readClientIp(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for") || ""
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || null
  }
  return request.headers.get("x-real-ip") || null
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const adId = String(body?.adId || "").trim()
    const placement = validatePlacement(body?.placement)
    const region = normalizeRegion(body?.region)

    if (!adId) {
      return NextResponse.json({ success: false, error: "adId is required" }, { status: 400 })
    }

    await recordAdClick({
      adId,
      placement,
      region,
      ip: readClientIp(request),
      userAgent: request.headers.get("user-agent") || null,
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to record ad click" },
      { status: 500 }
    )
  }
}
