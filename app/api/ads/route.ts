import { NextRequest, NextResponse } from "next/server"
import { listAds, type AdRegion, validatePlacement } from "@/lib/ads/repository"
import { resolveDeploymentRegion } from "@/lib/config/deployment-region"

export const runtime = "nodejs"

function normalizeRegion(value?: string | null): AdRegion {
  const v = String(value || "").toUpperCase()
  if (v === "INTL") return "INTL"
  if (v === "CN") return "CN"
  return resolveDeploymentRegion()
}

export async function GET(request: NextRequest) {
  try {
    const region = normalizeRegion(request.nextUrl.searchParams.get("region"))
    const placement = validatePlacement(request.nextUrl.searchParams.get("placement"))
    const ads = await listAds({ region, onlyActive: true, placement })
    return NextResponse.json({ success: true, ads })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to load ads" },
      { status: 500 }
    )
  }
}
