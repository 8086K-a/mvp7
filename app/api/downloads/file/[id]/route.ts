import { NextRequest, NextResponse } from "next/server"
import { getCloudbaseTempFileURL } from "@/lib/downloads/cloudbase-storage"
import { getPackageById, getSupabaseSignedDownloadUrl, recordDownloadEvent } from "@/lib/downloads/repository"
import { PackageRegion } from "@/lib/downloads/types"

export const runtime = "nodejs"

function normalizeRegion(value?: string | null): PackageRegion {
  return String(value || "").toUpperCase() === "INTL" ? "INTL" : "CN"
}

function getClientIp(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for")
  const realIp = request.headers.get("x-real-ip")
  if (forwarded) return forwarded.split(",")[0].trim()
  return realIp || null
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const region = normalizeRegion(request.nextUrl.searchParams.get("region"))
    const userId = request.nextUrl.searchParams.get("userId")
    const userEmail = request.nextUrl.searchParams.get("userEmail")

    if (!id) {
      return NextResponse.json({ success: false, error: "Package id is required" }, { status: 400 })
    }

    const pkg = await getPackageById(id, region)
    if (!pkg || !pkg.isActive) {
      return NextResponse.json({ success: false, error: "Package not found" }, { status: 404 })
    }

    await recordDownloadEvent({
      packageId: pkg.id,
      region: pkg.region,
      ip: getClientIp(request),
      userAgent: request.headers.get("user-agent"),
      userId,
      userEmail,
    })

    if (pkg.region === "INTL") {
      const signedUrl = await getSupabaseSignedDownloadUrl(pkg.storagePath)
      return NextResponse.redirect(signedUrl, { status: 302 })
    }

    const cloudbaseUrl = await getCloudbaseTempFileURL(pkg.storagePath)
    return NextResponse.redirect(cloudbaseUrl, { status: 302 })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to download package" },
      { status: 500 }
    )
  }
}
