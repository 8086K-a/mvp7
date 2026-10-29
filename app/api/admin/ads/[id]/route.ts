import { NextRequest, NextResponse } from "next/server"
import { verifyAdminToken } from "@/lib/downloads/admin-auth"
import { deleteAd, updateAdStatus, type AdRegion } from "@/lib/ads/repository"

export const runtime = "nodejs"

function normalizeRegion(value?: string | null): AdRegion {
  return String(value || "").toUpperCase() === "INTL" ? "INTL" : "CN"
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = verifyAdminToken(request)
  if (!auth.ok) return auth.response

  try {
    const { id } = await context.params
    const body = await request.json()
    const region = normalizeRegion(body?.region)
    const isActive = Boolean(body?.isActive)

    if (!id) {
      return NextResponse.json({ success: false, error: "Ad id is required" }, { status: 400 })
    }

    await updateAdStatus({ id, region, isActive })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to update ad" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = verifyAdminToken(request)
  if (!auth.ok) return auth.response

  try {
    const { id } = await context.params
    const region = normalizeRegion(request.nextUrl.searchParams.get("region"))

    if (!id) {
      return NextResponse.json({ success: false, error: "Ad id is required" }, { status: 400 })
    }

    await deleteAd({ id, region })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to delete ad" },
      { status: 500 }
    )
  }
}
