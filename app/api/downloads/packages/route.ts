import { NextRequest, NextResponse } from "next/server"
import { resolveDeploymentRegion } from "@/lib/config/deployment-region"
import { listDownloadPackages } from "@/lib/downloads/repository"
import { PackageRegion } from "@/lib/downloads/types"

export const runtime = "nodejs"

function resolveRegionFromQuery(value?: string | null): PackageRegion {
  if (String(value || "").toUpperCase() === "INTL") return "INTL"
  if (String(value || "").toUpperCase() === "CN") return "CN"
  return resolveDeploymentRegion()
}

export async function GET(request: NextRequest) {
  try {
    const region = resolveRegionFromQuery(request.nextUrl.searchParams.get("region"))
    const packages = await listDownloadPackages({ region, onlyActive: true })
    return NextResponse.json({ success: true, region, packages })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to load packages" },
      { status: 500 }
    )
  }
}
