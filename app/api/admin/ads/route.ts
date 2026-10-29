import { NextRequest, NextResponse } from "next/server"
import { verifyAdminToken } from "@/lib/downloads/admin-auth"
import { createAd, listAllAdsForAdmin, type AdRegion, validatePlacement } from "@/lib/ads/repository"

export const runtime = "nodejs"

function normalizeRegion(value?: string | null): AdRegion {
  return String(value || "").toUpperCase() === "INTL" ? "INTL" : "CN"
}

function isValidAdImageUrl(imageUrl: string) {
  return /^https?:\/\//i.test(imageUrl) || imageUrl.startsWith("cloud://")
}

export async function GET(request: NextRequest) {
  const auth = verifyAdminToken(request)
  if (!auth.ok) return auth.response

  try {
    const ads = await listAllAdsForAdmin()
    return NextResponse.json({ success: true, ads })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to load ads" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const auth = verifyAdminToken(request)
  if (!auth.ok) return auth.response

  try {
    const body = await request.json()
    const region = normalizeRegion(body?.region)
    const placement = validatePlacement(body?.placement)
    const title = String(body?.title || "").trim() || `广告位 · ${placement}`
    const imageUrl = String(body?.imageUrl || "").trim()
    const linkUrl = String(body?.linkUrl || "").trim()
    const sortOrder = Number(body?.sortOrder || 0)
    const isActive = Boolean(body?.isActive ?? true)

    if (!imageUrl || !linkUrl) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: imageUrl,linkUrl" },
        { status: 400 }
      )
    }

    if (!isValidAdImageUrl(imageUrl)) {
      return NextResponse.json(
        { success: false, error: "图片地址无效，请上传图片或使用 http/https 链接" },
        { status: 400 }
      )
    }

    const ad = await createAd({
      region,
      title,
      imageUrl,
      linkUrl,
      placement,
      sortOrder,
      isActive,
    })

    return NextResponse.json({ success: true, ad })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to create ad" },
      { status: 500 }
    )
  }
}
